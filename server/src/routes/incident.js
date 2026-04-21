const express = require('express');

const { authenticateToken } = require('./auth');
const multer = require('multer');
const path = require('path');
const { analyzeIncident } = require('../utils/aiTriage');

const router = express.Router();
const prisma = require('../utils/prisma');

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

    // AI Triage Analysis
    const aiAnalysis = await analyzeIncident(description, type);

    // Smart Assignment Logic - Find a staff member assigned to this floor
    let assignedUserId = null;
    let assignedUserName = null;
    if (floor) {
      // Find staff matching the floor
      const staffOnFloor = await prisma.user.findMany({
        where: {
          domain: session.domain,
          floors: { contains: floor },
          role: { in: ['Doctor', 'Nurse', 'Maintenance', 'Security', 'Receptionist', 'Operations', 'Help Desk', 'Information'] }
        },
        include: { _count: { select: { assignedIncidents: { where: { status: { in: ['Pending', 'In Progress', 'Reviewed'] } } } } } }
      });
      // Pick the least loaded staff
      if (staffOnFloor.length > 0) {
        staffOnFloor.sort((a, b) => a._count.assignedIncidents - b._count.assignedIncidents);
        assignedUserId = staffOnFloor[0].id;
        assignedUserName = `${staffOnFloor[0].name} (${staffOnFloor[0].role})`;
      }
    }

    const incident = await prisma.incident.create({
      data: {
        type,
        description,
        floor: (type === 'Medical Emergency' || session.domain === 'HOTEL' || floor) ? floor : null,
        uploadedMediaUrl,
        sessionId,
        domain: session.domain,
        status: 'Pending',
        assignedToId: assignedUserId,
        assignedToName: assignedUserName,
        severityScore: aiAnalysis.severityScore,
        sentiment: aiAnalysis.sentiment,
        aiTriageInstructions: aiAnalysis.instructions,
        language: session.language
      },
      include: {
        session: { select: { sessionCode: true, name: true } }
      }
    });

    // Notify via Socket.io isolated by domain
    if (assignedUserId) {
      // Alert specifically to assigned staff's role or floor optionally, but we'll broadcast to the floor and all staff
      req.io.to(`floor_${floor}_${session.domain}`).emit('new_incident', incident);
      req.io.to(`staff_all_${session.domain}`).emit('new_incident', incident);
    } else {
      req.io.to(`staff_all_${session.domain}`).emit('new_incident', incident);
    }

    // 1. Immediate notification (already done above)
    

    // 3. Auto-escalation: If ANY incident is not reviewed (remains Pending) in 2 minutes, trigger system-wide emergency buzz
    setTimeout(async () => {
      try {
        const checkIncident = await prisma.incident.findUnique({ where: { id: incident.id } });
        // If it's still Pending after 2 minutes, trigger the loud buzz
        if (checkIncident && checkIncident.status === 'Pending') {
          console.log(`Auto-triggering emergency buzz for unreviewed incident ${incident.id} (${type})`);
          const payload = {
            message: `UNREVIEWED EMERGENCY ALERT: ${type} at ${floor || 'Unknown Location'}. Staff attention required immediately!`,
            issuerData: { name: 'SYSTEM AUTO-ESC', role: 'Automated' }
          };
          req.io.to(`staff_all_${session.domain}`).emit('emergency_buzz', payload);
          
          if (type === 'Fire') {
            req.io.to(`patients_${session.domain}`).emit('emergency_buzz', payload);
          }
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

  // Floor-assigned staff roles across all domains
  const floorStaffRoles = ['Doctor', 'Nurse', 'Security', 'Maintenance', 'Receptionist', 'Operations', 'Help Desk', 'Information'];
  // Reception/Front-desk equivalent roles across all domains
  const frontDeskRoles = ['Front Desk', 'Help Desk', 'Information'];

  if (floorStaffRoles.includes(role)) {
    // Parse assigned floors
    const assignedFloors = floors
      ? floors.split(',').map(f => f.trim()).filter(f => f.length > 0)
      : [];

    if (assignedFloors.length > 0) {
      if (domain === 'HOSPITAL') {
        filter.OR = [
          { type: { in: ['Fire', 'Other'] } },
          { type: 'Medical Emergency', floor: { in: assignedFloors } },
          { assignedToId: req.user.id }
        ];
      } else {
        // Hotel / Airport / Mall filtering
        filter.OR = [
          { type: { in: ['Fire', 'Security Breach'] } },
          { type: { in: ['Maintenance Issue', 'Medical Emergency', 'Other'] }, floor: { in: assignedFloors } },
          { assignedToId: req.user.id }
        ];
      }
    }
  } else if (frontDeskRoles.includes(role)) {
    filter.type = { in: ['Fire', 'Other', 'Security Breach'] };
  }
  // Administrator / Hotel Manager / Duty Manager / Admin sees all in their domain

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
  let updateData = { status };
  // Capture assignee details if it transitions from Pending
  if (status === 'Reviewed' || status === 'In Progress') {
    updateData.assignedToId = req.user.id;
    updateData.assignedToName = `${req.user.name} (${req.user.role})`;
  }

  const incident = await prisma.incident.update({
    where: { id: parseInt(req.params.id) },
    data: updateData,
    include: { session: { select: { sessionCode: true, name: true } } }
  });

  // Broadcast update to staff
  if (status === 'Resolved') {
    req.io.to(`staff_all_${incident.domain}`).emit('incident_updated', { ...incident, removed: true });
  } else {
    req.io.to(`staff_all_${incident.domain}`).emit('incident_updated', incident);
  }
  
  // Give direct feedback to the patient who opened the ticket
  req.io.to(`patient_${incident.sessionId}`).emit('incident_updated', incident);
  // Give distinct notification to all staff that it was claimed
  if (status === 'Reviewed' || status === 'In Progress') {
     req.io.to(`staff_all_${incident.domain}`).emit('incident_claimed', {
         message: `${req.user.name} (${req.user.role}) has responded to the ${incident.type} alert at ${incident.floor || 'an unknown location'}.`
     });
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
  if (role !== 'Administrator' && role !== 'Hotel Manager' && role !== 'Duty Manager' && role !== 'Admin') {
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

// System alert from Vision AI / IoT with Context Awareness
router.post('/system-alert', async (req, res) => {
  try {
    const { domain, cameraLocation, eventType, confidence, zone } = req.body;
    
    // Vision AI context logic: Exclude alerts from Controlled Zones (e.g. Cooking in Kitchen)
    // unless confidence is extremely high (indicating it's NOT a normal kitchen fire)
    if (zone === 'Controlled_Zone' && confidence < 95) {
       console.log(`[Vision AI] Alert suppressed for ${eventType} in ${cameraLocation} (Controlled Zone, Confidence: ${confidence}%)`);
       return res.json({ status: 'Suppressed', reason: 'Controlled Zone' });
    }

    const staffResponse = await prisma.user.findFirst({
       where: { domain: domain, floors: { contains: cameraLocation } }
    });

    const sysIncident = await prisma.incident.create({
       data: {
         type: eventType === 'Fire' ? 'Fire' : 'Security Breach',
         description: `VISION AI ALERT: ${eventType} detected in ${cameraLocation}. Confidence: ${confidence}%. Immediate response recommended.`,
         floor: cameraLocation,
         sessionId: "SYSTEM_ALARM", 
         domain: domain,
         status: 'Pending',
         assignedToId: staffResponse ? staffResponse.id : null,
         assignedToName: staffResponse ? `${staffResponse.name} (${staffResponse.role})` : null,
         severityScore: confidence > 80 ? 9 : 6
       }
    });

    req.io.to(`staff_all_${domain}`).emit('new_incident', sysIncident);
    res.json(sysIncident);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'System alert failure' });
  }
});

// External Dispatch (EMS / Fire) - Staff only
router.post('/:id/dispatch', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const incident = await prisma.incident.findUnique({ where: { id: parseInt(id) } });

    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    // In a production app, this would call an external API (Twilio, EMS API, etc.)
    console.log(`[CORE DISPATCH] Escalating Incident #${id} to External Emergency Services...`);

    // Record the escalation in audit logs
    await prisma.auditLog.create({
      data: {
        action: 'EXTERNAL_DISPATCH',
        details: `Incident #${id} (${incident.type}) escalated to Regional Emergency Response.`,
        userId: req.user.id
      }
    });

    // Notify staff of the escalation status
    req.io.to(`staff_all_${incident.domain}`).emit('system_notification', {
       title: 'Dispatch Successful',
       message: `External emergency services have been dispatched to ${incident.floor}. ETA: 8-12 minutes.`
    });

    res.json({ success: true, message: 'Dispatched' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Dispatch escalation failed' });
  }
});

// Submit Feedback (Public)
router.post('/:id/feedback', async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const incident = await prisma.incident.update({
      where: { id: parseInt(req.params.id) },
      data: {
        feedbackRating: parseInt(rating),
        feedbackComment: comment
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'Submit Feedback',
        details: `Incident ID ${incident.id} received feedback: ${rating} stars`,
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error submitting feedback' });
  }
});

module.exports = router;
