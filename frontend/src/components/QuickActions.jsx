import React, { useState, useRef } from 'react';
import Modal from './Modal';
import Dropdown from './Dropdown';

export default function QuickActions({ token, apiBase, redactedContext, summaryText, tokenMap, showPii }) {
  const [loadingAction, setLoadingAction] = useState(null);
  const [actionResults, setActionResults] = useState([]); // Now an array to keep multiple results
  const [error, setError] = useState(null);
  
  const [selectedLang, setSelectedLang] = useState('Hindi');
  const [draftIntent, setDraftIntent] = useState('');
  const [whatIfScenario, setWhatIfScenario] = useState('');

  const handleAction = async (actionPath, payload, typeName) => {
    setLoadingAction(actionPath);
    setError(null);
    
    try {
      const res = await fetch(`${apiBase}/document/${actionPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      
      // Append the new result to the top of the list
      setActionResults(prev => [{
        id: Date.now(),
        type: typeName,
        text: data.result
      }, ...prev]);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const removeResult = (id) => {
    setActionResults(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* The AI Tools Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>✨ AI Smart Tools</h3>
        
        <Dropdown align="right" trigger={
          <button className="btn-gold" style={{ padding: '0.6rem 1.25rem' }}>
            {loadingAction ? 'Processing...' : '🔧 Tools ▼'}
          </button>
        }>
          <div style={{ padding: '0.5rem', width: '280px' }}>
            
            {/* Risk Analyzer */}
            <button className="dropdown-item" disabled={loadingAction} onClick={() => handleAction('analyze-risk', { redacted_context: redactedContext }, '⚖️ Legal Risk Analysis')}>
              ⚖️ Risk Analyzer (with Pages)
            </button>

            {/* Deadline Extractor */}
            <button className="dropdown-item" disabled={loadingAction} onClick={() => handleAction('extract-deadlines', { redacted_context: redactedContext }, '📅 Obligations & Deadlines')}>
              📅 Obligation Tracker
            </button>

            {/* Negotiation Assistant */}
            <button className="dropdown-item" style={{ borderBottom: '1px solid var(--border)' }} disabled={loadingAction} onClick={() => handleAction('negotiate', { redacted_context: redactedContext }, '🤝 Negotiation Strategy')}>
              🤝 Negotiation Assistant
            </button>


            {/* Translate */}
            <div className="dropdown-keep-open" style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
              <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>🌐 Translate</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select className="form-input" style={{ padding: '0.3rem', width: '100px' }} value={selectedLang} onChange={e => setSelectedLang(e.target.value)}>
                  <option>Hindi</option><option>Telugu</option><option>Tamil</option><option>Marathi</option>
                </select>
                <button className="btn-ghost" disabled={loadingAction} onClick={() => handleAction('translate', { text: summaryText, language: selectedLang }, `Translated to ${selectedLang}`)}>Go</button>
              </div>
            </div>

            {/* Lawyer */}
            <button className="dropdown-item" disabled={loadingAction} onClick={() => handleAction('lawyer-advice', { redacted_context: redactedContext }, '⚖️ Lawyer Advice')}>
              ⚖️ Find Lawyer Advice
            </button>

            {/* Action Items */}
            <button className="dropdown-item" style={{ borderTop: '1px solid var(--border)' }} disabled={loadingAction} onClick={() => handleAction('action-items', { redacted_context: redactedContext }, '📋 Action Items (To-Do List)')}>
              📋 Generate To-Do List
            </button>

            {/* Draft */}
            <div className="dropdown-keep-open" style={{ padding: '0.5rem', borderTop: '1px solid var(--border)', marginTop: '0.5rem' }}>
              <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>📝 Draft Letter</p>
              <input 
                  type="text" className="form-input" placeholder="Intent (e.g. Reject offer)"
                  style={{ width: '100%', marginBottom: '0.5rem', padding: '0.4rem' }}
                  value={draftIntent} onChange={e => setDraftIntent(e.target.value)}
              />
              <button 
                  className="btn-ghost" style={{ width: '100%', padding: '0.4rem' }}
                  disabled={!draftIntent || loadingAction} 
                  onClick={() => handleAction('draft-letter', { redacted_context: redactedContext, intent: draftIntent }, '📝 Draft Letter')}
              >
                 Draft It
              </button>
            </div>

            {/* What-If Simulator */}
            <div className="dropdown-keep-open" style={{ padding: '0.5rem', borderTop: '1px solid var(--border)', marginTop: '0.5rem' }}>
              <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>🧪 What-if Simulator</p>
              <input 
                  type="text" className="form-input" placeholder="e.g. Payment is delayed by 30 days"
                  style={{ width: '100%', marginBottom: '0.5rem', padding: '0.4rem' }}
                  value={whatIfScenario} onChange={e => setWhatIfScenario(e.target.value)}
              />
              <button 
                  className="btn-ghost" style={{ width: '100%', padding: '0.4rem' }}
                  disabled={!whatIfScenario || loadingAction} 
                  onClick={() => handleAction('what-if', { redacted_context: redactedContext, scenario: whatIfScenario }, `🧪 Scenario: ${whatIfScenario}`)}
              >
                 Simulate Consequence
              </button>
            </div>

          </div>
        </Dropdown>
      </div>

      {error && <div style={{ color: 'var(--danger)', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-sm)' }}>{error}</div>}

      {/* Render All Persistent Results */}
      {actionResults.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {actionResults.map(res => (
            <div key={res.id} className="glass-card fade-up" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, color: 'var(--gold-light)' }}>{res.type}</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => navigator.clipboard.writeText(res.text)}>Copy</button>
                  <button className="btn-ghost danger" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => removeResult(res.id)}>✕</button>
                </div>
              </div>
              <div className="summary-content" style={{ whiteSpace: 'pre-wrap' }}>
                 {showPii && tokenMap 
                   ? Object.entries(tokenMap).reduce((t, [token, val]) => t.replaceAll(token, val), res.text)
                   : res.text}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
