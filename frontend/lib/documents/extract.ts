// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';

export interface ExtractionResult {
  text: string;
  pageCount: number | null;
}

export async function extractText(buffer: Buffer, mimeType: string): Promise<ExtractionResult> {
  switch (mimeType) {
    case 'application/pdf':
      return extractPdf(buffer);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractDocx(buffer);
    case 'text/plain':
    case 'text/csv':
    case 'text/markdown':
      return { text: buffer.toString('utf-8'), pageCount: null };
    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  const data = await pdfParse(buffer);
  return {
    text: data.text,
    pageCount: data.numpages,
  };
}

async function extractDocx(buffer: Buffer): Promise<ExtractionResult> {
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value,
    pageCount: null,
  };
}
