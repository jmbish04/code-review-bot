CREATE TABLE `system_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`level` text DEFAULT 'INFO',
	`message` text NOT NULL,
	`source` text NOT NULL,
	`metadata` text,
	`created_at` integer
);
