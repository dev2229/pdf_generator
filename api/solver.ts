
import { GoogleGenAI, Type } from "@google/genai";
import { QuestionItem, AcademicContext } from "../types.ts";

/**
 * SERVER-ONLY MODULE
 * This code uses process.env.API_KEY and must never be bundled into the client.
 */

function getAI() {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_MISSING: The server is not configured with a Gemini API Key.");
  }
  return new GoogleGenAI({ apiKey });
}

export async function extractQuestionsAction(text: string): Promise<QuestionItem[]> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Extract questions from this text. Return JSON array with "number" and "question".\n\n${text}`,
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
  return JSON.parse(response.text || "[]");
}

export async function solveQuestionsAction(questions: QuestionItem[], context: AcademicContext): Promise<QuestionItem[]> {
  const ai = getAI();
  const prompt = `Solve these questions for ${context.subject}. Return JSON.\n\n${JSON.stringify(questions)}`;
  
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
  return JSON.parse(response.text || "[]");
}

export async function generateDiagramAction(prompt: string): Promise<string | undefined> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: `Academic diagram: ${prompt}` }] },
    config: { imageConfig: { aspectRatio: "4:3" } }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : undefined;
}
