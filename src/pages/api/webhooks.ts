import type { APIRoute } from 'astro';
import { EventManager } from '../../services/EventManager';
import { Logger } from '../../services/Logger';

export const POST: APIRoute = async ({ request, locals }) => {
  const event = request.headers.get('x-github-event');
  if (!event) {
    return new Response('No event header', { status: 400 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return new Response('Invalid JSON', { status: 400 });
  }

  // @ts-ignore - locals.runtime available in Cloudflare adapter
  const env = locals.runtime?.env || (process.env as any); 
  
  const manager = new EventManager(env);
  const logger = new Logger(env.DB);
  
  // Use waitUntil if available to avoid blocking response
  // @ts-ignore
  if (locals.runtime?.ctx?.waitUntil) {
      // @ts-ignore
      locals.runtime.ctx.waitUntil(logger.info(`Received webhook event: ${event}`, 'WebhookHandler', { sender: (payload as any).sender?.login }));
      // @ts-ignore
      // Handle all events via EventManager (including push, issue_comment, etc.)
      locals.runtime.ctx.waitUntil(manager.handleEvent(event, payload));
  } else {
      await logger.info(`Received webhook event: ${event}`, 'WebhookHandler', { sender: (payload as any).sender?.login });
      await manager.handleEvent(event, payload);
  }

  return new Response('Accepted', { status: 202 });
};
