import React, { useState, useEffect } from 'react';
import {
  Camera,
  Layers,
  Play,
  FileDown,
  Sparkles,
  Settings,
  Search,
  Plus,
  Laptop,
  Calendar,
  Clock,
  Flag,
  RefreshCw
} from 'lucide-react';
import {
  getConferences,
  getTopics,
  saveTopic,
  deleteTopic,
  getSlides,
  saveSlide,
  deleteSlide,
  getSetting,
  initializeBlankState,
  purgeOldDemoData,
  clearAllData
} from './services/storage';
import { CameraView } from './components/CameraView';
import { TopicManagerModal } from './components/TopicManagerModal';
import { SlideDetailModal } from './components/SlideDetailModal';
import { PresentationViewer } from './components/PresentationViewer';
import { SessionSummaryModal } from './components/SessionSummaryModal';
import { DataTransferModal } from './components/DataTransferModal';
import { SettingsModal } from './components/SettingsModal';
import { SessionCompileModal } from './components/SessionCompileModal';
import { EndOfDayReview } from './components/EndOfDayReview';
import { exportToPdf } from './services/exportService';
import confetti from 'canvas-confetti';

export default function App() {
  const [_conferences, setConferences] = useState([]);
  const [activeConference, setActiveConference] = useState(null);
  const [topics, setTopics] = useState([]);
  const [activeTopicId, setActiveTopicId] = useState(null);
  const [slides, setSlides] = useState([]);

  // Active View Tab: 'camera' | 'review' | 'organizer'
  const [viewMode, setViewMode] = useState('camera');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTopicId, setFilterTopicId] = useState('all');

  // Modals
  const [showTopicManager, setShowTopicManager] = useState(false);
  const [selectedSlideForDetail, setSelectedSlideForDetail] = useState(null);
  const [showPresentation, setShowPresentation] = useState(false);
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  const [showDataTransfer, setShowDataTransfer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [compilingTopic, setCompilingTopic] = useState(null); // When session finishes
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  // Settings
  const [geminiApiKey, setGeminiApiKey] = useState('');

  // Service worker update listener
  useEffect(() => {
    const handleNewVersion = (e) => {
      setNewVersionAvailable(true);
      if (e.detail?.registration?.waiting) {
        setWaitingWorker(e.detail.registration.waiting);
      }
    };

    window.addEventListener('slidesnap-new-version', handleNewVersion);
    return () => window.removeEventListener('slidesnap-new-version', handleNewVersion);
  }, []);

  const handleApplyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    if (window.forceReloadSlideSnap) {
      window.forceReloadSlideSnap();
    } else {
      window.location.reload();
    }
  };

  const handleForceRefresh = () => {
    if (window.forceReloadSlideSnap) {
      window.forceReloadSlideSnap();
    } else {
      window.location.reload();
    }
  };

  // Initial load
  useEffect(() => {
    async function loadData() {
      // Purge any stale demo conferences / slides from previous versions
      await purgeOldDemoData();
      const initialConf = await initializeBlankState();

      const confs = await getConferences();
      setConferences(confs);

      if (initialConf) {
        setActiveConference(initialConf);

        const loadedTopics = await getTopics(initialConf.id);
        setTopics(loadedTopics);
        if (loadedTopics.length > 0) {
          setActiveTopicId(loadedTopics[0].id);
        } else {
          setActiveTopicId(null);
        }

        const loadedSlides = await getSlides(initialConf.id);
        setSlides(loadedSlides);
      }

      const key = await getSetting('gemini_api_key', '');
      setGeminiApiKey(key);
    }

    loadData();
  }, []);

  // Reload topics and slides for active conference
  const refreshActiveData = async (confId) => {
    if (!confId) return;
    const loadedTopics = await getTopics(confId);
    setTopics(loadedTopics);
    if (loadedTopics.length > 0 && !loadedTopics.some((t) => t.id === activeTopicId)) {
      setActiveTopicId(loadedTopics[0].id);
    }
    const loadedSlides = await getSlides(confId);
    setSlides(loadedSlides);
  };

  // Handle slide capture from camera or file (Zero-delay auto-save)
  const handleSlideCaptured = async (slideData) => {
    const newSlide = {
      id: `slide-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      conferenceId: activeConference?.id,
      topicId: slideData.topicId || activeTopicId || topics[0]?.id,
      title: slideData.title || `Slide #${slides.length + 1}`,
      imageData: slideData.imageData,
      capturedAt: Date.now(),
      notes: slideData.notes || '',
      ocrText: '',
      aiSummary: '',
      order: slides.length
    };

    await saveSlide(newSlide);
    setSlides((prev) => [...prev, newSlide]);
  };

  // Handle save updated slide
  const handleSaveSlide = async (updatedSlide) => {
    await saveSlide(updatedSlide);
    setSlides((prev) => prev.map((s) => (s.id === updatedSlide.id ? updatedSlide : s)));
    setSelectedSlideForDetail(null);
  };

  // Handle delete slide
  const handleDeleteSlide = async (slideId) => {
    await deleteSlide(slideId);
    setSlides((prev) => prev.filter((s) => s.id !== slideId));
  };

  // Handle save topic
  const handleSaveTopic = async (topicData) => {
    const newTopic = {
      ...topicData,
      conferenceId: activeConference?.id
    };
    await saveTopic(newTopic);
    await refreshActiveData(activeConference?.id);
  };

  // Handle delete topic
  const handleDeleteTopic = async (topicId) => {
    await deleteTopic(topicId);
    await refreshActiveData(activeConference?.id);
  };

  // Handle Quick Start New Session with Topic Name
  const handleStartSession = async (topicName) => {
    if (!topicName || !topicName.trim()) return;

    // Check if topic exists
    const existing = topics.find((t) => t.name.toLowerCase() === topicName.trim().toLowerCase());
    if (existing) {
      setActiveTopicId(existing.id);
      return;
    }

    // Colors for session badges
    const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];
    const newTopic = {
      id: `topic-${Date.now()}`,
      conferenceId: activeConference?.id,
      name: topicName.trim(),
      speaker: '',
      color: colors[topics.length % colors.length],
      order: topics.length,
      createdAt: Date.now()
    };

    await saveTopic(newTopic);
    await refreshActiveData(activeConference?.id);
    setActiveTopicId(newTopic.id);
    confetti({ particleCount: 30, spread: 45 });
  };

  // Handle Finish Session
  const handleFinishSession = (topicId) => {
    const topic = topics.find((t) => t.id === (topicId || activeTopicId)) || topics[0];
    setCompilingTopic(topic);
  };

  // Export current view or presentation directly to PDF
  const handleDirectPdfExport = async () => {
    const currentTopic = topics.find((t) => t.id === (filterTopicId === 'all' ? activeTopicId : filterTopicId));
    const slidesToExport = filterTopicId === 'all' 
      ? slides 
      : slides.filter((s) => s.topicId === filterTopicId);

    if (slidesToExport.length === 0) {
      alert('No slides to export.');
      return;
    }

    try {
      await exportToPdf({
        conferenceTitle: activeConference?.name || 'Conference',
        sessionTitle: currentTopic ? currentTopic.name : 'All Sessions',
        speaker: currentTopic?.speaker,
        slides: slidesToExport,
        includeNotes: true
      });
      confetti({ particleCount: 70, spread: 60 });
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  // Filtered slides for organizer grid
  const filteredSlides = slides.filter((slide) => {
    const matchesTopic = filterTopicId === 'all' || slide.topicId === filterTopicId;
    const matchesSearch =
      !searchQuery ||
      slide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      slide.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (slide.ocrText && slide.ocrText.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTopic && matchesSearch;
  });

  // Recent slides under active topic (for camera thumbnail dock)
  const recentTopicSlides = slides.filter((s) => s.topicId === activeTopicId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Top Application Navigation Bar */}
      <header className="app-header">
        {/* Brand & Conference Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="brand-title" style={{ cursor: 'pointer' }} onClick={() => setViewMode('camera')}>
            <span style={{ fontSize: 22 }}>📸</span>
            <span>SlideSnap AI</span>
          </div>

          {activeConference && (
            <div
              style={{
                display: 'none',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '4px 10px',
                borderRadius: 20,
                border: '1px solid var(--border-subtle)',
                fontSize: 12,
                color: 'var(--text-secondary)'
              }}
              className="desktop-conf-pill"
            >
              <Calendar size={13} color="var(--accent-cyan)" />
              <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeConference.name}
              </span>
            </div>
          )}
        </div>

        {/* View Switcher: Live Camera vs End-of-Day Review vs Grid Organizer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(5, 8, 16, 0.7)',
            padding: 3,
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <button
            className={`btn btn-pill ${viewMode === 'camera' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 13, padding: '6px 14px' }}
            onClick={() => setViewMode('camera')}
            title="Live camera snap mode"
          >
            <Camera size={15} />
            <span>Live Camera</span>
          </button>

          <button
            className={`btn btn-pill ${viewMode === 'review' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 13, padding: '6px 14px' }}
            onClick={() => setViewMode('review')}
            title="End-of-day review: scroll, add notes, and convert"
          >
            <Clock size={15} color={viewMode === 'review' ? '#ffffff' : 'var(--accent-amber)'} />
            <span>End-of-Day Review</span>
          </button>

          <button
            className={`btn btn-pill ${viewMode === 'organizer' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 13, padding: '6px 14px' }}
            onClick={() => setViewMode('organizer')}
            title="Grid organizer view"
          >
            <Layers size={15} />
            <span>Organizer ({slides.length})</span>
          </button>
        </div>

        {/* Header Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn btn-secondary"
            style={{ fontSize: 12.5, padding: '6px 12px' }}
            onClick={() => setShowPresentation(true)}
            title="Present full screen interactive slide deck"
          >
            <Play size={13} color="var(--accent-emerald)" />
            <span className="hide-on-mobile">Present</span>
          </button>

          <button
            className="btn btn-secondary"
            style={{ fontSize: 12.5, padding: '6px 12px' }}
            onClick={() => setShowSessionSummary(true)}
            title="AI Executive session briefing"
          >
            <Sparkles size={13} color="var(--accent-purple)" />
            <span className="hide-on-mobile">AI Brief</span>
          </button>

          <button
            className="btn btn-ghost btn-pill"
            style={{ width: 36, height: 36, padding: 0 }}
            onClick={() => setShowDataTransfer(true)}
            title="Phone ➔ Laptop instant sync"
          >
            <Laptop size={16} color="var(--accent-cyan)" />
          </button>

          <button
            className="btn btn-ghost btn-pill"
            style={{ width: 36, height: 36, padding: 0 }}
            onClick={handleForceRefresh}
            title="Force Refresh / Update App (Wipe cache)"
          >
            <RefreshCw size={15} color="var(--accent-amber)" />
          </button>

          <button
            className="btn btn-ghost btn-pill"
            style={{ width: 36, height: 36, padding: 0 }}
            onClick={() => setShowSettings(true)}
            title="Settings & API key"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Top Update Notification Banner */}
      {newVersionAvailable && (
        <div
          style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
            color: '#ffffff',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12.5,
            fontWeight: 600,
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            zIndex: 100
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={15} />
            <span>New SlideSnap update ready! Tap to load latest version.</span>
          </div>
          <button
            className="btn btn-pill"
            style={{ background: '#ffffff', color: '#0a0d16', fontSize: 11.5, padding: '4px 12px', border: 'none', fontWeight: 700 }}
            onClick={handleApplyUpdate}
          >
            <RefreshCw size={12} /> Reload Now
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {/* PERSISTENT CAMERA VIEW CONTAINER (Never drops stream or re-requests permission on tab change!) */}
        <div
          style={{
            display: viewMode === 'camera' ? 'flex' : 'none',
            flex: 1,
            height: '100%',
            overflow: 'hidden'
          }}
        >
          <CameraView
            conference={activeConference}
            topics={topics}
            activeTopicId={activeTopicId}
            onSelectTopic={(tId) => setActiveTopicId(tId)}
            onOpenTopicManager={() => setShowTopicManager(true)}
            onSlideCaptured={handleSlideCaptured}
            recentSlides={recentTopicSlides}
            onOpenSlideDetail={(slide) => setSelectedSlideForDetail(slide)}
            onOpenGallery={() => {
              setFilterTopicId(activeTopicId || 'all');
              setViewMode('organizer');
            }}
            onStartSession={handleStartSession}
            onFinishSession={handleFinishSession}
            onGoToReview={() => setViewMode('review')}
          />
        </div>

        {/* END-OF-DAY REVIEW VIEW (Scroll, inspect, add notes, and convert) */}
        {viewMode === 'review' && (
          <EndOfDayReview
            conference={activeConference}
            topics={topics}
            slides={slides}
            onUpdateSlide={handleSaveSlide}
            onDeleteSlide={handleDeleteSlide}
            onOpenSlideDetail={(slide) => setSelectedSlideForDetail(slide)}
            onBackToCamera={() => setViewMode('camera')}
          />
        )}

        {/* ORGANIZER GRID VIEW */}
        {viewMode === 'organizer' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 22px', overflowY: 'auto' }}>
            {/* Top Toolbar: Topic Filter Pills & Search */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
              {/* Topic Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', padding: '2px 0', maxWidth: '70%' }}>
                <button
                  className={`btn btn-pill ${filterTopicId === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 12.5, padding: '6px 14px' }}
                  onClick={() => setFilterTopicId('all')}
                >
                  All Topics ({slides.length})
                </button>

                {topics.map((t) => {
                  const count = slides.filter((s) => s.topicId === t.id).length;
                  const isSelected = filterTopicId === t.id;
                  return (
                    <button
                      key={t.id}
                      className={`btn btn-pill ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      style={{
                        fontSize: 12.5,
                        padding: '6px 14px',
                        borderColor: isSelected ? 'transparent' : 'var(--border-subtle)'
                      }}
                      onClick={() => setFilterTopicId(t.id)}
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
                      <span style={{ opacity: 0.7, fontSize: 11 }}>({count})</span>
                    </button>
                  );
                })}

                <button
                  className="btn btn-ghost btn-pill"
                  style={{ fontSize: 12.5, padding: '6px 10px' }}
                  onClick={() => setShowTopicManager(true)}
                  title="Manage topics"
                >
                  <Plus size={14} /> New Topic
                </button>
              </div>

              {/* Search & Direct Export */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ position: 'relative', minWidth: 200 }}>
                  <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Search slide titles or OCR text..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: 32, fontSize: 13 }}
                  />
                </div>

                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 13 }}
                  onClick={handleDirectPdfExport}
                  title="Export current filtered slides to PDF"
                >
                  <FileDown size={15} color="var(--accent-purple)" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>

            {/* Slide Count & Active Session Banner */}
            {filterTopicId !== 'all' && (
              <div
                style={{
                  background: 'rgba(139, 92, 246, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16
                }}
              >
                <div>
                  <h3 style={{ fontSize: 15, color: '#ffffff' }}>
                    {topics.find((t) => t.id === filterTopicId)?.name}
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {topics.find((t) => t.id === filterTopicId)?.speaker || 'Conference Session'} • {filteredSlides.length} slides archived
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => {
                      const t = topics.find((top) => top.id === filterTopicId);
                      setCompilingTopic(t);
                    }}
                  >
                    <Flag size={13} color="var(--accent-emerald)" /> Compile & Convert
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => {
                      setActiveTopicId(filterTopicId);
                      setShowPresentation(true);
                    }}
                  >
                    <Play size={13} /> Present This Topic
                  </button>
                </div>
              </div>
            )}

            {/* Slides Grid */}
            {filteredSlides.length > 0 ? (
              <div className="slides-grid">
                {filteredSlides.map((slide, index) => {
                  const topic = topics.find((t) => t.id === slide.topicId);
                  return (
                    <div
                      key={slide.id}
                      className="slide-card"
                      onClick={() => setSelectedSlideForDetail(slide)}
                    >
                      <div className="slide-card-img-wrap">
                        <img src={slide.imageData} alt={slide.title} loading="lazy" />
                        <span className="slide-card-badge">Slide #{index + 1}</span>
                      </div>

                      <div className="slide-card-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: topic?.color || 'var(--accent-purple)',
                              flexShrink: 0
                            }}
                          />
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {topic?.name || 'Unassigned'}
                          </span>
                        </div>

                        <h4 className="slide-card-title">{slide.title}</h4>

                        {/* Badges for OCR / AI summary */}
                        <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                          {slide.ocrText && (
                            <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', fontSize: 10 }}>
                              OCR Extracted
                            </span>
                          )}
                          {slide.aiSummary && (
                            <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)', fontSize: 10 }}>
                              AI Brief
                            </span>
                          )}
                          {slide.notes && (
                            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', fontSize: 10 }}>
                              Notes
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <Camera size={44} style={{ opacity: 0.4, marginBottom: 12 }} />
                <h3 style={{ fontSize: 17, marginBottom: 6 }}>No slides found</h3>
                <p style={{ fontSize: 13, marginBottom: 18 }}>
                  {searchQuery ? 'Try adjusting your search query.' : 'Snap some photos using the Camera or upload slide images.'}
                </p>
                <button className="btn btn-primary" onClick={() => setViewMode('camera')}>
                  <Camera size={15} /> Open Camera
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Session Compile & Action Hub Modal (Opened on "Finish Session") */}
      {compilingTopic && (
        <SessionCompileModal
          sessionTopic={compilingTopic}
          conference={activeConference}
          slides={slides.filter((s) => s.topicId === compilingTopic.id)}
          onClose={() => setCompilingTopic(null)}
          onStartNewSession={() => {
            setCompilingTopic(null);
            setViewMode('camera');
          }}
          onGoToReview={() => {
            setCompilingTopic(null);
            setViewMode('review');
          }}
        />
      )}

      {/* Modals */}
      {showTopicManager && (
        <TopicManagerModal
          topics={topics}
          activeTopicId={activeTopicId}
          slides={slides}
          onSaveTopic={handleSaveTopic}
          onDeleteTopic={handleDeleteTopic}
          onSelectTopic={(tId) => setActiveTopicId(tId)}
          onClose={() => setShowTopicManager(false)}
        />
      )}

      {selectedSlideForDetail && (
        <SlideDetailModal
          slide={selectedSlideForDetail}
          topics={topics}
          geminiApiKey={geminiApiKey}
          onSaveSlide={handleSaveSlide}
          onDeleteSlide={handleDeleteSlide}
          onClose={() => setSelectedSlideForDetail(null)}
          hasPrev={slides.findIndex((s) => s.id === selectedSlideForDetail.id) > 0}
          hasNext={slides.findIndex((s) => s.id === selectedSlideForDetail.id) < slides.length - 1}
          onPrevSlide={() => {
            const idx = slides.findIndex((s) => s.id === selectedSlideForDetail.id);
            if (idx > 0) setSelectedSlideForDetail(slides[idx - 1]);
          }}
          onNextSlide={() => {
            const idx = slides.findIndex((s) => s.id === selectedSlideForDetail.id);
            if (idx < slides.length - 1) setSelectedSlideForDetail(slides[idx + 1]);
          }}
        />
      )}

      {showPresentation && (
        <PresentationViewer
          conference={activeConference}
          activeTopic={topics.find((t) => t.id === activeTopicId) || topics[0]}
          slides={filterTopicId === 'all' ? slides : slides.filter((s) => s.topicId === filterTopicId)}
          onClose={() => setShowPresentation(false)}
        />
      )}

      {showSessionSummary && (
        <SessionSummaryModal
          activeTopic={topics.find((t) => t.id === activeTopicId) || topics[0]}
          slides={slides.filter((s) => s.topicId === activeTopicId)}
          geminiApiKey={geminiApiKey}
          onSaveTopicSummary={(tId, summary) => {
            const topic = topics.find((t) => t.id === tId);
            if (topic) {
              handleSaveTopic({ ...topic, summary, summaryTimestamp: new Date().toISOString() });
            }
          }}
          onClose={() => setShowSessionSummary(false)}
        />
      )}

      {showDataTransfer && (
        <DataTransferModal
          conference={activeConference}
          onImportComplete={async () => {
            const confs = await getConferences();
            setConferences(confs);
            if (confs.length > 0) {
              setActiveConference(confs[0]);
              await refreshActiveData(confs[0].id);
            }
          }}
          onClose={() => setShowDataTransfer(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          geminiApiKey={geminiApiKey}
          onSaveApiKey={(key) => setGeminiApiKey(key)}
          onResetSampleData={async () => {
            await clearAllData();
            const freshConf = await initializeBlankState();
            setActiveConference(freshConf);
            setTopics([]);
            setSlides([]);
            setActiveTopicId(null);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
