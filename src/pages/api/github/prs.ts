import type { APIRoute } from 'astro';
import { getOctokit } from '../../../tools/github';

export const GET: APIRoute = async ({ request, locals }) => {
    // @ts-ignore
    const env = locals.runtime?.env || (process.env as any);

    try {
        const octokit = getOctokit(env);
        const url = new URL(request.url);
        const prNumberStr = url.searchParams.get('number');
        const repoParam = url.searchParams.get('repo');

        const owner = env.OWNER || 'jmbish04';
        // Default to code-review-bot if no repo provided, logic handles "owner/repo" or just "repo"
        const repo = repoParam ? (repoParam.includes('/') ? repoParam.split('/')[1] : repoParam) : 'code-review-bot';
        const finalOwner = repoParam?.includes('/') ? repoParam.split('/')[0] : owner;

        if (prNumberStr) {
            const prNumber = parseInt(prNumberStr);
            const { data: comments } = await octokit.pulls.listReviewComments({
                owner: finalOwner,
                repo,
                pull_number: prNumber
            });
            return new Response(JSON.stringify(comments), {
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            const { data: prs } = await octokit.pulls.list({
                owner: finalOwner,
                repo,
                state: 'open'
            });

            const simplified = prs.map(pr => ({
                number: pr.number,
                title: pr.title,
                user: pr.user?.login,
                html_url: pr.html_url,
                created_at: pr.created_at,
                repo_full_name: `${finalOwner}/${repo}`
            }));

            return new Response(JSON.stringify(simplified), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (e: any) {
        console.error('API Error:', e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
