import type { DocumentQuery, Document } from '@/types';
import { classNames } from '@/lib/util';
import { getAllByDocumentId } from '@/controllers/document-query';
import AIForm from './ai-form';
import { askQuestion } from '@/controllers/document-query';
import { revalidatePath } from 'next/cache';

export default async function AI({ document }: { document: Document }) {
  const queries = await getAllByDocumentId(document.id);

  async function saveData({ query }: { query: string }) {
    'use server';

    const result = await askQuestion({ document, question: query });

    revalidatePath(`/document/${document.id}`);
  }

  return (
    <div className="">
      <div className="text-med leading-6 text-gray-500 mt-4">AI</div>
      <div className="text-xs">
        {queries.map((query) => (
          <div key={query.id} className="flex flex-row">
            <div className="flex flex-col my-2">
              <div className="text-xs text-gray-500 font-bold">
                {query.query}
              </div>
              <div className="text-xs text-gray-500">
                {query.result?.content}
              </div>
            </div>
          </div>
        ))}
      </div>
      <AIForm saveData={saveData} />
    </div>
  );
}
