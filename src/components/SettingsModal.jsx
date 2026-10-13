import React, { useState } from 'react';
import {
  X,
  Key,
  Volume2,
  Trash2,
  RotateCcw,
  Check,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { saveSetting } from '../services/storage';

export function SettingsModal({
  geminiApiKey,
  onSaveApiKey,
  onResetSampleData,
  onClose
}) {
  const [apiKey, setApiKey] = useState(geminiApiKey || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    await saveSetting('gemini_api_key', apiKey.trim());
    if (onSaveApiKey) {
      onSaveApiKey(apiKey.trim());
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container glass-modal" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 6, borderRadius: 8, background: 'rgba(139, 92, 246, 0.2)' }}>
              <Key size={18} color="var(--accent-purple)" />
            </div>
            <div>
              <h3 style={{ fontSize: 16 }}>App Settings & AI Configuration</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Customize AI intelligence and slide tools
              </p>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-pill"
            style={{ width: 32, height: 32, padding: 0 }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Gemini API Key Form */}
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                Google Gemini API Key (Optional)
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 11, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
              >
                Get free key <ExternalLink size={11} />
              </a>
            </div>

            <input
              type="password"
              className="input-field"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--text-muted)' }}>
              <ShieldCheck size={14} color="var(--accent-emerald)" />
              Stored locally on your device. Never transmitted to third-party servers.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="submit" className="btn btn-primary" style={{ fontSize: 13 }}>
                {savedSuccess ? <Check size={14} /> : null}
                {savedSuccess ? 'Saved' : 'Save Key'}
              </button>
            </div>
          </form>

          {/* Offline Mode Note */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 10,
              padding: 12,
              border: '1px solid var(--border-subtle)',
              fontSize: 12,
              color: 'var(--text-secondary)'
            }}
          >
            <strong>Offline Conference Mode:</strong> If no API key is supplied or if conference hall Wi-Fi drops, SlideSnap automatically uses on-device OCR and local heuristic synthesis to organize and summarize slides.
          </div>

          {/* Reset / Sample Data */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
            <h4 style={{ fontSize: 13, color: '#ffffff', marginBottom: 6 }}>Demo Data & Sample Slides</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Reload sample AI Summit slides and topics
              </span>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '6px 12px' }}
                onClick={() => {
                  if (confirm('Reload sample conference data?')) {
                    onResetSampleData();
                    onClose();
                  }
                }}
              >
                <RotateCcw size={13} /> Reset Demo Data
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
