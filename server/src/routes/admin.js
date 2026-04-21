const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole } = require('./auth');
const { generateLogHash } = require('../utils/crypto');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// Admin-only endpoints - allow both Administrator (Hospital) and Hotel Manager (Hotel)
router.use(requireRole(['Administrator', 'Hotel Manager']));

/**
 * High-utility helper to create a "Block" in our audit chain.
 */
async function createChainedLog(action, details, userId, domain) {
  // Find the last log to get the previousHash
  const lastLog = await prisma.auditLog.findFirst({
    where: { user: { domain: domain } },
    orderBy: { timestamp: 'desc' }
  });
  
  const prevHash = lastLog ? lastLog.hash : 'GENESIS_BLOCK';
  const newHash = generateLogHash(action, details, prevHash);

  return await prisma.auditLog.create({
    data: {
      action,
      details,
      userId,
      hash: newHash,
      previousHash: prevHash
    }
  });
}

router.get('/staff', async (req, res) => {
  const staff = await prisma.user.findMany({
    where: { domain: req.user.domain },
    select: { id: true, username: true, name: true, role: true, floors: true, createdAt: true }
  });
  res.json(staff);
});

router.get('/resources', async (req, res) => {
  const resources = await prisma.resource.findMany({
    where: { domain: req.user.domain }
  });
  res.json(resources);
});

router.post('/resources', async (req, res) => {
  const { name, type, floor, lat, lng } = req.body;
  const resource = await prisma.resource.create({
    data: {
      name,
      type,
      floor,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      domain: req.user.domain
    }
  });
  res.json(resource);
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

  await createChainedLog('Create Staff', `Created staff member ${username} with role ${role}`, req.user.id, req.user.domain);

  res.json({ id: user.id, username: user.username, role: user.role });
});

router.delete('/staff/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  // Optional: Prevent deleting self
  if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete self' });

  await prisma.user.delete({ where: { id } });
  
  await createChainedLog('Delete Staff', `Deleted staff ID ${id}`, req.user.id, req.user.domain);

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

  await createChainedLog('Update Config', `Geofence updated to ${geofenceLat}, ${geofenceLng} rad:${geofenceRadius}`, req.user.id, req.user.domain);

  res.json(config);
});

router.get('/analytics', async (req, res) => {
  // Aggregate incident stats
  const totalIncidents = await prisma.incident.count({ where: { domain: req.user.domain } });
  
  const incidentsByTypeData = await prisma.incident.groupBy({
    by: ['type'],
    where: { domain: req.user.domain },
    _count: { type: true }
  });
  const incidentsByType = incidentsByTypeData.map(item => ({ name: item.type, count: item._count.type }));

  const incidentsByStatusData = await prisma.incident.groupBy({
    by: ['status'],
    where: { domain: req.user.domain },
    _count: { status: true }
  });
  const incidentsByStatus = incidentsByStatusData.map(item => ({ name: item.status, count: item._count.status }));

  // Average response time calculation
  const resolvedIncidents = await prisma.incident.findMany({
    where: { domain: req.user.domain, status: 'Resolved' },
    select: { createdAt: true, updatedAt: true }
  });

  let avgResponseTimeSeconds = 0;
  if (resolvedIncidents.length > 0) {
    const totalDiff = resolvedIncidents.reduce((sum, inc) => {
      return sum + (new Date(inc.updatedAt).getTime() - new Date(inc.createdAt).getTime());
    }, 0);
    avgResponseTimeSeconds = Math.round((totalDiff / resolvedIncidents.length) / 1000);
  }

  // Active staff count
  const activeStaff = await prisma.user.count({ where: { domain: req.user.domain } });

  // Average Feedback
  const incidentsWithFeedback = await prisma.incident.findMany({
    where: { domain: req.user.domain, feedbackRating: { not: null } },
    select: { feedbackRating: true }
  });
  let avgFeedback = 0;
  if (incidentsWithFeedback.length > 0) {
    avgFeedback = (incidentsWithFeedback.reduce((sum, i) => sum + i.feedbackRating, 0) / incidentsWithFeedback.length).toFixed(1);
  }

  // Severity Distribution
  const severityData = await prisma.incident.groupBy({
    by: ['severityScore'],
    where: { domain: req.user.domain },
    _count: { severityScore: true }
  });
  const severityDistribution = severityData.map(item => ({ score: item.severityScore, count: item._count.severityScore }));

  res.json({
    totalIncidents,
    avgResponseTimeSeconds,
    avgFeedback,
    activeStaff,
    incidentsByType,
    incidentsByStatus,
    severityDistribution
  });
});

module.exports = router;
