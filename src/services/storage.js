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

// Purge old demo data if present (to ensure completely blank user experience)
export async function purgeOldDemoData() {
  const db = await openDB();
  const confs = await getConferences();
  for (const c of confs) {
    if (c.id === 'conf-demo-2026' || c.name?.includes('Global AI & Cloud Architecture Summit')) {
      await deleteConference(c.id);
    }
  }
}

// Clear all data to completely blank state
export async function clearAllData() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['conferences', 'topics', 'slides'], 'readwrite');
    tx.objectStore('conferences').clear();
    tx.objectStore('topics').clear();
    tx.objectStore('slides').clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// Initialize clean, completely blank workspace (0 preloaded slides, 0 preloaded topics)
export async function initializeBlankState() {
  // Purge any stale demo conferences from past loads
  await purgeOldDemoData();

  const confs = await getConferences();
  if (confs.length === 0) {
    const blankConf = {
      id: `conf-${Date.now()}`,
      name: 'Conference Sessions',
      createdAt: Date.now()
    };
    await saveConference(blankConf);
    return blankConf;
  }
  return confs[0];
}

// Backwards compatibility alias
export async function initializeSampleDataIfEmpty() {
  return await initializeBlankState();
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
