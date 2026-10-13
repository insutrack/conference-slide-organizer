// Gemini API & Hybrid Local Summarizer Service

/**
 * Summarize a single slide using Gemini or fallback offline heuristics
 */
export async function summarizeSlide({
  apiKey,
  title,
  topicName,
  ocrText,
  imageData,
  notes
}) {
  if (apiKey && apiKey.trim().length > 10) {
    try {
      return await callGeminiSlideSummary({
        apiKey: apiKey.trim(),
        title,
        topicName,
        ocrText,
        imageData,
        notes
      });
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local extractor:', err);
      // Fallback
      return generateLocalSlideSummary({ title, topicName, ocrText, notes, errorNote: err.message });
    }
  }

  // Local / Offline fallback
  return generateLocalSlideSummary({ title, topicName, ocrText, notes });
}

/**
 * Summarize an entire conference session/topic from multiple slides
 */
export async function summarizeSession({
  apiKey,
  topicName,
  speaker,
  slides
}) {
  if (apiKey && apiKey.trim().length > 10) {
    try {
      return await callGeminiSessionSummary({
        apiKey: apiKey.trim(),
        topicName,
        speaker,
        slides
      });
    } catch (err) {
      console.warn('Gemini API session call failed, falling back to local synthesizer:', err);
      return generateLocalSessionSummary({ topicName, speaker, slides, errorNote: err.message });
    }
  }

  return generateLocalSessionSummary({ topicName, speaker, slides });
}

/**
 * Direct Gemini API call for a single slide
 */
async function callGeminiSlideSummary({
  apiKey,
  title,
  topicName,
  ocrText,
  imageData,
  notes
}) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const prompt = `You are an expert conference note-taker and technical analyst.
Analyze this conference presentation slide:
- Topic/Track: "${topicName || 'General'}"
- Current Slide Title: "${title || 'Untitled Slide'}"
${notes ? `- Attendee's Quick Notes: "${notes}"` : ''}
${ocrText ? `- Detected Slide Text: """${ocrText}"""` : ''}

Please provide a concise, high-value summary of this slide:
1. Core Takeaway (1-2 sentences capturing the main insight)
2. Key Points / Data Points (2-4 bullet points)
3. Actionable Item / Application (1 practical note for engineering/business)

Keep it crisp and professional. Format in clean markdown with bullets.`;

  const contents = [];
  const parts = [{ text: prompt }];

  // If we have image data, attach inline image part
  if (imageData && imageData.startsWith('data:image/')) {
    const match = imageData.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (match) {
      const mimeType = match[1];
      const data = match[2];
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: data
        }
      });
    }
  }

  contents.push({ parts });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 500
      }
    })
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || `API error ${response.status}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No summary generated from Gemini.');
  return text.trim();
}

/**
 * Gemini API call to synthesize entire session
 */
async function callGeminiSessionSummary({
  apiKey,
  topicName,
  speaker,
  slides
}) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const slideBriefs = slides.map((s, idx) => `
[Slide ${idx + 1}: ${s.title || 'Untitled'}]
OCR Text: ${s.ocrText || 'N/A'}
Notes: ${s.notes || 'None'}
Summary: ${s.aiSummary || 'None'}
`).join('\n---\n');

  const prompt = `You are an executive conference analyst.
Synthesize the complete conference presentation for topic: "${topicName}"
${speaker ? `Speaker: ${speaker}` : ''}
Total Slides Captured: ${slides.length}

Here are the slide details captured during the talk:
${slideBriefs}

Produce a polished, comprehensive Executive Conference Brief:
## 🎯 Session Overview & Thesis
## 💡 Key Technical Themes & Insights (Grouped logically)
## 📊 Notable Metrics, Quotes, or Architecture Decisions
## 🚀 Next Steps & Implementation Takeaways

Make it thorough yet readable, ready for sharing with an engineering team.`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1200
      }
    })
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || `API error ${response.status}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No session summary generated from Gemini.');
  return text.trim();
}

/**
 * Offline Heuristic Slide Summarizer
 */
function generateLocalSlideSummary({ title, topicName, ocrText, notes, errorNote }) {
  const cleanLines = (ocrText || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 5);

  const bulletCandidates = cleanLines.filter((l) =>
    l.startsWith('•') || l.startsWith('-') || l.startsWith('*') || /^\d+\./.test(l)
  );

  const otherLines = cleanLines.filter(
    (l) => !bulletCandidates.includes(l) && l.toLowerCase() !== (title || '').toLowerCase()
  );

  let summary = `### 📌 Core Takeaway\n`;
  if (otherLines.length > 0) {
    summary += `${otherLines[0]}.\n\n`;
  } else {
    summary += `Key presentation slide on **${title || topicName || 'Session'}** covering strategic takeaways.\n\n`;
  }

  summary += `### 🔑 Key Points\n`;
  if (bulletCandidates.length > 0) {
    bulletCandidates.slice(0, 4).forEach((b) => {
      const cleanB = b.replace(/^[•\-\*\d\.]+\s*/, '');
      summary += `• ${cleanB}\n`;
    });
  } else if (otherLines.length > 1) {
    otherLines.slice(1, 4).forEach((l) => {
      summary += `• ${l}\n`;
    });
  } else {
    summary += `• Visual diagram/code slide captured during ${topicName || 'session'}.\n`;
  }

  if (notes) {
    summary += `\n### 📝 Attendee Notes\n> ${notes}\n`;
  }

  if (errorNote) {
    summary += `\n*(Note: Generated via offline engine. Add a Gemini API key in Settings for cloud multi-modal reasoning)*`;
  }

  return summary;
}

/**
 * Offline Heuristic Session Synthesizer
 */
function generateLocalSessionSummary({ topicName, speaker, slides }) {
  let summary = `## 🎯 Executive Brief: ${topicName}\n`;
  if (speaker) summary += `**Presented by:** ${speaker}\n`;
  summary += `**Archived Slides:** ${slides.length} slides captured\n\n`;

  summary += `### 💡 Primary Themes & Flow\n`;
  slides.forEach((s, i) => {
    summary += `${i + 1}. **${s.title || `Slide ${i + 1}`}**\n`;
    if (s.aiSummary) {
      const firstLine = s.aiSummary.split('\n').find((l) => l.trim().length > 10 && !l.startsWith('#'));
      if (firstLine) summary += `   *${firstLine.trim()}*\n`;
    }
  });

  summary += `\n### 🚀 Action Items & Key Focus\n`;
  const notedSlides = slides.filter((s) => s.notes);
  if (notedSlides.length > 0) {
    notedSlides.forEach((s) => {
      summary += `• **${s.title || 'Slide'}**: ${s.notes}\n`;
    });
  } else {
    summary += `• Review slide diagrams and compare architecture benchmarks.\n`;
    summary += `• Share synthesized slide deck with team members.\n`;
  }

  return summary;
}
