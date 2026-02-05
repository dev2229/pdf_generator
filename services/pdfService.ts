
import { QuestionItem } from "../types";
import { jsPDF } from "jspdf";

declare const pdfjsLib: any;

export class PdfService {
  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window !== 'undefined') {
      // Ensure pdfjsLib is available (it's loaded via CDN in index.html)
      const checkInterval = setInterval(() => {
        if (typeof pdfjsLib !== 'undefined') {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          clearInterval(checkInterval);
        }
      }, 100);
    }
  }

  async extractText(file: File): Promise<string> {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error("PDF Engine not loaded. Please check your internet connection and refresh.");
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = "";
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        fullText += pageText + "\n";
      }
      
      if (!fullText.trim()) {
        throw new Error("This PDF seems to contain only images or is encrypted. Try a text-based PDF.");
      }
      
      return fullText;
    } catch (error: any) {
      console.error("PDF Extraction Error:", error);
      throw new Error(error.message || "Failed to parse PDF content.");
    }
  }

  async generateAnswerPdf(questions: QuestionItem[]): Promise<Blob> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;
    let pageNumber = 1;

    const addFooter = () => {
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "normal");
      doc.text(`Page ${pageNumber} • Synthesized by AceExam Pro AI`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    };

    const checkPage = (heightNeeded: number) => {
      if (y + heightNeeded > pageHeight - margin - 15) {
        addFooter();
        doc.addPage();
        pageNumber++;
        y = margin;
        return true;
      }
      return false;
    };

    doc.setFontSize(26);
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.text("AceExam Technical Guide", margin, y);
    y += 12;

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "italic");
    doc.text(`SYNTHESIZED SOLUTIONS • ${new Date().toLocaleDateString()} • MULTI-FIELD RIGOR`, margin, y);
    y += 20;

    questions.forEach((item) => {
      const qText = `QUESTION ${item.number}: ${item.question}`;
      const qLines = doc.splitTextToSize(qText, maxWidth - 4);
      const qBoxHeight = (qLines.length * 7) + 8;

      checkPage(qBoxHeight + 10);
      
      doc.setFillColor(248, 250, 252);
      doc.rect(margin - 2, y - 6, maxWidth + 4, qBoxHeight, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin - 2, y - 6, margin - 2, y - 6 + qBoxHeight);

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(qLines, margin, y);
      y += qBoxHeight + 5;

      if (item.diagramDataUrl) {
        const imgHeight = 80;
        const imgWidth = 106; 
        checkPage(imgHeight + 20);
        
        try {
          doc.addImage(item.diagramDataUrl, 'PNG', margin + (maxWidth - imgWidth) / 2, y, imgWidth, imgHeight);
          y += imgHeight + 6;
          doc.setFontSize(9);
          doc.setTextColor(71, 85, 105);
          doc.setFont("helvetica", "italic");
          doc.text("FIGURE: AI-Generated Conceptual Reconstruction", pageWidth / 2, y, { align: 'center' });
          y += 12;
        } catch (e) {
          console.error("PDF image injection error", e);
        }
      }

      checkPage(10);
      doc.setFontSize(11);
      doc.setTextColor(37, 99, 235);
      doc.setFont("helvetica", "bold");
      doc.text("EXPERT SOLUTION:", margin, y);
      y += 8;

      const aText = item.answer || "";
      const lines = aText.split('\n');
      doc.setFontSize(10.5);
      
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
          y += 4;
          return;
        }

        const isHeader = trimmed.endsWith(':') || 
                         trimmed.startsWith('Step') || 
                         trimmed.includes('Given Data') || 
                         trimmed.includes('Principle');

        if (isHeader) {
          checkPage(10);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(15, 23, 42);
        } else {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(51, 65, 85);
        }

        const splitLines = doc.splitTextToSize(trimmed, maxWidth);
        splitLines.forEach((sl: string) => {
          checkPage(7);
          doc.text(sl, margin, y);
          y += 6.5;
        });
        if (isHeader) y += 2;
      });

      y += 10;
      checkPage(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("INTERACTIVE LEARNING RESOURCES", margin, y);
      y += 8;

      const bannerHeight = 9;

      if (item.referenceDocUrl) {
        checkPage(12);
        doc.setFillColor(239, 246, 255); 
        doc.roundedRect(margin, y - 5, maxWidth, bannerHeight, 1, 1, 'F');
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("  > DOCUMENT: Academic Reference Article", margin + 2, y + 1);
        doc.link(margin, y - 5, maxWidth, bannerHeight, { url: item.referenceDocUrl });
        y += 12;
      }

      if (item.referenceVideoUrl) {
        checkPage(12);
        doc.setFillColor(254, 242, 242); 
        doc.roundedRect(margin, y - 5, maxWidth, bannerHeight, 1, 1, 'F');
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38); 
        doc.text("  > VIDEO: Visual Explanation Guide", margin + 2, y + 1);
        doc.link(margin, y - 5, maxWidth, bannerHeight, { url: item.referenceVideoUrl });
        y += 12;
      }

      y += 5;
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 15;
    });

    addFooter();
    return doc.output('blob');
  }
}
