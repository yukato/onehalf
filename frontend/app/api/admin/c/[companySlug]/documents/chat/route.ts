import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateDocumentAnswer } from '@/lib/documents/chat';

async function authenticateAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyAccessToken(authHeader.slice(7));
}

export async function POST(
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

    const body = await request.json();
    const { query, conversationHistory } = body;

    if (!query) {
      return NextResponse.json({ detail: 'Query is required' }, { status: 400 });
    }

    const result = await generateDocumentAnswer(companySlug, query, conversationHistory || []);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin document chat error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.includes('APIキーが設定されていません')) {
      return NextResponse.json({ detail: message }, { status: 422 });
    }
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
