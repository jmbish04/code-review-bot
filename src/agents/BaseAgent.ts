import { getDb } from '../db';
import { settings, agentTasks } from '../db/schema';
import { eq } from 'drizzle-orm';
import { generateText as aiGenerateText } from '../ai';
import { Logger } from '../services/Logger';

export class BaseAgent {
    protected db: ReturnType<typeof getDb>;
    protected logger: Logger;
    protected model: string = 'gpt-5'; // default model

    constructor(protected env: any) {
        this.db = getDb(env.DB);
        this.logger = new Logger(env.DB);
    }

    async init() {
        // Load provider/model from settings or env
        // User requested PR_FIX_PROVIDER or AGENT_PROVIDER mapping
        // We look for a setting 'AGENT_PROVIDER' which holds the MODEL name (e.g. 'gemini-2.0-flash')
        const modelSetting = await this.db.select().from(settings).where(eq(settings.key as any, 'AGENT_PROVIDER') as any).get();
        if (modelSetting) {
            this.model = modelSetting.value;
        } else if (this.env.AGENT_PROVIDER) {
             this.model = this.env.AGENT_PROVIDER;
        }
    }

    async generateText(prompt: string, systemPrompt?: string) {
        // Use the unified AI module. It handles provider deduction from this.model string.
        try {
            return await aiGenerateText(this.env, prompt, systemPrompt, this.model);
        } catch (error) {
            await this.logger.error(`Error generating text with model ${this.model}`, this.constructor.name, { error });
            return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
    }

    protected async log(message: string, metadata?: any) {
        await this.logger.info(message, this.constructor.name, metadata);
    }
}
