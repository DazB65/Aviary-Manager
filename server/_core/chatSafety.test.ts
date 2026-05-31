import { describe, expect, it } from "vitest";
import {
  ACTION_TOOL_NAMES,
  CHAT_MAX_MESSAGES,
  CHAT_MAX_USER_TEXT_CHARS,
  READ_TOOL_NAMES,
  getActiveToolsForMessages,
  validateChatMessages,
  windowChatMessages,
} from "./chatSafety";

function userText(text: string) {
  return {
    id: "u1",
    role: "user",
    parts: [{ type: "text", text }],
  };
}

function assistantText(text: string) {
  return {
    id: "a1",
    role: "assistant",
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

  it("does not reject normal long chats (they are windowed instead)", () => {
    const messages = Array.from({ length: CHAT_MAX_MESSAGES + 10 }, (_, index) => userText(`message ${index}`));

    expect(validateChatMessages(messages)).toEqual({ ok: true });
  });

  it("rejects abusively large payloads", () => {
    const messages = Array.from({ length: 201 }, (_, index) => userText(`message ${index}`));

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

  it("exposes both read and action tools on every turn (approval is the safety gate)", () => {
    const activeTools = getActiveToolsForMessages([userText("What pairs do I have?")]);

    expect(activeTools).toEqual(expect.arrayContaining([...READ_TOOL_NAMES]));
    expect(activeTools).toEqual(expect.arrayContaining([...ACTION_TOOL_NAMES]));
  });

  it("includes the previously dead tools in the active set", () => {
    const activeTools = getActiveToolsForMessages([userText("Move pair 3 to cage B")]);

    expect(activeTools).toEqual(
      expect.arrayContaining(["updatePair", "deleteClutch", "deleteBrood", "convertEggToFledged"]),
    );
  });
});

describe("windowChatMessages", () => {
  it("returns the array unchanged when within the limit", () => {
    const messages = [userText("hi"), assistantText("hello")];

    expect(windowChatMessages(messages, CHAT_MAX_MESSAGES)).toBe(messages);
  });

  it("keeps only the most recent messages once over the limit", () => {
    const messages = Array.from({ length: 10 }, (_, index) => userText(`message ${index}`));

    const windowed = windowChatMessages(messages, 4);

    expect(windowed.length).toBeLessThanOrEqual(4);
    expect(windowed[windowed.length - 1]).toBe(messages[messages.length - 1]);
  });

  it("cuts at a user-message boundary so tool pairing is preserved", () => {
    // ...older turns..., assistant(tool call), user(latest)
    const messages = [
      userText("turn 1"),
      assistantText("reply 1"),
      userText("turn 2"),
      assistantText("reply 2"),
      userText("latest"),
    ];

    // Window of 2 would naively start at index 3 (an assistant message); we must
    // instead start at the next user boundary (index 4).
    const windowed = windowChatMessages(messages, 2);

    expect((windowed[0] as any).role).toBe("user");
    expect(windowed[windowed.length - 1]).toBe(messages[messages.length - 1]);
  });
});
