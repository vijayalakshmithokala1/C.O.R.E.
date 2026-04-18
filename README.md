# C.O.R.E. — Crisis Operations & Response Ecosystem

> A real-time emergency incident management platform for hospitals and hotels.  
> Staff manage incidents on a live dashboard. Patients/guests report emergencies via a QR code portal — no app required.

---

## 🚨 The Problem

In high-occupancy environments like hospitals and hotels, emergency response suffers from a critical gap: **patients and guests have no reliable channel to report distress**. Intercom buttons are fixed, staff are understaffed, and by the time an emergency is visible, it may be too late.

C.O.R.E. bridges the gap by turning every smartphone into an emergency hotline through a QR code.

---

## ✨ Features

### 🏥 Multi-Domain Support
- Runs in **Hospital mode** (Patients, Doctors, Nurses, Receptionists, Administrators) and **Hotel mode** (Guests, Security, Maintenance, Front Desk, Hotel Managers) from a single codebase
- Domain-isolated data — hospital staff never see hotel incidents and vice versa

### 📱 QR Code Patient/Guest Portal
- Reception generates a unique QR code on check-in
- Patient/guest scans it on their phone → opens a mobile-optimised portal (no login, no app)
- **Geofence enforcement** — incident reports are only accepted within a configurable radius of the property
- Incident types: Medical Emergency, Fire/Smoke, Security Breach, Maintenance Issue, Other
- Optional photo/video evidence attachment

### ⚡ Real-Time Incident Feed (Socket.io)
- Incidents appear on staff dashboards **instantly** via WebSocket — no polling
- Status updates (`Pending → In Progress → Resolved`) broadcast to all connected staff in real time
- **Auto-escalation**: if any incident remains `Pending` for 2 minutes, a system-wide emergency buzz fires automatically

### 🚨 Emergency Broadcast Buzz
- Administrators can send a system-wide emergency alert to **all** staff and patient portals simultaneously (one click)
- Fire incidents trigger an automatic buzz to all connected users
- Plays a loud klaxon alarm on all devices

### 🔐 Role-Based Access Control
| Role | Access |
|------|--------|
| Administrator / Hotel Manager | Full access: staff management, audit logs, system config, all incidents |
| Doctor / Nurse / Security | Assigned-floor incident feed |
| Receptionist / Front Desk | Patient/guest check-in, QR generation, discharge |
| Patient / Guest | QR portal only (no login required) |

### 📋 Audit Trail
- Every staff action (login, check-in, discharge, config change) is logged with timestamp and user
- Admin-only audit log view

### 🗺️ Geofence Configuration
- Administrators set GPS coordinates and radius (metres) for their property
- Portal blocks submissions from users outside the perimeter

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, React Router v7 |
| Backend | Node.js, Express v5 |
| Database | PostgreSQL via **Supabase** |
| ORM | Prisma |
| Real-time | Socket.io v4 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| File Uploads | Multer (local disk) |
| UI Icons | Lucide React |
| QR Codes | qrcode.react |

---

## 📁 Project Structure

```
Solution challenge/
├── client/               # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx          # Domain selector (Hospital / Hotel)
│   │   │   ├── Login.jsx            # Staff login + first-time admin setup
│   │   │   ├── Dashboard.jsx        # Main staff shell + nav + emergency buzz
│   │   │   ├── MedicalDashboard.jsx # Live incident feed
│   │   │   ├── ReceptionDashboard.jsx # Check-in, QR generation, discharge
│   │   │   ├── AdminDashboard.jsx   # Staff management, config, audit logs
│   │   │   └── PatientPortal.jsx    # QR web portal for patients/guests
│   │   ├── context/
│   │   │   ├── ThemeContext.jsx     # Dark/light mode
│   │   │   └── DomainContext.jsx    # Hospital vs Hotel terminology
│   │   └── utils/
│   │       ├── api.js               # Central API base URL (VITE_API_URL)
│   │       └── alarm.js             # Audio alarm engine
│   └── .env                        # VITE_API_URL (not committed)
│
├── server/               # Node.js + Express backend
│   ├── src/
│   │   ├── index.js                 # Express app + Socket.io setup
│   │   └── routes/
│   │       ├── auth.js              # Login, admin setup, JWT middleware
│   │       ├── admin.js             # Staff CRUD, config, audit logs
│   │       ├── session.js           # Check-in, discharge, QR sessions
│   │       └── incident.js          # Submit, fetch, update incidents
│   ├── prisma/
│   │   └── schema.prisma            # DB schema (PostgreSQL)
│   ├── uploads/                    # Uploaded incident evidence (local)
│   └── .env                        # DATABASE_URL, JWT_SECRET (not committed)
│
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Clone & Install

```bash
git clone https://github.com/your-username/c.o.r.e.git
cd "Solution challenge"

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Configure Environment

