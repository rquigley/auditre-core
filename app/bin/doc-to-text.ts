import { program } from 'commander';
import { loadEnvConfig } from '@next/env';
import { getById, extractContent } from '@/controllers/document';
import { getFile } from '@/lib/aws';
import { db } from '@/lib/db';
import { basename } from 'path';
import { existsSync } from 'fs';
import { extractData } from '@/lib/text-extraction';
import { askQuestion, summarize } from '@/lib/ai';

const dev = process.env.NODE_ENV !== 'production';
loadEnvConfig(process.cwd(), dev, { info: () => null, error: console.error });

async function main(documentId: string, question: string) {
  // const document = await getById(parseInt(documentId));
  // const data = await extractData({
  //   key: document.key,
  //   bucket: document.bucket,
  //   mimeType: document.type,
  // });
  const document = await extractContent(parseInt(documentId));
  //console.log(document.extracted.data[0].content);
  //@ts-ignore
  const data = document.extracted.data[0].content;

  // const out = await summarize(JSON.stringify(data));
  // console.log(out);
  const out = await askQuestion(question, JSON.stringify(data));
  console.log(out);

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
