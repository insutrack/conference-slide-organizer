import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  Laptop,
  Smartphone,
  Check,
  FileArchive,
  ArrowRight,
  Info
} from 'lucide-react';
import { exportConferenceBundle, importConferenceBundle } from '../services/storage';

export function DataTransferModal({
  conference,
  onImportComplete,
  onClose
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const bundle = await exportConferenceBundle(conference.id);
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = `${conference.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_backup.slideconf.json`;
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportStatus('reading');
      const text = await file.text();
      const parsed = JSON.parse(text);
      setImportStatus('importing');
      await importConferenceBundle(parsed);
      setImportStatus('success');
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err) {
      setImportStatus('error');
      alert('Import failed: ' + err.message);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container glass-modal" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 6, borderRadius: 8, background: 'rgba(16, 185, 129, 0.2)' }}>
              <Laptop size={18} color="var(--accent-emerald)" />
            </div>
            <div>
              <h3 style={{ fontSize: 16 }}>Phone ➔ Laptop Instant Sync</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Transfer all slides with their exact folders without misplaced files
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
          {/* Explanation Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              borderRadius: 12,
              padding: '14px 18px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Smartphone size={24} color="var(--accent-purple)" />
              <ArrowRight size={18} color="var(--text-muted)" />
              <Laptop size={24} color="var(--accent-cyan)" />
            </div>
            <div style={{ fontSize: 12.5, color: '#e2e8f0', flex: 1, marginLeft: 14 }}>
              <strong>Zero manual folder sorting:</strong> Export on phone, drop file on laptop, and every slide is pre-grouped into its topic!
            </div>
          </div>

          {/* Export Card */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <h4 style={{ fontSize: 14, color: '#ffffff' }}>1. Export Conference Package</h4>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Bundles all high-res photos, topic tags, titles, and summaries into a single file.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleExport}
                disabled={isExporting}
                style={{ fontSize: 13 }}
              >
                <Download size={15} /> {isExporting ? 'Packaging...' : 'Export Package'}
              </button>
            </div>
          </div>

          {/* Import Card */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <h4 style={{ fontSize: 14, color: '#ffffff' }}>2. Import Package on Laptop</h4>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Open this app on your laptop and restore the conference archive.
                </p>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                style={{ fontSize: 13 }}
              >
                <Upload size={15} /> Select Package
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json,.slideconf"
                style={{ display: 'none' }}
              />
            </div>
            {importStatus === 'success' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-emerald)', fontSize: 12, marginTop: 8 }}>
                <Check size={14} /> Import successful! Slides & folders restored.
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