**`server/.env`**
```env
PORT=5000
DATABASE_URL="postgresql://postgres.[ref]:[password]@...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@...pooler.supabase.com:5432/postgres"
JWT_SECRET="your-strong-secret-here"
CLIENT_URL="http://localhost:5173"
```

> Get your Supabase connection strings from:  
> **Supabase Dashboard → Project Settings → Database → Connection String**  
> Use **Transaction** mode (port `6543`) for `DATABASE_URL` and **Session** mode (port `5432`) for `DIRECT_URL`.

**`client/.env`**
```env
VITE_API_URL=http://localhost:5000
```

### 3. Push Database Schema

```bash
cd server
npx prisma db push
```

### 4. Run the App

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. First-Time Setup

1. Go to `/login` and select your domain (Hospital or Hotel).
2. Click **"First Time Setup?"** at the bottom.
3. Create your Administrator account.
4. Log in and start managing your system.

---

## ☁️ Production Deployment

### Backend → [Render](https://render.com)

1. Create a new **Web Service** pointing to your GitHub repo.
2. Set **Root Directory** to `Solution challenge/server`.
3. Set **Build Command**: `npm install && npx prisma generate`
4. Set **Start Command**: `node src/index.js`
5. Add environment variables:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `JWT_SECRET`
   - `CLIENT_URL` → your Vercel frontend URL

### Frontend → [Vercel](https://vercel.com)

1. Import your GitHub repo.
2. Set **Root Directory** to `Solution challenge/client`.
3. Add environment variable:
   - `VITE_API_URL` → your Render backend URL (e.g. `https://core-api.onrender.com`)
4. Deploy.

---

## 🔌 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/setup-admin` | None | First-time admin creation |
| `POST` | `/api/auth/login` | None | Staff login, returns JWT |
| `GET` | `/api/session/session/:id` | None | Validate QR session (portal) |
| `GET` | `/api/session/config` | None | Fetch geofence config (portal) |
| `POST` | `/api/session/checkin` | JWT (Receptionist+) | Create patient/guest session |
| `POST` | `/api/session/discharge/:id` | JWT (Receptionist+) | Deactivate session |
| `GET` | `/api/session/sessions` | JWT | List all sessions (domain-scoped) |
| `POST` | `/api/incident` | None | Submit incident from QR portal |
| `GET` | `/api/incident` | JWT | Fetch incidents (role + domain filtered) |
| `PUT` | `/api/incident/:id/status` | JWT | Update incident status |
| `GET` | `/api/admin/staff` | JWT (Admin) | List all staff |
| `POST` | `/api/admin/staff` | JWT (Admin) | Create staff account |
| `DELETE` | `/api/admin/staff/:id` | JWT (Admin) | Remove staff account |
| `GET` | `/api/admin/audit` | JWT (Admin) | View audit logs |
| `GET` | `/api/admin/config` | JWT (Admin) | Get geofence config |
| `PUT` | `/api/admin/config` | JWT (Admin) | Update geofence config |

### Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_room` | Client → Server | Join a domain/floor/role room |
| `new_incident` | Server → Client | New incident submitted |
| `incident_updated` | Server → Client | Incident status changed |
| `buzz_triggered` | Client → Server | Staff triggers emergency broadcast |
| `emergency_buzz` | Server → Client | Emergency alert to all devices |
| `session_discharged` | Server → Client | Notifies portal that QR is deactivated |

---

## 🗃️ Database Schema

```
User          — Staff accounts with role and domain
Session       — Patient/guest QR sessions
Incident      — Emergency reports linked to sessions
SystemConfig  — Geofence settings per domain
AuditLog      — Staff action history
```

---

## 🔒 Security Notes

- All staff routes are JWT-protected
- Roles are verified on every request (`requireRole` middleware)
- CORS is restricted to the configured `CLIENT_URL`
- `.env` files are excluded from version control
- Incident submissions from QR portals are validated against active sessions

---

## 📄 License

MIT — Built for the Solution Challenge 2026.
