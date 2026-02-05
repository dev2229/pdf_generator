
import { QuestionItem } from "../types";
import { jsPDF } from "jspdf";

export class PdfService {
  private workerInitialized = false;

  private async getLib(): Promise<any> {
    const lib = (window as any).pdfjsLib;
    if (!lib) {
      // Wait for CDN script to load if it hasn't yet
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
            reject(new Error("PDF.js library failed to load from CDN."));
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
        throw new Error("This PDF appears to be a scan (images only) or is empty. Please use a text-based PDF.");
      }
      
      return fullText;
    } catch (error: any) {
      console.error("PDF extraction error:", error);
      throw new Error(error.message || "Failed to read PDF content.");
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
      doc.text(`Page ${pageNumber} • AceExam Pro AI`, pageWidth / 2, pageHeight - 10, { align: 'center' });
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

    doc.setFontSize(22);
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.text("AceExam Study Guide", margin, y);
    y += 10;

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "italic");
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, y);
    y += 15;

    questions.forEach((item) => {
      const qText = `Q${item.number}: ${item.question}`;
      const qLines = doc.splitTextToSize(qText, maxWidth);
      const qHeight = (qLines.length * 6) + 4;

      checkPage(qHeight + 20);
      
      doc.setFillColor(241, 245, 249);
      doc.rect(margin - 2, y - 5, maxWidth + 4, qHeight, 'F');
      
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(qLines, margin, y);
      y += qHeight + 5;

      doc.setFontSize(10);
      doc.setTextColor(37, 99, 235);
      doc.text("SOLUTION:", margin, y);
      y += 7;

      const aLines = doc.splitTextToSize(item.answer || "", maxWidth);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      
      aLines.forEach((line: string) => {
        checkPage(7);
        doc.text(line, margin, y);
        y += 6;
      });

      if (item.referenceDocUrl || item.referenceVideoUrl) {
        y += 4;
        checkPage(10);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("RESOURCES:", margin, y);
        y += 5;

        if (item.referenceDocUrl) {
          doc.setTextColor(37, 99, 235);
          doc.text(`Read: ${item.referenceDocUrl}`, margin, y);
          doc.link(margin, y - 3, maxWidth, 4, { url: item.referenceDocUrl });
          y += 5;
        }
        if (item.referenceVideoUrl) {
          doc.setTextColor(220, 38, 38);
          doc.text(`Watch: ${item.referenceVideoUrl}`, margin, y);
          doc.link(margin, y - 3, maxWidth, 4, { url: item.referenceVideoUrl });
          y += 5;
        }
      }

      y += 10;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y - 5, pageWidth - margin, y - 5);
    });

    addFooter();
    return doc.output('blob');
  }
}
