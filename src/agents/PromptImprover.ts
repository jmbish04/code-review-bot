import { BaseAgent } from './BaseAgent';

export class PromptImproverAgent extends BaseAgent {
    async refinePrompt(rawPrompt: string, repoName: string): Promise<string> {
        await this.init();
        
        const systemPrompt = `You are an expert AI prompt engineer. 
        Your goal is to improve the user's raw prompt for a coding agent.
        The agent will be working on the repository: ${repoName}.
        
        Enhance the prompt by:
        1. Adding specific context about best practices.
        2. Structuring the request clearly.
        3. Ensuring the agent checks for existing patterns.
        
        Return ONLY the improved prompt.`;

        const improved = await this.generateText(rawPrompt, systemPrompt);
        return improved;
    }
}
