import { program } from 'commander';
import { getById } from '@/controllers/document';
import { create as createDocumentQuery } from '@/controllers/document-query';
import { askQuestion, summarize } from '@/lib/ai';
import { db } from '@/lib/db';
import type { DocumentQueryResult } from '@/types';

async function main(documentId: string, question: string) {
  // const document = await getById(parseInt(documentId));
  // const data = await extractData({
  //   key: document.key,
  //   bucket: document.bucket,
  //   mimeType: document.type,
  // });
  const document = await getById(documentId);
  //console.log(document.extracted.data[0].content);
  //@ts-ignore

  // const out = await summarize(JSON.stringify(data));
  // console.log(out);
  const { message, model } = await askQuestion(question, document.extracted);
  await createDocumentQuery({
    documentId: documentId,
    model,
    query: question,
    result: message as DocumentQueryResult,
    identifier: 'OTHER',
  });

  console.log(message);

  await db.destroy();
}

program.option('--document-id <documentId>', 'Document ID');
program.option('--question <question>', 'Question');

program.parse();
const options = program.opts();

main(options.documentId, options.question).catch((err) => {
  console.error(err);
  process.exit(1);
});
