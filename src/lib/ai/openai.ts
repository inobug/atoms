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

export async function* streamOpenAI(
  systemPrompt: string,
  userMessage: string,
): AsyncGenerator<string> {
  const model = process.env.OPENAI_MODEL || "gpt-5.4";

  const stream = await getClient().chat.completions.create({
    model,
    max_tokens: 8192,
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
