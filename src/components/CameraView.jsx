import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  SwitchCamera,
  Upload,
  Plus,
  Folder,
  Layers,
  Sparkles,
  Check,
  Grid,
  ChevronDown,
  X
} from 'lucide-react';
import { playShutterSound } from '../utils/audio';

export function CameraView({
  conference,
  topics,
  activeTopicId,
  onSelectTopic,
  onOpenTopicManager,
  onSlideCaptured,
  recentSlides = [],
  onOpenSlideDetail,
  onOpenGallery
}) {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' is rear camera
  const [cameraError, setCameraError] = useState(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [quickTitleModal, setQuickTitleModal] = useState(false);
  const [pendingCapture, setPendingCapture] = useState(null);
  const [customSlideTitle, setCustomSlideTitle] = useState('');
  const [quickNotes, setQuickNotes] = useState('');
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false);

  const activeTopic = topics.find((t) => t.id === activeTopicId) || topics[0];

  // Start Camera Stream
  useEffect(() => {
    let currentStream = null;

    async function initCamera() {
      setCameraError(null);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API is not supported on this browser or context.');
        }

        const constraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch((e) => console.warn('Video play warning:', e));
        }
      } catch (err) {
        console.warn('Camera access issue:', err);
        setCameraError(err.message || 'Unable to access camera.');
      }
    }

    initCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  // Flip Camera
  const toggleFacingMode = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture Frame
  const triggerCapture = (requestTitlePrompt = false) => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      alert('Camera is still loading. Please wait a moment.');
      return;
    }

    // Play Shutter Sound & Flash
    playShutterSound();
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    // Render high-res frame to canvas
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    const slideNumber = recentSlides.length + 1;
    const defaultTitle = `${activeTopic ? activeTopic.name : 'Slide'} - Slide #${slideNumber}`;

    if (requestTitlePrompt) {
      setPendingCapture({
        imageData: dataUrl,
        defaultTitle
      });
      setCustomSlideTitle(defaultTitle);
      setQuickNotes('');
      setQuickTitleModal(true);
    } else {
      // Rapid Snap (instant auto-save)
      onSlideCaptured({
        imageData: dataUrl,
        title: defaultTitle,
        topicId: activeTopic ? activeTopic.id : null,
        conferenceId: conference ? conference.id : null,
        notes: ''
      });
    }
  };

  // Confirm Quick Title & Notes
  const handleSavePendingCapture = () => {
    if (!pendingCapture) return;

    onSlideCaptured({
      imageData: pendingCapture.imageData,
      title: customSlideTitle.trim() || pendingCapture.defaultTitle,
      topicId: activeTopic ? activeTopic.id : null,
      conferenceId: conference ? conference.id : null,
      notes: quickNotes.trim()
    });

    setPendingCapture(null);
    setQuickTitleModal(false);
  };

  // Handle File Upload Fallback
  const handleFileUpload = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        const slideNumber = recentSlides.length + index + 1;
        const defaultTitle = file.name.replace(/\.[^/.]+$/, '') || `${activeTopic?.name || 'Slide'} #${slideNumber}`;

        onSlideCaptured({
          imageData: dataUrl,
          title: defaultTitle,
          topicId: activeTopic ? activeTopic.id : null,
          conferenceId: conference ? conference.id : null,
          notes: ''
        });
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  };

  return (
    <div className="camera-view-container">
      {/* Top Bar inside Camera */}
      <div className="camera-topic-bar">
        {/* Active Topic Switcher Pill */}
        <div style={{ position: 'relative' }}>
          <button
            className="active-topic-selector"
            onClick={() => setIsTopicDropdownOpen(!isTopicDropdownOpen)}
            title="Switch or set topic before snapping"
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: activeTopic?.color || 'var(--accent-purple)',
                boxShadow: `0 0 8px ${activeTopic?.color || 'var(--accent-purple)'}`
              }}
            />
            <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, fontSize: 13 }}>
              {activeTopic ? activeTopic.name : 'Select Topic'}
            </span>
            <ChevronDown size={14} style={{ opacity: 0.7 }} />
          </button>

          {/* Quick Topic Dropdown */}
          {isTopicDropdownOpen && (
            <div
              className="glass-modal"
              style={{
                position: 'absolute',
                top: 45,
                left: 0,
                width: 280,
                padding: '8px 0',
                zIndex: 60,
                borderRadius: 14,
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <div style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Active Topic / Track
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {topics.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      onSelectTopic(t.id);
                      setIsTopicDropdownOpen(false);
                    }}
                    style={{
                      padding: '9px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      background: t.id === activeTopic?.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                      color: t.id === activeTopic?.id ? '#ffffff' : 'var(--text-secondary)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: t.color || '#a78bfa', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{t.name}</span>
                    </div>
                    {t.id === activeTopic?.id && <Check size={14} color="var(--accent-purple)" />}
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '6px 8px 2px' }}>
                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'flex-start', fontSize: 12, padding: '6px 10px' }}
                  onClick={() => {
                    setIsTopicDropdownOpen(false);
                    onOpenTopicManager();
                  }}
                >
                  <Plus size={14} /> + New Topic / Session
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Framing & Camera switch buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn btn-ghost btn-pill"
            style={{ width: 36, height: 36, padding: 0, background: showGrid ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.4)' }}
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle slide framing grid"
          >
            <Grid size={16} />
          </button>

          <button
            className="btn btn-ghost btn-pill"
            style={{ width: 36, height: 36, padding: 0, background: 'rgba(0,0,0,0.4)' }}
            onClick={toggleFacingMode}
            title="Switch between rear and front camera"
          >
            <SwitchCamera size={16} />
          </button>
        </div>
      </div>

      {/* Main Viewfinder Feed */}
      <div className="camera-feed-wrapper">
        {cameraError ? (
          <div style={{ textAlign: 'center', padding: 24, maxWidth: 380 }}>
            <Camera size={48} color="var(--accent-purple)" style={{ marginBottom: 12, opacity: 0.8 }} />
            <h3 style={{ fontSize: 17, marginBottom: 8 }}>Camera Not Accessible</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 18 }}>
              {cameraError}. You can still capture presentation slides by picking photos from your device library!
            </p>
            <button
              className="btn btn-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} /> Upload Slide Photos
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="camera-video-elem"
          />
        )}

        {/* 16:9 Presentation Framing Guide */}
        {showGrid && !cameraError && (
          <div className="slide-framing-guide focused">
            <div className="frame-corner frame-corner-tl" />
            <div className="frame-corner frame-corner-tr" />
            <div className="frame-corner frame-corner-bl" />
            <div className="frame-corner frame-corner-br" />
            <div className="frame-label">16:9 Slide Frame</div>
          </div>
        )}

        {/* Flash Effect on capture */}
        <div className={`camera-flash-overlay ${isFlashing ? 'flashing' : ''}`} />
      </div>

      {/* Bottom Dock with Rapid Snaps & Controls */}
      <div className="camera-bottom-dock">
        {/* Rapid Multi-shot thumbnails strip */}
        {recentSlides.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Current Session: {activeTopic?.name} ({recentSlides.length} slides)
            </span>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: '2px 8px', height: 'auto' }}
              onClick={onOpenGallery}
            >
              View All ({recentSlides.length})
            </button>
          </div>
        )}

        {recentSlides.length > 0 && (
          <div className="rapid-snaps-strip">
            {recentSlides.slice(-8).map((slide, idx) => (
              <div
                key={slide.id}
                className="rapid-snap-thumb"
                onClick={() => onOpenSlideDetail(slide)}
                title={slide.title}
              >
                <img src={slide.imageData} alt="slide preview" />
                <span className="rapid-snap-number">#{recentSlides.length - recentSlides.slice(-8).length + idx + 1}</span>
              </div>
            ))}
          </div>
        )}

        {/* Shutter Action Bar */}
        <div className="camera-actions-row">
          {/* Pick File from Disk/Gallery */}
          <button
            className="btn btn-ghost btn-pill"
            style={{ width: 48, height: 48, padding: 0, background: 'rgba(255,255,255,0.06)' }}
            onClick={() => fileInputRef.current?.click()}
            title="Import photo from device"
          >
            <Upload size={20} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            multiple
            style={{ display: 'none' }}
          />

          {/* Rapid Snap Shutter Button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <button
              className="shutter-btn-outer"
              onClick={() => triggerCapture(false)}
              title="Snap slide (instant auto-save into active topic)"
            >
              <div className="shutter-btn-inner" />
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
              Rapid Snap
            </span>
          </div>

          {/* Snap with Title / Notes Modal */}
          <button
            className="btn btn-ghost btn-pill"
            style={{ width: 48, height: 48, padding: 0, background: 'rgba(255,255,255,0.06)' }}
            onClick={() => triggerCapture(true)}
            title="Snap with custom title & notes prompt"
          >
            <Sparkles size={20} color="var(--accent-purple)" />
          </button>
        </div>
      </div>

      {/* Quick Title & Notes Prompt Modal */}
      {quickTitleModal && pendingCapture && (
        <div className="modal-backdrop">
          <div className="modal-container glass-modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 16 }}>Captured Slide Details</h3>
              <button
                className="btn btn-ghost btn-pill"
                style={{ width: 32, height: 32, padding: 0 }}
                onClick={() => setQuickTitleModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ width: '100%', height: 160, borderRadius: 8, overflow: 'hidden', background: '#000' }}>
                <img
                  src={pendingCapture.imageData}
                  alt="Captured slide"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Slide Title / Heading
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Distributed Consensus Architecture"
                  value={customSlideTitle}
                  onChange={(e) => setCustomSlideTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Quick Speaker Note / Takeaway
                </label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="e.g. Speaker said this reduces recovery latency to 10ms..."
                  value={quickNotes}
                  onChange={(e) => setQuickNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setQuickTitleModal(false)}
              >
                Discard
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSavePendingCapture}
              >
                <Check size={16} /> Save to {activeTopic?.name}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
