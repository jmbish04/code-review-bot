
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from './db/schema';

// Define the environment bindings
type Env = {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  DB: D1Database;
  GITHUB_API_TOKEN: string;
  JULES_API_KEY: string;
  GITHUB_USER: string;
  JULES_API_URL: string;
  GITHUB_WEBHOOK_SECRET: string;
};

const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware to allow frontend to call the API
app.use('/api/*', cors());


// --- Helper function for webhook signature verification ---
async function verifySignature(request: Request, secret: string): Promise<boolean> {
    try {
        const signature = request.headers.get('x-hub-signature-256');
        if (!signature || !signature.startsWith('sha256=')) {
            return false;
        }

        const payload = await request.clone().text();
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const sigHex = signature.substring(7); // Remove 'sha256='
        const sigBytes = new Uint8Array(sigHex.match(/../g)!.map(h => parseInt(h, 16)));
        const dataBytes = encoder.encode(payload);

        return await crypto.subtle.verify('HMAC', key, sigBytes, dataBytes);
    } catch (e) {
        console.error("Signature verification error:", e);
        return false;
    }
}


// --- GitHub API Routes ---

// List pull requests
app.get('/api/prs', async (c) => {
  const status = c.req.query('status') || 'open'; // Default to open
  let query = `is:pr+author:${c.env.GITHUB_USER}`;
  if (status !== 'all') {
      query += `+is:${status}`;
  }

  const GITHUB_API_URL = `https://api.github.com/search/issues?q=${query}`;

  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        'User-Agent': 'CodeReviewBot',
        'Authorization': `Bearer ${c.env.GITHUB_API_TOKEN}`,
      },
    });
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }
    const data = await response.json();
    return c.json(data);
  } catch (error) {
    console.error('Failed to fetch pull requests:', error);
    return c.json({ error: 'Failed to fetch pull requests' }, 500);
  }
});

