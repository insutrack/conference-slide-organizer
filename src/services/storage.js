// IndexedDB wrapper for conference, topic, and slide storage
const DB_NAME = 'SlideSnapDB';
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('conferences')) {
        const confStore = db.createObjectStore('conferences', { keyPath: 'id' });
        confStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('topics')) {
        const topicStore = db.createObjectStore('topics', { keyPath: 'id' });
        topicStore.createIndex('conferenceId', 'conferenceId', { unique: false });
        topicStore.createIndex('order', 'order', { unique: false });
      }

      if (!db.objectStoreNames.contains('slides')) {
        const slideStore = db.createObjectStore('slides', { keyPath: 'id' });
        slideStore.createIndex('conferenceId', 'conferenceId', { unique: false });
        slideStore.createIndex('topicId', 'topicId', { unique: false });
        slideStore.createIndex('capturedAt', 'capturedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// Generic transaction helper
async function performTx(storeName, mode, callback) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = callback(store);

    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = () => reject(tx.error);
  });
}

// Conferences
export async function getConferences() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('conferences', 'readonly');
    const store = tx.objectStore('conferences');
    const request = store.getAll();
    request.onsuccess = () => {
      const list = request.result || [];
      list.sort((a, b) => b.createdAt - a.createdAt);
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveConference(conference) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('conferences', 'readwrite');
    const store = tx.objectStore('conferences');
    const request = store.put(conference);
    request.onsuccess = () => resolve(conference);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteConference(conferenceId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['conferences', 'topics', 'slides'], 'readwrite');
    
    // delete conf
    tx.objectStore('conferences').delete(conferenceId);

    // delete topics
    const topicStore = tx.objectStore('topics');
    const topicIndex = topicStore.index('conferenceId');
    const topicReq = topicIndex.openKeyCursor(IDBKeyRange.only(conferenceId));
    topicReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        topicStore.delete(cursor.primaryKey);
        cursor.continue();
      }
    };

    // delete slides
    const slideStore = tx.objectStore('slides');
    const slideIndex = slideStore.index('conferenceId');
    const slideReq = slideIndex.openKeyCursor(IDBKeyRange.only(conferenceId));
    slideReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        slideStore.delete(cursor.primaryKey);
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// Topics
export async function getTopics(conferenceId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('topics', 'readonly');
    const store = tx.objectStore('topics');
    const index = store.index('conferenceId');
    const request = index.getAll(IDBKeyRange.only(conferenceId));
    request.onsuccess = () => {
      const list = request.result || [];
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveTopic(topic) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('topics', 'readwrite');
    const store = tx.objectStore('topics');
    const request = store.put(topic);
    request.onsuccess = () => resolve(topic);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTopic(topicId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['topics', 'slides'], 'readwrite');
    tx.objectStore('topics').delete(topicId);

    // move or delete slides under topic
    const slideStore = tx.objectStore('slides');
    const slideIndex = slideStore.index('topicId');
    const slideReq = slideIndex.openKeyCursor(IDBKeyRange.only(topicId));
    slideReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        slideStore.delete(cursor.primaryKey);
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// Slides
export async function getSlides(conferenceId, topicId = null) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('slides', 'readonly');
    const store = tx.objectStore('slides');
    let request;

    if (topicId) {
      const index = store.index('topicId');
      request = index.getAll(IDBKeyRange.only(topicId));
    } else if (conferenceId) {
      const index = store.index('conferenceId');
      request = index.getAll(IDBKeyRange.only(conferenceId));
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => {
      const list = request.result || [];
      list.sort((a, b) => (a.order ?? a.capturedAt) - (b.order ?? b.capturedAt));
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveSlide(slide) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('slides', 'readwrite');
    const store = tx.objectStore('slides');
    const request = store.put(slide);
    request.onsuccess = () => resolve(slide);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSlide(slideId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('slides', 'readwrite');
    const store = tx.objectStore('slides');
    const request = store.delete(slideId);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// Reassign slide topic
export async function reassignSlideTopic(slideId, newTopicId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('slides', 'readwrite');
    const store = tx.objectStore('slides');
    const getReq = store.get(slideId);
    getReq.onsuccess = () => {
      const slide = getReq.result;
      if (!slide) return reject(new Error('Slide not found'));
      slide.topicId = newTopicId;
      const putReq = store.put(slide);
      putReq.onsuccess = () => resolve(slide);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// App Settings (Gemini API key, default camera mode, sound effect toggle, etc.)
export async function getSetting(key, defaultValue = null) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : defaultValue);
    req.onerror = () => reject(req.error);
  });
}

export async function saveSetting(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const req = store.put({ key, value });
    req.onsuccess = () => resolve(value);
    req.onerror = () => reject(req.error);
  });
}

// Seed initial rich sample conference data if empty
export async function initializeSampleDataIfEmpty() {
  const confs = await getConferences();
  if (confs.length > 0) return;

  const confId = 'conf-demo-2026';
  const conf = {
    id: confId,
    name: 'Global AI & Cloud Architecture Summit 2026',
    date: '2026-10-12',
    location: 'Auditorium Hall A (Tech Plaza)',
    createdAt: Date.now() - 3600000 * 2,
    description: 'Annual gathering on Large Models, Autonomous Agents, and Scalable Cloud Edge Systems.'
  };
  await saveConference(conf);

  const topic1 = {
    id: 'topic-keynote',
    conferenceId: confId,
    name: 'Keynote: Frontier AI & Autonomous Systems',
    speaker: 'Dr. Elena Rostova (Chief AI Scientist)',
    order: 0,
    color: '#8b5cf6',
    summary: 'The keynote highlighted the convergence of multimodal reasoning and agentic loops. Latency drops 4x when combining local edge caches with cloud frontier models. Key advice for teams: treat agent evaluation as continuous regression testing.',
    summaryTimestamp: new Date().toISOString()
  };

  const topic2 = {
    id: 'topic-cloud-scale',
    conferenceId: confId,
    name: 'Session 2: Ultra-Low Latency Cloud Architecture',
    speaker: 'Marcus Vance (VP Systems Engineering)',
    order: 1,
    color: '#06b6d4',
    summary: 'Marcus presented 99.999% availability patterns across multi-region clusters. Recommended using distributed event logs with optimistic UI commits and automated consensus fallbacks.',
    summaryTimestamp: new Date().toISOString()
  };

  const topic3 = {
    id: 'topic-qa',
    conferenceId: confId,
    name: 'Interactive Q&A & Panel Discussion',
    speaker: 'Panel: Industry Leads',
    order: 2,
    color: '#10b981',
    summary: 'Panel addressed data privacy guardrails, offline inference capabilities, and edge deployment challenges.',
    summaryTimestamp: new Date().toISOString()
  };

  await saveTopic(topic1);
  await saveTopic(topic2);
  await saveTopic(topic3);

  // Generate crisp canvas sample slides for demonstration
  function createSampleSlideDataUrl(title, subtitle, bullets, themeColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 1280, 720);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);

    // Decorative glow
    ctx.fillStyle = themeColor + '22';
    ctx.beginPath();
    ctx.arc(1100, 100, 350, 0, Math.PI * 2);
    ctx.fill();

    // Top branding bar
    ctx.fillStyle = themeColor;
    ctx.fillRect(60, 60, 8, 80);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(title, 90, 105);

    // Subtitle
    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px sans-serif';
    ctx.fillText(subtitle, 90, 140);

    // Accent line
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 180);
    ctx.lineTo(1220, 180);
    ctx.stroke();

    // Bullet points
    let y = 260;
    bullets.forEach((bullet) => {
      ctx.fillStyle = themeColor;
      ctx.beginPath();
      ctx.arc(90, y - 8, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '28px sans-serif';
      ctx.fillText(bullet, 120, y);
      y += 85;
    });

    // Footer
    ctx.fillStyle = '#64748b';
    ctx.font = '18px sans-serif';
    ctx.fillText('Global AI & Cloud Summit 2026 • Confidential Presentation', 60, 680);
    ctx.fillText('SlideSnap Auto-Archived', 1000, 680);

    return canvas.toDataURL('image/jpeg', 0.9);
  }

  const slide1 = {
    id: 'slide-1',
    conferenceId: confId,
    topicId: topic1.id,
    title: 'Next Evolution of Multimodal Architecture',
    imageData: createSampleSlideDataUrl(
      'Next Evolution of Multimodal Architecture',
      'Keynote Presentation • Dr. Elena Rostova',
      [
        'End-to-end tokenization: Native audio, vision, and code grounding',
        'Inference optimization: 4x speedup with dynamic speculative decoding',
        'Stateful context windows scaling to 10M tokens with zero loss',
        'Edge-first fallback: Processing critical sensor inputs with sub-5ms SLA'
      ],
      '#8b5cf6'
    ),
    capturedAt: Date.now() - 3600000,
    order: 0,
    ocrText: `Next Evolution of Multimodal Architecture\nKeynote Presentation • Dr. Elena Rostova\n• End-to-end tokenization: Native audio, vision, and code grounding\n• Inference optimization: 4x speedup with dynamic speculative decoding\n• Stateful context windows scaling to 10M tokens with zero loss\n• Edge-first fallback: Sub-5ms SLA`,
    aiSummary: `Key takeaway: Multi-modal models now handle sensor telemetry directly at the edge, reducing cloud roundtrips while preserving full context history.`,
    notes: `Remark from audience: Elena emphasized that speculative decoding works best when small draft models are trained on domain-specific logs.`
  };

  const slide2 = {
    id: 'slide-2',
    conferenceId: confId,
    topicId: topic1.id,
    title: 'Autonomous Agent Feedback Loops',
    imageData: createSampleSlideDataUrl(
      'Autonomous Agent Feedback Loops',
      'Self-healing Execution & Verification Pipelines',
      [
        'Execution Sandboxes: Isolated runtime validation for code generation',
        'Multi-agent consensus: Reviewer agents reduce hallucination by 78%',
        'Human-in-the-loop checkpoints at critical operational boundaries',
        'Automated metric tracking: Cost, token efficiency, and completion rate'
      ],
      '#8b5cf6'
    ),
    capturedAt: Date.now() - 3000000,
    order: 1,
    ocrText: `Autonomous Agent Feedback Loops\nSelf-healing Execution & Verification Pipelines\n• Execution Sandboxes: Isolated runtime validation\n• Multi-agent consensus: Reviewer agents reduce hallucination by 78%\n• Human-in-the-loop checkpoints at critical boundaries\n• Automated metrics: Cost, token efficiency, completion rate`,
    aiSummary: `Reviewer agents and sandbox verification drastically reduce hallucination. Critical tasks require defined human confirmation gates.`,
    notes: `Important slide! Need to implement reviewer agent loop in our next sprint.`
  };

  const slide3 = {
    id: 'slide-3',
    conferenceId: confId,
    topicId: topic2.id,
    title: 'Zero-Downtime Distributed Consensus',
    imageData: createSampleSlideDataUrl(
      'Zero-Downtime Distributed Consensus',
      'Marcus Vance • Systems Architecture',
      [
        'Raft with multi-tiered quorum leases for partition resilience',
        'Global edge routing: Anycast DNS paired with BGP route health checks',
        'Data consistency: Strict serializability on primary state stores',
        'Chaos engineering: Chaos Monkey running continuously in production'
      ],
      '#06b6d4'
    ),
    capturedAt: Date.now() - 1800000,
    order: 0,
    ocrText: `Zero-Downtime Distributed Consensus\nMarcus Vance • Systems Architecture\n• Raft with multi-tiered quorum leases for partition resilience\n• Global edge routing: Anycast DNS with BGP health checks\n• Strict serializability on primary state stores\n• Continuous production Chaos engineering`,
    aiSummary: `Architecture relies on multi-tiered quorum leases and active chaos testing to guarantee 99.999% uptime even during regional fiber cuts.`,
    notes: `Check their whitepaper on multi-tier quorum leases.`
  };

  await saveSlide(slide1);
  await saveSlide(slide2);
  await saveSlide(slide3);
}

// Export complete conference bundle (JSON format for instant transfer to laptop)
export async function exportConferenceBundle(conferenceId) {
  const db = await openDB();
  const confTx = db.transaction(['conferences', 'topics', 'slides'], 'readonly');

  const conf = await new Promise((res, rej) => {
    const r = confTx.objectStore('conferences').get(conferenceId);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });

  const topics = await getTopics(conferenceId);
  const slides = await getSlides(conferenceId);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    conference: conf,
    topics,
    slides
  };
}

// Import conference bundle (e.g., opened on laptop)
export async function importConferenceBundle(bundle) {
  if (!bundle || !bundle.conference || !bundle.topics || !bundle.slides) {
    throw new Error('Invalid conference package file structure.');
  }

  // Ensure unique IDs if needed or update existing
  await saveConference(bundle.conference);
  for (const topic of bundle.topics) {
    await saveTopic(topic);
  }
  for (const slide of bundle.slides) {
    await saveSlide(slide);
  }

  return bundle.conference;
}
