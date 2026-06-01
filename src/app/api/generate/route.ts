import { NextRequest } from "next/server";
import { runPlanner } from "@/lib/agents/planner";
import { runCoder } from "@/lib/agents/coder";
import { runReviewer, parseReviewerVerdict } from "@/lib/agents/reviewer";
import {
  parseMultiFileOutput,
  toSandpackFiles,
  validateFileCompleteness,
} from "@/lib/parser";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { SandpackFiles } from "@/types";

let _supabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _supabaseAdmin;
}

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_RETRIES = 2;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    projectId,
    prompt,
    modelProvider,
    currentFiles,
    history,
    skipPlanner,
    plan: providedPlan,
  } = body;

  if (!projectId || !prompt) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: projectId, prompt" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const encoder = new TextEncoder();
  const provider = modelProvider || "claude";

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        // --- Phase 1: Planner ---
        let planContent = providedPlan || "";

        if (!skipPlanner) {
          send({ agent: "planner" });

          try {
            for await (const chunk of runPlanner({
              userRequest: prompt,
              currentFiles: currentFiles || null,
              history: history || [],
              provider,
            })) {
              planContent += chunk;
              send({ content: chunk });
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Planner failed";
            send({ content: `\n\n[Error: ${msg}]` });
            planContent = prompt;
          }

          // Save plan to project
          send({ plan: planContent });
          await getSupabaseAdmin()
            .from("projects")
            .update({ plan: planContent })
            .eq("id", projectId);
        }

        // --- Phase 2: Coder (with retry loop) ---
        let sandpackFiles: SandpackFiles = {};
        let retryCount = 0;
        let reviewerFeedback: string | undefined;
        let lastVerdict: { verdict: string; issues: string[] } | null = null;
        let autoCheckIssues: string[] = [];

        while (retryCount <= MAX_RETRIES) {
          send({
            agent: "coder",
            ...(retryCount > 0 ? { retry: retryCount } : {}),
          });
          let coderRaw = "";

          try {
            for await (const chunk of runCoder({
              plan: planContent,
              userRequest: prompt,
              currentFiles: currentFiles || null,
              provider,
              reviewerFeedback,
            })) {
              coderRaw += chunk;
              send({ content: chunk });
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Coder failed";
            send({ content: `\n\n[Error: ${msg}]` });
            send({ error: msg });
            controller.close();
            return;
          }

          // Parse multi-file output
          const parsedFiles = parseMultiFileOutput(coderRaw);
          sandpackFiles = toSandpackFiles(parsedFiles);

          // Send files for preview
          send({ files: sandpackFiles });

          // Quick completeness check before reviewer
          const { missing, truncated } =
            validateFileCompleteness(sandpackFiles);
          autoCheckIssues = [
            ...missing.map((m) => `缺失文件: ${m}`),
            ...truncated.map((t) => `文件不完整: ${t}`),
          ];
          if (
            (missing.length > 0 || truncated.length > 0) &&
            retryCount < MAX_RETRIES
          ) {
            const issues: string[] = [];
            if (missing.length > 0) {
              issues.push(
                `App.jsx imports these files but they don't exist: ${missing.join(", ")}. You MUST either generate these files or remove the imports and inline the components.`,
              );
            }
            if (truncated.length > 0) {
              issues.push(
                `These files are truncated/incomplete: ${truncated.join(", ")}. Regenerate them completely. If there are too many files, consolidate components into fewer files.`,
              );
            }
            send({
              agent: "reviewer",
            });
            send({
              content: `Auto-check found issues:\n- ${issues.join("\n- ")}\n\nRetrying with fixes...`,
            });
            reviewerFeedback = issues.join("\n");
            retryCount++;
            continue;
          }

          // --- Phase 3: Reviewer ---
          send({ agent: "reviewer" });
          let reviewContent = "";

          try {
            for await (const chunk of runReviewer({
              userRequest: prompt,
              files: sandpackFiles,
              provider,
            })) {
              reviewContent += chunk;
              send({ content: chunk });
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Reviewer failed";
            send({ content: `\n\n[Error: ${msg}]` });
            break; // Don't retry on reviewer failure
          }

          // Parse verdict
          const verdict = parseReviewerVerdict(reviewContent);
          lastVerdict = verdict;
          send({ verdict });

          if (verdict.verdict === "pass" || retryCount >= MAX_RETRIES) {
            break;
          }

          // Retry: feed reviewer issues back to coder
          reviewerFeedback = verdict.issues.join("\n");
          retryCount++;
        }

        // --- Save results ---
        const generationId = crypto.randomUUID();

        // Save all files to generated_files
        const fileRows = Object.entries(sandpackFiles).map(
          ([path, { code }]) => ({
            project_id: projectId,
            filename: path,
            content: code,
            language: path.split(".").pop() || "text",
            generation_id: generationId,
            version: 1,
          }),
        );

        if (fileRows.length > 0) {
          await getSupabaseAdmin().from("generated_files").insert(fileRows);
        }

        // Update project with current files
        await getSupabaseAdmin()
          .from("projects")
          .update({
            current_files: sandpackFiles,
            updated_at: new Date().toISOString(),
          })
          .eq("id", projectId);

        // Send structured summary
        const fileList = Object.keys(sandpackFiles);
        send({
          summary: {
            fileCount: fileList.length,
            files: fileList,
            retries: retryCount,
            verdict: lastVerdict?.verdict || "unknown",
            issues:
              lastVerdict?.issues && lastVerdict.issues.length > 0
                ? lastVerdict.issues
                : autoCheckIssues.length > 0
                  ? autoCheckIssues
                  : [],
          },
        });

        send({ done: true, generationId });
      } catch (error) {
        console.error("Generation error:", error);
        send({
          error: error instanceof Error ? error.message : "Generation failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
