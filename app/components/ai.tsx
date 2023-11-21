import { revalidatePath } from 'next/cache';

import CopyToClipboard from '@/components/copy-to-clipboard';
import { nl2br } from '@/components/nl2br';
import { askQuestion, getAllByDocumentId } from '@/controllers/ai-query';
import { OpenAIModel } from '@/types';
import AIForm from './ai-form';
import Datetime from './datetime';

import type { Document } from '@/types';

export default async function AI({ document }: { document: Document }) {
  const queries = await getAllByDocumentId(document.id);

  async function saveData({ query, model }: { query: string; model: string }) {
    'use server';
    const typedModel = model as OpenAIModel;
    const result = await askQuestion({
      document,
      question: query,
      model: typedModel,
    });

    revalidatePath(`/document/${document.id}`);
  }

  return (
    <div className="">
      <div className="text-med leading-6 text-gray-500 mt-4">AI</div>
      <div className="text-xs ">
        {queries.map((query) => (
          <div
            key={query.id}
            className="my-4 p-4 border border-1 border-slate-300 rounded-md "
          >
            <div className="mb-2">
              Identifier: {query.identifier}
              <br />
              Model: {query.model}
              <br />
              Tokens: {query.usage?.totalTokens} prompt,{' '}
              {query.usage?.completionTokens} completion
              <br />
              Time: {(query.usage?.timeMs / 1000).toFixed(2)}s<br />
              Created: <Datetime dateTime={query.createdAt} />
            </div>

            <div className="text-xs text-gray-500">
              <span className="font-bold" id={`query-${query.id}`}>
                Q: {nl2br(query.query.messages[0].content)}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              <pre
                className="w-180 whitespace-normal"
                id={`result-${query.id}`}
              >
                A: {nl2br(query.result)}
              </pre>

              {/* <CopyToClipboard elementId={`query-${query.id}`}>
                  Copy query
                </CopyToClipboard>
                <CopyToClipboard elementId={`result-${query.id}`}>
                  Copy result
                </CopyToClipboard> */}
            </div>
          </div>
        ))}
      </div>
      <AIForm saveData={saveData} />
    </div>
  );
}
