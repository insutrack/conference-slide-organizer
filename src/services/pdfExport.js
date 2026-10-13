import { jsPDF } from 'jspdf';

/**
 * Generate a PDF presentation deck from a list of slides
 */
export async function exportSlideDeckToPdf({
  conferenceTitle,
  topicTitle,
  speaker,
  slides,
  includeNotes = true
}) {
  // Landscape 16:9 PDF (width: 297mm, height: 167mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [297, 167]
  });

  const pageWidth = 297;
  const pageHeight = 167;

  // Title Slide
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Accent bar
  doc.setFillColor(139, 92, 246); // violet-500
  doc.rect(20, 25, 4, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text(conferenceTitle || 'Conference Presentation', 28, 38);

  doc.setTextColor(196, 181, 253);
  doc.setFontSize(18);
  doc.text(topicTitle || 'All Topics', 28, 48);

  if (speaker) {
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.text(`Presented by: ${speaker}`, 28, 62);
  }

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(11);
  doc.text(`Generated with SlideSnap AI • ${slides.length} Slides Captured`, 28, 145);
  doc.text(new Date().toLocaleDateString(undefined, { dateStyle: 'long' }), 230, 145);

  // Slides Loop
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    doc.addPage([297, 167], 'landscape');

    // Dark backdrop
    doc.setFillColor(11, 15, 25);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header bar
    doc.setFillColor(23, 31, 51);
    doc.rect(0, 0, pageWidth, 16, 'F');

    doc.setTextColor(241, 245, 249);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const slideHeader = `${i + 1}. ${slide.title || 'Slide ' + (i + 1)}`;
    doc.text(slideHeader.substring(0, 75), 14, 11);

    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Slide ${i + 1} of ${slides.length}`, 260, 11);

    // Slide Image
    if (slide.imageData) {
      try {
        const hasNotes = includeNotes && (slide.notes || slide.aiSummary);
        
        let imgX = 14;
        let imgY = 22;
        let imgW = 269;
        let imgH = 135;

        // If has notes, adjust layout: image takes left ~190mm, notes take right ~70mm
        if (hasNotes) {
          imgW = 188;
          imgH = 132;
        }

        doc.addImage(slide.imageData, 'JPEG', imgX, imgY, imgW, imgH, undefined, 'FAST');

        // Draw border around image
        doc.setDrawColor(51, 65, 85);
        doc.setLineWidth(0.4);
        doc.rect(imgX, imgY, imgW, imgH);

        // Right side notes card if enabled
        if (hasNotes) {
          const notesX = 208;
          const notesY = 22;
          const notesW = 75;
          const notesH = 132;

          doc.setFillColor(20, 27, 45);
          doc.rect(notesX, notesY, notesW, notesH, 'F');
          doc.setDrawColor(51, 65, 85);
          doc.rect(notesX, notesY, notesW, notesH);

          doc.setTextColor(167, 139, 250);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text('Key Takeaway & Notes', notesX + 6, notesY + 10);

          let curY = notesY + 18;
          doc.setTextColor(226, 232, 240);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);

          const summaryText = slide.aiSummary || slide.ocrText || '';
          const lines = doc.splitTextToSize(summaryText.replace(/###|##|#/g, ''), notesW - 12);
          const maxLines = 14;
          lines.slice(0, maxLines).forEach((line) => {
            doc.text(line, notesX + 6, curY);
            curY += 5;
          });

          if (slide.notes) {
            curY = Math.max(curY + 3, notesY + 95);
            doc.setTextColor(56, 189, 248);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text('My Note:', notesX + 6, curY);
            curY += 5;

            doc.setTextColor(203, 213, 225);
            doc.setFont('helvetica', 'italic');
            const noteLines = doc.splitTextToSize(slide.notes, notesW - 12);
            noteLines.slice(0, 5).forEach((line) => {
              doc.text(line, notesX + 6, curY);
              curY += 4.5;
            });
          }
        }
      } catch (err) {
        console.warn('Could not embed slide image to PDF:', err);
      }
    }
  }

  const filename = `${(topicTitle || conferenceTitle || 'presentation')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')}_slides.pdf`;

  doc.save(filename);
  return filename;
}
