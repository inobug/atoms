import { streamClaude } from "@/lib/ai/claude";
import { streamOpenAI } from "@/lib/ai/openai";
import { PLANNER_SYSTEM_PROMPT, buildPlannerPrompt } from "./prompts";
import type { SandpackFiles } from "@/types";

export async function* runPlanner(opts: {
  userRequest: string;
  currentFiles: SandpackFiles | null;
  history: Array<{ role: string; content: string }>;
  provider: "claude" | "openai";
}): AsyncGenerator<string> {
  const userMessage = buildPlannerPrompt(
    opts.userRequest,
    opts.currentFiles,
    opts.history,
  );

  const stream =
    opts.provider === "claude"
      ? streamClaude(PLANNER_SYSTEM_PROMPT, userMessage)
      : streamOpenAI(PLANNER_SYSTEM_PROMPT, userMessage);

  for await (const chunk of stream) {
    yield chunk;
  }
}
