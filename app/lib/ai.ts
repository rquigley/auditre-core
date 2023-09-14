import OpenAI from 'openai';
import { z } from 'zod';
import { OpenAIModel } from '@/types';

const openaiConfig = z.string().min(3).max(255);

export async function askQuestion({
  question,
  content,
  model,
}: {
  question: string;
  content: string;
  model?: OpenAIModel;
}) {
  return await call(
    [
      {
        role: 'system',
        content: question,
      },
      { role: 'user', content },
    ],
    {
      model,
    },
  );
}

type Message = {
  role: 'user' | 'system';
  content: string;
};
async function call(
  messages: Message[],
  { model }: { model?: OpenAIModel } = {},
) {
  const apiKey = openaiConfig.parse(process.env.OPENAI_API_KEY);
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  if (!model) {
    // TODO: better estimate
    if (JSON.stringify(messages).length > 8000) {
      model = 'gpt-3.5-turbo-16k';
    } else {
      model = 'gpt-3.5-turbo';
    }
  }

  const resp = await openai.chat.completions.create({
    model,
    messages,
  });
  return {
    message: resp.choices[0].message,
    model,
    usage: resp.usage,
  };
}
