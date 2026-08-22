import { sqliteTable,text } from 'drizzle-orm/sqlite-core';

export const authorizedEditors=sqliteTable('authorized_editors',{
  email:text('email').primaryKey(),
  addedAt:text('added_at').notNull(),
  addedBy:text('added_by').notNull(),
});
