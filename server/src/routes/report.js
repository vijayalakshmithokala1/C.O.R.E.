const express = require('express');
const PDFDocument = require('pdfkit');
const { authenticateToken, requireRole } = require('./auth');
const router = express.Router();
const prisma = require('../utils/prisma');

// Support token via query param for window.open (PDF download)
router.use((req, res, next) => {
  if (req.query.token && !req.headers['authorization']) {
    req.headers['authorization'] = `Bearer ${req.query.token}`;
  }
  next();
});
router.use(authenticateToken);
router.use(requireRole(['Administrator', 'Hotel Manager', 'Duty Manager', 'Admin']));

// ── GET /api/report/incident/:id — Generate PDF for a specific incident ──────
router.get('/incident/:id', async (req, res) => {
  try {
    const incident = await prisma.incident.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        session: { select: { sessionCode: true, name: true, language: true } },
        assignedTo: { select: { name: true, role: true } }
      }
    });

    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    if (incident.domain !== req.user.domain) return res.status(403).json({ error: 'Forbidden' });

    // Fetch related audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: { details: { contains: `Incident ID ${incident.id}` } },
      include: { user: { select: { name: true, role: true } } },
      orderBy: { timestamp: 'asc' }
    });

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="CORE-Incident-${incident.id}-Report.pdf"`);
    doc.pipe(res);

    // ── Header ──
    doc.rect(0, 0, doc.page.width, 80).fill('#0f172a');
    doc.fill('white').fontSize(22).font('Helvetica-Bold').text('C.O.R.E.', 50, 20);
    doc.fontSize(10).font('Helvetica').text('Crisis Operations & Response Ecosystem', 50, 46);
    doc.text(`${incident.domain} — Incident Report`, 50, 60);
    doc.moveDown(3).fill('#0f172a');

    // ── Title ──
    doc.fontSize(18).font('Helvetica-Bold').text(`Incident #${incident.id} — ${incident.type}`, { underline: false });
    doc.moveDown(0.4);

    // ── Severity badge line ──
    const sevColor = incident.severityScore >= 8 ? '#ef4444' : incident.severityScore >= 5 ? '#f59e0b' : '#22c55e';
    doc.fontSize(11).font('Helvetica').fillColor(sevColor)
      .text(`Severity: ${incident.severityScore}/10  |  Sentiment: ${incident.sentiment || 'N/A'}  |  Status: ${incident.status}`);
    doc.fillColor('#0f172a').moveDown(0.8);

    const line = () => doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e2e8f0').moveDown(0.5);
    const section = (title) => {
      doc.moveDown(0.5);
      doc.fontSize(13).font('Helvetica-Bold').text(title);
      doc.moveDown(0.3);
      line();
    };
    const field = (label, value) => {
      doc.fontSize(10).font('Helvetica-Bold').text(`${label}:`, { continued: true });
      doc.font('Helvetica').text(`  ${value || 'N/A'}`);
    };

    // ── Incident Details ──
    section('Incident Details');
    field('Type', incident.type);
    field('Domain', incident.domain);
    field('Location / Floor', incident.floor || 'Not specified');
    field('Reported At', new Date(incident.createdAt).toLocaleString());
    field('Last Updated', new Date(incident.updatedAt).toLocaleString());

    // ── Reporter ──
    section('Reporter');
    field('Session Code', incident.session?.sessionCode || 'System Auto-Generated');
    field('Guest / Patient Name', incident.session?.name || 'Anonymous');
    field('Language', incident.session?.language || 'en');

    // ── Responder ──
    section('Responding Staff');
    field('Assigned To', incident.assignedToName || 'Not yet assigned');

    // ── Description ──
    section('Incident Description');
    doc.fontSize(10).font('Helvetica').text(incident.description, { lineGap: 4 });
    doc.moveDown(0.5);

    // ── AI Triage ──
    if (incident.aiTriageInstructions) {
      section('AI Triage Instructions (for Distressed Individual)');
      doc.fontSize(10).font('Helvetica').text(incident.aiTriageInstructions, { lineGap: 4 });
    }
    if (incident.suggestedResponse) {
      section('AI Staff Protocol Recommendation');
      doc.fontSize(10).font('Helvetica').text(incident.suggestedResponse, { lineGap: 4 });
    }

    // ── Evidence ──
    if (incident.uploadedMediaUrl) {
      section('Attached Evidence');
      doc.fontSize(10).font('Helvetica').text(incident.uploadedMediaUrl);
    }

    // ── Feedback ──
    if (incident.feedbackRating) {
      section('Guest Feedback');
      field('Rating', `${incident.feedbackRating}/5 stars`);
      field('Comment', incident.feedbackComment || 'None');
    }

    // ── Audit Trail ──
    if (auditLogs.length > 0) {
      section('Audit Trail');
      auditLogs.forEach(log => {
        doc.fontSize(9).font('Helvetica')
          .text(`[${new Date(log.timestamp).toLocaleString()}]  ${log.action}`, { continued: true })
          .font('Helvetica-Bold').text(`  — ${log.user?.name || 'System'} (${log.user?.role || 'Auto'})`);
        if (log.details) {
          doc.font('Helvetica').fillColor('#64748b').fontSize(8).text(`   ${log.details}`).fillColor('#0f172a');
        }
      });
    }

    // ── Footer ──
    doc.moveDown(2);
    line();
    doc.fontSize(8).fillColor('#64748b')
      .text(`Report generated by C.O.R.E. on ${new Date().toLocaleString()} by ${req.user.username} (${req.user.role})`, { align: 'center' });
    doc.text('This document is confidential and intended for authorized personnel only.', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('[Report Error]', error);
    if (!res.headersSent) res.status(500).json({ error: 'Report generation failed' });
  }
});

module.exports = router;
