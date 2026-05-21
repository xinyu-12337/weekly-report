import { relations } from "drizzle-orm/relations";
import { weeklyReports, weeklyReportItems, weeklyReportAttachments } from "./schema";

export const weeklyReportRelations = relations(weeklyReports, ({ many }) => ({
  items: many(weeklyReportItems),
  attachments: many(weeklyReportAttachments),
}));

export const weeklyReportItemRelations = relations(weeklyReportItems, ({ one }) => ({
  report: one(weeklyReports, {
    fields: [weeklyReportItems.report_id],
    references: [weeklyReports.id],
  }),
}));

export const weeklyReportAttachmentRelations = relations(weeklyReportAttachments, ({ one }) => ({
  report: one(weeklyReports, {
    fields: [weeklyReportAttachments.report_id],
    references: [weeklyReports.id],
  }),
}));
