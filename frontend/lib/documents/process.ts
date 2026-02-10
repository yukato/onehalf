import { getStorage } from '@/lib/storage';
import { extractText } from './extract';
import { chunkText } from './chunker';
import { generateEmbeddings } from './embeddings';
import { insertChunks, updateDocumentStatus } from './queries';
import { getLlmSettingsRaw } from '@/lib/llm-settings/queries';

export async function processDocument(
  companySlug: string,
  documentId: string,
  s3Path: string,
  mimeType: string
): Promise<void> {
  try {
    // 1. ストレージからダウンロード
    const buffer = await getStorage().download(s3Path);

    // 2. テキスト抽出
    const { text, pageCount } = await extractText(buffer, mimeType);

    if (!text.trim()) {
      await updateDocumentStatus(companySlug, documentId, 'ready', { pageCount: pageCount ?? undefined });
      return;
    }

    // 3. チャンキング
    const chunks = chunkText(text);

    // 4. 埋め込み生成（バッチ）— Pythonバックエンドのローカルモデルを使用
    const llmSettings = await getLlmSettingsRaw(companySlug);
    const embeddings = await generateEmbeddings(chunks.map((c) => c.content), llmSettings.embeddingModel);

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
    console.error(`Document processing failed [company=${companySlug}, doc=${documentId}, path=${s3Path}]:`, error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    try {
      await updateDocumentStatus(companySlug, documentId, 'error', { errorMessage: message });
    } catch (statusErr) {
      console.error(`Failed to update error status [company=${companySlug}, doc=${documentId}]:`, statusErr);
    }
  }
}
