import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { generateDocumentAnswer } from '@/lib/documents/chat';

async function authenticateCompany(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyCompanyAccessToken(authHeader.slice(7));
}

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateCompany(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { query, conversationHistory } = body;

    if (!query) {
      return NextResponse.json({ detail: 'Query is required' }, { status: 400 });
    }

    const result = await generateDocumentAnswer(payload.companySlug, query, conversationHistory || []);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Company document chat error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.includes('APIキーが設定されていません')) {
      return NextResponse.json({ detail: message }, { status: 422 });
    }
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
