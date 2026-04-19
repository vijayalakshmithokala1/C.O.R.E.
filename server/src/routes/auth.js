const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Initial Admin creation if none exists (for easy setup)
router.post('/setup-admin', async (req, res) => {
  try {
    const { username, password, name, domain } = req.body;
    const reqDomain = domain || 'HOSPITAL';
    const roleName = reqDomain === 'HOTEL' ? 'Hotel Manager' : 'Administrator';

    const adminExists = await prisma.user.findFirst({ where: { role: roleName, domain: reqDomain } });
    if (adminExists) {
      return res.status(400).json({ error: 'Administrator already exists for this domain' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        name,
        role: roleName,
        domain: reqDomain
      }
    });

    await prisma.systemConfig.upsert({
      where: { id: 1 },
      update: {},
      create: { geofenceLat: 0, geofenceLng: 0, geofenceRadius: 200 }
    });

    res.json({ message: 'Admin setup successful', user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password, role, domain } = req.body;
    const reqDomain = domain || 'HOSPITAL';
    
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.domain !== reqDomain) {
      return res.status(401).json({ error: 'Invalid credentials or domain' });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ error: 'Invalid role access' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, floors: user.floors, domain: user.domain }, process.env.JWT_SECRET, { expiresIn: '12h' });

    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role, floors: user.floors, domain: user.domain } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Auth Middleware (exportable)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  }
}

module.exports = router;
module.exports.authenticateToken = authenticateToken;
module.exports.requireRole = requireRole;
