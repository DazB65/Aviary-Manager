import { describe, expect, it } from "vitest";
import {
  ACTION_TOOL_NAMES,
  CHAT_MAX_MESSAGES,
  CHAT_MAX_USER_TEXT_CHARS,
  getActiveToolsForMessages,
  validateChatMessages,
} from "./chatSafety";

function userText(text: string) {
  return {
    id: "u1",
    role: "user",
    parts: [{ type: "text", text }],
  };
}

describe("chat safety helpers", () => {
  it("rejects malformed message payloads", () => {
    expect(validateChatMessages(undefined)).toMatchObject({
      ok: false,
      status: 400,
      code: "INVALID_MESSAGES",
    });
  });

  it("rejects chats with too many messages", () => {
    const messages = Array.from({ length: CHAT_MAX_MESSAGES + 1 }, (_, index) => userText(`message ${index}`));

    expect(validateChatMessages(messages)).toMatchObject({
      ok: false,
      code: "TOO_MANY_MESSAGES",
    });
  });

  it("rejects oversized user messages", () => {
    const messages = [userText("x".repeat(CHAT_MAX_USER_TEXT_CHARS + 1))];

    expect(validateChatMessages(messages)).toMatchObject({
      ok: false,
      status: 413,
      code: "MESSAGE_TOO_LONG",
    });
  });

  it("limits non-action prompts to read tools", () => {
    const activeTools = getActiveToolsForMessages([userText("What pairs do I have?")]);

    expect(activeTools).toContain("listPairs");
    expect(activeTools).not.toContain("deleteBird");
  });

  it("exposes action tools for mutation intent and approval continuations", () => {
    const actionTools = getActiveToolsForMessages([userText("Delete pair 12")]);
    expect(actionTools).toEqual(expect.arrayContaining([...ACTION_TOOL_NAMES]));

    const approvalTools = getActiveToolsForMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "tool-deletePair", state: "approval-responded" }],
      },
    ]);
    expect(approvalTools).toEqual(expect.arrayContaining([...ACTION_TOOL_NAMES]));
  });
});
