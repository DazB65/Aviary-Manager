export const AVIARY_AI_PROMPT_EVENT = "aviary-ai-open";

export function openAIAssistant(prompt: string) {
  window.dispatchEvent(new CustomEvent(AVIARY_AI_PROMPT_EVENT, { detail: { prompt } }));
}
