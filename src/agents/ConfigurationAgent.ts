import { BaseAgent } from './BaseAgent';
import { getOctokit } from '../tools/github';

export class ConfigurationAgent extends BaseAgent {
    async validateBindings(repoName: string, ref: string = 'main') {
        await this.init();
        await this.log(`Validating configuration for ${repoName} on ref ${ref}`);

        const octokit = getOctokit(this.env);
        const [owner, repo] = repoName.split('/');

        let content = '';
        let filename = '';

        try {
            // Try wrangler.jsonc first
            try {
                const { data } = await octokit.repos.getContent({
                    owner,
                    repo,
                    path: 'wrangler.jsonc',
                    ref
                });
                if ('content' in data) {
                    content = atob(data.content);
                    filename = 'wrangler.jsonc';
                }
            } catch (e) {
                // Try wrangler.toml
                const { data } = await octokit.repos.getContent({
                    owner,
                    repo,
                    path: 'wrangler.toml',
                    ref
                });
                 if ('content' in data) {
                    content = atob(data.content);
                    filename = 'wrangler.toml';
                }
            }
        } catch (e) {
            await this.log(`No wrangler configuration found for ${repoName}`);
            return;
        }

        if (!content) return;

        const prompt = `
        Analyze the following Cloudflare Workers configuration file (${filename}):

        \`\`\`
        ${content}
        \`\`\`

        Check for the following critical bindings:
        1. A D1 database binding (likely named 'DB').
        2. An AI binding (likely named 'AI').

        Return a JSON object: { "valid": boolean, "issues": string[] }
        `;

        try {
            const response = await this.generateText(prompt);
             // Basic parsing if the model doesn't return pure JSON
            await this.log(`Configuration check result: ${response}`);
        } catch (e) {
            await this.log(`Error validating configuration: ${e}`);
        }
    }
}
