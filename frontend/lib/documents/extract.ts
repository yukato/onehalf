// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

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
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.ms-excel':
      return extractXlsx(buffer);
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

const MAX_XLSX_SIZE = 10 * 1024 * 1024; // 10MB

function extractXlsx(buffer: Buffer): ExtractionResult {
  if (buffer.length > MAX_XLSX_SIZE) {
    throw new Error(`Excelファイルが大きすぎます (${(buffer.length / 1024 / 1024).toFixed(1)}MB)。上限は${MAX_XLSX_SIZE / 1024 / 1024}MBです。`);
  }
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const texts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (csv.trim()) {
      texts.push(`[${sheetName}]\n${csv}`);
    }
  }
  return {
    text: texts.join('\n\n'),
    pageCount: workbook.SheetNames.length,
  };
}
