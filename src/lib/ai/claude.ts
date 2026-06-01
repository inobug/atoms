import OpenAI from "openai";

let _client: OpenAI | null = null;
function getClient() {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.AI_API_KEY,
      baseURL: process.env.AI_BASE_URL,
    });
  }
  return _client;
}

export async function* streamClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens?: number,
): AsyncGenerator<string> {
  const model = process.env.CLAUDE_MODEL || "claude-4.6";

  const stream = await getClient().chat.completions.create({
    model,
    max_tokens: maxTokens || 16384,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
