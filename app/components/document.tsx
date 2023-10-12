import 'server-only';

import { Suspense } from 'react';

import { Await } from '@/components/await';
import { getById as getDocumentById } from '@/controllers/document';

import type { DocumentId } from '@/types';

export async function Document({ documentId }: { documentId: DocumentId }) {
  if (!documentId) {
    return null;
  }
  return (
    <Suspense fallback={'...'}>
      <Await promise={getDocumentById(documentId)}>
        {(document) => (
          <div className="text-xs">
            Doc: {documentId}
            {document.name}
          </div>
        )}
      </Await>
    </Suspense>
  );
}
