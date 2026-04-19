const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload directory exists
const fs = require('fs');
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// Pass io to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Users can join specific rooms based on their role or floor
  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });
  
  socket.on('buzz_triggered', (data) => {
    // Expected to be triggered by staff and blast to all QR users in their domain
    console.log('Emergency buzz triggered by staff:', data);
    const domain = data.domain || 'HOSPITAL';
    // Broadcast to the "patients" or "guests" room (which we just call patients_DOMAIN) and staff_all
    io.to(`patients_${domain}`).emit('emergency_buzz', data);
    io.to(`staff_all_${domain}`).emit('emergency_buzz', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Import Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const sessionRoutes = require('./routes/session');
const incidentRoutes = require('./routes/incident');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/patient', sessionRoutes); // Keep /api/patient for backwards compatibility on frontend if needed, but we'll update it to /api/session
app.use('/api/session', sessionRoutes);
app.use('/api/incident', incidentRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
