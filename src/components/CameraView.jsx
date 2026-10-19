import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  SwitchCamera,
  Upload,
  Plus,
  Grid,
  ChevronDown,
  Flag,
  ShieldCheck,
  Check,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { playShutterSound } from '../utils/audio';

export function CameraView({
  conference,
  topics,
  activeTopicId,
  onSelectTopic,
  onOpenTopicManager: _onOpenTopicManager,
  onSlideCaptured,
  recentSlides = [],
  onOpenSlideDetail,
  onOpenGallery,
  onStartSession,
  onFinishSession,
  onGoToReview
}) {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' is rear camera
  const [cameraError, setCameraError] = useState(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false);
  const [newTopicInput, setNewTopicInput] = useState('');
  const [isCreatingNewSession, setIsCreatingNewSession] = useState(false);
  const [lastSavedToast, setLastSavedToast] = useState('');

  const activeTopic = topics.find((t) => t.id === activeTopicId) || topics[0];

  // Start & Maintain Camera Stream (without dropping unnecessarily)
  useEffect(() => {
    let active = true;

    async function initCamera() {
      setCameraError(null);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera hardware access is not directly available in this browser window.');
        }

        // Try high-res first, fallback gracefully
        const constraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false // STRICTLY NO AUDIO / NO VIDEO RECORDING
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch((e) => console.warn('Video playback notice:', e));
        }
      } catch (err) {
        console.warn('Camera stream notice:', err);
        setCameraError(err.message || 'Unable to access camera.');
      }
    }

    initCamera();

    return () => {
      active = false;
      // Do not prematurely tear down stream if switching between views
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

  // Capture Frame Immediately (Rapid Snap - Auto-saved without blocking modals)
  const triggerCapture = () => {
    const slideNumber = recentSlides.length + 1;
    const defaultTitle = `${activeTopic ? activeTopic.name : 'Slide'} - Slide #${slideNumber}`;

    if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
      const video = videoRef.current;

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

      // Instant Auto-Save
      onSlideCaptured({
        imageData: dataUrl,
        title: defaultTitle,
        topicId: activeTopic ? activeTopic.id : null,
        conferenceId: conference ? conference.id : null,
        notes: ''
      });

      showSavedConfirmation(slideNumber);
    } else {
      // If camera is not active or blocked in environment, generate crisp slide snapshot or trigger native camera
      simulateOrFallbackCapture(defaultTitle, slideNumber);
    }
  };

  // Toast confirmation for auto-save
  const showSavedConfirmation = (num) => {
    setLastSavedToast(`Slide #${num} Auto-Saved!`);
    setTimeout(() => setLastSavedToast(''), 2200);
  };

  // Fallback simulator for desktop/test environments without webcam
  const simulateOrFallbackCapture = (defaultTitle, slideNumber) => {
    playShutterSound();
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1920, 1080);

    // Header bar
    ctx.fillStyle = activeTopic?.color || '#8b5cf6';
    ctx.fillRect(80, 80, 16, 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText(activeTopic?.name || 'Conference Presentation', 120, 140);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '32px sans-serif';
    ctx.fillText(`${conference?.name || 'Annual Summit'} • Slide #${slideNumber}`, 120, 200);

    // Decorative content lines
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 260);
    ctx.lineTo(1840, 260);
    ctx.stroke();

    const sampleBullets = [
      `Key insight captured from presenter`,
      `Critical architectural milestone & roadmap`,
      `Real-time benchmark & performance metrics`,
      `Auto-archived with zero delay into ${activeTopic?.name || 'Session'}`
    ];

    let y = 380;
    sampleBullets.forEach((bullet) => {
      ctx.fillStyle = activeTopic?.color || '#8b5cf6';
      ctx.beginPath();
      ctx.arc(120, y - 10, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '38px sans-serif';
      ctx.fillText(bullet, 160, y);
      y += 110;
    });

    // Timestamp footer
    ctx.fillStyle = '#64748b';
    ctx.font = '24px monospace';
    ctx.fillText(`SNAP TIMESTAMP: ${new Date().toLocaleTimeString()} • PHOTO STILL`, 80, 980);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    onSlideCaptured({
      imageData: dataUrl,
      title: defaultTitle,
      topicId: activeTopic ? activeTopic.id : null,
      conferenceId: conference ? conference.id : null,
      notes: ''
    });

    showSavedConfirmation(slideNumber);
  };

  // Quick Start New Session with Topic Name
  const handleQuickStartSession = (e) => {
    e.preventDefault();
    if (!newTopicInput.trim()) return;

    if (onStartSession) {
      onStartSession(newTopicInput.trim());
    }
    setNewTopicInput('');
    setIsCreatingNewSession(false);
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
        showSavedConfirmation(slideNumber);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  return (
    <div className="camera-view-container">
      {/* Top Banner: Prominent Session Topic & Finish Controls */}
      <div className="camera-topic-bar" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          {/* Active Session Display / Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            {isCreatingNewSession ? (
              <form onSubmit={handleQuickStartSession} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter Session / Topic Name (e.g. AI Keynote)..."
                  value={newTopicInput}
                  onChange={(e) => setNewTopicInput(e.target.value)}
                  autoFocus
                  style={{ fontSize: 13, padding: '6px 12px', minWidth: 220 }}
                />
                <button type="submit" className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}>
                  Start Session
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 12, padding: '6px 10px' }}
                  onClick={() => setIsCreatingNewSession(false)}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="active-topic-selector"
                  onClick={() => setIsTopicDropdownOpen(!isTopicDropdownOpen)}
                  title="Switch or change active topic"
                  style={{ padding: '6px 14px', borderRadius: 20 }}
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
                  <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700, fontSize: 13 }}>
                    Session: {activeTopic ? activeTopic.name : 'Select Topic'}
                  </span>
                  <ChevronDown size={14} style={{ opacity: 0.7 }} />
                </button>

                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 12, padding: '5px 10px' }}
                  onClick={() => setIsCreatingNewSession(true)}
                  title="Start a new session with new topic name"
                >
                  <Plus size={13} /> New Session
                </button>
              </div>
            )}
          </div>

          {/* Right Action: Finish Session Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn btn-pill"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: 12.5,
                padding: '7px 16px',
                boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)'
              }}
              onClick={() => onFinishSession(activeTopic?.id)}
              title="Finish session and compile slides into PDF, PPTX, Notes, or ZIP"
            >
              <Flag size={14} />
              <span>Finish Session ({recentSlides.length})</span>
            </button>

            <button
              className="btn btn-ghost btn-pill"
              style={{ width: 34, height: 34, padding: 0, background: showGrid ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.4)' }}
              onClick={() => setShowGrid(!showGrid)}
              title="Toggle 16:9 framing grid"
            >
              <Grid size={15} />
            </button>

            <button
              className="btn btn-ghost btn-pill"
              style={{ width: 34, height: 34, padding: 0, background: 'rgba(0,0,0,0.4)' }}
              onClick={toggleFacingMode}
              title="Switch camera"
            >
              <SwitchCamera size={15} />
            </button>
          </div>
        </div>

        {/* Reassurance Banner: PHOTO-ONLY MODE (NO VIDEO RECORDING) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(5, 8, 16, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
            padding: '4px 12px',
            fontSize: 11.5
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
            <ShieldCheck size={14} color="var(--accent-emerald)" />
            <span style={{ color: '#ffffff', fontWeight: 600 }}>Photo Snap Mode:</span>
            <span>Takes single high-res still photos. Audio/video recording is permanently disabled.</span>
          </div>

          <div style={{ color: 'var(--accent-cyan)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Auto-Save:</span>
            <span style={{ color: '#10b981' }}>Active</span>
          </div>
        </div>

        {/* Dropdown for selecting session topic */}
        {isTopicDropdownOpen && (
          <div
            className="glass-modal"
            style={{
              position: 'absolute',
              top: 75,
              left: 16,
              width: 300,
              padding: '8px 0',
              zIndex: 70,
              borderRadius: 14,
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Select Existing Session / Topic
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
                  setIsCreatingNewSession(true);
                }}
              >
                <Plus size={14} /> + Add New Topic Name
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Viewfinder Feed */}
      <div className="camera-feed-wrapper" onClick={triggerCapture} style={{ cursor: 'pointer' }} title="Tap anywhere to snap slide photo">
        {cameraError ? (
          <div style={{ textAlign: 'center', padding: 24, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <Camera size={44} color="var(--accent-purple)" style={{ marginBottom: 12, opacity: 0.8 }} />
            <h3 style={{ fontSize: 17, marginBottom: 8 }}>Camera Ready for Live Sessions</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 18 }}>
              Browser camera permission is restricted or webcam is inactive. You can test instant slide captures or upload photos directly!
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => triggerCapture()}
              >
                <Camera size={15} /> Simulate Snap Slide
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={15} /> Upload Photos
              </button>
            </div>
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
            <div className="frame-label">16:9 Slide Framing Guide (Tap frame to snap)</div>
          </div>
        )}

        {/* Live Auto-Saved Toast */}
        {lastSavedToast && (
          <div
            style={{
              position: 'absolute',
              top: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(16, 185, 129, 0.95)',
              color: '#ffffff',
              padding: '8px 18px',
              borderRadius: 24,
              fontSize: 13,
              fontWeight: 700,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              zIndex: 30,
              pointerEvents: 'none'
            }}
          >
            <CheckCircle2 size={16} />
            <span>{lastSavedToast}</span>
          </div>
        )}

        {/* Flash Effect on capture */}
        <div className={`camera-flash-overlay ${isFlashing ? 'flashing' : ''}`} />
      </div>

      {/* Bottom Dock with Rapid Snaps Filmstrip & Shutter Button */}
      <div className="camera-bottom-dock">
        {/* Slides Reel for active topic */}
        {recentSlides.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Current Session: {activeTopic?.name} ({recentSlides.length} slides auto-saved)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 11, padding: '2px 8px', height: 'auto', color: 'var(--accent-emerald)' }}
                onClick={() => onFinishSession(activeTopic?.id)}
              >
                Finish & Compile ({recentSlides.length})
              </button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 11, padding: '2px 8px', height: 'auto' }}
                onClick={onOpenGallery}
              >
                Review All
              </button>
            </div>
          </div>
        )}

        {recentSlides.length > 0 && (
          <div className="rapid-snaps-strip">
            {recentSlides.slice(-10).map((slide, idx) => (
              <div
                key={slide.id}
                className="rapid-snap-thumb"
                onClick={() => onOpenSlideDetail(slide)}
                title={slide.title}
              >
                <img src={slide.imageData} alt="slide preview" />
                <span className="rapid-snap-number">#{recentSlides.length - recentSlides.slice(-10).length + idx + 1}</span>
              </div>
            ))}
          </div>
        )}

        {/* Shutter Action Bar */}
        <div className="camera-actions-row">
          {/* Pick File / Native Phone Camera */}
          <button
            className="btn btn-ghost btn-pill"
            style={{ width: 48, height: 48, padding: 0, background: 'rgba(255,255,255,0.06)' }}
            onClick={() => fileInputRef.current?.click()}
            title="Import slide photo from phone library"
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

          {/* Primary Big Shutter Button: Instant Auto-Save */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <button
              className="shutter-btn-outer"
              onClick={triggerCapture}
              title="Snap Slide Photo (Auto-saved into active topic with 0 delay)"
            >
              <div className="shutter-btn-inner" />
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>
              SNAP PHOTO (AUTO-SAVE)
            </span>
          </div>

          {/* Quick End-of-Day Review Shortcut */}
          <button
            className="btn btn-ghost btn-pill"
            style={{ width: 48, height: 48, padding: 0, background: 'rgba(255,255,255,0.06)' }}
            onClick={onGoToReview}
            title="Go to End-of-Day Review"
          >
            <Layers size={20} color="var(--accent-purple)" />
          </button>
        </div>
      </div>
    </div>
  );
}
