import { getDb } from '../db';
import { githubWebhooks, prCodeComments } from '../db/schema';
import { ReviewBot } from '../agents/ReviewBot';
import { DeploymentVerifierAgent } from '../agents/DeploymentVerifier';

export class EventManager {
  constructor(private env: any) {}

  async handleEvent(event: string, payload: any) {
    const db = getDb(this.env.DB);
    console.log(`[EventManager] Received event: ${event}`);

    // 1. Log generic webhook
    await db.insert(githubWebhooks).values({
      event,
      payload: JSON.stringify(payload),
      processed: false,
    });

    // 2. Dispatch based on event type
    try {
        if (this.isPrCodeComment(event, payload)) {
             await this.handlePrCodeComment(payload);
        } else if (this.isPrMerged(event, payload)) {
             await this.handlePrMerged(payload);
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

  async handlePrCodeComment(payload: any) {
      console.log('[EventManager] Handling PR Code Comment');
      const db = getDb(this.env.DB);
      
      // Safety check for repository structure
      const repoName = payload.repository?.full_name || `${this.env.OWNER}/${payload.repository?.name}`;
      const prNumber = payload.pull_request.number;
      const commentId = payload.comment.id;
      const body = payload.comment.body;
      const path = payload.comment.path;
      const line = payload.comment.line || payload.comment.original_line;
      const author = payload.comment.user.login;

      // Log specific comment
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

      // Spawn ReviewBot Agent
      const agent = new ReviewBot(this.env);
      await agent.processNewComment(repoName, prNumber, body, path, line);
  }

  async handlePrMerged(payload: any) {
      console.log('[EventManager] Handling PR Merged');
      const repoName = payload.repository.full_name;
      const prNumber = payload.pull_request.number;

      const agent = new DeploymentVerifierAgent(this.env);
      await agent.verifyDeployment(repoName, prNumber);
  }
}
