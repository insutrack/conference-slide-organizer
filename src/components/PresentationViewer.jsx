import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileDown,
  MessageSquare,
  Sparkles,
  Play,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { exportSlideDeckToPdf } from '../services/pdfExport';

export function PresentationViewer({
  conference,
  activeTopic,
  slides,
  onClose
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNotesDrawer, setShowNotesDrawer] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const currentSlide = slides[currentIndex] || slides[0];

  // Keyboard navigation (Left / Right / Esc)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        e.preventDefault();
        setCurrentIndex((prev) => (prev < slides.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, onClose]);

  // PDF Export
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await exportSlideDeckToPdf({
        conferenceTitle: conference?.name,
        topicTitle: activeTopic ? activeTopic.name : 'All Sessions',
        speaker: activeTopic?.speaker,
        slides,
        includeNotes: true
      });

      // Reward celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      alert('PDF export failed: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (!currentSlide) {
    return (
      <div className="presentation-fullscreen" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p>No slides in this presentation yet.</p>
        <button className="btn btn-secondary" onClick={onClose} style={{ marginTop: 12 }}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="presentation-fullscreen">
      {/* Top Floating Control Bar */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 20,
          right: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 50,
          pointerEvents: 'none'
        }}
      >
        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              background: 'rgba(10, 15, 28, 0.85)',
              backdropFilter: 'blur(12px)',
              padding: '6px 14px',
              borderRadius: 30,
              border: '1px solid var(--border-subtle)',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: activeTopic?.color || 'var(--accent-purple)'
              }}
            />
            <span>{activeTopic?.name || conference?.name}</span>
          </div>

          <span
            style={{
              background: 'rgba(0, 0, 0, 0.6)',
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 12,
              color: 'var(--text-secondary)'
            }}
          >
            Slide {currentIndex + 1} of {slides.length}
          </span>
        </div>

        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn btn-primary"
            style={{ fontSize: 13, padding: '7px 14px' }}
            onClick={handleExportPdf}
            disabled={isExporting}
          >
            <FileDown size={15} /> {isExporting ? 'Generating PDF...' : 'Download PDF Deck'}
          </button>

          <button
            className="btn btn-ghost btn-pill"
            style={{ width: 38, height: 38, padding: 0, background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setShowNotesDrawer(!showNotesDrawer)}
            title="Toggle presenter notes drawer"
          >
            <MessageSquare size={16} color={showNotesDrawer ? 'var(--accent-cyan)' : '#ffffff'} />
          </button>

          <button
            className="btn btn-ghost btn-pill"
            style={{ width: 38, height: 38, padding: 0, background: 'rgba(0,0,0,0.6)' }}
            onClick={onClose}
            title="Exit presentation (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Presentation Stage */}
      <div className="presentation-stage">
        {/* Previous Button */}
        <button
          className="btn btn-ghost btn-pill"
          style={{
            position: 'absolute',
            left: 18,
            width: 48,
            height: 48,
            padding: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 40,
            opacity: currentIndex > 0 ? 1 : 0.2,
            pointerEvents: currentIndex > 0 ? 'auto' : 'none'
          }}
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
        >
          <ChevronLeft size={24} />
        </button>

        {/* Slide Projected Image */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '85%', maxHeight: '85vh' }}>
          <img
            src={currentSlide.imageData}
            alt={currentSlide.title}
            className="presentation-slide-image"
          />
          <h2 style={{ fontSize: 18, marginTop: 12, textAlign: 'center', color: '#e2e8f0', fontWeight: 600 }}>
            {currentSlide.title}
          </h2>
        </div>

        {/* Next Button */}
        <button
          className="btn btn-ghost btn-pill"
          style={{
            position: 'absolute',
            right: 18,
            width: 48,
            height: 48,
            padding: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 40,
            opacity: currentIndex < slides.length - 1 ? 1 : 0.2,
            pointerEvents: currentIndex < slides.length - 1 ? 'auto' : 'none'
          }}
          onClick={() => setCurrentIndex((prev) => Math.min(slides.length - 1, prev + 1))}
        >
          <ChevronRight size={24} />
        </button>

        {/* Presenter Notes & Takeaways Sidebar Drawer */}
        {showNotesDrawer && (
          <div
            className="glass-modal"
            style={{
              position: 'absolute',
              right: 24,
              bottom: 84,
              width: 320,
              maxHeight: '62vh',
              padding: 16,
              overflowY: 'auto',
              zIndex: 45,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              borderRadius: 14,
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--accent-purple)' }}>
                <Sparkles size={14} />
                Slide Notes & Takeaways
              </div>
              <button
                className="btn btn-ghost btn-pill"
                style={{ width: 24, height: 24, padding: 0 }}
                onClick={() => setShowNotesDrawer(false)}
              >
                <X size={13} />
              </button>
            </div>

            {currentSlide.notes && (
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Speaker Note
                </span>
                <p style={{ fontSize: 13, color: '#f1f5f9', marginTop: 4, fontStyle: 'italic', background: 'rgba(255,255,255,0.04)', padding: 8, borderRadius: 6 }}>
                  "{currentSlide.notes}"
                </p>
              </div>
            )}

            {currentSlide.aiSummary ? (
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  AI Summary
                </span>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {currentSlide.aiSummary}
                </div>
              </div>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                No AI summary generated for this slide yet.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Thumbnail Strip for Instant Jump */}
      <div className="presentation-toolbar">
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0', width: '100%' }}>
          {slides.map((s, idx) => (
            <div
              key={s.id}
              onClick={() => setCurrentIndex(idx)}
              style={{
                position: 'relative',
                width: 68,
                height: 44,
                borderRadius: 6,
                overflow: 'hidden',
                cursor: 'pointer',
                flexShrink: 0,
                border: idx === currentIndex ? '2px solid var(--accent-purple)' : '1px solid rgba(255,255,255,0.15)',
                boxShadow: idx === currentIndex ? '0 0 10px rgba(139,92,246,0.5)' : 'none',
                opacity: idx === currentIndex ? 1 : 0.6,
                transition: 'all 0.15s ease'
              }}
            >
              <img src={s.imageData} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <span
                style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  background: 'rgba(0,0,0,0.7)',
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '1px 3px',
                  borderRadius: 3
                }}
              >
                {idx + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
