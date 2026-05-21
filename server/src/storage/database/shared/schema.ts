import { pgTable, serial, timestamp, varchar, text, integer, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"


export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const weeklyReports = pgTable(
  "weekly_reports",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    submitter_name: varchar("submitter_name", { length: 128 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("submitted"),
    reject_reason: text("reject_reason"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("weekly_reports_status_idx").on(table.status),
    index("weekly_reports_created_at_idx").on(table.created_at),
  ]
);

export const weeklyReportItems = pgTable(
  "weekly_report_items",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    report_id: varchar("report_id", { length: 36 }).notNull().references(() => weeklyReports.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 20 }).notNull(),
    content: text("content").notNull(),
    manager_reply: text("manager_reply"),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("weekly_report_items_report_id_idx").on(table.report_id),
    index("weekly_report_items_category_idx").on(table.category),
  ]
);

export const weeklyReportAttachments = pgTable(
  "weekly_report_attachments",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    report_id: varchar("report_id", { length: 36 }).notNull().references(() => weeklyReports.id, { onDelete: "cascade" }),
    file_key: text("file_key").notNull(),
    file_name: text("file_name").notNull(),
    file_size: integer("file_size"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("weekly_report_attachments_report_id_idx").on(table.report_id),
  ]
);
