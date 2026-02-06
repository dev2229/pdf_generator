
import { GoogleGenAI, Type } from "@google/genai";
import { QuestionItem, AcademicContext } from "../types.ts";

/**
 * SERVER-LIKE ACTION MODULE
 * This file handles all direct interaction with the Gemini API.
 * 
 * Rules:
 * 1. Obtained exclusively from process.env.API_KEY.
 * 2. Uses 'Normal' models: gemini-3-flash-preview and gemini-2.5-flash-image.
 */

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_MISSING: Environment variable process.env.API_KEY is not defined. Please ensure your API key is selected via the project settings.");
  }
  return new GoogleGenAI({ apiKey });
};

export async function extractQuestionsAction(text: string): Promise<QuestionItem[]> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Extract all exam questions from this text. 
    Format the output as a JSON array of objects with keys "number" and "question".
    
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
    console.error("Extraction Parse Error:", e);
    return [];
  }
}

export async function solveQuestionsAction(questions: QuestionItem[], context: AcademicContext): Promise<QuestionItem[]> {
  const ai = getAI();
  
  const prompt = `Act as an expert Academic Solver.
  Subject: ${context.subject}
  Field: ${context.field} -> ${context.subField}
  
  TASK: Solve these questions with high academic standards. 
  - Show step-by-step logic for math or technical problems.
  - Use structured formatting for theoretical answers.
  - Suggest a simple visual "diagramPrompt" for a logical technical illustration.
  - Provide a "referenceDocUrl" (educational article) and "referenceVideoUrl" (video tutorial).
  
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
      }
    }
  });

  const content = response.text;
  if (!content) return questions.map(q => ({ ...q, answer: "Solution generation failed." }));
  try {
    return JSON.parse(content.trim());
  } catch (e) {
    console.error("Solver Parse Error:", e);
    return questions.map(q => ({ ...q, answer: "Error formatting AI solution." }));
  }
}

export async function generateDiagramAction(prompt: string): Promise<string | undefined> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: `Professional academic diagram: ${prompt}. Clean minimalist style, white background.` }]
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
  return undefined;
}
