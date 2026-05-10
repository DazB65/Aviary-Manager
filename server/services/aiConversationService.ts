import type { UIMessage } from "ai";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { aiConversations, aiMessages } from "../../drizzle/schema";

function safeTitleFromMessages(messages: UIMessage[]): string {
  const firstUserText = messages
    .find((message) => message.role === "user")
    ?.parts?.map((part: any) => part?.type === "text" ? String(part.text ?? "") : "")
    .join(" ")
    .trim();

  if (!firstUserText) return "Aviary AI Chat";
  return firstUserText.length > 80 ? `${firstUserText.slice(0, 77)}...` : firstUserText;
}

function parseMessageParts(parts: string) {
  try {
    const parsed = JSON.parse(parts);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export class AIConversationService {
  static async list(userId: number) {
    return getDb()
      .select({
        id: aiConversations.id,
        clientKey: aiConversations.clientKey,
        title: aiConversations.title,
        createdAt: aiConversations.createdAt,
        updatedAt: aiConversations.updatedAt,
      })
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(30);
  }

  static async create(userId: number, title = "Aviary AI Chat", clientKey?: string | null) {
    const [conversation] = await getDb()
      .insert(aiConversations)
      .values({ userId, title, clientKey: clientKey ?? null })
      .returning();
    return conversation;
  }

  static async getByClientKey(userId: number, clientKey: string) {
    const [conversation] = await getDb()
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.userId, userId), eq(aiConversations.clientKey, clientKey)))
      .limit(1);
    return conversation;
  }

  static async getOrCreateByClientKey(userId: number, clientKey: string, title?: string) {
    const existing = await this.getByClientKey(userId, clientKey);
    if (existing) return existing;
    return this.create(userId, title ?? "Aviary AI Chat", clientKey);
  }

  static async load(userId: number, conversationId: number) {
    const [conversation] = await getDb()
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)))
      .limit(1);

    if (!conversation) return null;

    const rows = await getDb()
      .select()
      .from(aiMessages)
      .where(and(eq(aiMessages.conversationId, conversation.id), eq(aiMessages.userId, userId)))
      .orderBy(asc(aiMessages.id));

    const messages = rows.map((row) => ({
      id: row.messageId ?? String(row.id),
      role: row.role,
      parts: parseMessageParts(row.parts),
    })) as UIMessage[];

    return { conversation, messages };
  }

  static async loadByClientKey(userId: number, clientKey: string) {
    const conversation = await this.getByClientKey(userId, clientKey);
    if (!conversation) return { conversation: null, messages: [] as UIMessage[] };
    return (await this.load(userId, conversation.id)) ?? { conversation, messages: [] as UIMessage[] };
  }

  static async saveMessages(userId: number, conversationId: number, messages: UIMessage[]) {
    const [conversation] = await getDb()
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)))
      .limit(1);
    if (!conversation) throw new Error("Conversation not found");

    const safeMessages = messages.slice(-40);
    await getDb().transaction(async (tx) => {
      await tx
        .delete(aiMessages)
        .where(and(eq(aiMessages.conversationId, conversationId), eq(aiMessages.userId, userId)));

      if (safeMessages.length > 0) {
        await tx.insert(aiMessages).values(
          safeMessages.map((message) => ({
            conversationId,
            userId,
            messageId: message.id,
            role: message.role,
            parts: JSON.stringify(message.parts ?? []),
          }))
        );
      }

      await tx
        .update(aiConversations)
        .set({ title: safeTitleFromMessages(safeMessages), updatedAt: new Date() })
        .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)));
    });
  }

  static async saveMessagesByClientKey(userId: number, clientKey: string, messages: UIMessage[]) {
    const conversation = await this.getOrCreateByClientKey(userId, clientKey, safeTitleFromMessages(messages));
    await this.saveMessages(userId, conversation.id, messages);
    return this.load(userId, conversation.id);
  }

  static async delete(userId: number, conversationId: number) {
    await getDb().transaction(async (tx) => {
      await tx.delete(aiMessages).where(and(eq(aiMessages.conversationId, conversationId), eq(aiMessages.userId, userId)));
      await tx.delete(aiConversations).where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)));
    });
  }
}
