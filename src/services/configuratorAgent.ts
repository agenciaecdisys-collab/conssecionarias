import { CONFIGURATOR_SYSTEM_PROMPT } from "@/constants/configuratorPrompt";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendToAgent(messages: Message[]): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: CONFIGURATOR_SYSTEM_PROMPT,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Falha na comunicação com a IA');
  }

  const data = await response.json();
  return data.content[0].text;
}
