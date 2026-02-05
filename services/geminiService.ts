
import { QuestionItem, AcademicContext } from "../types.ts";
import { extractQuestionsAction, solveQuestionsAction, generateDiagramAction } from "../api/solver.ts";

/**
 * CLIENT-SIDE SERVICE
 * This service acts as the 'frontend' bridge to the 'backend' API folder.
 * It handles retries and high-level orchestration without knowing SDK details.
 */
export class GeminiService {
  private async executeAction<T>(action: () => Promise<T>, retries = 2, delay = 2000): Promise<T> {
    try {
      return await action();
    } catch (error: any) {
      // Handle quota or common network errors with exponential backoff
      const errorMsg = error?.message || "";
      const isQuotaError = errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED');
      
      if (isQuotaError && retries > 0) {
        console.warn(`API Rate Limit hit, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeAction(action, retries - 1, delay * 2);
      }
      
      throw error;
    }
  }

  async extractQuestions(text: string): Promise<QuestionItem[]> {
    return this.executeAction(() => extractQuestionsAction(text));
  }

  async solveQuestions(questions: QuestionItem[], context: AcademicContext): Promise<QuestionItem[]> {
    return this.executeAction(() => solveQuestionsAction(questions, context));
  }

  async generateTechnicalDiagram(prompt: string): Promise<string | undefined> {
    try {
      return await this.executeAction(() => generateDiagramAction(prompt));
    } catch (e) {
      console.warn("Diagram generation skipped:", e);
      return undefined;
    }
  }
}
