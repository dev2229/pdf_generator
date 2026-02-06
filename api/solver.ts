import { GoogleGenAI, Type } from "@google/genai";
import { QuestionItem, AcademicContext } from "../types.ts";

/**
 * SECURE API MODULE
 * Every function instantiates its own GoogleGenAI instance to ensure 
 * process.env.API_KEY is retrieved dynamically and securely.
 */

export async function extractQuestionsAction(text: string): Promise<QuestionItem[]> {
  if (!text) throw new Error("Prompt is required for extraction");

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract all academic exam questions from the following text. 
      Exclude headers, footers, and generic instructions.
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
    console.error("Gemini Extraction Error Details:", JSON.stringify(error, null, 2));
    throw new Error(error.message || 'Question extraction failed');
  }
}

export async function solveQuestionsAction(questions: QuestionItem[], context: AcademicContext): Promise<QuestionItem[]> {
  if (!questions || questions.length === 0) throw new Error("Questions list is required");

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Complex reasoning tasks like solving exams benefit from Pro model
    const prompt = `Act as an expert Academic Solver for the subject: ${context.subject}.
    Academic Field: ${context.field} (${context.subField})
    
    TASK: Provide exam-ready, high-scoring solutions for these questions.
    - Be concise but complete.
    - Show mathematical steps for quantitative problems.
    - Use bullet points for theory.
    - Propose a visual "diagramPrompt" (description) if a technical drawing would help explain the answer.
    - Provide a "referenceDocUrl" (an authoritative article link) and "referenceVideoUrl" (YouTube link) for further study.
    
    Questions to solve:
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
        },
        temperature: 0.4,
      },
    });

    if (!response || !response.text) {
      throw new Error("Empty response from Gemini during solution generation");
    }

    return JSON.parse(response.text.trim());
  } catch (error: any) {
    console.error("Gemini Solver Error Details:", JSON.stringify(error, null, 2));
    throw new Error(error.message || 'Academic solution generation failed');
  }
}

export async function generateDiagramAction(prompt: string): Promise<string | undefined> {
  if (!prompt) return undefined;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `High-quality technical academic diagram: ${prompt}. Minimalist, professional white background, no text overlays if possible.` }]
      },
      config: {
        imageConfig: { aspectRatio: "4:3" }
      },
    });

    // Extracting the image from candidates parts
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return undefined;
  } catch (error: any) {
    console.error("Gemini Diagram Generation Error:", JSON.stringify(error, null, 2));
    // Non-blocking error, return undefined to skip diagram in PDF
    return undefined;
  }
}