import React, { useState } from 'react';
import {
  X,
  FileText,
  Sparkles,
  FolderInput,
  Trash2,
  Check,
  Loader2,
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { recognizeSlideText } from '../services/ocr';
import { summarizeSlide } from '../services/gemini';

export function SlideDetailModal({
  slide,
  topics,
  geminiApiKey,
  onSaveSlide,
  onDeleteSlide,
  onClose,
  onPrevSlide,
  onNextSlide,
  hasPrev,
  hasNext
}) {
  const [title, setTitle] = useState(slide.title || '');
  const [topicId, setTopicId] = useState(slide.topicId || topics[0]?.id || '');
  const [notes, setNotes] = useState(slide.notes || '');
  const [ocrText, setOcrText] = useState(slide.ocrText || '');
  const [aiSummary, setAiSummary] = useState(slide.aiSummary || '');

  const [ocrProgress, setOcrProgress] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const activeTopic = topics.find((t) => t.id === topicId);

  // Run Local OCR on Slide Image
  const handleRunOcr = async () => {
    try {
      setOcrProgress(1);
      const res = await recognizeSlideText(slide.imageData, (prog) => {
        setOcrProgress(prog);
      });

      setOcrText(res.text);

      // If user hasn't set custom title or it's default, propose detected heading
      if (res.titleSuggestion && (!title || title.includes('Slide #') || title.startsWith('Untitled'))) {
        setTitle(res.titleSuggestion);
      }
    } catch (err) {
      alert('OCR failed: ' + (err.message || 'Unknown error'));
    } finally {
      setOcrProgress(null);
    }
  };

  // Run AI / Hybrid Summarizer
  const handleGenerateSummary = async () => {
    setIsSummarizing(true);
    try {
      const summary = await summarizeSlide({
        apiKey: geminiApiKey,
        title,
        topicName: activeTopic?.name,
        ocrText,
        imageData: slide.imageData,
        notes
      });
      setAiSummary(summary);
    } catch (err) {
      alert('Summarization failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSummarizing(false);
    }
  };

  // Save changes
  const handleSave = () => {
    onSaveSlide({
      ...slide,
      title: title.trim() || 'Slide',
      topicId,
      notes: notes.trim(),
      ocrText,
      aiSummary
    });
    onClose();
  };

  const handleCopyNotes = () => {
    const textToCopy = `### ${title}\nTopic: ${activeTopic?.name}\n\n${aiSummary || ocrText || notes}`;
    navigator.clipboard.writeText(textToCopy);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container glass-modal" style={{ maxWidth: 840, maxHeight: '94vh' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: activeTopic?.color || 'var(--accent-purple)'
              }}
            />
            <h3 style={{ fontSize: 16 }}>Edit Slide & AI Analysis</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {hasPrev && (
              <button
                className="btn btn-ghost btn-pill"
                style={{ width: 32, height: 32, padding: 0 }}
                onClick={onPrevSlide}
                title="Previous slide"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            {hasNext && (
              <button
                className="btn btn-ghost btn-pill"
                style={{ width: 32, height: 32, padding: 0 }}
                onClick={onNextSlide}
                title="Next slide"
              >
                <ChevronRight size={16} />
              </button>
            )}
            <button
              className="btn btn-ghost btn-pill"
              style={{ width: 32, height: 32, padding: 0 }}
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body (Two columns on desktop) */}
        <div className="modal-body" style={{ padding: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Left Column: Image preview & Topic Reassignment */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 9',
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: '#020617',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <img
                  src={slide.imageData}
                  alt="Slide capture"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>

              {/* Move / Reassign Topic */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: 12, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  <FolderInput size={15} color="var(--accent-purple)" />
                  Assigned Topic / Folder (Fix misplaced slides)
                </label>
                <select
                  className="input-field"
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                  style={{ background: 'rgba(15, 20, 35, 0.9)' }}
                >
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  Select any other topic to move this slide instantly.
                </span>
              </div>

              {/* Actions row: Run OCR or Delete */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: 13 }}
                  onClick={handleRunOcr}
                  disabled={ocrProgress !== null}
                >
                  {ocrProgress !== null ? (
                    <>
                      <Loader2 size={14} className="spin" /> Reading Text ({ocrProgress}%)
                    </>
                  ) : (
                    <>
                      <FileText size={14} color="var(--accent-cyan)" /> Extract Text (OCR)
                    </>
                  )}
                </button>

                <button
                  className="btn btn-ghost"
                  style={{ color: 'var(--accent-rose)' }}
                  onClick={() => {
                    if (confirm('Delete this slide permanently?')) {
                      onDeleteSlide(slide.id);
                      onClose();
                    }
                  }}
                  title="Delete slide"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Right Column: Title, Notes & AI Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Slide Title / Headline
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Distributed Consensus Engine"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  My Quick Notes
                </label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Takeaways, speaker comments, questions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* AI Slide Summary Card */}
              <div
                style={{
                  background: 'rgba(139, 92, 246, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: 12,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#c4b5fd' }}>
                    <Sparkles size={15} color="#c4b5fd" />
                    AI Slide Insights & Takeaways
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: 11, padding: '4px 10px', height: 'auto' }}
                    onClick={handleGenerateSummary}
                    disabled={isSummarizing}
                  >
                    {isSummarizing ? (
                      <>
                        <Loader2 size={12} className="spin" /> Analyzing...
                      </>
                    ) : (
                      'Generate with AI'
                    )}
                  </button>
                </div>

                {aiSummary ? (
                  <div
                    style={{
                      fontSize: 12.5,
                      lineHeight: 1.55,
                      color: '#e2e8f0',
                      maxHeight: 180,
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      background: 'rgba(10, 14, 25, 0.6)',
                      padding: 10,
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    {aiSummary}
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Tap "Generate with AI" to summarize this slide into key takeaways and actionable bullet points.
                  </span>
                )}
              </div>

              {/* Extracted Raw OCR Text (Collapsible) */}
              {ocrText && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                    Extracted Text from Image (OCR)
                  </label>
                  <div
                    style={{
                      maxHeight: 90,
                      overflowY: 'auto',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      background: 'rgba(5, 8, 16, 0.8)',
                      padding: 8,
                      borderRadius: 6,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {ocrText}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            className="btn btn-ghost"
            onClick={handleCopyNotes}
            title="Copy notes to clipboard"
          >
            {copySuccess ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
            {copySuccess ? 'Copied!' : 'Copy Summary'}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Check size={15} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
