import React, { useState, useRef } from 'react';
import QuickActions from './QuickActions';
import Modal from './Modal';

const ACCEPTED = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.bmp,.tiff';
const FILE_LABELS = { pdf: 'PDF', doc: 'Word', docx: 'Word', jpg: 'Image', jpeg: 'Image', png: 'Image', bmp: 'Image', tiff: 'Image' };
const STEPS = ['📄 Extracting text', '🔒 Redacting PII', '🤖 Summarising'];



export default function DocUploader({ 
  token, apiBase, onSummaryReady, 
  step, setStep, 
  result, setResult, 
  error, setError 
}) {
  const [dragOver, setDragOver] = useState(false);
  const [showPii, setShowPii] = useState(false);
  const [showEntitiesModal, setShowEntitiesModal] = useState(false);
  const fileRef = useRef();

  const reset = () => { setResult(null); setError(''); setStep(-1); setShowPii(false); };

  const processFile = async (file) => {
    if (!file) return;
    reset();

    const ext = file.name.split('.').pop().toLowerCase();
    if (!FILE_LABELS[ext]) {
      setError('Unsupported file type. Please upload PDF, DOC, DOCX, JPG, or PNG.');
      return;
    }

    // Step 0 — show extraction
    setStep(0);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Step 0 — brief pause so user sees the extraction step
      await delay(700);
      setStep(1); // Redacting PII — fetch starts here

      const res = await fetch(`${apiBase}/document/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      setStep(2); // AI summarising
      await delay(300);

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Upload failed. Please try again.');
        setStep(-1);
        return;
      }

      setResult({ ...data, filename: file.name });
      setStep(3);

      // Pass full result to Dashboard
      if (onSummaryReady) {
        onSummaryReady({ ...data, filename: file.name });
      }
    } catch {
      setError('Could not connect to the server. Is the backend running?');
      setStep(-1);
    }
  };

  // Drag & drop handlers
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const onFileChange = (e) => processFile(e.target.files[0]);

  const isProcessing = step >= 0 && step < 3;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Upload Zone */}
      {step === -1 && !result && (
        <div
          className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED}
            style={{ display: 'none' }}
            onChange={onFileChange}
            id="file-upload-input"
          />

          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📂</div>
          <p style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
            Drop your legal document here
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            or click anywhere to browse
          </p>

          {/* File format badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px' }}>
            {['PDF', 'DOC', 'DOCX', 'JPG', 'PNG'].map(fmt => (
              <span key={fmt} className="badge badge-gold">{fmt}</span>
            ))}
          </div>
        </div>
      )}

      {/* Processing Steps */}
      {isProcessing && (
        <div className="glass-card fade-up" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
            Processing your document…
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 280, margin: '0 auto' }}>
            {STEPS.map((label, i) => {
              const isDone = step > i;
              const isActive = step === i;
              return (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.6rem 0.875rem',
                  borderRadius: 'var(--radius-sm)',
                  background: isDone ? 'rgba(16,185,129,0.08)' : isActive ? 'var(--gold-dim)' : 'transparent',
                  border: `1px solid ${isDone ? 'rgba(16,185,129,0.2)' : isActive ? 'var(--gold-border)' : 'var(--border)'}`,
                  transition: 'all 0.3s',
                }}>
                  <span style={{ fontSize: '1rem' }}>
                    {isDone ? '✅' : isActive ? '⏳' : '⬜️'}
                  </span>
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 400,
                    color: isDone ? '#6EE7B7' : isActive ? 'var(--gold-light)' : 'var(--text-muted)',
                  }}>
                    {label}
                  </span>
                  {isActive && (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                      <span className="pulse-dot" />
                      <span className="pulse-dot" />
                      <span className="pulse-dot" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Privacy assurance */}
          <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            🔒 Sensitive information is being stripped before the AI sees your document
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="fade-up" style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          color: '#FCA5A5',
          fontSize: '0.875rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <span>⚠️ {error}</span>
          <button className="btn-ghost" onClick={reset} style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', flexShrink: 0 }}>
            Try Again
          </button>
        </div>
      )}

      {/* Result */}
      {result && step === 3 && (
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>✅</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                  {result.filename}
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {result.char_count?.toLocaleString()} characters extracted
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-ghost" onClick={() => window.print()} style={{ padding: '0.4rem 0.875rem', fontSize: '0.8125rem' }}>
                📥 Export PDF
              </button>
              <button className="btn-ghost" onClick={reset} style={{ padding: '0.4rem 0.875rem', fontSize: '0.8125rem' }}>
                Upload Another
              </button>
            </div>
          </div>

          {/* PII redaction stats */}
          {result.pii_found && (
            <div className="pii-strip fade-up">
              🔒 <strong>Privacy protected:</strong>{' '}
              {Object.entries(result.redaction_stats || {}).map(([k, v]) => (
                <span key={k} style={{ marginRight: '0.5rem' }}>
                  {v} {k.replace('_', ' ').toLowerCase()}{v > 1 ? 's' : ''}
                </span>
              ))}
              redacted before AI processing
            </div>
          )}

          {/* Summary card */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📋</span>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--gold-light)' }}>
                  Document Summary
                </h3>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                 {/* Visual Risk Indicator */}
                 {(() => {
                    const level = result?.risk_level?.toUpperCase() || 'LOW';
                    const colors = {
                      LOW: { bg: 'rgba(52, 211, 153, 0.1)', text: '#34D399', border: 'rgba(52, 211, 153, 0.3)' },
                      MEDIUM: { bg: 'rgba(251, 191, 36, 0.1)', text: '#FBBF24', border: 'rgba(251, 191, 36, 0.3)' },
                      HIGH: { bg: 'rgba(248, 113, 113, 0.1)', text: '#F87171', border: 'rgba(248, 113, 113, 0.3)' },
                      CRITICAL: { bg: 'rgba(220, 38, 38, 0.2)', text: '#FCA5A5', border: 'rgba(220, 38, 38, 0.5)' }
                    };
                    const style = colors[level] || colors.LOW;
                    return (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px',
                        fontSize: '0.7rem', fontWeight: 800, background: style.bg, color: style.text, border: `1px solid ${style.border}`
                      }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: style.text, boxShadow: `0 0 8px ${style.text}` }}></span>
                        RISK: {level}
                      </div>
                    );
                 })()}

                 {result.pii_found && (
                   <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                        className="btn-ghost" 
                        style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                        onClick={() => setShowEntitiesModal(true)}
                    >
                        🔬 View All Redactions
                    </button>
                    <button 
                        className="btn-ghost" 
                        style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                        onClick={() => setShowPii(!showPii)}
                    >
                        {showPii ? '🔒 Hide' : '👁️ Reveal'}
                    </button>
                   </div>
                 )}
                 <span className="badge badge-blue">Plain English</span>
              </div>
            </div>
            <hr className="divider" style={{ marginBottom: '1rem' }} />
            <div className="summary-content" style={{ whiteSpace: 'pre-wrap' }}>
              {showPii && result.token_map 
                ? Object.entries(result.token_map).reduce((t, [token, val]) => t.replaceAll(token, val), result.summary) 
                : result.summary}
            </div>
          </div>

          {/* New Attractive Feature: Quick Actions */}
          <QuickActions 
             token={token} 
             apiBase={apiBase} 
             redactedContext={result.redacted_text} 
             summaryText={result.summary}
             tokenMap={result.token_map}
             showPii={showPii}
          />


          {/* PII Entities Table Modal */}
          <Modal 
            isOpen={showEntitiesModal} 
            onClose={() => setShowEntitiesModal(false)}
            title="Privacy Guard: Redacted Entities"
          >
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              These items were removed from the document text before it was sent to the AI. 
              The server never saw these values.
            </p>
            <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>Label</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>Real Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.token_map || {}).map(([token, val], i) => (
                    <tr key={token} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '0.75rem', color: 'var(--gold-light)', fontWeight: 600 }}>{token}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button className="btn-gold" onClick={() => setShowEntitiesModal(false)}>Close</button>
            </div>
          </Modal>

        </div>
      )}
    </div>
  );
}

const delay = (ms) => new Promise(res => setTimeout(res, ms));
