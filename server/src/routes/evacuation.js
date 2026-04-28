const express = require('express');
const { authenticateToken, requireRole } = require('./auth');
const router = express.Router();
const prisma = require('../utils/prisma');

router.use(authenticateToken);

const ADMIN_ROLES = ['Administrator', 'Hotel Manager', 'Duty Manager', 'Admin'];

// ── GET all active sessions with evacuation status ──────────────────────────
router.get('/', async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { domain: req.user.domain, active: true },
      include: {
        incidents: {
          where: { isDeleted: false, status: { not: 'Resolved' } },
          select: { id: true, type: true, status: true, floor: true, severityScore: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Aggregated floor summary
    const floorMap = {};
    sessions.forEach(s => {
      s.incidents.forEach(inc => {
        const floor = inc.floor || 'Unknown';
        if (!floorMap[floor]) floorMap[floor] = { floor, activeIncidents: 0, maxSeverity: 0 };
        floorMap[floor].activeIncidents++;
        if (inc.severityScore > floorMap[floor].maxSeverity) {
          floorMap[floor].maxSeverity = inc.severityScore;
        }
      });
    });

    res.json({
      sessions,
      floorSummary: Object.values(floorMap),
      counts: {
        total: sessions.length,
        safe: sessions.filter(s => s.evacuationStatus === 'Safe').length,
        evacuated: sessions.filter(s => s.evacuationStatus === 'Evacuated').length,
        unaccounted: sessions.filter(s => s.evacuationStatus === 'Unaccounted').length,
        unknown: sessions.filter(s => s.evacuationStatus === 'Unknown').length,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch evacuation data' });
  }
});

// ── PUT update evacuation status ────────────────────────────────────────────
router.put('/:sessionId', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const { evacuationStatus } = req.body;
    const valid = ['Unknown', 'Safe', 'Evacuated', 'Unaccounted'];
    if (!valid.includes(evacuationStatus)) {
      return res.status(400).json({ error: 'Invalid evacuation status' });
    }

    const session = await prisma.session.update({
      where: { id: req.params.sessionId },
      data: { evacuationStatus }
    });

    // Broadcast to all staff in the domain
    req.io.to(`staff_all_${req.user.domain}`).emit('evacuation_updated', {
      sessionId: session.id,
      evacuationStatus: session.evacuationStatus
    });

    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update evacuation status' });
  }
});

module.exports = router;
