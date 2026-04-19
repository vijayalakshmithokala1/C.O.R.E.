// Central API base URL — reads from VITE_API_URL env variable
// In development: http://localhost:5000
// In production: set VITE_API_URL=https://your-render-backend.onrender.com in your Vercel env settings
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default API_BASE;
