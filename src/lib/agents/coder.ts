import { streamClaude } from "@/lib/ai/claude";
import { streamOpenAI } from "@/lib/ai/openai";
import { CODER_SYSTEM_PROMPT, buildCoderPrompt } from "./prompts";

export async function* runCoder(opts: {
  plan: string;
  userRequest: string;
  currentCode: string | null;
  provider: "claude" | "openai";
}): AsyncGenerator<string> {
  const userMessage = buildCoderPrompt(
    opts.plan,
    opts.userRequest,
    opts.currentCode,
  );

  const stream =
    opts.provider === "claude"
      ? streamClaude(CODER_SYSTEM_PROMPT, userMessage)
      : streamOpenAI(CODER_SYSTEM_PROMPT, userMessage);

  for await (const chunk of stream) {
    yield chunk;
  }
}
