// src/lib/openrouter.ts
// Streaming OpenRouter chat response with fallback to OpenAI
export async function streamChatResponse({ model, messages, onToken }: {
  model: string;
  messages: { role: string; content: string }[];
  onToken: (token: string) => void;
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  });
  if (!res.body) throw new Error('No response body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let done = false;
  let buffer = '';
  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    let lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.replace('data: ', '').trim();
        if (data === '[DONE]') return;
        try {
          const json = JSON.parse(data);
          const token = json.choices?.[0]?.delta?.content;
          if (token) onToken(token);
        } catch {}
      }
    }
  }
}
