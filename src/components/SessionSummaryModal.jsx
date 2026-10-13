import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Download,
  Check,
  Loader2,
  FileText
} from 'lucide-react';
import { summarizeSession } from '../services/gemini';

export function SessionSummaryModal({
  activeTopic,
  slides,
  geminiApiKey,
  onSaveTopicSummary,
  onClose
}) {
  const [summary, setSummary] = useState(activeTopic?.summary || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generated = await summarizeSession({
        apiKey: geminiApiKey,
        topicName: activeTopic?.name,
        speaker: activeTopic?.speaker,
        slides
      });

      setSummary(generated);
      if (onSaveTopicSummary) {
        onSaveTopicSummary(activeTopic.id, generated);
      }
    } catch (err) {
      alert('Session summary generation error: ' + (err.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const filename = `${(activeTopic?.name || 'session')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')}_summary.md`;

    const blob = new Blob([summary], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container glass-modal" style={{ maxWidth: 680, maxHeight: '90vh' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 6, borderRadius: 8, background: 'rgba(6, 182, 212, 0.2)' }}>
              <FileText size={18} color="var(--accent-cyan)" />
            </div>
            <div>
              <h3 style={{ fontSize: 16 }}>Executive Session Brief & Summary</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {activeTopic?.name} • {slides.length} slides synthesized
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
          {/* Header Action Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              AI Synthesizer extracts core themes across all slides in this session.
            </span>
            <button
              className="btn btn-primary"
              style={{ fontSize: 13 }}
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={14} className="spin" /> Synthesizing Session...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> {summary ? 'Regenerate Brief' : 'Generate Full Session Brief'}
                </>
              )}
            </button>
          </div>

          {/* Rendered Summary Box */}
          <div
            style={{
              minHeight: 240,
              maxHeight: 400,
              overflowY: 'auto',
              background: 'rgba(10, 14, 25, 0.7)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: 16,
              fontSize: 13.5,
              lineHeight: 1.65,
              color: '#e2e8f0',
              whiteSpace: 'pre-wrap'
            }}
          >
            {summary ? (
              summary
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <Sparkles size={32} color="var(--accent-purple)" style={{ marginBottom: 10, opacity: 0.6 }} />
                <p>Click "Generate Full Session Brief" to automatically create an executive conference report from all your captured slides.</p>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          {summary && (
            <>
              <button className="btn btn-ghost" onClick={handleCopy}>
                {copied ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button className="btn btn-secondary" onClick={handleDownloadMarkdown}>
                <Download size={14} /> Download (.md)
              </button>
            </>
          )}
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
