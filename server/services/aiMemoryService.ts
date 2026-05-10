import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { aiMemories, type InsertAIMemory } from "../../drizzle/schema";

export const AI_MEMORY_CATEGORIES = [
  "preferred_species",
  "breeding_goal",
  "cage_naming_style",
  "mutation_interest",
  "default_breeding_year",
] as const;

export type AIMemoryCategory = typeof AI_MEMORY_CATEGORIES[number];

export class AIMemoryService {
  static async list(userId: number) {
    return getDb()
      .select()
      .from(aiMemories)
      .where(eq(aiMemories.userId, userId))
      .orderBy(desc(aiMemories.updatedAt), desc(aiMemories.id));
  }

  static async remember(userId: number, category: AIMemoryCategory, content: string) {
    const trimmed = content.trim();
    if (!trimmed) throw new Error("Memory content is required");

    const data: InsertAIMemory = {
      userId,
      category,
      content: trimmed.slice(0, 500),
    };

    const [memory] = await getDb().insert(aiMemories).values(data).returning();
    return memory;
  }

  static async forget(userId: number, memoryId: number) {
    await getDb().delete(aiMemories).where(and(eq(aiMemories.id, memoryId), eq(aiMemories.userId, userId)));
    return { success: true } as const;
  }
}
