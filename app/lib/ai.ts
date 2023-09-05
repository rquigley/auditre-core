import OpenAI from 'openai';
import { z } from 'zod';

const openaiConfig = z.string().min(3).max(255);

export async function summarize(content: string) {
  return await call([
    { role: 'system', content: 'Summarize this in under 20 words' },
    { role: 'user', content },
  ]);
}

export async function askQuestion(question: string, content: string) {
  return await call([
    {
      role: 'system',
      content: question,
    },
    { role: 'user', content },
  ]);
}

type Message = {
  role: 'user' | 'system';
  content: string;
};
async function call(messages: Message[]) {
  const apiKey = openaiConfig.parse(process.env.OPENAI_API_KEY);
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  let model;
  // TODO: better estimate
  if (JSON.stringify(messages).length > 4000) {
    model = 'gpt-3.5-turbo-16k';
  } else {
    model = 'gpt-3.5-turbo';
  }

  const chatCompletion = await openai.chat.completions.create({
    model,
    // model: 'gpt-3.5-turbo-16k',
    // messages: [{ role: 'user', content: 'Hello world' }],
    messages,
  });
  //console.log(chatCompletion.data);
  return chatCompletion.choices[0].message;
  //console.log(chatCompletion.data.choices[0].message);
}
