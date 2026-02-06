
import { GoogleGenAI, Type } from "@google/genai";
import { QuestionItem, AcademicContext } from "../types.ts";

/**
 * SECURE ACTION MODULE
 * Implementation following the secure handler pattern.
 * Uses gemini-3-flash-preview for text and gemini-2.5-flash-image for visuals.
 */

export async function extractQuestionsAction(text: string): Promise<QuestionItem[]> {
  if (!text) throw new Error("Prompt/Text is required for extraction");

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
      throw new Error("Empty response from AI model during extraction");
    }

    return JSON.parse(response.text.trim());
  } catch (error: any) {
    console.error("Gemini Extraction Error details:", JSON.stringify(error, null, 2));
    throw new Error(error.message || 'An error occurred during question extraction');
  }
}

export async function solveQuestionsAction(questions: QuestionItem[], context: AcademicContext): Promise<QuestionItem[]> {
  if (!questions || questions.length === 0) throw new Error("Questions list is required");

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Act as an expert Academic Solver for the subject: ${context.subject}.
    Field Context: ${context.field} -> ${context.subField}
    
    TASK: Solve these questions with depth and clarity. 
    - Show step-by-step logic for math or technical problems.
    - Use structured bullet points for theory.
    - Suggest a visual "diagramPrompt" for technical illustrations.
    - Provide a "referenceDocUrl" (article) and "referenceVideoUrl" (video).
    
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
        temperature: 0.3,
      },
    });

    if (!response || !response.text) {
      throw new Error("Empty response from AI model during solving");
    }

    return JSON.parse(response.text.trim());
  } catch (error: any) {
    console.error("Gemini Solving Error details:", JSON.stringify(error, null, 2));
    throw new Error(error.message || 'An error occurred during AI generation of solutions');
  }
}

export async function generateDiagramAction(prompt: string): Promise<string | undefined> {
  if (!prompt) return undefined;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Professional academic diagram: ${prompt}. Clean white background, minimalist technical style.` }]
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
    console.error("Gemini Diagram Error details:", JSON.stringify(error, null, 2));
    // We don't throw here to avoid failing the whole process if just a diagram fails
    return undefined;
  }
}
