import { request } from 'http';
import OpenAI from 'openai';
import { z } from 'zod';

import type { AiQueryUsage, OpenAIModel } from '@/types';

const openaiConfig = z.string().min(3).max(255);

export const DEFAULT_OPENAI_MODEL = 'gpt-4-1106-preview';

export async function askQuestion({
  question,
  content,
  model = DEFAULT_OPENAI_MODEL,
}: {
  question: string;
  content: string;
  model?: OpenAIModel;
}) {
  return await call({
    requestedModel: model,
    messages: [
      {
        role: 'system',
        content: question,
      },
      { role: 'user', content: `"""${content}"""` },
    ],
  });
}

export type OpenAIMessage = {
  role: 'user' | 'system';
  content: string;
};

export async function call({
  messages,
  requestedModel,
  stopSequences,
  respondInJSON,
}: {
  messages: OpenAIMessage[];
  requestedModel: OpenAIModel;
  stopSequences?: string[];
  respondInJSON?: boolean;
}): Promise<{
  message: unknown;
  model: OpenAIModel;
  usage: AiQueryUsage;
}> {
  const apiKey = openaiConfig.parse(process.env.OPENAI_API_KEY);
  const openai = new OpenAI({
    apiKey,
  });

  const t0 = Date.now();
  let resp: OpenAI.Chat.Completions.ChatCompletion | undefined;
  try {
    resp = await openai.chat.completions.create({
      model: requestedModel,
      messages,
      stop: stopSequences || undefined,
      response_format: { type: respondInJSON ? 'json_object' : 'text' },
    });
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      // We might be able to use a larger model
      // Example error:
      // 400 This model's maximum context length is 4097 tokens. However, your messages resulted in 4358 tokens. Please reduce the length of the messages.
      if (error.code === 'context_length_exceeded') {
        if (requestedModel === 'gpt-3.5-turbo') {
          return await call({
            messages,
            requestedModel: DEFAULT_OPENAI_MODEL,
          });
        }
      }
    }
    throw error;
  }
  if (!resp) {
    return {
      message: 'No response from OpenAI',
      model: requestedModel,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        timeMs: 0,
      },
    };
  }
  const t1 = Date.now();
  const usage = {
    promptTokens: resp.usage?.prompt_tokens || 0,
    completionTokens: resp.usage?.completion_tokens || 0,
    totalTokens: resp.usage?.total_tokens || 0,
    timeMs: t1 - t0,
  };
  let message;
  if (respondInJSON) {
    message = JSON.parse(resp.choices[0].message.content || '');
  } else {
    message = resp.choices[0].message.content || '';
  }
  return {
    message,
    model: requestedModel,
    usage,
  };
}
