
import { QuestionItem, AcademicContext } from "../types.ts";
import { extractQuestionsAction, solveQuestionsAction, generateDiagramAction } from "../api/solver.ts";

/**
 * CLIENT-SIDE SERVICE
 * This service now communicates with the simulated "API" layer.
 * No direct imports from @google/genai are present here.
 */
export class GeminiService {
  private async apiFetch<T>(action: () => Promise<T>, retries = 2, delay = 2000): Promise<T> {
    try {
      // In a real production app, this would be a window.fetch('/api/...') call.
      // Here we simulate the network request by calling the "API" module functions.
      return await action();
    } catch (error: any) {
      const isQuotaError = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
      if (isQuotaError && retries > 0) {
        console.warn(`Simulated API Route: Quota exceeded, retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.apiFetch(action, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  async extractQuestions(text: string): Promise<QuestionItem[]> {
    return this.apiFetch(() => extractQuestionsAction(text));
  }

  async solveQuestions(questions: QuestionItem[], context: AcademicContext): Promise<QuestionItem[]> {
    return this.apiFetch(() => solveQuestionsAction(questions, context));
  }

  async generateTechnicalDiagram(prompt: string): Promise<string | undefined> {
    try {
      return await this.apiFetch(() => generateDiagramAction(prompt));
    } catch (e) {
      console.warn("Visual aid skipped due to simulated API error:", e);
      return undefined;
    }
  }
}
