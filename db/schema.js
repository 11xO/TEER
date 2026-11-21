import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const challenges = sqliteTable('hosted_challenges', {
  id: text('id').primaryKey(), phone: text('phone').notNull(), providerSid: text('provider_sid').notNull(), bindingHash: text('binding_hash').notNull(),
  createdAt: integer('created_at').notNull(), expiresAt: integer('expires_at').notNull(), attempts: integer('attempts').notNull().default(0),
  status: text('status').notNull().default('pending'), checkingAt: integer('checking_at'), claimToken: text('claim_token'),
}, (table) => [index('hosted_challenges_phone').on(table.phone), index('hosted_challenges_provider').on(table.providerSid), index('hosted_challenges_expiry').on(table.expiresAt)]);
export const sessions = sqliteTable('hosted_sessions', {
  tokenHash: text('token_hash').primaryKey(), phone: text('phone').notNull(), createdAt: integer('created_at').notNull(), expiresAt: integer('expires_at').notNull(),
}, (table) => [index('hosted_sessions_expiry').on(table.expiresAt)]);
export const phoneSends = sqliteTable('hosted_phone_sends', { phone: text('phone').primaryKey(), sentAt: integer('sent_at').notNull() });
export const rateLimits = sqliteTable('hosted_rate_limits', { key: text('key').primaryKey(), windowStart: integer('window_start').notNull(), hits: integer('hits').notNull() });