// Get PR details
app.get('/api/prs/:owner/:repo/pull/:pull_number', async (c) => {
    const { owner, repo, pull_number } = c.req.param();
    const GITHUB_API_URL = `https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}`;

    try {
        const response = await fetch(GITHUB_API_URL, {
            headers: {
                'User-Agent': 'CodeReviewBot',
                'Authorization': `Bearer ${c.env.GITHUB_API_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
            },
        });
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.statusText}`);
        }
        const data = await response.json();
        return c.json(data);
    } catch (error) {
        console.error(`Failed to fetch PR details for #${pull_number}:`, error);
        return c.json({ error: `Failed to fetch PR details for #${pull_number}` }, 500);
    }
});


// Get PR comments
app.get('/api/prs/:owner/:repo/pull/:pull_number/comments', async (c) => {
    const { owner, repo, pull_number } = c.req.param();
    const GITHUB_API_URL = `https://api.github.com/repos/${owner}/${repo}/issues/${pull_number}/comments`;

    try {
        const response = await fetch(GITHUB_API_URL, {
            headers: {
                'User-Agent': 'CodeReviewBot',
                'Authorization': `Bearer ${c.env.GITHUB_API_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
            },
        });
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.statusText}`);
        }
        const data = await response.json();
        return c.json(data);
    } catch (error) {
        console.error(`Failed to fetch comments for PR #${pull_number}:`, error);
        return c.json({ error: `Failed to fetch comments for PR #${pull_number}` }, 500);
    }
});

// Get PR code comments and serve as JSON
app.get('/api/prs/:owner/:repo/pull/:pull_number/code_comments.json', async (c) => {
    const { owner, repo, pull_number } = c.req.param();
    const GITHUB_API_URL = `https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}/comments`;

    try {
        const response = await fetch(GITHUB_API_URL, {
            headers: {
                'User-Agent': 'CodeReviewBot',
                'Authorization': `Bearer ${c.env.GITHUB_API_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
            },
        });
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.statusText}`);
        }
        const data = await response.json();
        return c.json(data);
    } catch (error) {
        console.error(`Failed to fetch code comments for PR #${pull_number}:`, error);
        return c.json({ error: `Failed to fetch code comments for PR #${pull_number}` }, 500);
    }
});


// --- Jules API and Task Management ---

// List Jules' tasks
app.get('/api/jules/tasks', async (c) => {
    try {
        const db = drizzle(c.env.DB, { schema });
        const tasks = await db.select().from(schema.julesTasks).all();
        return c.json(tasks);
    } catch (error) {
        console.error('Failed to list Jules tasks:', error);
        return c.json({ error: 'Failed to list Jules tasks' }, 500);
    }
});

// Create a new task for Jules
app.post('/api/jules/tasks', async (c) => {
    const db = drizzle(c.env.DB, { schema });
    let taskId = '';

    try {
        const { task, pr_url } = await c.req.json();
        if (!task) {
            return c.json({ error: 'Task description is required' }, 400);
        }

        taskId = crypto.randomUUID();
        const now = new Date().toISOString();

        const newTask = {
            id: taskId,
            task,
            pr_url,
            status: 'pending',
            created_at: now,
            updated_at: now,
        };

        // Insert the initial task state into D1
        await db.insert(schema.julesTasks).values(newTask).run();

        // Proxy the request to the actual Jules API
        const jules_response = await fetch(c.env.JULES_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${c.env.JULES_API_KEY}`,
            },
            body: JSON.stringify({ task, pr_url }),
        });

        if (!jules_response.ok) {
            // If the API call fails, update the task status to 'failed' in D1
            await db.update(schema.julesTasks)
                .set({ status: 'failed', updated_at: new Date().toISOString() })
                .where(eq(schema.julesTasks.id, taskId));
            throw new Error(`Jules API error: ${jules_response.statusText}`);
        }

        // If the API call is successful, update the task status to 'queued' in D1
        const updatedTask = await db.update(schema.julesTasks)
            .set({ status: 'queued', updated_at: new Date().toISOString() })
            .where(eq(schema.julesTasks.id, taskId))
            .returning();

        return c.json(updatedTask[0], 201);

    } catch (error) {
        console.error('Failed to create Jules task:', error);
        // Clean up the task if it was created but the proxy failed
        if (taskId) {
            await db.update(schema.julesTasks)
                .set({ status: 'failed', updated_at: new Date().toISOString() })
                .where(eq(schema.julesTasks.id, taskId));
        }
        return c.json({ error: 'Failed to create Jules task' }, 500);
    }
});


// --- GitHub Webhook Handler ---

app.post('/api/webhooks/github', async (c) => {
    const valid = await verifySignature(c.req.raw, c.env.GITHUB_WEBHOOK_SECRET);
    if (!valid) {
        console.error('Invalid webhook signature');
        return c.json({ error: 'Invalid signature' }, 401);
    }

    const payload = await c.req.json();
    const event = c.req.header('x-github-event');

    // Only process pull request events
    if (event === 'pull_request') {
        const { action, pull_request } = payload;

        // Check for conflicts on PR open or sync events
        if (action === 'opened' || action === 'synchronize') {
            // GitHub may take a moment to calculate mergeability
            if (pull_request.mergeable === false) {
                const task = `Resolve merge conflict in PR #${pull_request.number}`;
                const pr_url = pull_request.html_url;

                // Create a task for Jules to resolve the conflict by calling our own API
                // This re-uses the Jules API proxy logic
                const tasksUrl = new URL('/api/jules/tasks', c.req.url).toString();
                const response = await fetch(tasksUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ task, pr_url }),
                });

                if(!response.ok) {
                    console.error("Failed to create conflict resolution task via webhook");
                }
            }
        }
    }

    return c.json({ message: 'Webhook processed' });
});


// --- Serve Frontend Assets ---

// Handle the PR detail page route
app.get('/prs/:owner/:repo/pull/:pull_number', (c) => {
    // Serve the pr.html file for this route
    const url = new URL(c.req.url);
    url.pathname = '/pr.html';
    const newReq = new Request(url.toString(), c.req.raw);
    return c.env.ASSETS.fetch(newReq);
});

// The GET handler will serve the other static assets
app.get('*', (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
