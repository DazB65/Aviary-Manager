import type { UIMessage } from "ai";

export const READ_TOOL_NAMES = [
  "getFlockStats",
  "getShows",
  "searchBirds",
  "getUpcomingEvents",
  "getMutationSummary",
  "getPairEggStats",
  "listPairs",
  "getBirdDetails",
  "getUpcomingHatches",
  "getPairHistory",
  "getSpeciesInfo",
  "getUserSettings",
  "getPedigreeSummary",
  "getInbreedingRisk",
  "getEggDetails",
  "getAttentionReport",
  "getPairPerformanceReport",
  "recommendPairings",
  "getAIMemory",
  "getDailyBrief",
  "naturalLanguageSearch",
  "planBreedingCandidates",
] as const;

export const ACTION_TOOL_NAMES = [
  "createBreedingPair",
  "updatePairStatus",
  "updatePair",
  "deletePair",
  "recordClutch",
  "updateClutch",
  "deleteClutch",
  "recordHatch",
  "deleteBrood",
  "addEvent",
  "updateEvent",
  "deleteEvent",
  "markEventComplete",
  "updateBirdStatus",
  "updateBird",
  "addBird",
  "deleteBird",
  "deleteBirds",
  "recordEggOutcome",
  "convertEggToFledged",
  "rememberAIMemory",
  "forgetAIMemory",
] as const;

export const ALL_TOOL_NAMES = [...READ_TOOL_NAMES, ...ACTION_TOOL_NAMES] as const;
export type ChatToolName = (typeof ALL_TOOL_NAMES)[number];

export const CHAT_MAX_MESSAGES = 30;
export const CHAT_MAX_USER_TEXT_CHARS = 4_000;
export const CHAT_MAX_TOTAL_TEXT_CHARS = 12_000;
export const CHAT_MAX_OUTPUT_TOKENS = 900;

function getMessageText(message: any): string {
  if (!message) return "";
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.parts)) {
    return message.parts
      .map((part: any) => (part?.type === "text" && typeof part.text === "string" ? part.text : ""))
      .join("\n");
  }
  return "";
}

// Absolute upper bound to reject abusive payloads. Normal long chats are NOT
// rejected here — they are trimmed by windowChatMessages() instead, so the chat
// keeps working instead of dead-ending once it gets long.
const CHAT_HARD_MESSAGE_LIMIT = 200;

export function validateChatMessages(messages: unknown): { ok: true } | { ok: false; status: number; error: string; code: string } {
  if (!Array.isArray(messages)) {
    return { ok: false, status: 400, error: "messages array is required", code: "INVALID_MESSAGES" };
  }

  if (messages.length > CHAT_HARD_MESSAGE_LIMIT) {
    return {
      ok: false,
      status: 400,
      error: "Please start a fresh chat.",
      code: "TOO_MANY_MESSAGES",
    };
  }

  let latestUserText = "";
  for (const message of messages) {
    if ((message as any)?.role === "user") latestUserText = getMessageText(message);
  }

  if (latestUserText.length > CHAT_MAX_USER_TEXT_CHARS) {
    return {
      ok: false,
      status: 413,
      error: "That message is too long for the assistant. Please shorten it and try again.",
      code: "MESSAGE_TOO_LONG",
    };
  }

  return { ok: true };
}

// Keep only the most recent messages so a long conversation stays within the
// model's context instead of being rejected. We always cut at a user-message
// boundary so the trimmed history never starts in the middle of an assistant
// tool-call / approval sequence (which would break tool pairing for the model).
export function windowChatMessages<T extends { role?: string }>(
  messages: T[],
  maxMessages: number = CHAT_MAX_MESSAGES,
): T[] {
  if (!Array.isArray(messages) || messages.length <= maxMessages) return messages;
  const start = messages.length - maxMessages;
  const userBoundary = messages.findIndex((m, i) => i >= start && (m as any)?.role === "user");
  const cut = userBoundary === -1 ? start : userBoundary;
  return messages.slice(cut);
}

// Expose every tool on every turn. Action tools all carry needsApproval:true, so
// nothing executes without the user clicking Approve — that approval is the real
// safety gate. Previously we hid action tools unless the user's message contained
// an exact keyword ("add", "create", ...), which meant naturally-phrased requests
// silently failed because the model literally had no tool to call.
export function getActiveToolsForMessages(_messages: UIMessage[] | any[]): ChatToolName[] {
  return [...ALL_TOOL_NAMES];
}
