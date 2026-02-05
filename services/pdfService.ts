
import { QuestionItem } from "../types";
import { jsPDF } from "jspdf";

// Use window reference for pdfjsLib to avoid 'never' type narrowing in TypeScript
declare const window: any;

export class PdfService {
  private workerInitialized = false;

  private async ensureLibLoaded(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Accessing pdfjsLib from window to ensure correct type resolution in browser environment
      const lib = window.pdfjsLib;

      if (typeof lib !== 'undefined') {
        if (!this.workerInitialized) {
          lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          this.workerInitialized = true;
        }
        resolve(lib);
        return;
      }

      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const currentLib = window.pdfjsLib;
        if (typeof currentLib !== 'undefined') {
          clearInterval(interval);
          if (!this.workerInitialized) {
            currentLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            this.workerInitialized = true;
          }
          resolve(currentLib);
        } else if (attempts > 50) { // 5 seconds timeout
          clearInterval(interval);
          reject(new Error("PDF engine failed to load. Please check your internet connection."));
        }
      }, 100);
    });
  }

  async extractText(file: File): Promise<string> {
    const lib = await this.ensureLibLoaded();

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = lib.getDocument({ data: arrayBuffer });
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
        throw new Error("This PDF appears to be empty or contains only scanned images (no selectable text).");
      }
      
      return fullText;
    } catch (error: any) {
      console.error("PDF extraction error:", error);
      throw new Error(error.message || "Failed to read PDF. It might be corrupted or protected.");
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

    // Header Section
    doc.setFontSize(24);
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.text("AceExam Technical Guide", margin, y);
    y += 12;

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "italic");
    doc.text(`GENERATED ON ${new Date().toLocaleDateString().toUpperCase()}`, margin, y);
    y += 15;

    questions.forEach((item) => {
      // Question Title
      const qText = `QUESTION ${item.number}: ${item.question}`;
      const qLines = doc.splitTextToSize(qText, maxWidth - 4);
      const qBoxHeight = (qLines.length * 6) + 8;

      checkPage(qBoxHeight + 10);
      
      doc.setFillColor(248, 250, 252);
      doc.rect(margin - 2, y - 5, maxWidth + 4, qBoxHeight, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.rect(margin - 2, y - 5, maxWidth + 4, qBoxHeight, 'D');

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(qLines, margin, y + 1);
      y += qBoxHeight + 6;

      // Solution Body
      checkPage(10);
      doc.setFontSize(10);
      doc.setTextColor(37, 99, 235);
      doc.text("EXPERT ANALYSIS:", margin, y);
      y += 8;

      const aLines = doc.splitTextToSize(item.answer || "", maxWidth);
      aLines.forEach((line: string) => {
        checkPage(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        doc.text(line, margin, y);
        y += 6;
      });

      // Resources
      if (item.referenceDocUrl || item.referenceVideoUrl) {
        y += 6;
        checkPage(15);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("STUDY LINKS:", margin, y);
        y += 6;

        doc.setFontSize(8.5);
        if (item.referenceDocUrl) {
          doc.setTextColor(37, 99, 235);
          doc.text(`[DOC] ${item.referenceDocUrl}`, margin + 2, y);
          doc.link(margin + 2, y - 3, maxWidth, 5, { url: item.referenceDocUrl });
          y += 5;
        }
        if (item.referenceVideoUrl) {
          doc.setTextColor(220, 38, 38);
          doc.text(`[VIDEO] ${item.referenceVideoUrl}`, margin + 2, y);
          doc.link(margin + 2, y - 3, maxWidth, 5, { url: item.referenceVideoUrl });
          y += 5;
        }
      }

      y += 12;
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y - 6, pageWidth - margin, y - 6);
    });

    addFooter();
    return doc.output('blob');
  }
}
