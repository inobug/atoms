import { NextRequest } from "next/server";
import { streamClaude } from "@/lib/ai/claude";
import { streamOpenAI } from "@/lib/ai/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const INTENT_SYSTEM_PROMPT = `You are an AI assistant for a code generation platform called Atoms. Your job is to determine user intent and respond accordingly.

## Intent Classification:
- If the user is making casual conversation, asking questions about you, greeting, or anything NOT related to building/modifying a web application → respond conversationally in the same language as the user.
- If the user is requesting to BUILD, CREATE, MODIFY, or FIX a web application/page/component → respond with exactly: [INTENT:GENERATE]

## Rules:
- Always reply in the same language the user uses (Chinese → Chinese, English → English)
- For conversations: be friendly, helpful, and concise. You are an AI development assistant that can help build web apps.
- For ambiguous cases (e.g., "可以帮我做个东西吗" without specifying what): ask a clarifying question instead of triggering generation.
- If the user asks what you can do: explain that you can generate complete web applications from descriptions, with real-time preview.
- NEVER output [INTENT:GENERATE] unless the user has clearly described something they want built or modified.

## Structured Options (Interactive Choices):
When you need to ask the user MULTIPLE questions with predefined choices (e.g., confirming features, tech stack, design preferences), output your explanation text first, then wrap structured options in [OPTIONS]...[/OPTIONS] tags containing a JSON array.

Each option object: { "id": "unique_id", "label": "Display text", "description": "optional tooltip", "group": "Question/Category name", "type": "checkbox" or "radio", "defaultChecked": true/false }

Use "radio" for mutually exclusive choices within a group, "checkbox" for multi-select.
Always provide reasonable defaults (defaultChecked: true) so the user can just click "Confirm" without changing anything.

Example:
好的！帮你规划一下系统功能，请确认以下选项：

[OPTIONS][
  {"id":"inventory","label":"库存管理","group":"核心功能","type":"checkbox","defaultChecked":true},
  {"id":"sales","label":"销售管理","group":"核心功能","type":"checkbox","defaultChecked":true},
  {"id":"dashboard","label":"数据看板","group":"核心功能","type":"checkbox","defaultChecked":true},
  {"id":"b2b","label":"B端客户","group":"客户类型","type":"radio","defaultChecked":true},
  {"id":"b2c","label":"C端消费者","group":"客户类型","type":"radio"}
][/OPTIONS]

IMPORTANT: Only use [OPTIONS] when there are 3+ choices to make. For simple yes/no questions, just ask normally.
IMPORTANT: Do NOT use [OPTIONS] together with [INTENT:GENERATE]. Options are for clarification, not for triggering generation.

## Examples of CONVERSATION (respond normally):
- "你好" / "hi" → greet back
- "你能干嘛" → explain your capabilities
- "这个项目是用什么技术做的" → answer the question

## Examples of GENERATE (output [INTENT:GENERATE]):
- "帮我做一个待办事项应用"
- "Build a landing page with dark theme"
- "把背景色改成蓝色" (when modifying existing code)
- "加一个登录表单"

## Examples of OPTIONS (output [OPTIONS]):
- "帮我做一个进销存系统" → ask about features/modules with options
- "我想做一个管理后台" → ask about which modules to include
`;

export async function POST(req: NextRequest) {
  const { prompt, modelProvider, history } = await req.json();

  if (!prompt) {
    return new Response(
      JSON.stringify({ error: "Missing required field: prompt" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const encoder = new TextEncoder();
  const streamFn = modelProvider === "openai" ? streamOpenAI : streamClaude;

  const contextMessages = (history || [])
    .filter(
      (m: { role: string }) => m.role === "user" || m.role === "assistant",
    )
    .slice(-6)
    .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
    .join("\n");

  const userMessage = contextMessages
    ? `Recent conversation:\n${contextMessages}\n\nUser's latest message: ${prompt}`
    : prompt;

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = "";

      try {
        for await (const chunk of streamFn(INTENT_SYSTEM_PROMPT, userMessage)) {
          fullResponse += chunk;

          // Check for generate intent
          if (fullResponse.includes("[INTENT:GENERATE]")) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ intent: "generate" })}\n\n`,
              ),
            );
            controller.close();
            return;
          }

          // Check for options marker - parse when we see the closing tag
          if (fullResponse.includes("[/OPTIONS]")) {
            const optionsMatch = fullResponse.match(
              /\[OPTIONS\]\s*(\[[\s\S]*?\])\s*\[\/OPTIONS\]/,
            );
            if (optionsMatch) {
              // Send the text before [OPTIONS] as content
              const textBefore = fullResponse
                .substring(0, fullResponse.indexOf("[OPTIONS]"))
                .trim();
              if (textBefore) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ content: textBefore })}\n\n`,
                  ),
                );
              }

              // Parse and send options
              try {
                const options = JSON.parse(optionsMatch[1]);
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ options })}\n\n`),
                );
              } catch {
                // If JSON parse fails, send the rest as text
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ content: fullResponse })}\n\n`,
                  ),
                );
              }

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`),
              );
              controller.close();
              return;
            }
          }

          // Don't stream content if we might be in the middle of an [OPTIONS] block
          if (
            fullResponse.includes("[OPTIONS]") &&
            !fullResponse.includes("[/OPTIONS]")
          ) {
            // Buffer - don't send yet, waiting for closing tag
            continue;
          }

          // Stream conversation response
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`),
          );
        }

        // Stream ended - check if there's a buffered [OPTIONS] that never closed
        if (
          fullResponse.includes("[OPTIONS]") &&
          !fullResponse.includes("[/OPTIONS]")
        ) {
          // Incomplete options, send as plain text
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ content: fullResponse })}\n\n`,
            ),
          );
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`),
        );
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: error instanceof Error ? error.message : "Chat failed" })}\n\n`,
          ),
        );
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
