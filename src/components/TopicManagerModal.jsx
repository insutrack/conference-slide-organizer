import React, { useState } from 'react';
import { Plus, X, Trash2, Edit2, Check, FolderPlus, Tag } from 'lucide-react';

const PRESET_COLORS = [
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#3b82f6', // blue
  '#ec4899', // pink
  '#6366f1'  // indigo
];

export function TopicManagerModal({
  topics,
  activeTopicId,
  slides,
  onSaveTopic,
  onDeleteTopic,
  onSelectTopic,
  onClose
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState(null);

  const [name, setName] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingTopicId(null);
    setName('');
    setSpeaker('');
    setSelectedColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
  };

  const handleStartEdit = (topic) => {
    setEditingTopicId(topic.id);
    setIsCreating(true);
    setName(topic.name);
    setSpeaker(topic.speaker || '');
    setSelectedColor(topic.color || PRESET_COLORS[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveTopic({
      id: editingTopicId || `topic-${Date.now()}`,
      name: name.trim(),
      speaker: speaker.trim(),
      color: selectedColor,
      order: editingTopicId ? undefined : topics.length
    });

    setIsCreating(false);
    setEditingTopicId(null);
    setName('');
    setSpeaker('');
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container glass-modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 6, borderRadius: 8, background: 'rgba(139, 92, 246, 0.2)' }}>
              <FolderPlus size={18} color="var(--accent-purple)" />
            </div>
            <div>
              <h3 style={{ fontSize: 16 }}>Manage Topics & Sessions</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Organize incoming slides by talk or track
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
          {/* Create or Edit Form */}
          {isCreating ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-accent)' }}>
                {editingTopicId ? 'Edit Topic / Session' : 'Add New Topic / Session'}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Topic or Talk Title *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Keynote: AI Foundation Models"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Speaker / Presenter (Optional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Dr. Jane Doe (MIT)"
                  value={speaker}
                  onChange={(e) => setSpeaker(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Topic Accent Color
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map((c) => (
                    <div
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        backgroundColor: c,
                        cursor: 'pointer',
                        border: selectedColor === c ? '2.5px solid #ffffff' : '1px solid transparent',
                        boxShadow: selectedColor === c ? `0 0 12px ${c}` : 'none',
                        transition: 'transform 0.15s ease'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={15} /> Save Topic
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {topics.length} Configured Topics
              </span>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 13, padding: '7px 12px' }}
                onClick={handleStartCreate}
              >
                <Plus size={15} /> Add New Topic
              </button>
            </div>
          )}

          {/* Topics List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
            {topics.map((t) => {
              const topicSlideCount = slides.filter((s) => s.topicId === t.id).length;
              const isActive = t.id === activeTopicId;

              return (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: isActive ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isActive ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: 'pointer', minWidth: 0 }}
                    onClick={() => {
                      onSelectTopic(t.id);
                      onClose();
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: t.color || '#a78bfa',
                        boxShadow: `0 0 8px ${t.color || '#a78bfa'}`,
                        flexShrink: 0
                      }}
                    />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.name}
                        </span>
                        {isActive && (
                          <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.3)', color: '#c4b5fd', fontSize: 10 }}>
                            Active
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {t.speaker ? `${t.speaker} • ` : ''}{topicSlideCount} slides
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn btn-ghost btn-pill"
                      style={{ width: 32, height: 32, padding: 0 }}
                      onClick={() => handleStartEdit(t)}
                      title="Edit topic name or speaker"
                    >
                      <Edit2 size={14} />
                    </button>
                    {topics.length > 1 && (
                      <button
                        className="btn btn-ghost btn-pill"
                        style={{ width: 32, height: 32, padding: 0, color: 'var(--accent-rose)' }}
                        onClick={() => {
                          if (confirm(`Delete topic "${t.name}"? Slides in this topic will also be removed.`)) {
                            onDeleteTopic(t.id);
                          }
                        }}
                        title="Delete topic"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
