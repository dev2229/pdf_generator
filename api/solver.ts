import { GoogleGenAI, Type } from "@google/genai";
import { QuestionItem, AcademicContext } from "../types.ts";

/**
 * SECURE SOLVER MODULE
 * Follows the pattern of instantiating GoogleGenAI per-request to ensure the most
 * up-to-date API_KEY from process.env is used.
 */

export async function extractQuestionsAction(text: string): Promise<QuestionItem[]> {
  if (!text) throw new Error("Text content is required for extraction");

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract all academic exam questions from the following text. 
      Format as a JSON array of objects with keys "number" and "question".
      
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
        },
        temperature: 0.1,
      },
    });

    if (!response || !response.text) {
      throw new Error("Empty response from Gemini during extraction");
    }

    return JSON.parse(response.text.trim());
  } catch (error: any) {
    console.error("Gemini Extraction Failure:", JSON.stringify(error, null, 2));
    throw new Error(error.message || 'Question extraction failed');
  }
}

export async function solveQuestionsAction(questions: QuestionItem[], context: AcademicContext): Promise<QuestionItem[]> {
  if (!questions || questions.length === 0) throw new Error("No questions provided to solver");

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Act as an expert Academic Solver for the subject: ${context.subject}.
    Academic Context: ${context.field} -> ${context.subField}
    
    TASK: Provide detailed, accurate, and exam-ready solutions for these questions.
    - Show calculation steps for technical problems.
    - Use bullet points for theoretical explanations.
    - Propose a visual "diagramPrompt" if a technical drawing would aid understanding.
    - Include a "referenceDocUrl" (educational article) and "referenceVideoUrl" (YouTube tutorial).
    
    Questions:
    ${JSON.stringify(questions, null, 2)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
        },
        temperature: 0.2,
      },
    });

    if (!response || !response.text) {
      throw new Error("Empty response from Gemini during solving");
    }

    return JSON.parse(response.text.trim());
  } catch (error: any) {
    console.error("Gemini Solving Failure:", JSON.stringify(error, null, 2));
    throw new Error(error.message || 'Problem solving failed');
  }
}

export async function generateDiagramAction(prompt: string): Promise<string | undefined> {
  if (!prompt) return undefined;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `High-quality academic diagram: ${prompt}. Clean white background, minimalist professional technical style.` }]
      },
      config: {
        imageConfig: { aspectRatio: "4:3" }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return undefined;
  } catch (error: any) {
    console.error("Gemini Diagram Failure:", JSON.stringify(error, null, 2));
    return undefined; // Non-blocking failure for diagrams
  }
}