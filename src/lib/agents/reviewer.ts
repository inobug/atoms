import { streamClaude } from "@/lib/ai/claude";
import { streamOpenAI } from "@/lib/ai/openai";
import { REVIEWER_SYSTEM_PROMPT, buildReviewerPrompt } from "./prompts";

export async function* runReviewer(opts: {
  userRequest: string;
  code: string;
  provider: "claude" | "openai";
}): AsyncGenerator<string> {
  const userMessage = buildReviewerPrompt(opts.userRequest, opts.code);

  const stream =
    opts.provider === "claude"
      ? streamClaude(REVIEWER_SYSTEM_PROMPT, userMessage)
      : streamOpenAI(REVIEWER_SYSTEM_PROMPT, userMessage);

  for await (const chunk of stream) {
    yield chunk;
  }
}
