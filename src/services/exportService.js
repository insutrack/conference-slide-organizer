import { jsPDF } from 'jspdf';
import pptxgen from 'pptxgenjs';
import JSZip from 'jszip';

/**
 * Clean string for safe filenames
 */
function sanitizeFilename(str) {
  return (str || 'conference_session')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 50);
}

/**
 * 1. Convert Slides to High-Resolution PDF Presentation Deck
 */
export async function exportToPdf({
  conferenceTitle = 'Conference Deck',
  sessionTitle = 'Session Slides',
  speaker = '',
  slides = [],
  includeNotes = true
}) {
  if (!slides || slides.length === 0) {
    throw new Error('No slides available to export.');
  }

  // 16:9 Landscape PDF (297mm x 167mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [297, 167]
  });

  const pageWidth = 297;
  const pageHeight = 167;

  // Title Slide
  doc.setFillColor(10, 13, 22); // Dark slate
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Gradient-like accent bar
  doc.setFillColor(139, 92, 246);
  doc.rect(20, 24, 4, 34, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text(conferenceTitle, 28, 36);

  doc.setTextColor(167, 139, 250);
  doc.setFontSize(18);
  doc.text(sessionTitle, 28, 48);

  if (speaker) {
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.text(`Presented by: ${speaker}`, 28, 62);
  }

  // Metadata Footer
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(10.5);
  doc.text(`SlideSnap AI Conference Archive • ${slides.length} Slides Captured`, 28, 148);
  doc.text(new Date().toLocaleDateString(undefined, { dateStyle: 'long' }), 220, 148);

  // Slides Loop
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    doc.addPage([297, 167], 'landscape');

    // Slide background
    doc.setFillColor(10, 13, 22);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header strip
    doc.setFillColor(17, 23, 38);
    doc.rect(0, 0, pageWidth, 15, 'F');

    doc.setTextColor(241, 245, 249);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const headerTitle = `${i + 1}. ${slide.title || 'Slide ' + (i + 1)}`;
    doc.text(headerTitle.substring(0, 80), 12, 10.5);

    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Slide ${i + 1} of ${slides.length}`, 250, 10.5);

    if (slide.imageData) {
      try {
        const hasNotes = includeNotes && (slide.notes || slide.aiSummary);

        let imgX = 12;
        let imgY = 20;
        let imgW = 273;
        let imgH = 138;

        if (hasNotes) {
          imgW = 194;
          imgH = 136;
        }

        doc.addImage(slide.imageData, 'JPEG', imgX, imgY, imgW, imgH, undefined, 'FAST');

        // Thin frame
        doc.setDrawColor(40, 50, 75);
        doc.setLineWidth(0.3);
        doc.rect(imgX, imgY, imgW, imgH);

        // Notes sidebar
        if (hasNotes) {
          const notesX = 212;
          const notesY = 20;
          const notesW = 73;
          const notesH = 136;

          doc.setFillColor(17, 23, 38);
          doc.rect(notesX, notesY, notesW, notesH, 'F');
          doc.setDrawColor(40, 50, 75);
          doc.rect(notesX, notesY, notesW, notesH);

          doc.setTextColor(167, 139, 250);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text('Key Notes & Points', notesX + 5, notesY + 9);

          let textY = notesY + 17;
          doc.setTextColor(226, 232, 240);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);

          const summaryText = slide.aiSummary || slide.ocrText || '';
          if (summaryText) {
            const lines = doc.splitTextToSize(summaryText.replace(/###|##|#/g, ''), notesW - 10);
            lines.slice(0, 12).forEach((line) => {
              doc.text(line, notesX + 5, textY);
              textY += 4.8;
            });
          }

          if (slide.notes) {
            textY = Math.max(textY + 4, notesY + 95);
            doc.setTextColor(56, 189, 248);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text('Takeaways:', notesX + 5, textY);
            textY += 4.5;

            doc.setTextColor(203, 213, 225);
            doc.setFont('helvetica', 'italic');
            const noteLines = doc.splitTextToSize(slide.notes, notesW - 10);
            noteLines.slice(0, 6).forEach((line) => {
              doc.text(line, notesX + 5, textY);
              textY += 4.2;
            });
          }
        }
      } catch (err) {
        console.warn('PDF image error:', err);
      }
    }
  }

  const filename = `${sanitizeFilename(sessionTitle)}_slides.pdf`;
  doc.save(filename);
  return filename;
}

/**
 * 2. Convert Slides to Real PowerPoint (.pptx) Presentation
 */
export async function exportToPptx({
  conferenceTitle = 'Conference Presentation',
  sessionTitle = 'Session Slides',
  speaker = '',
  slides = []
}) {
  if (!slides || slides.length === 0) {
    throw new Error('No slides available to export.');
  }

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';

  // Title Slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: '0A0D16' };

  titleSlide.addText(conferenceTitle, {
    x: 0.8,
    y: 1.5,
    w: 8.4,
    h: 1.0,
    fontSize: 26,
    bold: true,
    color: 'FFFFFF'
  });

  titleSlide.addText(sessionTitle, {
    x: 0.8,
    y: 2.5,
    w: 8.4,
    h: 0.8,
    fontSize: 18,
    color: 'A78BFA'
  });

  if (speaker) {
    titleSlide.addText(`Speaker: ${speaker}`, {
      x: 0.8,
      y: 3.4,
      w: 8.4,
      h: 0.5,
      fontSize: 13,
      color: '94A3B8'
    });
  }

  titleSlide.addText(`Archived with SlideSnap • ${slides.length} Captured Slides`, {
    x: 0.8,
    y: 4.8,
    w: 8.4,
    h: 0.4,
    fontSize: 10,
    color: '64748B'
  });

  // Individual Slides
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const pptSlide = pptx.addSlide();
    pptSlide.background = { color: '0A0D16' };

    // Slide Header
    pptSlide.addText(`${i + 1}. ${slide.title || 'Slide ' + (i + 1)}`, {
      x: 0.5,
      y: 0.3,
      w: 9.0,
      h: 0.4,
      fontSize: 13,
      bold: true,
      color: 'F8FAFC'
    });

    if (slide.imageData) {
      const hasNotes = Boolean(slide.notes || slide.aiSummary);

      if (hasNotes) {
        // Left side image
        pptSlide.addImage({
          data: slide.imageData,
          x: 0.5,
          y: 0.85,
          w: 6.8,
          h: 4.25
        });

        // Right side notes card
        const noteContent = [
          slide.aiSummary ? `Summary:\n${slide.aiSummary}\n\n` : '',
          slide.notes ? `Takeaway Notes:\n${slide.notes}` : ''
        ].join('');

        pptSlide.addText(noteContent, {
          x: 7.45,
          y: 0.85,
          w: 2.1,
          h: 4.25,
          fontSize: 9.5,
          color: 'CBD5E1',
          fill: { color: '111726' },
          margin: 0.1
        });
      } else {
        // Full width 16:9 presentation slide
        pptSlide.addImage({
          data: slide.imageData,
          x: 0.6,
          y: 0.85,
          w: 8.8,
          h: 4.35
        });
      }
    }
  }

  const filename = `${sanitizeFilename(sessionTitle)}_presentation.pptx`;
  await pptx.writeFile({ fileName: filename });
  return filename;
}

/**
 * 3. Convert Slides to Markdown Notes
 */
export function exportToNotesMarkdown({
  conferenceTitle = 'Conference',
  sessionTitle = 'Session Notes',
  speaker = '',
  slides = []
}) {
  if (!slides || slides.length === 0) {
    throw new Error('No slides available to export.');
  }

  let md = `# ${sessionTitle}\n\n`;
  md += `**Conference:** ${conferenceTitle}\n`;
  if (speaker) md += `**Speaker:** ${speaker}\n`;
  md += `**Date:** ${new Date().toLocaleDateString(undefined, { dateStyle: 'full' })}\n`;
  md += `**Total Captured Slides:** ${slides.length}\n\n`;
  md += `---\n\n`;

  slides.forEach((slide, idx) => {
    md += `## Slide ${idx + 1}: ${slide.title || 'Untitled Slide'}\n\n`;
    if (slide.capturedAt) {
      md += `*Captured at: ${new Date(slide.capturedAt).toLocaleTimeString()}*\n\n`;
    }
    if (slide.notes) {
      md += `### 💡 Takeaways & Notes\n${slide.notes}\n\n`;
    }
    if (slide.aiSummary) {
      md += `### 🤖 Executive Brief\n${slide.aiSummary}\n\n`;
    }
    if (slide.ocrText) {
      md += `### 📝 Extracted Slide Text\n\`\`\`\n${slide.ocrText}\n\`\`\`\n\n`;
    }
    md += `---\n\n`;
  });

  const filename = `${sanitizeFilename(sessionTitle)}_notes.md`;
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return filename;
}

