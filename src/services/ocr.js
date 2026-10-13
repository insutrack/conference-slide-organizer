import { createWorker } from 'tesseract.js';

let workerInstance = null;
let isInitializing = false;

async function getWorker(onProgress) {
  if (workerInstance) {
    return workerInstance;
  }

  isInitializing = true;
  try {
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      }
    });
    workerInstance = worker;
    return worker;
  } finally {
    isInitializing = false;
  }
}

/**
 * Perform optical character recognition on an image (DataURL, Blob, or URL)
 * @param {string|Blob} imageSource
 * @param {function} onProgress
 * @returns {Promise<{text: string, titleSuggestion: string, confidence: number}>}
 */
export async function recognizeSlideText(imageSource, onProgress = null) {
  try {
    const worker = await getWorker(onProgress);
    const ret = await worker.recognize(imageSource);
    const rawText = ret?.data?.text?.trim() || '';
    const confidence = ret?.data?.confidence || 0;

    // Detect candidate title (first non-empty line with letters)
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 2 && /[a-zA-Z]/.test(l));

    let titleSuggestion = '';
    if (lines.length > 0) {
      // Pick first line, strip leading symbols/numbers
      titleSuggestion = lines[0].replace(/^[#\d\.\-\*•\s]+/, '').trim();
      if (titleSuggestion.length > 60) {
        titleSuggestion = titleSuggestion.substring(0, 57) + '...';
      }
    }

    return {
      text: rawText,
      titleSuggestion,
      confidence
    };
  } catch (err) {
    console.error('OCR recognition error:', err);
    throw err;
  }
}

export async function terminateOcrWorker() {
  if (workerInstance) {
    await workerInstance.terminate();
    workerInstance = null;
  }
}
