
import { GoogleGenAI, Type } from "@google/genai";
import { QuestionItem, AcademicContext } from "../types.ts";

export class GeminiService {
  private async callWithRetry<T>(fn: () => Promise<T>, retries = 2, delay = 2000): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const isQuotaError = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
      if (isQuotaError && retries > 0) {
        console.warn(`Quota exceeded, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.callWithRetry(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  async extractQuestions(text: string): Promise<QuestionItem[]> {
    return this.callWithRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

      const content = response.text;
      if (!content) return [];
      try {
        return JSON.parse(content.trim());
      } catch (e) {
        console.error("Failed to parse extracted questions", e);
        return [];
      }
    });
  }

  async solveQuestions(questions: QuestionItem[], context: AcademicContext): Promise<QuestionItem[]> {
    return this.callWithRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `Act as a world-class Professor.
      Context: ${context.field}, ${context.subField}, Subject: ${context.subject}
      TASK: Solve these questions with depth. If math, show steps. If theory, provide structure.
      Include a "diagramPrompt" for logic visualization.
      Find high-quality links for "referenceDocUrl" and "referenceVideoUrl".
      
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
                diagramPrompt: { type: Type.STRING },
                referenceDocUrl: { type: Type.STRING },
                referenceVideoUrl: { type: Type.STRING }
              },
              required: ["number", "question", "answer", "referenceDocUrl", "referenceVideoUrl"]
            }
          }
        }
      });

      const content = response.text;
      if (!content) return questions.map(q => ({ ...q, answer: "Solution failed." }));
      try {
        return JSON.parse(content.trim());
      } catch (e) {
        console.error("Failed to parse solved questions", e);
        return questions.map(q => ({ ...q, answer: "Solution parse error." }));
      }
    });
  }

  async generateTechnicalDiagram(prompt: string): Promise<string | undefined> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `Professional academic diagram: ${prompt}. Minimalist, white background, high quality.` }]
        },
        config: {
          imageConfig: { aspectRatio: "4:3" }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    } catch (e) {
      console.warn("Visual aid skipped due to error:", e);
    }
    return undefined;
  }
}
