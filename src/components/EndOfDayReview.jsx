import React, { useState, useMemo } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Sparkles,
  Trash2,
  Maximize2,
  Edit3,
  Check,
  Search,
  FolderArchive,
  Camera,
  X
} from 'lucide-react';
import {
  exportToPdf,
  exportToPptx,
  exportToNotesMarkdown,
  exportToNotesHtml,
  exportToZipBundle
} from '../services/exportService';
import confetti from 'canvas-confetti';

export function EndOfDayReview({
  conference,
  topics = [],
  slides = [],
  onUpdateSlide,
  onDeleteSlide,
  onOpenSlideDetail: _onOpenSlideDetail,
  onBackToCamera
}) {
  const [selectedTopicId, setSelectedTopicId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lightboxSlide, setLightboxSlide] = useState(null);
  const [editingNotesId, setEditingNotesId] = useState(null);
  const [tempNoteText, setTempNoteText] = useState('');
  const [activeExporting, setActiveExporting] = useState(null);
  const [notification, setNotification] = useState('');

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  const conferenceName = conference?.name || 'Conference';

  // Group slides by topic
  const topicsWithSlides = topics.map((t) => ({
    ...t,
    slides: slides.filter((s) => s.topicId === t.id)
  }));

  // Handle slide search & topic filter
  const displayedTopics = topicsWithSlides.filter((t) => {
    if (selectedTopicId !== 'all' && t.id !== selectedTopicId) return false;
    return true;
  });

  const triggerExport = async (key, fn) => {
    setActiveExporting(key);
    try {
      const filename = await fn();
      confetti({ particleCount: 50, spread: 60 });
      setNotification(`Downloaded ${filename || 'file'} successfully!`);
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      alert('Export issue: ' + (err.message || 'Export failed'));
    } finally {
      setActiveExporting(null);
    }
  };

  // Save quick note edit
  const handleSaveNote = (slide) => {
    onUpdateSlide({
      ...slide,
      notes: tempNoteText
    });
    setEditingNotesId(null);
  };

  // Master Day Export (All Slides from today)
  const handleMasterPdf = () => {
    triggerExport('master-pdf', () =>
      exportToPdf({
        conferenceTitle: conferenceName,
        sessionTitle: 'Full Day Conference Slide Deck',
        speaker: 'All Sessions & Tracks',
        slides,
        includeNotes: true
      })
    );
  };

  const handleMasterPptx = () => {
    triggerExport('master-pptx', () =>
      exportToPptx({
        conferenceTitle: conferenceName,
        sessionTitle: 'Complete Conference Presentation Deck',
        speaker: 'All Keynotes & Sessions',
        slides
      })
    );
  };

  const handleMasterNotes = (format = 'html') => {
    triggerExport(`master-notes-${format}`, () => {
      if (format === 'md') {
        return exportToNotesMarkdown({
          conferenceTitle: conferenceName,
          sessionTitle: 'Master Conference Study Notes',
          speaker: 'All Speakers',
          slides
        });
      } else {
        return exportToNotesHtml({
          conferenceTitle: conferenceName,
          sessionTitle: 'Master Conference Study Notes',
          speaker: 'All Speakers',
          slides
        });
      }
    });
  };

  const handleMasterZip = () => {
    triggerExport('master-zip', () =>
      exportToZipBundle({
        conferenceTitle: conferenceName,
        sessionTitle: 'Complete_Day_Slides',
        speaker: 'All Sessions',
        slides
      })
    );
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Top Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.12) 0%, rgba(10, 13, 22, 0) 100%)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '24px 28px 20px'
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}
                >
                  End-of-Day Review
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {todayFormatted}
                </span>
              </div>
              <h1 style={{ fontSize: 24, color: '#ffffff' }}>
                Review All Today's Slides & Sessions
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, marginTop: 4 }}>
                Scroll down through your captured sessions, inspect slide photos, add notes, and export into any format.
              </p>
            </div>

            {/* Quick Stats Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                className="glass-panel"
                style={{ padding: '8px 16px', textAlign: 'center', minWidth: 90 }}
              >
                <div style={{ fontSize: 20, fontWeight: 800, color: '#ffffff' }}>{topics.length}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sessions</div>
              </div>

              <div
                className="glass-panel"
                style={{ padding: '8px 16px', textAlign: 'center', minWidth: 90 }}
              >
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-purple)' }}>{slides.length}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Slides</div>
              </div>

              <button
                className="btn btn-primary"
                onClick={onBackToCamera}
                style={{ height: 46 }}
              >
                <Camera size={16} />
                <span>Resume Camera</span>
              </button>
            </div>
          </div>

          {/* Master Day Actions Bar */}
          <div
            style={{
              marginTop: 20,
              padding: '14px 18px',
              borderRadius: 14,
              background: 'rgba(15, 20, 34, 0.7)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="var(--accent-cyan)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                Master Day Compilation:
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Combine all {slides.length} slides across all sessions into 1 document
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '7px 12px' }}
                onClick={handleMasterPdf}
                disabled={activeExporting === 'master-pdf'}
              >
                <FileText size={13} color="#f87171" />
                <span>Master PDF</span>
              </button>

              <button
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '7px 12px' }}
                onClick={handleMasterPptx}
                disabled={activeExporting === 'master-pptx'}
              >
                <FileSpreadsheet size={13} color="#fb923c" />
                <span>Master PPTX Deck</span>
              </button>

              <button
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '7px 12px' }}
                onClick={() => handleMasterNotes('html')}
                disabled={activeExporting === 'master-notes-html'}
              >
                <Download size={13} color="#38bdf8" />
                <span>Master Notes (.html)</span>
              </button>

              <button
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '7px 12px' }}
                onClick={handleMasterZip}
                disabled={activeExporting === 'master-zip'}
              >
                <FolderArchive size={13} color="var(--accent-purple)" />
                <span>Combine All (ZIP)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Review Stream */}
      <div style={{ maxWidth: 1200, width: '100%', margin: '0 auto', padding: '20px 28px', flex: 1 }}>
        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          {/* Topic Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', padding: '4px 0', maxWidth: '75%' }}>
            <button
              className={`btn btn-pill ${selectedTopicId === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 12, padding: '6px 14px' }}
              onClick={() => setSelectedTopicId('all')}
            >
              All Sessions ({slides.length})
            </button>

            {topics.map((t) => {
              const count = slides.filter((s) => s.topicId === t.id).length;
              const isSelected = selectedTopicId === t.id;
              return (
                <button
                  key={t.id}
                  className={`btn btn-pill ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    fontSize: 12,
                    padding: '6px 14px',
                    borderColor: isSelected ? 'transparent' : 'var(--border-subtle)'
                  }}
                  onClick={() => setSelectedTopicId(t.id)}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: t.color || 'var(--accent-purple)'
                    }}
                  />
                  <span>{t.name}</span>
                  <span style={{ opacity: 0.65, fontSize: 11 }}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search slide titles or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 30, fontSize: 12.5 }}
            />
          </div>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: 10,
              padding: '10px 16px',
              color: '#34d399',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 20
            }}
          >
            <Check size={16} />
            <span>{notification}</span>
          </div>
        )}

        {/* Sessions Stream */}
        {displayedTopics.map((topic) => {
          // Filter topic slides by search query
          const topicSlides = topic.slides.filter((slide) => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (
              (slide.title && slide.title.toLowerCase().includes(q)) ||
              (slide.notes && slide.notes.toLowerCase().includes(q)) ||
              (slide.ocrText && slide.ocrText.toLowerCase().includes(q))
            );
          });

          if (topicSlides.length === 0 && searchQuery) return null;

          return (
            <div
              key={topic.id}
              style={{
                marginBottom: 36,
                background: 'rgba(15, 20, 34, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 16,
                overflow: 'hidden'
              }}
            >
              {/* Session Header Card */}
              <div
                style={{
                  padding: '16px 20px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: topic.color || 'var(--accent-purple)',
                      boxShadow: `0 0 10px ${topic.color || 'var(--accent-purple)'}`
                    }}
                  />
                  <div>
                    <h3 style={{ fontSize: 16, color: '#ffffff' }}>{topic.name}</h3>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 10 }}>
                      {topic.speaker && <span>Speaker: {topic.speaker}</span>}
                      <span>•</span>
                      <span>{topicSlides.length} slides archived</span>
                    </div>
                  </div>
                </div>

                {/* Session Conversion Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 11.5, padding: '5px 10px' }}
                    onClick={() =>
                      triggerExport(`${topic.id}-pdf`, () =>
                        exportToPdf({
                          conferenceTitle: conferenceName,
                          sessionTitle: topic.name,
                          speaker: topic.speaker,
                          slides: topic.slides
                        })
                      )
                    }
                    title="Export session to PDF"
                  >
                    <FileText size={12} color="#f87171" /> PDF
                  </button>

                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 11.5, padding: '5px 10px' }}
                    onClick={() =>
                      triggerExport(`${topic.id}-pptx`, () =>
                        exportToPptx({
                          conferenceTitle: conferenceName,
                          sessionTitle: topic.name,
                          speaker: topic.speaker,
                          slides: topic.slides
                        })
                      )
                    }
                    title="Convert session to PowerPoint (.pptx)"
                  >
                    <FileSpreadsheet size={12} color="#fb923c" /> PPTX
                  </button>

                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 11.5, padding: '5px 10px' }}
                    onClick={() =>
                      triggerExport(`${topic.id}-notes`, () =>
                        exportToNotesHtml({
                          conferenceTitle: conferenceName,
                          sessionTitle: topic.name,
                          speaker: topic.speaker,
                          slides: topic.slides
                        })
                      )
                    }
                    title="Convert session to Notes"
                  >
                    <Download size={12} color="#38bdf8" /> Notes
                  </button>

                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 11.5, padding: '5px 10px' }}
                    onClick={() =>
                      triggerExport(`${topic.id}-zip`, () =>
                        exportToZipBundle({
                          conferenceTitle: conferenceName,
                          sessionTitle: topic.name,
                          speaker: topic.speaker,
                          slides: topic.slides
                        })
                      )
                    }
                    title="Combine all session slides into a ZIP"
                  >
                    <FolderArchive size={12} color="var(--accent-purple)" /> Combine ZIP
                  </button>
                </div>
              </div>

              {/* Slides Feed for this Session */}
              <div style={{ padding: 18 }}>
                {topicSlides.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No slides in this session yet. Use the camera to snap slides!
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                      gap: 16
                    }}
                  >
                    {topicSlides.map((slide, sIdx) => {
                      const isEditingNote = editingNotesId === slide.id;

                      return (
                        <div
                          key={slide.id}
                          style={{
                            background: '#0d1322',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 12,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          {/* Image Box */}
                          <div
                            style={{
                              position: 'relative',
                              width: '100%',
                              paddingTop: '56.25%', // 16:9 aspect ratio
                              background: '#000000',
                              cursor: 'pointer'
                            }}
                            onClick={() => setLightboxSlide(slide)}
                          >
                            <img
                              src={slide.imageData}
                              alt={slide.title}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain'
                              }}
                            />

                            {/* Slide Number Badge */}
                            <span
                              style={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                background: 'rgba(0,0,0,0.75)',
                                color: '#ffffff',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 700
                              }}
                            >
                              Slide #{sIdx + 1}
                            </span>

                            {/* Click to expand hover hint */}
                            <button
                              className="btn btn-ghost btn-pill"
                              style={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                width: 28,
                                height: 28,
                                padding: 0,
                                background: 'rgba(0,0,0,0.6)'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxSlide(slide);
                              }}
                              title="Full size view"
                            >
                              <Maximize2 size={13} />
                            </button>
                          </div>

                          {/* Slide Content & Notes Box */}
                          <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                              <h4
                                style={{
                                  fontSize: 13.5,
                                  color: '#f1f5f9',
                                  fontWeight: 600,
                                  lineHeight: 1.3
                                }}
                              >
                                {slide.title || `Slide #${sIdx + 1}`}
                              </h4>
                              <button
                                className="btn btn-ghost btn-pill"
                                style={{ width: 26, height: 26, padding: 0, color: 'var(--text-muted)' }}
                                onClick={() => {
                                  if (confirm('Delete this slide?')) {
                                    onDeleteSlide(slide.id);
                                  }
                                }}
                                title="Delete slide"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {/* Inline Note Box */}
                            <div
                              style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 8,
                                padding: 10,
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: 6
                              }}
                            >
                              {isEditingNote ? (
                                <div>
                                  <textarea
                                    className="input-field"
                                    rows={3}
                                    style={{ fontSize: 12, width: '100%', marginBottom: 6 }}
                                    value={tempNoteText}
                                    onChange={(e) => setTempNoteText(e.target.value)}
                                    placeholder="Add key takeaway or action item for this slide..."
                                    autoFocus
                                  />
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                    <button
                                      className="btn btn-ghost"
                                      style={{ fontSize: 11, padding: '4px 8px' }}
                                      onClick={() => setEditingNotesId(null)}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      className="btn btn-primary"
                                      style={{ fontSize: 11, padding: '4px 10px' }}
                                      onClick={() => handleSaveNote(slide)}
                                    >
                                      Save Note
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-cyan)' }}>
                                      Takeaway / Notes
                                    </span>
                                    <button
                                      className="btn btn-ghost"
                                      style={{ fontSize: 11, padding: '2px 6px', height: 'auto', color: 'var(--text-muted)' }}
                                      onClick={() => {
                                        setEditingNotesId(slide.id);
                                        setTempNoteText(slide.notes || '');
                                      }}
                                    >
                                      <Edit3 size={11} /> {slide.notes ? 'Edit' : '+ Add Note'}
                                    </button>
                                  </div>

                                  <p
                                    style={{
                                      fontSize: 12,
                                      color: slide.notes ? '#cbd5e1' : 'var(--text-muted)',
                                      fontStyle: slide.notes ? 'normal' : 'italic',
                                      lineHeight: 1.4
                                    }}
                                  >
                                    {slide.notes || 'No notes added yet. Click "+ Add Note" to record key takeaways.'}
                                  </p>
                                </div>
                              )}

                              {slide.aiSummary && (
                                <div style={{ fontSize: 11, color: '#34d399', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 6 }}>
                                  💡 {slide.aiSummary}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal for Full Resolution Slide Inspection */}
      {lightboxSlide && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 90 }}
          onClick={() => setLightboxSlide(null)}
        >
          <div
            className="glass-modal"
            style={{
              maxWidth: 960,
              width: '95vw',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <h3 style={{ fontSize: 16 }}>{lightboxSlide.title}</h3>
              <button
                className="btn btn-ghost btn-pill"
                style={{ width: 32, height: 32, padding: 0 }}
                onClick={() => setLightboxSlide(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10, minHeight: 400 }}>
              <img
                src={lightboxSlide.imageData}
                alt={lightboxSlide.title}
                style={{ maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain' }}
              />
            </div>

            {lightboxSlide.notes && (
              <div style={{ padding: '12px 20px', background: 'rgba(15, 20, 34, 0.9)', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                  Takeaway Notes:
                </span>
                <p style={{ fontSize: 13, color: '#e2e8f0', marginTop: 2 }}>{lightboxSlide.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
