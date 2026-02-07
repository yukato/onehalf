import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAllChunksWithEmbeddings, getDocument } from '@/lib/documents/queries';
import { generateEmbedding, cosineSimilarity } from '@/lib/documents/embeddings';

async function authenticateAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyAccessToken(authHeader.slice(7));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { companySlug } = await params;
    const company = await prisma.company.findUnique({ where: { slug: companySlug } });
    if (!company) {
      return NextResponse.json({ detail: 'Company not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query) {
      return NextResponse.json({ detail: 'Query parameter "q" is required' }, { status: 400 });
    }

    const queryEmbedding = await generateEmbedding(query);
    const chunks = await getAllChunksWithEmbeddings(companySlug);

    const scored = chunks.map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    const topChunks = scored.slice(0, limit * 3);

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

    const sortedDocs = Array.from(docMap.entries())
      .sort(([, a], [, b]) => b.maxScore - a.maxScore)
      .slice(0, limit);

    const results = await Promise.all(
      sortedDocs.map(async ([docId, { chunks: relChunks, maxScore }]) => {
        const document = await getDocument(companySlug, docId);
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
    console.error('Admin search documents error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
