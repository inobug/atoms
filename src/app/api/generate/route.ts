import { NextRequest } from "next/server";
import { runPlanner } from "@/lib/agents/planner";
import { runCoder } from "@/lib/agents/coder";
import { runReviewer } from "@/lib/agents/reviewer";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

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

export async function POST(req: NextRequest) {
  const { projectId, prompt, modelProvider, currentCode, history } =
    await req.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        // --- Phase 1: Planner ---
        send({ agent: "planner" });
        let planContent = "";

        for await (const chunk of runPlanner({
          userRequest: prompt,
          currentCode,
          history: history || [],
          provider: modelProvider || "claude",
        })) {
          planContent += chunk;
          send({ content: chunk });
        }

        // --- Phase 2: Coder ---
        send({ agent: "coder" });
        let codeContent = "";

        for await (const chunk of runCoder({
          plan: planContent,
          userRequest: prompt,
          currentCode,
          provider: modelProvider || "claude",
        })) {
          codeContent += chunk;
          send({ content: chunk });
        }

        // Extract HTML code from the coder output
        const finalCode = extractHtml(codeContent);

        // Send the code for preview
        send({ code: finalCode });

        // Save generated file
        const filename = "index.html";
        const { data: existingFiles } = await getSupabaseAdmin()
          .from("generated_files")
          .select("version")
          .eq("project_id", projectId)
          .eq("filename", filename)
          .order("version", { ascending: false })
          .limit(1);

        const nextVersion = existingFiles?.[0]
          ? existingFiles[0].version + 1
          : 1;

        const { data: newFile } = await getSupabaseAdmin()
          .from("generated_files")
          .insert({
            project_id: projectId,
            filename,
            content: finalCode,
            version: nextVersion,
            language: "html",
          })
          .select()
          .single();

        if (newFile) {
          send({ files: [newFile] });
        }

        // --- Phase 3: Reviewer ---
        send({ agent: "reviewer" });

        for await (const chunk of runReviewer({
          userRequest: prompt,
          code: finalCode,
          provider: modelProvider || "claude",
        })) {
          send({ content: chunk });
        }

        send({ done: true });
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

function extractHtml(content: string): string {
  // If the content is wrapped in markdown code fences, extract it
  const fenceMatch = content.match(/```(?:html)?\s*\n([\s\S]*?)\n```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  // If the content starts with <!DOCTYPE or <html, use it directly
  const trimmed = content.trim();
  if (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<!doctype") ||
    trimmed.startsWith("<html")
  ) {
    return trimmed;
  }

  // Fallback: wrap in basic HTML structure
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated App</title>
</head>
<body>
${trimmed}
</body>
</html>`;
}
