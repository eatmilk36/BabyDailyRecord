CREATE TABLE `babies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`birth_date` text NOT NULL,
	`color_key` text NOT NULL,
	`sort_order` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`baby_id` text NOT NULL,
	`session_id` text,
	`type` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`ended_at` integer,
	`status` text DEFAULT 'done' NOT NULL,
	`method` text,
	`milk` text,
	`amount_ml` integer,
	`duration_min` integer,
	`side` text,
	`diaper_kind` text,
	`diaper_color` text,
	`payload` text,
	`note` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_events_baby_time` ON `events` (`baby_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_events_baby_type_time` ON `events` (`baby_id`,`type`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_events_status` ON `events` (`status`);--> statement-breakpoint
CREATE INDEX `idx_events_session` ON `events` (`session_id`);