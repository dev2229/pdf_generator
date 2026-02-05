
import { GoogleGenAI, Type } from "@google/genai";
import { QuestionItem, AcademicContext } from "../types.ts";

/**
 * SIMULATED BACKEND ACTIONS
 * This file is the source of truth for SDK interactions.
 */

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in process.env.API_KEY. Please ensure it is configured.");
  }
  return new GoogleGenAI({ apiKey });
};

export async function extractQuestionsAction(text: string): Promise<QuestionItem[]> {
  const ai = getAI();
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
    console.error("Parse Error in extractQuestionsAction:", e);
    return [];
  }
}

export async function solveQuestionsAction(questions: QuestionItem[], context: AcademicContext): Promise<QuestionItem[]> {
  const ai = getAI();
  
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
    console.error("Parse Error in solveQuestionsAction:", e);
    return questions.map(q => ({ ...q, answer: "Format error in solution." }));
  }
}

export async function generateDiagramAction(prompt: string): Promise<string | undefined> {
  const ai = getAI();
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
  return undefined;
}
