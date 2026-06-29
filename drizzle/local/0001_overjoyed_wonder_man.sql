ALTER TABLE `comprobantes` ADD `payment_method` text;--> statement-breakpoint
ALTER TABLE `credit_payments` ADD `comprobante_id` integer;--> statement-breakpoint
ALTER TABLE `invoices` ADD `payment_method` text NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `min_stock` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE TABLE `company_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`cuit` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`web` text DEFAULT '' NOT NULL,
	`logo_base64` text DEFAULT '' NOT NULL,
	`store_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_company_settings_store` ON `company_settings` (`store_id`);
