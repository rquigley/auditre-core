import { getDocument } from 'pdfjs-dist/build/pdf.js';
import { basename } from 'path';
import fs from 'fs';
import os from 'os';
import { getFile } from '@/lib/aws';
import mime from 'mime-types';
import { exec } from 'child_process';
import { readFile } from 'fs/promises';

//https://github.com/mozilla/pdf.js/blob/master/examples/node/getinfo.js

export async function extractData({
  key,
  bucket,
  mimeType,
}: {
  key: string;
  bucket: string;
  mimeType: string;
}) {
  const outputFilename = basename(key);
  const downloadsDir = `${os.tmpdir()}/__auditre_org_files__`;
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
  }

  // TODO: make the path more resilient
  const outputPath = `${downloadsDir}/${outputFilename}`;
  if (!fs.existsSync(outputPath)) {
    await getFile({
      bucket,
      key,
      outputFilename: outputPath,
    });
    console.log(`Downloaded to ${outputPath}.`);
  }

  const ext = mime.extension(mimeType);
  if (ext === 'pdf') {
    return await extractTextFromPDF(outputPath);
  } else if (ext === 'xlsx') {
    return await extractTextFromXLSX(outputPath);
  }
}

export async function extractTextFromPDF(pdfPath: string) {
  const pdf = await getDocument(pdfPath).promise;
  let data = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str);
    data.push({
      page: pageNum,
      content: strings.join(' '),
    });
  }

  return data;
}

async function extractTextFromXLSX(path: string) {
  await new Promise<void>((resolve, reject) => {
    exec(`xlsx2csv ${path} > ${path}.csv`, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
  const data = await readFile(`${path}.csv`, 'utf-8');
  return [{ page: 1, content: data }];
}
