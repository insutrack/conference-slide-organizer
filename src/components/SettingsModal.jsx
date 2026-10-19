import React, { useState } from 'react';
import {
  X,
  Key,
  RotateCcw,
  Check,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  Smartphone
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    await saveSetting('gemini_api_key', apiKey.trim());
    if (onSaveApiKey) {
      onSaveApiKey(apiKey.trim());
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    if (window.forceReloadSlideSnap) {
      await window.forceReloadSlideSnap();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container glass-modal" style={{ maxWidth: 540, maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 6, borderRadius: 8, background: 'rgba(139, 92, 246, 0.2)' }}>
              <Key size={18} color="var(--accent-purple)" />
            </div>
            <div>
              <h3 style={{ fontSize: 16 }}>App Settings & Version</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                SlideSnap v3.2.0 • Session Hub & End-of-Day Review
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

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* iPhone / PWA Home Screen Refresh Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.12) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              borderRadius: 12,
              padding: '14px 16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ padding: 6, borderRadius: 8, background: 'rgba(139, 92, 246, 0.3)', color: '#ffffff' }}>
                <Smartphone size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: 13.5, color: '#ffffff', fontWeight: 700 }}>
                  iPhone Home Screen Shortcut Update
                </h4>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.45 }}>
                  If your iPhone home screen icon is still showing an older cached version, tap below to wipe the offline cache and immediately load the latest release:
                </p>

                <div style={{ marginTop: 10 }}>
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: 12.5, padding: '7px 14px', width: '100%' }}
                    onClick={handleForceRefresh}
                    disabled={isRefreshing}
                  >
                    <RefreshCw size={13} className={isRefreshing ? 'spin' : ''} />
                    <span>{isRefreshing ? 'Clearing Cache & Updating...' : 'Force Update App (Clear iPhone Cache)'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

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
              <button type="submit" className="btn btn-secondary" style={{ fontSize: 13 }}>
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
            <strong>Offline Conference Mode:</strong> If no API key is supplied or conference hall Wi-Fi drops, SlideSnap automatically uses on-device OCR and local heuristic synthesis to organize and summarize slides.
          </div>

          {/* Clear All / Start 100% Blank */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
            <h4 style={{ fontSize: 13, color: '#ffffff', marginBottom: 6 }}>Wipe Database & Clean Slate</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Delete any previous sessions/slides and start with an entirely blank workspace
              </span>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '6px 12px', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                onClick={() => {
                  if (confirm('Clear all sessions and slides to start 100% blank?')) {
                    onResetSampleData();
                    onClose();
                  }
                }}
              >
                <RotateCcw size={13} /> Clear All to Blank
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
