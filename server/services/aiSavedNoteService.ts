import { desc, and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { aiSavedNotes } from "../../drizzle/schema";

export class AISavedNoteService {
  static async list(userId: number) {
    return getDb()
      .select()
      .from(aiSavedNotes)
      .where(eq(aiSavedNotes.userId, userId))
      .orderBy(desc(aiSavedNotes.createdAt))
      .limit(50);
  }

  static async create(userId: number, title: string, content: string) {
    const [note] = await getDb()
      .insert(aiSavedNotes)
      .values({
        userId,
        title: title.trim().slice(0, 160) || "AI chat note",
        content: content.trim().slice(0, 20_000),
      })
      .returning();
    return note;
  }

  static async delete(userId: number, id: number) {
    await getDb()
      .delete(aiSavedNotes)
      .where(and(eq(aiSavedNotes.id, id), eq(aiSavedNotes.userId, userId)));
  }
}
