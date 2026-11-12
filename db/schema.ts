import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const revisions = sqliteTable('kitchen_revisions', {
  id: integer('id').primaryKey({autoIncrement:true}),
  data: text('data').notNull(),
  label: text('label').notNull(),
  createdAt: text('created_at').notNull(),
});
