const express = require('express');

const { authenticateToken, requireRole } = require('./auth');
const crypto = require('crypto');

const router = express.Router();
const prisma = require('../utils/prisma');

// Get config for Web Portal for geofence validation
router.get('/config', async (req, res) => {
  const domain = req.query.domain || 'HOSPITAL';
  const config = await prisma.systemConfig.findFirst({ where: { domain } });
  res.json({
    geofenceLat: config?.geofenceLat || 0,
    geofenceLng: config?.geofenceLng || 0,
    geofenceRadius: config?.geofenceRadius || 200
  });
});

// Check if a session is valid (public route for portal)
router.get('/session/:id', async (req, res) => {
  const session = await prisma.session.findUnique({ where: { id: req.params.id } });
  if (!session || !session.active) {
    return res.status(404).json({ error: 'Session invalid or discharged' });
  }
  res.json({ id: session.id, sessionCode: session.sessionCode, domain: session.domain });
});

// Staff can view all active sessions for their domain
router.get('/sessions', authenticateToken, async (req, res) => {
  const sessions = await prisma.session.findMany({
    where: { domain: req.user.domain },
    orderBy: { createdAt: 'desc' }
  });
  res.json(sessions);
});

// Receptionist / Front Desk Check-in
router.post('/checkin', authenticateToken, requireRole(['Receptionist', 'Administrator', 'Front Desk', 'Hotel Manager', 'Help Desk', 'Duty Manager', 'Information', 'Admin']), async (req, res) => {
  const { name } = req.body;
  const prefixMap = { HOTEL: 'GST-', AIRPORT: 'PSG-', MALL: 'SHR-', HOSPITAL: 'PAT-' };
  const prefix = prefixMap[req.user.domain] || 'SES-';
  const sessionCode = `${prefix}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  
  const session = await prisma.session.create({
    data: {
      sessionCode,
      name: name || null,
      domain: req.user.domain,
      active: true
    }
  });

  await prisma.auditLog.create({
    data: {
      action: 'Session Created',
      details: `Checked in ${sessionCode} (${name || 'No Name'}) in ${req.user.domain}`,
      userId: req.user.id
    }
  });

  res.json(session);
});

// Receptionist / Front Desk Discharge
router.post('/discharge/:id', authenticateToken, requireRole(['Receptionist', 'Administrator', 'Front Desk', 'Hotel Manager', 'Help Desk', 'Duty Manager', 'Information', 'Admin']), async (req, res) => {
  const session = await prisma.session.update({
    where: { id: req.params.id },
    data: {
      active: false,
      dischargedAt: new Date()
    }
  });

  // Emit to sockets to tell user session is invalid if we had a specific room
  req.io.to(`patient_${session.id}`).emit('session_discharged', { message: 'You have been discharged.' });

  await prisma.auditLog.create({
    data: {
      action: 'Session Discharged',
      details: `Discharged ${session.sessionCode}`,
      userId: req.user.id
    }
  });

  res.json(session);
});

module.exports = router;
