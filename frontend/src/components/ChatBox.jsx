import React, { useState, useRef, useEffect } from 'react';

const SUGGESTIONS = [
  'What are my rights if an FIR is filed against me?',
  'Explain Section 144 in simple words.',
  'What is the difference between bail and anticipatory bail?',
  'What should I do if my landlord is illegally evicting me?',
  'How do I file a consumer complaint in India?',
];

export default function ChatBox({ token, apiBase, redactedContext, recentDocs = [], onSelectContext }) {
  const [messages, setMessages] = useState([]);
  const [showDocs, setShowDocs] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef();

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const query = (text || input).trim();
    if (!query || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/document/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query,
          redacted_context: redactedContext || '',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages(prev => [...prev, {
          role: 'ai',
          content: `⚠️ ${data.error || 'Something went wrong. Please try again.'}`,
          isError: true,
        }]);
        return;
      }

      setMessages(prev => [...prev, { role: 'ai', content: data.answer }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: '⚠️ Cannot reach the server. Please ensure the backend is running.',
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? prev + ' ' + transcript : transcript);
    };

    recognition.start();
  };

  const speakText = (text) => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel(); // Stop any current speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    synth.speak(utterance);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isEmpty = messages.length === 0;

  const clearChat = () => setMessages([]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 480,
      position: 'relative',
    }}>

      {/* Header with tools */}
      <div style={{
        padding: '0.75rem 1rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.9rem' }}>💬</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>AI Chat Sessions</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!isEmpty && (
            <button className="btn-ghost danger" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={clearChat}>
              Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Message Thread */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>

        {/* Empty state */}
        {isEmpty && (
          <div style={{ textAlign: 'center', paddingTop: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚖️</div>
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Ask me anything about Indian law
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.75rem' }}>
              I explain legal concepts in simple, everyday language.
            </p>

            {/* Suggestion chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 480, margin: '0 auto', textAlign: 'left' }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  className="btn-ghost"
                  onClick={() => sendMessage(s)}
                  style={{
                    padding: '0.6rem 0.875rem',
                    fontSize: '0.8125rem',
                    textAlign: 'left',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  💬 {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className="fade-up"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            {/* Role label */}
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: msg.role === 'user' ? 'var(--gold)' : '#93C5FD',
              marginBottom: '4px',
              paddingLeft: '4px',
              paddingRight: '4px',
            }}>
              {msg.role === 'user' ? 'You' : '⚖️ SmartLaw AI'}
            </span>

            <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}
              style={msg.isError ? { borderColor: 'rgba(239,68,68,0.3)', color: '#FCA5A5' } : {}}>
              {msg.content}
              {msg.role === 'ai' && !msg.isError && (
                <button 
                  onClick={() => speakText(msg.content)}
                  style={{ 
                    display: 'block', 
                    marginTop: '8px', 
                    background: 'rgba(255,255,255,0.05)', 
                    border: 'none', 
                    borderRadius: '4px',
                    color: 'var(--text-muted)',
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    cursor: 'pointer'
                  }}
                >
                  🔊 Read Aloud
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#93C5FD', marginBottom: '4px', paddingLeft: '4px' }}>
              ⚖️ SmartLaw AI
            </span>
            <div className="chat-bubble-ai">
              <div className="typing-indicator">
                <span className="pulse-dot" />
                <span className="pulse-dot" />
                <span className="pulse-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '1rem',
        background: 'var(--bg-surface)',
      }}>
        {recentDocs.length > 0 && (
          <div style={{ marginBottom: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Context</span>
              <button 
                className="btn-ghost" 
                style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                onClick={() => setShowDocs(!showDocs)}
              >
                {showDocs ? 'Hide Selector' : 'Change Document'}
              </button>
            </div>
            {redactedContext ? (
               <div style={{ fontSize: '0.85rem', color: 'var(--gold-light)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                 <span>📄</span> {recentDocs.find(d => d.result?.redacted_text === redactedContext)?.name || 'Current Document'}
               </div>
            ) : (
               <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No document selected (General Legal Chat)</div>
            )}

            {showDocs && (
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button 
                  className={`dropdown-item ${!redactedContext ? 'active' : ''}`}
                  onClick={() => { onSelectContext(''); setShowDocs(false); }}
                  style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                >
                  No Context (General)
                </button>
                {recentDocs.map(doc => (
                  <button 
                    key={doc.id}
                    className={`dropdown-item ${redactedContext === doc.result?.redacted_text ? 'active' : ''}`}
                    onClick={() => { onSelectContext(doc.result.redacted_text); setShowDocs(false); }}
                    style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                  >
                    📄 {doc.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <textarea
            id="chat-input"
            className="form-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask any legal question… (Enter to send)"
            rows={1}
            style={{
              resize: 'none',
              lineHeight: 1.5,
              flex: 1,
              maxHeight: '120px',
              overflow: 'auto',
            }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            id="voice-btn"
            className={`btn-ghost ${isListening ? 'active' : ''}`}
            onClick={startListening}
            style={{ padding: '0.7rem 1rem', fontSize: '1rem', flexShrink: 0, color: isListening ? 'var(--danger)' : 'var(--gold)' }}
          >
            {isListening ? '🛑' : '🎙️'}
          </button>
          <button
            id="send-btn"
            className="btn-gold"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{ padding: '0.7rem 1.25rem', fontSize: '0.875rem', flexShrink: 0 }}
          >
            {loading ? '…' : 'Send →'}
          </button>
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          ⚖️ Always consult a licensed advocate for serious legal matters.
        </p>
      </div>

    </div>
  );
}
