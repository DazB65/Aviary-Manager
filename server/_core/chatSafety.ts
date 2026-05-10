import type { UIMessage } from "ai";

export const READ_TOOL_NAMES = [
  "getFlockStats",
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
] as const;

export const ACTION_TOOL_NAMES = [
  "createBreedingPair",
  "updatePairStatus",
  "deletePair",
  "recordClutch",
  "updateClutch",
  "recordHatch",
  "addEvent",
  "updateEvent",
  "deleteEvent",
  "markEventComplete",
  "updateBirdStatus",
  "updateBird",
  "addBird",
  "deleteBird",
  "recordEggOutcome",
] as const;

export const ALL_TOOL_NAMES = [...READ_TOOL_NAMES, ...ACTION_TOOL_NAMES] as const;
export type ChatToolName = (typeof ALL_TOOL_NAMES)[number];

export const CHAT_MAX_MESSAGES = 30;
export const CHAT_MAX_USER_TEXT_CHARS = 4_000;
export const CHAT_MAX_TOTAL_TEXT_CHARS = 12_000;
export const CHAT_MAX_OUTPUT_TOKENS = 900;

const ACTION_KEYWORDS = [
  "add",
  "appointment",
  "breed",
  "bred",
  "cancel",
  "change",
  "clutch",
  "complete",
  "create",
  "delete",
  "edit",
  "egg",
  "eggs",
  "hatch",
  "hatched",
  "mark",
  "move",
  "pair",
  "paired",
  "pairing",
  "reminder",
  "record",
  "remove",
  "set",
  "update",
];

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

function hasApprovalResponse(messages: any[]): boolean {
  return messages.some((message) =>
    message?.parts?.some((part: any) => part?.state === "approval-responded")
  );
}

export function validateChatMessages(messages: unknown): { ok: true } | { ok: false; status: number; error: string; code: string } {
  if (!Array.isArray(messages)) {
    return { ok: false, status: 400, error: "messages array is required", code: "INVALID_MESSAGES" };
  }

  if (messages.length > CHAT_MAX_MESSAGES) {
    return {
      ok: false,
      status: 400,
      error: `Please start a fresh chat. The assistant can handle up to ${CHAT_MAX_MESSAGES} messages at a time.`,
      code: "TOO_MANY_MESSAGES",
    };
  }

  let totalText = 0;
  let latestUserText = "";
  for (const message of messages) {
    const text = getMessageText(message);
    totalText += text.length;
    if ((message as any)?.role === "user") latestUserText = text;
  }

  if (latestUserText.length > CHAT_MAX_USER_TEXT_CHARS) {
    return {
      ok: false,
      status: 413,
      error: "That message is too long for the assistant. Please shorten it and try again.",
      code: "MESSAGE_TOO_LONG",
    };
  }

  if (totalText > CHAT_MAX_TOTAL_TEXT_CHARS) {
    return {
      ok: false,
      status: 413,
      error: "This chat has too much context. Please clear the chat and try again.",
      code: "CHAT_CONTEXT_TOO_LONG",
    };
  }

  return { ok: true };
}

function hasActionIntent(text: string): boolean {
  return ACTION_KEYWORDS.some((keyword) => new RegExp(`\\b${keyword}\\b`, "i").test(text));
}

export function getActiveToolsForMessages(messages: UIMessage[] | any[]): ChatToolName[] {
  if (hasApprovalResponse(messages)) return [...ALL_TOOL_NAMES];

  const latestUser = [...messages].reverse().find((message) => message?.role === "user");
  const latestText = getMessageText(latestUser).toLowerCase();
  const isActionIntent = hasActionIntent(latestText);

  return isActionIntent ? [...ALL_TOOL_NAMES] : [...READ_TOOL_NAMES];
}
