import { downloadFromS3 } from '@/lib/s3';
import { extractText } from './extract';
import { chunkText } from './chunker';
import { generateEmbeddings } from './embeddings';
import { insertChunks, updateDocumentStatus } from './queries';

export async function processDocument(
  companySlug: string,
  documentId: string,
  s3Path: string,
  mimeType: string
): Promise<void> {
  try {
    // 1. S3からダウンロード
    const buffer = await downloadFromS3(s3Path);

    // 2. テキスト抽出
    const { text, pageCount } = await extractText(buffer, mimeType);

    if (!text.trim()) {
      await updateDocumentStatus(companySlug, documentId, 'ready', { pageCount: pageCount ?? undefined });
      return;
    }

    // 3. チャンキング
    const chunks = chunkText(text);

    // 4. 埋め込み生成（バッチ）
    const embeddings = await generateEmbeddings(chunks.map((c) => c.content));

    // 5. チャンク + 埋め込みを保存
    await insertChunks(
      companySlug,
      documentId,
      chunks.map((c, i) => ({
        content: c.content,
        chunkIndex: c.chunkIndex,
        tokenCount: c.tokenCount,
        embedding: embeddings[i],
      }))
    );

    // 6. ステータス更新
    await updateDocumentStatus(companySlug, documentId, 'ready', { pageCount: pageCount ?? undefined });
  } catch (error) {
    console.error(`Document processing failed [${documentId}]:`, error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    await updateDocumentStatus(companySlug, documentId, 'error', { errorMessage: message });
  }
}
