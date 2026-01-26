import { BaseAgent } from './BaseAgent';
import { getOctokit } from '../tools/github';
import { aiLogs, agentTasks } from '../db/schema';

export class ReviewBot extends BaseAgent {
    
    async processNewComment(repoName: string, prNumber: number, commentBody: string, commentPath?: string, commentLine?: number) {
        await this.init();
        await this.log(`Processing comment on ${repoName}#${prNumber}`);

        const octokit = getOctokit(this.env);
        const [owner, repo] = repoName.split('/');

        // 1. Fetch file context if path is provided
        let fileContext = "";
        if (commentPath) {
            try {
                const { data: fileData } = await octokit.repos.getContent({
                    owner,
                    repo,
                    path: commentPath,
                    ref: `refs/pull/${prNumber}/head` // Get content from PR head
                });
                
                if ('content' in fileData && !Array.isArray(fileData)) {
                    fileContext = atob(fileData.content);
                }
            } catch (e) {
                await this.log(`Failed to fetch file content: ${e}`);
            }
        }

        // 2. Detect Cloudflare Worker
        const isWorker = await this.isCloudflareWorker(owner, repo, prNumber);
        let additionalContext = "";

        if (isWorker) {
            await this.log("Detected Cloudflare Worker environment.");
            // Generate queries for Cloudflare Docs (Simulation of MCP)
            const queries = await this.generateDocsQueries(commentBody, fileContext);
            
            for (const query of queries) {
                // Simulate querying Docs MCP - in reality this might hit a specific knowledge base or vector DB
                // For this implementation, we will simulate a loop checking status
                // For now, we ask the AI to answer based on its training data about Cloudflare
                const docsResponse = await this.generateText(
                    `Answer this question specifically about Cloudflare Workers best practices: ${query}`,
                    "You are a Cloudflare expert. Provide concise, technical answers."
                );

                // Log to D1
                await this.db.insert(aiLogs).values({
                    query,
                    response: docsResponse,
                    provider: this.model,
                    createdAt: new Date()
                });

                additionalContext += `\n\nContext for "${query}":\n${docsResponse}`;
            }
        }

        // 3. Prompt Provider (Jules/Gemini) to fix
        const prompt = `
        You are an expert code reviewer and developer.
        
        Repo: ${repoName}
        File: ${commentPath || 'N/A'}
        Line: ${commentLine || 'N/A'}
        
        User Comment: "${commentBody}"
        
        ${fileContext ? `File Content Snippet:\n\`\`\`\n${this.getRelevantLines(fileContext, commentLine)}\n\`\`\`` : ''}
        
        ${additionalContext}
        
        Task:
        1. Analyze the comment and the code.
        2. Provide a specific code fix (patch) to address the comment.
        3. If this is a Cloudflare Worker, apply the best practices found in the context.
        
        Output only the code block for the fix and a brief explanation.
        `;

        // Create Task
        const taskResult = await this.db.insert(agentTasks).values({
            prompt,
            repoName,
            prNumber,
            provider: this.env.PR_FIX_PROVIDER || 'jules',
            status: 'pending',
            assignee: 'auto-agent'
        }).returning();

        // Execute immediately (or could be picked up by a queue)
        const fixResponse = await this.generateText(prompt);
        
        // Update Task
        await this.db.update(agentTasks)
            .set({ 
                status: 'completed', 
                result: fixResponse,
                updatedAt: new Date() 
            })
            .where({ id: taskResult[0].id } as any); // Type cast for Drizzle

        await this.log(`Fix generated for task ${taskResult[0].id}`);
    }

    private async isCloudflareWorker(owner: string, repo: string, prNumber: number): Promise<boolean> {
        const octokit = getOctokit(this.env);
        // Check for wrangler.toml or wrangler.jsonc in root
        try {
            const { data: files } = await octokit.pulls.listFiles({
                owner,
                repo,
                pull_number: prNumber
            });
            // Also check repo root via contents API if not in PR files
            // For efficiency, just checking if *any* file suggests it, or if we should check root
            // Let's check root specifically
            try {
                await Promise.any([
                    octokit.repos.getContent({ owner, repo, path: 'wrangler.toml' }),
                    octokit.repos.getContent({ owner, repo, path: 'wrangler.jsonc' })
                ]);
                return true;
            } catch (e) {
                // All promises were rejected
                return false;
            }
        } catch (e) {
            return false;
        }
    }

    private async generateDocsQueries(comment: string, code: string): Promise<string[]> {
        const prompt = `
        Based on this code review comment: "${comment}"
        And this code context: "${code.slice(0, 500)}..."
        
        Generate 3 specific questions to ask the Cloudflare Documentation to ensure best practices are met.
        Return as a JSON array of strings.
        `;
        
        try {
            // Simple parsing of list/array
            const response = await this.generateText(prompt);
            // Attempt to extract JSON
            const match = response.match(/\[.*\]/s);
            if (match) return JSON.parse(match[0]);
            return ["Cloudflare Workers best practices"];
        } catch {
            return ["Cloudflare Workers security", "Cloudflare Workers optimization"];
        }
    }

    private getRelevantLines(content: string, line?: number): string {
        if (!line) return content.slice(0, 1000);
        const lines = content.split('\n');
        const start = Math.max(0, line - 10);
        const end = Math.min(lines.length, line + 10);
        return lines.slice(start, end).join('\n');
    }
}
