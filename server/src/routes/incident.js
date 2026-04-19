const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('./auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();
const prisma = new PrismaClient();

// Multer storage for media uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/'))
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'incident-' + uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

// Submit Incident (Public to QR Portal)
router.post('/', upload.single('media'), async (req, res) => {
  try {
    const { type, description, floor, sessionId } = req.body;
    let uploadedMediaUrl = null;

    if (req.file) {
      uploadedMediaUrl = `/uploads/${req.file.filename}`;
    }

    // Verify session
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || !session.active) {
      return res.status(403).json({ error: 'Invalid or expired session' });
    }

    const incident = await prisma.incident.create({
      data: {
        type,
        description,
        floor: (type === 'Medical Emergency' || session.domain === 'HOTEL') ? floor : null,
        uploadedMediaUrl,
        sessionId,
        domain: session.domain,
        status: 'Pending'
      },
      include: {
        session: { select: { sessionCode: true, name: true } }
      }
    });

    // Notify via Socket.io isolated by domain
    if (type === 'Medical Emergency') {
      req.io.to(`floor_${floor}_${session.domain}`).to(`Administrator_${session.domain}`).to(`Hotel Manager_${session.domain}`).to(`staff_all_${session.domain}`).emit('new_incident', incident);
    } else {
      req.io.to(`staff_all_${session.domain}`).emit('new_incident', incident);
    }

    // 1. Immediate notification (already done above)
    

    // 3. Auto-escalation: If ANY incident is not reviewed (remains Pending) in 2 minutes, trigger system-wide emergency buzz
    setTimeout(async () => {
      try {
        const checkIncident = await prisma.incident.findUnique({ where: { id: incident.id } });
        // If it's still Pending after 2 minutes, trigger the loud buzz for everyone
        if (checkIncident && checkIncident.status === 'Pending') {
          console.log(`Auto-triggering emergency buzz for unreviewed incident ${incident.id} (${type})`);
          const payload = {
            message: `UNREVIEWED EMERGENCY ALERT: ${type} at ${floor || 'Unknown Location'}. Staff attention required immediately!`,
            issuerData: { name: 'SYSTEM AUTO-ESC', role: 'Automated' }
          };
          req.io.to(`staff_all_${session.domain}`).emit('emergency_buzz', payload);
          req.io.to(`patients_${session.domain}`).emit('emergency_buzz', payload);
        }
      } catch (err) {
        console.error('Error in incident auto-buzz timeout:', err);
      }
    }, 2 * 60 * 1000); // 2 minutes in milliseconds

    res.json(incident);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error submitting incident' });
  }
});

// Get Incidents (Staff Only)
router.get('/', authenticateToken, async (req, res) => {
  const { role, floors, domain } = req.user;
  
  let filter = { domain, isDeleted: false, status: { not: 'Resolved' } }; // ALWAYS filter by domain, exclude deleted, and exclude Resolved from feed

  if (role === 'Doctor' || role === 'Nurse' || role === 'Security' || role === 'Maintenance') {
    // Parse assigned floors
    const assignedFloors = floors
      ? floors.split(',').map(f => f.trim()).filter(f => f.length > 0)
      : [];

    if (assignedFloors.length > 0) {
      if (domain === 'HOSPITAL') {
        filter.OR = [
          { type: { in: ['Fire', 'Other'] } },
          { type: 'Medical Emergency', floor: { in: assignedFloors } }
        ];
      } else {
        // Hotel specific filtering
        filter.OR = [
          { type: { in: ['Fire', 'Security Breach'] } },
          { type: { in: ['Maintenance Issue', 'Medical Emergency'] }, floor: { in: assignedFloors } }
        ];
      }
    }
  } else if (role === 'Receptionist' || role === 'Front Desk') {
    filter.type = { in: ['Fire', 'Other', 'Security Breach'] };
  }
  // Administrator / Hotel Manager sees all in their domain

  const incidents = await prisma.incident.findMany({
    where: filter,
    include: { session: { select: { sessionCode: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  res.json(incidents);
});

// Update Incident Status (Staff Only)
router.put('/:id/status', authenticateToken, async (req, res) => {
  const { status } = req.body;

  const incident = await prisma.incident.update({
    where: { id: parseInt(req.params.id) },
    data: { status },
    include: { session: { select: { sessionCode: true, name: true } } }
  });

  // Broadcast update
  if (status === 'Resolved') {
    req.io.to(`staff_all_${incident.domain}`).emit('incident_updated', { ...incident, removed: true });
  } else {
    req.io.to(`staff_all_${incident.domain}`).emit('incident_updated', incident);
  }

  await prisma.auditLog.create({
    data: {
      action: 'Update Incident',
      details: `Incident ID ${incident.id} changed to ${status}`,
      userId: req.user.id
    }
  });

  res.json(incident);
});

// Soft Delete Incident (Administrator / Hotel Manager Only)
router.delete('/:id', authenticateToken, async (req, res) => {
  const { role } = req.user;
  if (role !== 'Administrator' && role !== 'Hotel Manager') {
    return res.status(403).json({ error: 'Only Administrators can remove incidents from the feed.' });
  }

  const incident = await prisma.incident.update({
    where: { id: parseInt(req.params.id) },
    data: { isDeleted: true }
  });

  // Broadcast that the incident is removed (we can use the same updated event, but client will filter it)
  req.io.to(`staff_all_${incident.domain}`).emit('incident_updated', { ...incident, removed: true });

  await prisma.auditLog.create({
    data: {
      action: 'Archive Incident',
      details: `Incident ID ${incident.id} archived by admin`,
      userId: req.user.id
    }
  });

  res.json({ success: true, id: incident.id });
});

module.exports = router;
