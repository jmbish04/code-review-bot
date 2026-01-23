CREATE TABLE `agent_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prompt` text NOT NULL,
	`refined_prompt` text,
	`provider` text DEFAULT 'jules',
	`status` text DEFAULT 'pending',
	`repo_name` text,
	`pr_number` integer,
	`assignee` text,
	`result` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `ai_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer,
	`query` text NOT NULL,
	`response` text NOT NULL,
	`provider` text,
	`created_at` integer,
	FOREIGN KEY (`task_id`) REFERENCES `agent_tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `deployments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`repo_name` text NOT NULL,
	`pr_number` integer,
	`status` text DEFAULT 'pending',
	`build_logs` text,
	`verification_status` text DEFAULT 'unknown',
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `github_webhooks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event` text NOT NULL,
	`payload` text NOT NULL,
	`processed` integer DEFAULT false,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `pr_code_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`repo_name` text NOT NULL,
	`pr_number` integer NOT NULL,
	`comment_id` integer NOT NULL,
	`body` text NOT NULL,
	`path` text,
	`line` integer,
	`author` text,
	`status` text DEFAULT 'open',
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer
);
