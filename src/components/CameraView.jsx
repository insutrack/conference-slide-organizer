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
  Layers,
  Edit3,
  X,
  Sparkles
} from 'lucide-react';
import { playShutterSound } from '../utils/audio';

export function CameraView({
  conference,
  topics = [],
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
  const topicInputRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' is rear camera
  const [cameraError, setCameraError] = useState(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false);
  const [newTopicInput, setNewTopicInput] = useState('');
  const [isCreatingNewSession, setIsCreatingNewSession] = useState(false);
  const [lastSavedToast, setLastSavedToast] = useState('');
  const [missingSessionPrompt, setMissingSessionPrompt] = useState(false);

  // Active topic object
  const activeTopic = topics.find((t) => t.id === activeTopicId) || null;

  // Auto-focus input when prompt or session creation opens
  useEffect(() => {
    if ((!activeTopic || isCreatingNewSession) && topicInputRef.current) {
      topicInputRef.current.focus();
    }
  }, [activeTopic, isCreatingNewSession]);

  // Start & Maintain Camera Stream
  useEffect(() => {
    let active = true;

    async function initCamera() {
      setCameraError(null);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera hardware access is not directly available in this browser window.');
        }

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

  // Start Session with Custom Name
  const handleStartSessionSubmit = (e) => {
    if (e) e.preventDefault();
    const cleanName = newTopicInput.trim();
    if (!cleanName) return;

    if (onStartSession) {
      onStartSession(cleanName);
    }
    setNewTopicInput('');
    setIsCreatingNewSession(false);
    setMissingSessionPrompt(false);
  };

  // Capture Frame Immediately (Rapid Auto-Save)
  const triggerCapture = () => {
    // Check if user has entered a session name before taking pictures
    if (!activeTopic) {
      setMissingSessionPrompt(true);
      setIsCreatingNewSession(true);
      if (topicInputRef.current) topicInputRef.current.focus();
      return;
    }

    const slideNumber = recentSlides.length + 1;
    const defaultTitle = `${activeTopic.name} - Slide #${slideNumber}`;

    if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
      const video = videoRef.current;

      playShutterSound();
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 200);

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

      onSlideCaptured({
        imageData: dataUrl,
        title: defaultTitle,
        topicId: activeTopic.id,
        conferenceId: conference ? conference.id : null,
        notes: ''
      });

      showSavedConfirmation(slideNumber);
    } else {
      // Clean fallback if camera hardware is not available
      fallbackCaptureClean(defaultTitle, slideNumber);
    }
  };

  // Toast confirmation for auto-save
  const showSavedConfirmation = (num) => {
    setLastSavedToast(`Slide #${num} Auto-Saved!`);
    setTimeout(() => setLastSavedToast(''), 2200);
  };

  // Clean fallback slide (zero fake preloaded text)
  const fallbackCaptureClean = (defaultTitle, slideNumber) => {
    playShutterSound();
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    // Blank dark presentation canvas
    ctx.fillStyle = '#0a0d16';
    ctx.fillRect(0, 0, 1920, 1080);

    // Subtle header accent
    ctx.fillStyle = activeTopic?.color || '#8b5cf6';
    ctx.fillRect(80, 80, 14, 70);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px sans-serif';
    ctx.fillText(activeTopic?.name || 'Session Slide', 120, 135);

    ctx.fillStyle = '#64748b';
    ctx.font = '28px monospace';
    ctx.fillText(`Slide #${slideNumber} • Captured ${new Date().toLocaleTimeString()}`, 120, 190);

    // Clean outline
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.strokeRect(60, 60, 1800, 960);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    onSlideCaptured({
      imageData: dataUrl,
      title: defaultTitle,
      topicId: activeTopic?.id,
      conferenceId: conference ? conference.id : null,
      notes: ''
    });

    showSavedConfirmation(slideNumber);
  };

  // Handle File Upload Fallback
  const handleFileUpload = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!activeTopic) {
      setMissingSessionPrompt(true);
      setIsCreatingNewSession(true);
      return;
    }

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        const slideNumber = recentSlides.length + index + 1;
        const defaultTitle = file.name.replace(/\.[^/.]+$/, '') || `${activeTopic.name} #${slideNumber}`;

        onSlideCaptured({
          imageData: dataUrl,
          title: defaultTitle,
          topicId: activeTopic.id,
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
      {/* Top Banner: UNMISSABLE OPTION TO ADD SESSION NAME BEFORE TAKING PICS */}
      <div className="camera-topic-bar" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 16px' }}>
        
        {/* CASE 1: NO SESSION ACTIVE YET OR USER WANTS TO ADD/RENAME SESSION */}
        {!activeTopic || isCreatingNewSession ? (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.22) 0%, rgba(6, 182, 212, 0.16) 100%)',
              border: missingSessionPrompt ? '2px solid #f43f5e' : '2px solid rgba(139, 92, 246, 0.55)',
              borderRadius: 14,
              padding: '14px 18px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🏷️</span>
                <div>
                  <h3 style={{ fontSize: 14.5, color: '#ffffff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {missingSessionPrompt ? '⚠️ Please Add Session Name to Begin Snapping' : 'Add Session Name Before Starting Pics'}
                  </h3>
                  <p style={{ fontSize: 12, color: missingSessionPrompt ? '#fca5a5' : 'var(--text-secondary)' }}>
                    Type the topic or speaker name below. All photos you snap will be auto-saved into this session.
                  </p>
                </div>
              </div>

              {activeTopic && (
                <button
                  className="btn btn-ghost btn-pill"
                  style={{ width: 28, height: 28, padding: 0 }}
                  onClick={() => {
                    setIsCreatingNewSession(false);
                    setMissingSessionPrompt(false);
                  }}
                  title="Cancel renaming"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <form onSubmit={handleStartSessionSubmit} style={{ display: 'flex', gap: 8 }}>
              <input
                ref={topicInputRef}
                type="text"
                className="input-field"
                placeholder="Enter Session Name (e.g., Keynote, AI in Healthcare, Panel)..."
                value={newTopicInput}
                onChange={(e) => {
                  setNewTopicInput(e.target.value);
                  if (missingSessionPrompt) setMissingSessionPrompt(false);
                }}
                style={{
                  fontSize: 14,
                  padding: '10px 14px',
                  flex: 1,
                  background: 'rgba(10, 13, 22, 0.95)',
                  borderColor: missingSessionPrompt ? '#f43f5e' : 'var(--accent-purple)'
                }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ fontSize: 13, padding: '10px 20px', fontWeight: 700, whiteSpace: 'nowrap' }}
              >
                <Check size={16} /> Start Session
              </button>
            </form>
          </div>
        ) : (
          /* CASE 2: SESSION IS ACTIVE - PROMINENT GLOWING SESSION BAR */
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              borderRadius: 14,
              padding: '10px 16px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
              flexWrap: 'wrap',
              gap: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: activeTopic.color || 'var(--accent-purple)',
                  boxShadow: `0 0 10px ${activeTopic.color || 'var(--accent-purple)'}`,
                  flexShrink: 0
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🟢 Active Session
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    • {recentSlides.length} slides auto-saved
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#ffffff',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 240
                  }}
                  title={activeTopic.name}
                >
                  {activeTopic.name}
                </div>
              </div>

              {/* Edit Session Name & New Session buttons */}
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 11.5, padding: '3px 8px', height: 'auto', color: 'var(--accent-cyan)' }}
                  onClick={() => {
                    setNewTopicInput(activeTopic.name);
                    setIsCreatingNewSession(true);
                  }}
                  title="Rename current session"
                >
                  <Edit3 size={12} /> Rename
                </button>

                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 11.5, padding: '3px 8px', height: 'auto' }}
                  onClick={() => {
                    setNewTopicInput('');
                    setIsCreatingNewSession(true);
                  }}
                  title="Start another session"
                >
                  <Plus size={12} /> New Session
                </button>
              </div>
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
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)'
                }}
                onClick={() => onFinishSession(activeTopic.id)}
                title="Finish session and compile into PDF, PPTX, Notes, or ZIP"
              >
                <Flag size={14} />
                <span>Finish Session ({recentSlides.length})</span>
              </button>

              <button
                className="btn btn-ghost btn-pill"
                style={{ width: 34, height: 34, padding: 0, background: showGrid ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.4)' }}
                onClick={() => setShowGrid(!showGrid)}
                title="Toggle framing grid"
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
        )}

        {/* Reassurance Banner: Photo Snap Mode (No video recording) */}
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
            <span style={{ color: '#10b981' }}>{activeTopic ? 'Active' : 'Awaiting Session Name'}</span>
          </div>
        </div>
      </div>

      {/* Main Viewfinder Feed */}
      <div className="camera-feed-wrapper" onClick={triggerCapture} style={{ cursor: 'pointer' }} title={activeTopic ? 'Tap anywhere to snap slide photo' : 'Add session name first to snap'}>
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
                <Camera size={15} /> Snap Test Slide
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

        {/* Clean 16:9 Slide Framing Guide */}
        {showGrid && !cameraError && (
          <div className="slide-framing-guide focused">
            <div className="frame-corner frame-corner-tl" />
            <div className="frame-corner frame-corner-tr" />
            <div className="frame-corner frame-corner-bl" />
            <div className="frame-corner frame-corner-br" />
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
        {recentSlides.length > 0 && activeTopic && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Current Session: {activeTopic.name} ({recentSlides.length} slides auto-saved)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 11, padding: '2px 8px', height: 'auto', color: 'var(--accent-emerald)' }}
                onClick={() => onFinishSession(activeTopic.id)}
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
              title={activeTopic ? `Snap photo for "${activeTopic.name}"` : 'Enter session name first to snap'}
            >
              <div className="shutter-btn-inner" />
            </button>
            <span style={{ fontSize: 11, color: activeTopic ? 'var(--text-secondary)' : '#f87171', fontWeight: 700 }}>
              {activeTopic ? 'SNAP PHOTO (AUTO-SAVE)' : 'ENTER SESSION NAME FIRST'}
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
