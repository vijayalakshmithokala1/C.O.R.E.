const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole } = require('./auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// Admin-only endpoints - allow both Administrator (Hospital) and Hotel Manager (Hotel)
router.use(requireRole(['Administrator', 'Hotel Manager']));

router.get('/staff', async (req, res) => {
  const staff = await prisma.user.findMany({
    where: { domain: req.user.domain },
    select: { id: true, username: true, name: true, role: true, floors: true, createdAt: true }
  });
  res.json(staff);
});

router.post('/staff', async (req, res) => {
  const { username, password, name, role, floors } = req.body;
  
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return res.status(400).json({ error: 'Username taken' });

  const passwordHash = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      name,
      role,
      floors: floors || '',
      domain: req.user.domain
    }
  });

  await prisma.auditLog.create({
    data: {
      action: 'Create Staff',
      details: `Created staff member ${username} with role ${role}`,
      userId: req.user.id
    }
  });

  res.json({ id: user.id, username: user.username, role: user.role });
});

router.delete('/staff/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  // Optional: Prevent deleting self
  if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete self' });

  await prisma.user.delete({ where: { id } });
  
  await prisma.auditLog.create({
    data: {
      action: 'Delete Staff',
      details: `Deleted staff ID ${id}`,
      userId: req.user.id
    }
  });

  res.json({ message: 'Deleted successfully' });
});

router.get('/audit', async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    where: { user: { domain: req.user.domain } },
    include: { user: { select: { name: true, role: true } } },
    orderBy: { timestamp: 'desc' },
    take: 100
  });
  res.json(logs);
});

router.get('/config', async (req, res) => {
  let config = await prisma.systemConfig.findFirst({ where: { domain: req.user.domain } });
  if (!config) {
    // Generate unique ID based on domain to avoid unique constraint clash since it's not auto-incrementing if we rely on default
    const id = req.user.domain === 'HOTEL' ? 2 : 1;
    config = await prisma.systemConfig.upsert({ 
      where: { id },
      update: {},
      create: { id, geofenceLat: 0, geofenceLng: 0, geofenceRadius: 200, domain: req.user.domain } 
    });
  }
  res.json(config);
});

router.put('/config', async (req, res) => {
  const { geofenceLat, geofenceLng, geofenceRadius } = req.body;
  const configToUpdate = await prisma.systemConfig.findFirst({ where: { domain: req.user.domain } });
  
  if (!configToUpdate) return res.status(404).json({ error: 'Config not found' });

  const config = await prisma.systemConfig.update({
    where: { id: configToUpdate.id },
    data: { geofenceLat: parseFloat(geofenceLat), geofenceLng: parseFloat(geofenceLng), geofenceRadius: parseInt(geofenceRadius) }
  });

  await prisma.auditLog.create({
    data: {
      action: 'Update Config',
      details: `Geofence updated to ${geofenceLat}, ${geofenceLng} rad:${geofenceRadius}`,
      userId: req.user.id
    }
  });

  res.json(config);
});

module.exports = router;
