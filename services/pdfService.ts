
import { QuestionItem } from "../types.ts";
import { jsPDF } from "jspdf";

/**
 * CLIENT-SIDE PDF SERVICE
 * Handles browser-only tasks: PDF text extraction and PDF generation.
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

  async generateAnswerPdf(questions: QuestionItem[]): Promise<Blob> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 20;
    let y = 20;

    doc.setFontSize(22);
    doc.text("AceExam Study Guide", margin, y);
    y += 20;

    questions.forEach((item) => {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const qLines = doc.splitTextToSize(`Q${item.number}: ${item.question}`, 170);
      doc.text(qLines, margin, y);
      y += (qLines.length * 7) + 5;

      doc.setFont("helvetica", "normal");
      const aLines = doc.splitTextToSize(item.answer || "", 170);
      doc.text(aLines, margin, y);
      y += (aLines.length * 6) + 15;

      if (y > 250) {
        doc.addPage();
        y = margin;
      }
    });

    return doc.output('blob');
  }
}