/**
 * 4. Convert Slides to Printable HTML Document with Embedded Photos
 */
export function exportToNotesHtml({
  conferenceTitle = 'Conference',
  sessionTitle = 'Session Notes',
  speaker = '',
  slides = []
}) {
  if (!slides || slides.length === 0) {
    throw new Error('No slides available to export.');
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${sessionTitle} - Conference Notes</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f1f5f9; padding: 40px; margin: 0; line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; }
    header { border-bottom: 2px solid #8b5cf6; padding-bottom: 20px; margin-bottom: 30px; }
    h1 { color: #ffffff; margin: 0 0 10px 0; font-size: 28px; }
    .meta { color: #94a3b8; font-size: 14px; margin-bottom: 5px; }
    .slide-card { background: #131a2c; border: 1px solid #28334e; border-radius: 12px; margin-bottom: 32px; overflow: hidden; page-break-inside: avoid; }
    .slide-header { background: #1a233a; padding: 12px 18px; font-weight: bold; color: #a78bfa; font-size: 16px; border-bottom: 1px solid #28334e; }
    .slide-img { width: 100%; max-height: 500px; object-fit: contain; background: #000000; display: block; }
    .slide-content { padding: 18px; }
    .notes-box { background: rgba(139, 92, 246, 0.1); border-left: 4px solid #8b5cf6; padding: 12px; margin-top: 10px; border-radius: 4px; }
    .notes-label { font-weight: bold; color: #38bdf8; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
    @media print {
      body { background: #ffffff; color: #000000; padding: 10px; }
      .slide-card { border: 1px solid #cccccc; background: #ffffff; margin-bottom: 20px; }
      .slide-header { background: #f0f0f0; color: #000000; }
      .notes-box { background: #f9f9f9; border-left: 4px solid #333333; color: #000000; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${sessionTitle}</h1>
      <div class="meta"><strong>Conference:</strong> ${conferenceTitle}</div>
      ${speaker ? `<div class="meta"><strong>Speaker:</strong> ${speaker}</div>` : ''}
      <div class="meta"><strong>Date:</strong> ${new Date().toLocaleDateString(undefined, { dateStyle: 'full' })} • ${slides.length} Slides</div>
    </header>

    ${slides.map((s, idx) => `
      <div class="slide-card">
        <div class="slide-header">Slide ${idx + 1}: ${s.title || 'Slide #' + (idx + 1)}</div>
        ${s.imageData ? `<img src="${s.imageData}" class="slide-img" alt="Slide ${idx + 1}" />` : ''}
        <div class="slide-content">
          ${s.notes ? `
            <div class="notes-box">
              <div class="notes-label">Takeaway Notes</div>
              <div>${s.notes}</div>
            </div>` : ''}
          ${s.aiSummary ? `
            <div class="notes-box" style="border-left-color: #10b981; margin-top: 8px;">
              <div class="notes-label" style="color: #10b981;">Executive Summary</div>
              <div>${s.aiSummary}</div>
            </div>` : ''}
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(sessionTitle)}_complete_notes.html`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 5. Combine All Slides into Single ZIP Archive Bundle
 */
export async function exportToZipBundle({
  conferenceTitle = 'Conference',
  sessionTitle = 'Session Slides',
  speaker = '',
  slides = []
}) {
  if (!slides || slides.length === 0) {
    throw new Error('No slides available to export.');
  }

  const zip = new JSZip();
  const slidesFolder = zip.folder('slides');

  // Add individual full-res images
  slides.forEach((slide, index) => {
    if (slide.imageData) {
      const base64Data = slide.imageData.replace(/^data:image\/\w+;base64,/, '');
      const pad = String(index + 1).padStart(2, '0');
      const safeTitle = (slide.title || `slide_${pad}`)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 30);
      slidesFolder.file(`${pad}_${safeTitle}.jpg`, base64Data, { base64: true });
    }
  });

  // Notes document inside the bundle
  let readme = `# ${sessionTitle}\n\n`;
  readme += `Conference: ${conferenceTitle}\n`;
  if (speaker) readme += `Speaker: ${speaker}\n`;
  readme += `Archived: ${new Date().toLocaleString()}\n`;
  readme += `Slide Count: ${slides.length}\n\n`;
  readme += `Files in this bundle:\n`;
  slides.forEach((s, i) => {
    readme += `- slides/${String(i + 1).padStart(2, '0')}_${(s.title || 'slide').replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg\n`;
    if (s.notes) readme += `  Note: ${s.notes}\n`;
  });

  zip.file('NOTES.txt', readme);

  // Complete JSON metadata bundle for importing or transferring
  const metadata = {
    version: 1,
    conferenceTitle,
    sessionTitle,
    speaker,
    archivedAt: new Date().toISOString(),
    totalSlides: slides.length,
    slides: slides.map((s, idx) => ({
      index: idx + 1,
      id: s.id,
      title: s.title,
      capturedAt: s.capturedAt,
      notes: s.notes,
      ocrText: s.ocrText,
      aiSummary: s.aiSummary
    }))
  };

  zip.file('session_metadata.json', JSON.stringify(metadata, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  const filename = `${sanitizeFilename(sessionTitle)}_combined_bundle.zip`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return filename;
}
