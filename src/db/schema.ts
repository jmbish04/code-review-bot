import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';

// ----------------------------------------------------------------------------
// Github Webhooks
// ----------------------------------------------------------------------------
export const githubWebhooks = sqliteTable('github_webhooks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  event: text('event').notNull(),
  payload: text('payload', { mode: 'json' }).notNull(), // Raw JSON
  processed: integer('processed', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ----------------------------------------------------------------------------
// PR Code Comments
// ----------------------------------------------------------------------------
export const prCodeComments = sqliteTable('pr_code_comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  repoName: text('repo_name').notNull(),
  prNumber: integer('pr_number').notNull(),
  commentId: integer('comment_id').notNull(), // Github Comment ID
  body: text('body').notNull(),
  path: text('path'),
  line: integer('line'),
  author: text('author'),
  status: text('status').default('open'), // open, resolved
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ----------------------------------------------------------------------------
// Agent Tasks (Manual & Auto)
// ----------------------------------------------------------------------------
export const agentTasks = sqliteTable('agent_tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  prompt: text('prompt').notNull(),
  refinedPrompt: text('refined_prompt'),
  provider: text('provider').default('jules'), // jules, gemini, manual
  status: text('status').default('pending'), // pending, refining, in_progress, completed, failed
  repoName: text('repo_name'),
  prNumber: integer('pr_number'),
  assignee: text('assignee'),
  result: text('result'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ----------------------------------------------------------------------------
// AI Logs (Cloudflare Docs Oracle usage)
// ----------------------------------------------------------------------------
export const aiLogs = sqliteTable('ai_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id').references(() => agentTasks.id),
  query: text('query').notNull(),
  response: text('response').notNull(),
  provider: text('provider'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ----------------------------------------------------------------------------
// Deployments (Verification)
// ----------------------------------------------------------------------------
export const deployments = sqliteTable('deployments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  repoName: text('repo_name').notNull(),
  prNumber: integer('pr_number'),
  status: text('status').default('pending'), // pending, success, failure
  buildLogs: text('build_logs'),
  verificationStatus: text('verification_status').default('unknown'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ----------------------------------------------------------------------------
// Settings (Dynamic Config)
// ----------------------------------------------------------------------------
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
// ----------------------------------------------------------------------------
// System Logs (General Application Logging)
// ----------------------------------------------------------------------------
export const systemLogs = sqliteTable('system_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  level: text('level').default('INFO'), // INFO, WARN, ERROR
  message: text('message').notNull(),
  source: text('source').notNull(), // Worker, Webhook, AgentName
  metadata: text('metadata', { mode: 'json' }), // Optional JSON context
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
