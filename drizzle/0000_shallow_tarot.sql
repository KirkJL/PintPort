CREATE TABLE `auth_transactions` (
	`hash` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`nonce` text NOT NULL,
	`verifier` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `beers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`normalized` text NOT NULL,
	`brewery_id` text NOT NULL,
	`style` text NOT NULL,
	`abv` real,
	FOREIGN KEY (`brewery_id`) REFERENCES `breweries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `beer_identity` ON `beers` (`normalized`,`brewery_id`);--> statement-breakpoint
CREATE TABLE `breweries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`normalized` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `breweries_normalized_unique` ON `breweries` (`normalized`);--> statement-breakpoint
CREATE TABLE `experiences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`beer_id` text NOT NULL,
	`venue_id` text NOT NULL,
	`rating` real,
	`occurred_at` text NOT NULL,
	`price` real,
	`currency` text NOT NULL,
	`notes` text NOT NULL,
	`venue_notes` text NOT NULL,
	`drink_again` integer NOT NULL,
	`would_return` integer NOT NULL,
	`venue_rating` real,
	`pour_rating` real,
	`price_rating` real,
	`contribute` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`beer_id`) REFERENCES `beers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `experience_owner_date` ON `experiences` (`user_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `experience_venue_contribute` ON `experiences` (`venue_id`,`contribute`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`experience_id` text,
	`object_key` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`experience_id`) REFERENCES `experiences`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`issuer` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_identity` ON `users` (`issuer`,`subject`);--> statement-breakpoint
CREATE TABLE `venue_aliases` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `venue_sources` (
	`venue_id` text NOT NULL,
	`provider` text NOT NULL,
	`external_id` text NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `venue_external` ON `venue_sources` (`provider`,`external_id`);--> statement-breakpoint
CREATE TABLE `venues` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`normalized` text NOT NULL,
	`city` text NOT NULL,
	`country` text NOT NULL,
	`country_code` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_by` text,
	`merged_into` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `venue_geo` ON `venues` (`lat`,`lng`);--> statement-breakpoint
CREATE INDEX `venue_normalized` ON `venues` (`normalized`);