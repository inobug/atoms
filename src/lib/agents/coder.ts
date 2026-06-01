import { streamClaude } from "@/lib/ai/claude";
import { streamOpenAI } from "@/lib/ai/openai";
import { CODER_SYSTEM_PROMPT, buildCoderPrompt } from "./prompts";
import type { SandpackFiles } from "@/types";

const CODER_MAX_TOKENS = 32000;

export async function* runCoder(opts: {
  plan: string;
  userRequest: string;
  currentFiles: SandpackFiles | null;
  provider: "claude" | "openai";
  reviewerFeedback?: string;
}): AsyncGenerator<string> {
  const userMessage = buildCoderPrompt(
    opts.plan,
    opts.userRequest,
    opts.currentFiles,
    opts.reviewerFeedback,
  );

  const stream =
    opts.provider === "claude"
      ? streamClaude(CODER_SYSTEM_PROMPT, userMessage, CODER_MAX_TOKENS)
      : streamOpenAI(CODER_SYSTEM_PROMPT, userMessage, CODER_MAX_TOKENS);

  for await (const chunk of stream) {
    yield chunk;
  }
}
