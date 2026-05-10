import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "../db";
import { aiUsageEvents, type InsertAIUsageEvent } from "../../drizzle/schema";

export class AIUsageService {
  static async record(event: InsertAIUsageEvent) {
    await getDb().insert(aiUsageEvents).values(event);
  }

  static async dashboard(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totals, failedTools, approvals] = await Promise.all([
      getDb()
        .select({
          eventType: aiUsageEvents.eventType,
          status: aiUsageEvents.status,
          count: count(),
        })
        .from(aiUsageEvents)
        .where(gte(aiUsageEvents.createdAt, since))
        .groupBy(aiUsageEvents.eventType, aiUsageEvents.status)
        .orderBy(desc(count())),
      getDb()
        .select({
          toolName: aiUsageEvents.toolName,
          count: count(),
        })
        .from(aiUsageEvents)
        .where(and(gte(aiUsageEvents.createdAt, since), eq(aiUsageEvents.status, "failure")))
        .groupBy(aiUsageEvents.toolName)
        .orderBy(desc(count()))
        .limit(10),
      getDb()
        .select({
          approved: sql<number>`sum(case when ${aiUsageEvents.status} = 'approved' then 1 else 0 end)`,
          rejected: sql<number>`sum(case when ${aiUsageEvents.status} = 'rejected' then 1 else 0 end)`,
        })
        .from(aiUsageEvents)
        .where(and(gte(aiUsageEvents.createdAt, since), eq(aiUsageEvents.eventType, "approval"))),
    ]);

    return {
      days,
      totals,
      failedTools,
      approvals: approvals[0] ?? { approved: 0, rejected: 0 },
    };
  }
}
