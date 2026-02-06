
import { GoogleGenAI, Type } from "@google/genai";
import { QuestionItem, AcademicContext } from "../types.ts";

/**
 * SIMULATED BACKEND ACTIONS
 * This file is the only entry point for @google/genai calls.
 * Model used: gemini-3-flash-preview (Normal Model).
 */

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_MISSING: Environment variable process.env.API_KEY is not defined. Please select a key.");
  }
  // Initialize instance immediately before call to ensure the latest key from dialog is used.
  return new GoogleGenAI({ apiKey });
};

export async function extractQuestionsAction(text: string): Promise<QuestionItem[]> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Extract all academic exam questions from the following text. 
    Return a JSON array of objects with "number" (string) and "question" (string).
    
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
  Field: ${context.field}, Specialty: ${context.subField}, Subject: ${context.subject}
  
  TASK: Provide clear, concise, exam-ready answers for these questions.
  - Show steps for mathematical problems.
  - Use structured bullet points for theoretical answers.
  - Suggest a simple visual diagram description in "diagramPrompt".
  - Provide a legitimate "referenceDocUrl" (article link) and "referenceVideoUrl" (educational video link).
  
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
    console.error("Solver Parse Error:", e);
    return questions.map(q => ({ ...q, answer: "Error formatting the response." }));
  }
}

export async function generateDiagramAction(prompt: string): Promise<string | undefined> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: `Professional educational diagram: ${prompt}. Minimalist, white background, high contrast.` }]
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
