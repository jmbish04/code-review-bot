import { getDb } from '../db';
import { githubWebhooks, prCodeComments } from '../db/schema';
import { ReviewBot } from '../agents/ReviewBot';
import { DeploymentVerifierAgent } from '../agents/DeploymentVerifier';
import { ConfigurationAgent } from '../agents/ConfigurationAgent';
import { CodeConflictAgent } from '../agents/ConflictResolver';
import { generateStructured } from '../ai';
import { z } from '@hono/zod-openapi';

export class EventManager {
  constructor(private env: any) {}

  async handleEvent(event: string, payload: any) {
    const db = getDb(this.env.DB);
    console.log(`[EventManager] Received event: ${event}`);

    // 1. Log generic webhook
    try {
        await db.insert(githubWebhooks).values({
            event,
            payload: JSON.stringify(payload),
            processed: false,
        });
    } catch (e) {
        console.error('[EventManager] Failed to log webhook', e);
    }

    // 2. Dispatch based on event type
    try {
        if (this.isPrCodeComment(event, payload)) {
             await this.handlePrCodeComment(payload);
        } else if (this.isPrMerged(event, payload)) {
             await this.handlePrMerged(payload);
        } else if (this.isPush(event, payload)) {
             await this.handlePush(payload);
        } else if (this.isIssueComment(event, payload)) {
             await this.handleIssueComment(payload);
        } else if (this.isPrOpenedOrSync(event, payload)) {
             console.log('[EventManager] PR Opened/Synchronized');
        }
    } catch (error) {
        console.error('[EventManager] Error processing event', error);
    }
  }

  isPrCodeComment(event: string, payload: any) {
      return (event === 'pull_request_review_comment' && payload.action === 'created');
  }

  isPrMerged(event: string, payload: any) {
      return event === 'pull_request' && payload.action === 'closed' && payload.pull_request.merged === true;
  }

  isPush(event: string, payload: any) {
      return event === 'push';
  }

  isIssueComment(event: string, payload: any) {
      return event === 'issue_comment' && payload.action === 'created';
  }

  isPrOpenedOrSync(event: string, payload: any) {
      return event === 'pull_request' && (payload.action === 'opened' || payload.action === 'synchronize' || payload.action === 'reopened');
  }

  async handlePrCodeComment(payload: any) {
      console.log('[EventManager] Handling PR Code Comment');
      const db = getDb(this.env.DB);
      
      const repoName = payload.repository?.full_name || `${this.env.OWNER}/${payload.repository?.name}`;
      const prNumber = payload.pull_request.number;
      const commentId = payload.comment.id;
      const body = payload.comment.body;
      const path = payload.comment.path;
      const line = payload.comment.line || payload.comment.original_line;
      const author = payload.comment.user.login;

      await db.insert(prCodeComments).values({
          repoName,
          prNumber,
          commentId,
          body,
          path,
          line,
          author,
          status: 'open'
      });

      // Check if this comment is a command for the bot
      if (body.includes('@colby-bot')) {
           await this.routeCommand(repoName, prNumber, body);
           return;
      }

      const agent = new ReviewBot(this.env);
      await agent.processNewComment(repoName, prNumber, body, path, line);
  }

  async handleIssueComment(payload: any) {
      console.log('[EventManager] Handling Issue Comment');
      const body = payload.comment.body;
      const repoName = payload.repository.full_name;
      const issueNumber = payload.issue.number;
      // In GitHub, PRs are Issues. payload.issue.pull_request exists if it's a PR.
      const isPR = !!payload.issue.pull_request;

      if (!body.includes('@colby-bot')) {
          return;
      }

      if (!isPR) {
          console.log('[EventManager] Ignoring non-PR issue comment command');
          return;
      }

      await this.routeCommand(repoName, issueNumber, body);
  }

  async routeCommand(repoName: string, prNumber: number, command: string) {
      console.log(`[EventManager] Routing command: ${command}`);

      const Schema = z.object({
          intent: z.enum(['fix_code', 'resolve_conflict', 'check_status', 'unknown']),
          reasoning: z.string()
      });

      try {
          const result = await generateStructured(this.env,
              `Classify the intent of this command addressed to a bot: "${command}".
               - 'fix_code': The user wants the bot to fix code issues, review the PR, or apply changes.
               - 'resolve_conflict': The user wants help with merge conflicts.
               - 'check_status': The user asks for status, health, or verification.
               - 'unknown': None of the above.`,
              Schema
          );

          console.log(`[EventManager] Intent: ${result.intent}`);

          switch (result.intent) {
              case 'fix_code':
                  const reviewBot = new ReviewBot(this.env);
                  await reviewBot.processNewComment(repoName, prNumber, command);
                  break;
              case 'resolve_conflict':
                  const conflictAgent = new CodeConflictAgent(this.env);
                  await conflictAgent.resolveConflict(repoName, prNumber);
                  break;
              case 'check_status':
                  const verifier = new DeploymentVerifierAgent(this.env);
                  await verifier.verifyDeployment(repoName, prNumber);
                  break;
              default:
                  console.log('[EventManager] Unknown intent');
          }

      } catch (e) {
          console.error('[EventManager] Failed to route command', e);
      }
  }

  async handlePrMerged(payload: any) {
      console.log('[EventManager] Handling PR Merged');
      const repoName = payload.repository.full_name;
      const prNumber = payload.pull_request.number;

      const agent = new DeploymentVerifierAgent(this.env);
      await agent.verifyDeployment(repoName, prNumber);
  }

  async handlePush(payload: any) {
      console.log('[EventManager] Handling Push');
      const repoName = payload.repository.full_name;
      const ref = payload.ref.replace('refs/heads/', ''); // Extract branch name
      const commits = payload.commits || [];

      // Check for wrangler.toml or wrangler.jsonc in modified/added files
      let configChanged = false;
      for (const commit of commits) {
          const files = [...(commit.added || []), ...(commit.modified || [])];
          if (files.some((f: string) => f.includes('wrangler.toml') || f.includes('wrangler.jsonc'))) {
              configChanged = true;
              break;
          }
      }

      if (configChanged) {
          console.log('[EventManager] Wrangler config changed, triggering ConfigurationAgent');
          const agent = new ConfigurationAgent(this.env);
          await agent.validateBindings(repoName, ref);
      }
  }
}
