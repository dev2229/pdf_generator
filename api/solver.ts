
import { GoogleGenAI, Type } from "@google/genai";
import { QuestionItem, AcademicContext } from "../types.ts";

/**
 * SIMULATED BACKEND ACTIONS
 * This file is the only entry point for @google/genai calls.
 * Updated to use 'gemini-3-flash-preview' as requested (Normal Model).
 */

const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    // This error will be caught and reported to the user as an auth requirement
    throw new Error("API_KEY_MISSING: Environment variable process.env.API_KEY is not defined. Please ensure an API Key is selected.");
  }
  return new GoogleGenAI({ apiKey });
};

export async function extractQuestionsAction(text: string): Promise<QuestionItem[]> {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Extract all academic exam questions from the following text. 
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
    console.error("Extraction Parsing Failed:", e);
    return [];
  }
}

export async function solveQuestionsAction(questions: QuestionItem[], context: AcademicContext): Promise<QuestionItem[]> {
  const ai = getAIInstance();
  
  const prompt = `Act as an expert Academic Solver.
  Subject Context: ${context.field}, ${context.subField}, Course: ${context.subject}
  
  TASK: Solve these questions with depth and clarity. 
  - For calculation problems, provide step-by-step logic.
  - For theoretical problems, use structured headings.
  - Suggest a "diagramPrompt" for a logical technical illustration.
  - Search for a "referenceDocUrl" and "referenceVideoUrl" that are highly relevant.
  
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
  if (!content) return questions.map(q => ({ ...q, answer: "AI generation failed." }));
  try {
    return JSON.parse(content.trim());
  } catch (e) {
    console.error("Solver Parsing Failed:", e);
    return questions.map(q => ({ ...q, answer: "Format error in AI output." }));
  }
}

export async function generateDiagramAction(prompt: string): Promise<string | undefined> {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: `High-quality academic diagram: ${prompt}. Technical, clean, white background.` }]
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
