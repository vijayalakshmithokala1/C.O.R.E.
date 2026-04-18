# 🏛️ SmartLaw: Production-Grade Legal AI Platform

SmartLaw analyzes legal documents, detects risks, and generates actionable insights—while ensuring sensitive personal data is never exposed to AI models.

## 🌐 Live Deployment

| Service | Link | Platform |
|---------|------|----------|
| 🖥️ **Frontend (App)** | [smart-law-kappa.vercel.app](https://smart-law-kappa.vercel.app/) | Vercel |
| ⚙️ **Backend (API)** | [smartlaw-backend.onrender.com](https://smartlaw-backend.onrender.com/) | Render |

> **💡 Presentation Tip:** Bookmark both links or open them in browser tabs before your demo starts. The Render backend may take ~30 seconds to wake up on first load (free tier cold start) — open it a minute early!

---

SmartLaw is a secure, production-ready legal document management and analysis platform. It leverages state-of-the-art AI (Llama 3.3) to provide deep legal insights while ensuring strict privacy through an advanced PII redaction and cloud-storage pipeline.

---

## 🚀 Core Philosophy: Privacy-First AI
Legal documents contain highly sensitive identifiers (Aadhaar, PAN, etc.). SmartLaw is designed so that real identifiers never reach the AI models:
- **Anonymized Inference**: PII is redacted before being sent to AI services. Sensitive identifiers are replaced with anonymous tokens (e.g., `[PAN_1]`), ensuring AI models operate only on anonymized data.
- **Secure Processing**: Documents are temporarily processed in a secure backend environment for extraction and OCR.
- **Client-Side Restoration**: The mapping between anonymous tokens and real data remains strictly in the client's browser, allowing the UI to restore real values without the server or AI provider ever seeing them.

---

## 🏗️ System Architecture

```text
       [ User Browser ]
              ↓
    [ React Frontend — Vercel ]
    https://smart-law-kappa.vercel.app/
              ↓
    [ Flask API — Render / Docker / Gunicorn ]
    https://smartlaw-backend.onrender.com/
        ↙           ↓           ↘
[ PostgreSQL ] [ Cloudinary ] [ Groq API ]
 (Neon DB)     (File Storage)  (Llama 3.3)
```

---

## 🛠️ Technical Stack

### **Backend (Python / Flask / Docker)**
- **Framework**: Flask (Application Factory pattern).
- **Server**: Pro-grade `Gunicorn` WSGI server.
- **Database**: PostgreSQL (Production) with SQLite fallback (Development).
- **Storage**: **Cloudinary** for persistent, cloud-based file management.
- **OCR**: `Tesseract OCR` fully integrated via Docker system dependencies.
- **Containerization**: The backend is containerized using Docker to ensure consistent deployment with system-level dependencies.
- **AI**: **Groq API** (Llama 3.3 70B) for high-speed legal reasoning.

### **Frontend (React / Vite / Vercel)**
- **Framework**: React 19.
- **Styling**: Tailwind CSS 4.0 + Custom Glassmorphism.
- **Environment**: Dynamic API routing for Vercel deployment.

---

## ✨ Key Features & Capabilities

### 1. **Robust Document Processing**
- **Format Support**: PDF, DOCX, and Image-based documents (JPG/PNG).
- **Extraction**: Hybrid extraction using `pdfplumber` and `PyPDF2` fallback.
- **OCR Engine**: Tesseract-driven OCR for scanned legal papers.

### 2. **Professional Legal AI Suite**
- **Risk Auditor**: Specialized AI persona that identifies harmful clauses and cites exact page numbers.
- **Summarizer**: Explains complex legal jargon in "chai-side" plain English.
- **Action Items**: Concrete, actionable To-Do checklists extracted from agreements.
- **Legal Chat**: Context-aware Q&A based on the uploaded document context.

---

## 📂 Project Structure

```text
SmartLaw/
├── backend/
│   ├── app.py              # Application Factory (Postgres + CORS logic)
│   ├── Dockerfile          # Production Build (Tesseract + Gunicorn)
│   ├── requirements.txt    # Production dependencies
│   ├── routes/
│   │   ├── auth_routes.py  # JWT-based Auth
│   │   └── document_routes.py # Cloud-based analysis logic
│   └── services/
│       ├── storage_service.py # Cloudinary & Temp Local Buffering
│       ├── pii_service.py     # Regex-based PII Redaction
│       ├── ai_service.py      # LLM Prompts & Integration
│       └── extraction_service.py # PDF & OCR Logic
├── frontend/
│   ├── src/
│   │   └── App.jsx         # Dynamic API Routing
│   └── vite.config.js
└── smartlaw.db             # Local dev database (Fallback)
```

---

## 🛡️ Security & Scalability
- **Database Fixes**: Native support for Render's `postgres://` to `postgresql://` URI mapping.
- **Safe Cleaning**: All temporary OCR buffers are deleted immediately after extraction using a robust cleanup service.
- **Size Guards**: 10MB upload limits and 10s fetch timeouts to ensure stability.

---

## 🧪 Deployment & Configuration

### **Environment Variables**
To deploy successfully, ensure the following variables are set:
- `DATABASE_URL`: PostgreSQL connection string.
- `GROQ_API_KEY`: Your Groq AI API key.
- `CLOUDINARY_CLOUD_NAME`: Cloudinary account name.
- `CLOUDINARY_API_KEY`: Cloudinary API key.
- `CLOUDINARY_API_SECRET`: Cloudinary API secret.
- `JWT_SECRET`: Secure string for token signing.
- `CORS_ORIGINS`: Allowed frontend URL (e.g., `https://smartlaw.vercel.app`).

### **Platform Strategy**
- **Backend**: Deploy `backend/` as a Docker web service on Render.
- **Frontend**: Deploy `frontend/` to Vercel (set `VITE_API_BASE_URL` to the Render service URL).

---

## ⚠️ Known Limitations
- OCR performance depends on server resources and may be slower on free-tier deployments.
- Large documents (>10MB) are restricted to ensure system stability.
- "Cold starts" on Render free tier may introduce initial request latency.

---

## 🚧 Future Enhancements
- **Async Processing**: Background job queue (Celery/RQ) for long-running OCR and AI tasks.
- **Access Control**: Role-based Access Control (RBAC) for legal teams.
- **Encryption**: End-to-end encryption for stored documents.
- **Custom LLM**: Fine-tuned legal models for specialized jurisdiction reasoning.
