import { streamClaude } from "@/lib/ai/claude";
import { streamOpenAI } from "@/lib/ai/openai";
import { REVIEWER_SYSTEM_PROMPT, buildReviewerPrompt } from "./prompts";
import type { SandpackFiles, ReviewerVerdict } from "@/types";

export async function* runReviewer(opts: {
  userRequest: string;
  files: SandpackFiles;
  provider: "claude" | "openai";
}): AsyncGenerator<string> {
  const userMessage = buildReviewerPrompt(opts.userRequest, opts.files);

  const stream =
    opts.provider === "claude"
      ? streamClaude(REVIEWER_SYSTEM_PROMPT, userMessage)
      : streamOpenAI(REVIEWER_SYSTEM_PROMPT, userMessage);

  for await (const chunk of stream) {
    yield chunk;
  }
}

/**
 * Parse the reviewer verdict from the full review text.
 * Looks for JSON on the last line.
 */
export function parseReviewerVerdict(reviewText: string): ReviewerVerdict {
  const lines = reviewText.trim().split("\n");
  // Search from the end for a JSON verdict
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
    const line = lines[i].trim();
    if (line.startsWith("{") && line.includes('"verdict"')) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.verdict === "pass" || parsed.verdict === "retry") {
          return {
            verdict: parsed.verdict,
            issues: parsed.issues || parsed.critical_issues || [],
          };
        }
      } catch {
        // not valid JSON, continue searching
      }
    }
  }
  // Default to pass if no verdict found
  return { verdict: "pass", issues: [] };
}
