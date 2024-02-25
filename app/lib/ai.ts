import OpenAI from 'openai';
import { z } from 'zod';

import { delay } from './util';

import type { AiQueryUsage, OpenAIModel } from '@/types';

const openaiConfig = z.string().min(3).max(255);

export const DEFAULT_OPENAI_MODEL = 'gpt-4-0125-preview';

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
  retryNum = 0,
}: {
  messages: OpenAIMessage[];
  requestedModel: OpenAIModel;
  stopSequences?: string[];
  respondInJSON?: boolean;
  retryNum?: number;
}) {
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
  } catch (err) {
    if (err instanceof OpenAI.APIError) {
      if (err.status === 429 && retryNum < 4) {
        await delay(Math.random() * 1000 + 1000);
        return await call({
          messages,
          requestedModel,
          stopSequences,
          respondInJSON,
          retryNum: retryNum + 1,
        });
      } else if (err.code === 'context_length_exceeded') {
        if (requestedModel === 'gpt-3.5-turbo') {
          return await call({
            messages,
            requestedModel: DEFAULT_OPENAI_MODEL,
            stopSequences,
            respondInJSON,
            retryNum: retryNum + 1,
          });
        }
      }
    }
    throw err;
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
    // We've seen the OpenAI API respond with invalid JSON. If we see that, retry once
    try {
      message = JSON.parse(resp.choices[0].message.content || '');
    } catch (error) {
      if (retryNum === 0) {
        return call({
          messages,
          requestedModel,
          stopSequences,
          respondInJSON,
          retryNum: retryNum + 1,
        });
      } else {
        throw error;
      }
    }
  } else {
    message = resp.choices[0].message.content || '';
  }
  return {
    message,
    model: requestedModel,
    usage,
  };
}
