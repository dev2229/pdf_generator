
import { GoogleGenAI, Type } from "@google/genai";
import { QuestionItem, AcademicContext } from "../types";

export class GeminiService {
  private getClient() {
    // Initializing with named parameter as required by guidelines
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private async callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const isQuotaError = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
      if (isQuotaError && retries > 0) {
        console.warn(`Quota exceeded, retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.callWithRetry(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  async extractQuestions(text: string): Promise<QuestionItem[]> {
    return this.callWithRetry(async () => {
      const ai = this.getClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Extract all exam questions from the following text. 
        Format them as a JSON array of objects.
        Each object should have:
        - "number": the question number.
        - "question": the text of the question.
        
        Text:
        ${text}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                number: { type: Type.STRING },
                question: { type: Type.STRING }
              },
              required: ["number", "question"]
            }
          }
        }
      });

      try {
        // Accessing text property directly (not a method) and trimming
        return JSON.parse(response.text?.trim() || '[]');
      } catch (e) {
        console.error("Extraction parse error", e);
        return [];
      }
    });
  }

  async solveQuestions(questions: QuestionItem[], context: AcademicContext): Promise<QuestionItem[]> {
    return this.callWithRetry(async () => {
      const ai = this.getClient();
      
      const prompt = `Act as a world-class Professor and Subject Matter Expert.
      Academic Context:
      Field: ${context.field}
      Specialization: ${context.subField}
      Subject: ${context.subject}
      
      TASK: Solve the following exam questions with absolute academic precision and depth.
      
      ADAPTIVE SOLVING RULES:
      1. IF QUANTITATIVE/MATHEMATICAL:
         - Provide Given Data, Formulas used, Step-by-Step Derivation, and a final clearly stated Result.
      2. IF QUALITATIVE/THEORETICAL:
         - Provide a structured essay-style answer with Introduction, Key Principles, Detailed Analysis, and Practical Applications/Examples.
      3. DIAGRAM REQUIREMENT:
         - If a visual would aid understanding (e.g., a process flow, a schematic, a graph, or a structural model), provide a "diagramPrompt" describing a professional technical illustration.

      LINK QUALITY REQUIREMENT:
      Use Google Search to find REAL, WORKING, and RELEVANT educational links.
      1. "referenceDocUrl": Find a high-quality academic or professional article (e.g., Investopedia for finance, MDN for tech, Britannica for arts).
      2. "referenceVideoUrl": Find a specific YouTube tutorial or lecture from a reputable educational channel.
      
      Questions:
      ${JSON.stringify(questions, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                number: { type: Type.STRING },
                question: { type: Type.STRING },
                answer: { type: Type.STRING },
                diagramPrompt: { type: Type.STRING, description: "Detailed prompt for an academic diagram." },
                referenceDocUrl: { type: Type.STRING, description: "Functional HTTPS URL to a technical article." },
                referenceVideoUrl: { type: Type.STRING, description: "Functional HTTPS URL to a YouTube video." }
              },
              required: ["number", "question", "answer", "referenceDocUrl", "referenceVideoUrl"]
            }
          }
        }
      });

      try {
        // Accessing text property directly (not a method) and trimming
        const jsonStr = response.text?.trim() || '[]';
        return JSON.parse(jsonStr);
      } catch (e) {
        console.error("Solver failed to parse JSON:", e);
        return questions.map(q => ({ 
          ...q, 
          answer: "Unable to synthesize solution due to a logic processing error.",
          referenceDocUrl: "https://www.google.com/search?q=" + encodeURIComponent(q.question + " " + context.subject),
          referenceVideoUrl: "https://www.youtube.com/results?search_query=" + encodeURIComponent(q.question + " " + context.subject)
        }));
      }
    });
  }

  async generateTechnicalDiagram(prompt: string): Promise<string | undefined> {
    try {
      const ai = this.getClient();
      // Using generateContent with gemini-2.5-flash-image for image generation
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `A professional academic diagram for: ${prompt}. Clean white background, minimalist technical style, high resolution. No text artifacts.` }]
        },
        config: {
          imageConfig: { aspectRatio: "4:3" }
        }
      });

      // Iterating through parts to find the image part as recommended in guidelines
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    } catch (e: any) {
      console.error("Diagram error", e);
    }
    return undefined;
  }
}
