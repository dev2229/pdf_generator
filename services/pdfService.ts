
import { jsPDF } from "jspdf";
import { QuestionItem } from "../types.ts";

/**
 * CLIENT-SIDE PDF SERVICE
 * Handles browser-only operations: PDF text extraction and PDF generation.
 */
export class PdfService {
  private workerInitialized = false;

  private async getLib(): Promise<any> {
    const lib = (window as any).pdfjsLib;
    if (!lib) {
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const interval = setInterval(() => {
          const currentLib = (window as any).pdfjsLib;
          if (currentLib) {
            clearInterval(interval);
            this.initWorker(currentLib);
            resolve(currentLib);
          }
          if (attempts++ > 50) {
            clearInterval(interval);
            reject(new Error("PDF.js failed to load."));
          }
        }, 100);
      });
    }
    this.initWorker(lib);
    return lib;
  }

  private initWorker(lib: any) {
    if (!this.workerInitialized && lib) {
      lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      this.workerInitialized = true;
    }
  }

  async extractText(file: File): Promise<string> {
    const lib = await this.getLib();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = lib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }
    
    if (!fullText.trim()) throw new Error("No text found in PDF.");
    return fullText;
  }

  async generateAnswerPdf(questions: QuestionItem[], subject: string): Promise<Blob> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 20;
    let y = 20;

    // Header
    doc.setFontSize(24);
    doc.setTextColor(30, 64, 175); // blue-800
    doc.setFont("helvetica", "bold");
    doc.text("ACEEXAM STUDY GUIDE", margin, y);
    
    y += 10;
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFont("helvetica", "normal");
    doc.text(`SUBJECT: ${subject.toUpperCase()}`, margin, y);
    
    y += 15;
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(margin, y, 190, y);
    y += 15;

    for (const item of questions) {
      // Check for page overflow
      if (y > 260) {
        doc.addPage();
        y = margin;
      }

      // Question block
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont("helvetica", "bold");
      const qLines = doc.splitTextToSize(`Q${item.number}: ${item.question}`, 170);
      doc.text(qLines, margin, y);
      y += (qLines.length * 6) + 3;

      // Answer block
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85); // slate-700
      doc.setFont("helvetica", "normal");
      const aLines = doc.splitTextToSize(item.answer || "No answer generated.", 170);
      doc.text(aLines, margin, y);
      y += (aLines.length * 5) + 8;

      // References
      if (item.referenceDocUrl || item.referenceVideoUrl) {
        doc.setFontSize(8);
        doc.setTextColor(59, 130, 246); // blue-500
        if (item.referenceDocUrl) {
          doc.text(`Reference Link: ${item.referenceDocUrl}`, margin + 5, y);
          y += 4;
        }
        if (item.referenceVideoUrl) {
          doc.text(`Video Tutorial: ${item.referenceVideoUrl}`, margin + 5, y);
          y += 4;
        }
        y += 6;
      }

      // Separator
      doc.setDrawColor(241, 245, 249); // slate-100
      doc.line(margin, y, 190, y);
      y += 10;
    }

    return doc.output('blob');
  }
}
