import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { generateEmbedding, cosineSimilarity } from './embeddings';
import { getAllChunksWithEmbeddings } from './queries';
import { getLlmSettingsRaw } from '@/lib/llm-settings/queries';
import type { DocumentChatMessage, DocumentChatSource } from '@/types';

const TOP_K = 5;
const MAX_CHUNK_LENGTH = 1500;

function buildSystemPrompt(sources: { title: string; content: string }[]): string {
  const docsSection = sources
    .map((s, i) => `[ドキュメント${i + 1}: ${s.title}]\n${s.content.slice(0, MAX_CHUNK_LENGTH)}`)
    .join('\n\n');

  return `あなたは社内ドキュメントに基づいて質問に回答するAIアシスタントです。
以下のドキュメントの内容のみを参考にして、正確に回答してください。
ドキュメントに記載がない情報については、「ドキュメントに記載が見つかりませんでした」と回答してください。
回答はマークダウン形式で返してください。

--- 参照ドキュメント ---
${docsSection}
---`;
}

async function callLlm(
  provider: string,
  model: string,
  apiKey: string,
  systemPrompt: string,
  conversationHistory: DocumentChatMessage[],
  query: string
): Promise<string> {
  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey });
    const messages = [
      ...conversationHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: query },
    ];
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  } else {
    // OpenAI
    const client = new OpenAI({ apiKey });
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: query },
    ];
    const response = await client.chat.completions.create({
      model,
      max_tokens: 2048,
      messages,
    });
    return response.choices[0]?.message?.content || '';
  }
}

export async function generateDocumentAnswer(
  companySlug: string,
  query: string,
  conversationHistory: DocumentChatMessage[] = []
): Promise<{ answer: string; sources: DocumentChatSource[]; model: string }> {
  // 1. Get LLM settings
  const llmSettings = await getLlmSettingsRaw(companySlug);

  const apiKey = llmSettings.provider === 'anthropic'
    ? llmSettings.apiKeyAnthropic
    : llmSettings.apiKeyOpenai;

  if (!apiKey) {
    throw new Error(`${llmSettings.provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} APIキーが設定されていません。設定画面からAPIキーを登録してください。`);
  }

  // 2. Generate query embedding
  const queryEmbedding = await generateEmbedding(query, llmSettings.embeddingModel);

  // 3. Get all chunks and compute similarity
  const chunks = await getAllChunksWithEmbeddings(companySlug);

  if (chunks.length === 0) {
    return {
      answer: 'ドキュメントがまだアップロードされていないか、処理が完了していません。',
      sources: [],
      model: llmSettings.model,
    };
  }

  const scored = chunks.map((chunk) => ({
    ...chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  const topChunks = scored.slice(0, TOP_K);

  // 4. Build system prompt
  const systemPrompt = buildSystemPrompt(
    topChunks.map((c) => ({ title: c.documentTitle, content: c.content }))
  );

  // 5. Call LLM
  const answer = await callLlm(
    llmSettings.provider,
    llmSettings.model,
    apiKey,
    systemPrompt,
    conversationHistory,
    query
  );

  // 6. Build sources (deduplicate by documentId)
  const seenDocs = new Set<string>();
  const sources: DocumentChatSource[] = [];
  for (const chunk of topChunks) {
    if (!seenDocs.has(chunk.documentId)) {
      seenDocs.add(chunk.documentId);
      sources.push({
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle,
        content: chunk.content.slice(0, 200),
        score: chunk.score,
      });
    }
  }

  return { answer, sources, model: llmSettings.model };
}
