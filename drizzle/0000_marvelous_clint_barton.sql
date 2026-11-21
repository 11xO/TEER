CREATE TABLE `hosted_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`provider_sid` text NOT NULL,
	`binding_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`checking_at` integer,
	`claim_token` text
);
--> statement-breakpoint
CREATE INDEX `hosted_challenges_phone` ON `hosted_challenges` (`phone`);--> statement-breakpoint
CREATE INDEX `hosted_challenges_provider` ON `hosted_challenges` (`provider_sid`);--> statement-breakpoint
CREATE INDEX `hosted_challenges_expiry` ON `hosted_challenges` (`expires_at`);--> statement-breakpoint
CREATE TABLE `hosted_phone_sends` (
	`phone` text PRIMARY KEY NOT NULL,
	`sent_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hosted_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`hits` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hosted_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `hosted_sessions_expiry` ON `hosted_sessions` (`expires_at`);