
import { QuestionItem, AcademicContext } from "../types.ts";
import { extractQuestionsAction, solveQuestionsAction, generateDiagramAction } from "../api/solver.ts";

/**
 * CLIENT-SIDE SERVICE
 * This service proxies requests to the solver actions in the api/ folder.
 */
export class GeminiService {
  private async run<T>(action: () => Promise<T>, retries = 2, delay = 2000): Promise<T> {
    try {
      return await action();
    } catch (error: any) {
      const isQuotaError = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
      if (isQuotaError && retries > 0) {
        console.warn(`API Rate Limit: Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.run(action, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  async extractQuestions(text: string): Promise<QuestionItem[]> {
    return this.run(() => extractQuestionsAction(text));
  }

  async solveQuestions(questions: QuestionItem[], context: AcademicContext): Promise<QuestionItem[]> {
    return this.run(() => solveQuestionsAction(questions, context));
  }

  async generateTechnicalDiagram(prompt: string): Promise<string | undefined> {
    try {
      return await this.run(() => generateDiagramAction(prompt));
    } catch (e) {
      console.warn("Diagram generation failed in Service layer:", e);
      return undefined;
    }
  }
}
