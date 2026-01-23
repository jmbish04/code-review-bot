import type { APIRoute } from 'astro';
import { getDb } from '../../db';
import { agentTasks } from '../../db/schema';
import { PromptImproverAgent } from '../../agents/PromptImprover';

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const body = await request.json() as any;
        const { prompt, repoName, assignee, provider } = body;

        // @ts-ignore
        const env = locals.runtime?.env || (process.env as any);
        const db = getDb(env.DB);
        
        let refinedPrompt = prompt;

        // Auto-refine prompt
        try {
            const improver = new PromptImproverAgent(env);
            refinedPrompt = await improver.refinePrompt(prompt, repoName);
        } catch (e) {
            console.error('Prompt refinement failed', e);
        }

        const result = await db.insert(agentTasks).values({
            prompt,
            refinedPrompt,
            repoName,
            assignee,
            provider,
            status: 'pending'
        }).returning();

        return new Response(JSON.stringify(result[0]), { 
            status: 201, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (e) {
        return new Response('Error creating task', { status: 500 });
    }
};
