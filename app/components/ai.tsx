import type { Document } from '@/types';
import { getAllByDocumentId } from '@/controllers/document-query';
import AIForm from './ai-form';
import { askQuestion } from '@/controllers/document-query';
import { revalidatePath } from 'next/cache';
import { OpenAIModel } from '@/types';

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
      <div className="text-xs">
        {queries.map((query) => (
          <div key={query.id} className="flex flex-row">
            <div className="flex flex-col my-2">
              <div className="text-xs text-gray-500">
                <span className="font-bold">{query.query}</span>
              </div>
              <div className="text-xs text-gray-500">
                ({query.model}, Tokens: {query.usage?.totalTokens} prompt,{' '}
                {query.usage?.completionTokens} completion)
                <pre className="w-180 whitespace-normal">
                  {query.result?.content}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>
      <AIForm saveData={saveData} />
    </div>
  );
}
