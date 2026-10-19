import React, { useState } from 'react';
import {
  X,
  FileText,
  FileSpreadsheet,
  Download,
  Share2,
  Printer,
  Check,
  Sparkles,
  ArrowRight,
  FolderArchive,
  Loader2
} from 'lucide-react';
import {
  exportToPdf,
  exportToPptx,
  exportToNotesMarkdown,
  exportToNotesHtml,
  exportToZipBundle
} from '../services/exportService';
import confetti from 'canvas-confetti';

export function SessionCompileModal({
  sessionTopic,
  conference,
  slides = [],
  onClose,
  onStartNewSession,
  onGoToReview
}) {
  const [activeExporting, setActiveExporting] = useState(null); // 'pdf' | 'pptx' | 'notes-md' | 'notes-html' | 'zip' | null
  const [copied, setCopied] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const sessionName = sessionTopic?.name || 'Conference Session';
  const speaker = sessionTopic?.speaker || '';
  const conferenceName = conference?.name || 'Conference 2026';

  const triggerExport = async (type, fn) => {
    setActiveExporting(type);
    setSuccessMessage('');
    try {
      await fn();
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.7 } });
      setSuccessMessage(`Success! File generated & downloaded.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      alert('Export issue: ' + (err.message || 'Could not compile file'));
    } finally {
      setActiveExporting(null);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: sessionName,
          text: `Check out the ${slides.length} slides captured from "${sessionName}" at ${conferenceName}.`,
          url: window.location.href
        });
      } catch (_err) {
        // user cancelled share
      }
    } else {
      navigator.clipboard.writeText(
        `Session: ${sessionName}\nConference: ${conferenceName}\nSlides: ${slides.length} slides captured with SlideSnap.`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    exportToNotesHtml({
      conferenceTitle: conferenceName,
      sessionTitle: sessionName,
      speaker,
      slides
    });
  };

  return (
    <div className="modal-backdrop">
      <div
        className="modal-container glass-modal"
        style={{
          maxWidth: 680,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden'
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)'
              }}
            >
              <Check size={24} color="#ffffff" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    textTransform: 'uppercase',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    color: 'var(--accent-emerald)',
                    background: 'rgba(16, 185, 129, 0.12)',
                    padding: '2px 8px',
                    borderRadius: 20
                  }}
                >
                  Session Compiled
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {slides.length} slides organized
                </span>
              </div>
              <h2 style={{ fontSize: 18, marginTop: 2, color: '#ffffff' }}>
                {sessionName}
              </h2>
            </div>
          </div>

          <button
            className="btn btn-ghost btn-pill"
            style={{ width: 34, height: 34, padding: 0 }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Filmstrip preview of compiled slides */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Captured Slides in this session ({slides.length})
              </span>
              <span style={{ fontSize: 11, color: 'var(--accent-cyan)' }}>
                Auto-saved in high resolution
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
                overflowX: 'auto',
                paddingBottom: 8,
                scrollSnapType: 'x mandatory'
              }}
            >
              {slides.map((s, idx) => (
                <div
                  key={s.id || idx}
                  style={{
                    flex: '0 0 110px',
                    height: 70,
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: '#070a13',
                    border: '1px solid var(--border-subtle)',
                    position: 'relative'
                  }}
                >
                  {s.imageData ? (
                    <img
                      src={s.imageData}
                      alt={`Slide ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 10 }}>
                      No Image
                    </div>
                  )}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      right: 4,
                      background: 'rgba(0,0,0,0.75)',
                      padding: '1px 5px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700
                    }}
                  >
                    #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Success Notification Banner */}
          {successMessage && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: 10,
                padding: '10px 14px',
                color: '#34d399',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16
              }}
            >
              <Check size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Conversion Options Cards */}
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase' }}>
              Convert & Download Options
            </h4>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 12
              }}
            >
              {/* Option 1: PDF Presentation */}
              <div
                className="glass-panel"
                style={{
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                  transition: 'transform 0.2s, border-color 0.2s',
                  cursor: 'pointer'
                }}
                onClick={() =>
                  triggerExport('pdf', () =>
                    exportToPdf({
                      conferenceTitle: conferenceName,
                      sessionTitle: sessionName,
                      speaker,
                      slides,
                      includeNotes: true
                    })
                  )
                }
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171'
                    }}
                  >
                    <FileText size={22} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14, color: '#ffffff' }}>Convert to PDF Deck</h4>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      16:9 widescreen presentation document with title page, slide numbers & notes.
                    </p>
                  </div>
                </div>

                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: 12, padding: '7px 12px' }}
                  disabled={activeExporting === 'pdf'}
                >
                  {activeExporting === 'pdf' ? (
                    <>
                      <Loader2 size={13} className="spin" /> Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download size={13} color="var(--accent-purple)" /> Download PDF (.pdf)
                    </>
                  )}
                </button>
              </div>

              {/* Option 2: PowerPoint PPTX */}
              <div
                className="glass-panel"
                style={{
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                  cursor: 'pointer'
                }}
                onClick={() =>
                  triggerExport('pptx', () =>
                    exportToPptx({
                      conferenceTitle: conferenceName,
                      sessionTitle: sessionName,
                      speaker,
                      slides
                    })
                  )
                }
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      background: 'rgba(249, 115, 22, 0.15)',
                      color: '#fb923c'
                    }}
                  >
                    <FileSpreadsheet size={22} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14, color: '#ffffff' }}>Convert to PowerPoint</h4>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      Real Microsoft PowerPoint (.pptx) file with 1 slide per captured picture.
                    </p>
                  </div>
                </div>

                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: 12, padding: '7px 12px' }}
                  disabled={activeExporting === 'pptx'}
                >
                  {activeExporting === 'pptx' ? (
                    <>
                      <Loader2 size={13} className="spin" /> Generating Slides...
                    </>
                  ) : (
                    <>
                      <Download size={13} color="var(--accent-amber)" /> Download PPTX (.pptx)
                    </>
                  )}
                </button>
              </div>

              {/* Option 3: Convert to Notes */}
              <div
                className="glass-panel"
                style={{
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      background: 'rgba(6, 182, 212, 0.15)',
                      color: '#22d3ee'
                    }}
                  >
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14, color: '#ffffff' }}>Convert to Notes</h4>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      Study and meeting notes with slide figures, timestamps, and annotations.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: 12, padding: '7px 10px' }}
                    onClick={() =>
                      triggerExport('notes-md', () =>
                        exportToNotesMarkdown({
                          conferenceTitle: conferenceName,
                          sessionTitle: sessionName,
                          speaker,
                          slides
                        })
                      )
                    }
                  >
                    <Download size={12} /> Markdown (.md)
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: 12, padding: '7px 10px' }}
                    onClick={() =>
                      triggerExport('notes-html', () =>
                        exportToNotesHtml({
                          conferenceTitle: conferenceName,
                          sessionTitle: sessionName,
                          speaker,
                          slides
                        })
                      )
                    }
                  >
                    <Download size={12} /> Printable (.html)
                  </button>
                </div>
              </div>

              {/* Option 4: Combine File (ZIP Archive) */}
              <div
                className="glass-panel"
                style={{
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                  cursor: 'pointer'
                }}
                onClick={() =>
                  triggerExport('zip', () =>
                    exportToZipBundle({
                      conferenceTitle: conferenceName,
                      sessionTitle: sessionName,
                      speaker,
                      slides
                    })
                  )
                }
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      background: 'rgba(139, 92, 246, 0.15)',
                      color: '#a78bfa'
                    }}
                  >
                    <FolderArchive size={22} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14, color: '#ffffff' }}>Combine File (ZIP)</h4>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      One archive containing all full-res photos, text notes, and JSON bundle.
                    </p>
                  </div>
                </div>

                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: 12, padding: '7px 12px' }}
                  disabled={activeExporting === 'zip'}
                >
                  {activeExporting === 'zip' ? (
                    <>
                      <Loader2 size={13} className="spin" /> Compiling ZIP...
                    </>
                  ) : (
                    <>
                      <Download size={13} color="var(--accent-cyan)" /> Download Combined (.zip)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Action Strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Quick Actions:
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: '5px 10px' }}
                onClick={handleShare}
              >
                {copied ? <Check size={13} color="var(--accent-emerald)" /> : <Share2 size={13} />}
                <span>{copied ? 'Copied Link' : 'Share'}</span>
              </button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: '5px 10px' }}
                onClick={handlePrint}
              >
                <Printer size={13} />
                <span>Print Notes</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer with Forward Steps */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(10, 13, 22, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <button
            className="btn btn-secondary"
            onClick={() => {
              onClose();
              if (onStartNewSession) onStartNewSession();
            }}
          >
            <span>+ Start Next Session</span>
          </button>

          <button
            className="btn btn-primary"
            style={{ padding: '9px 20px' }}
            onClick={() => {
              onClose();
              if (onGoToReview) onGoToReview();
            }}
          >
            <span>Go to End-of-Day Review</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
