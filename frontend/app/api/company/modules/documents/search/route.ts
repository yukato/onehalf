import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { getAllChunksWithEmbeddings, getDocument } from '@/lib/documents/queries';
import { generateEmbedding, cosineSimilarity } from '@/lib/documents/embeddings';

async function authenticateCompany(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyCompanyAccessToken(authHeader.slice(7));
}

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateCompany(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query) {
      return NextResponse.json({ detail: 'Query parameter "q" is required' }, { status: 400 });
    }

    // クエリの埋め込み生成
    const queryEmbedding = await generateEmbedding(query);

    // 全チャンクを取得してコサイン類似度計算
    const chunks = await getAllChunksWithEmbeddings(payload.companySlug);

    const scored = chunks.map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    // スコアでソートして上位を取得
    scored.sort((a, b) => b.score - a.score);
    const topChunks = scored.slice(0, limit * 3); // 多めに取ってドキュメント単位にグループ化

    // ドキュメント単位にグループ化
    const docMap = new Map<string, { chunks: typeof topChunks; maxScore: number }>();
    for (const chunk of topChunks) {
      const existing = docMap.get(chunk.documentId);
      if (existing) {
        existing.chunks.push(chunk);
        existing.maxScore = Math.max(existing.maxScore, chunk.score);
      } else {
        docMap.set(chunk.documentId, { chunks: [chunk], maxScore: chunk.score });
      }
    }

    // maxScoreでソートして上位ドキュメントを取得
    const sortedDocs = Array.from(docMap.entries())
      .sort(([, a], [, b]) => b.maxScore - a.maxScore)
      .slice(0, limit);

    // ドキュメント詳細を取得
    const results = await Promise.all(
      sortedDocs.map(async ([docId, { chunks: relChunks, maxScore }]) => {
        const document = await getDocument(payload.companySlug, docId);
        return {
          document,
          relevantChunks: relChunks.slice(0, 3).map((c) => ({
            content: c.content,
            score: c.score,
          })),
          maxScore,
        };
      })
    );

    return NextResponse.json({
      results: results.filter((r) => r.document !== null),
      query,
    });
  } catch (error) {
    console.error('Search documents error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
