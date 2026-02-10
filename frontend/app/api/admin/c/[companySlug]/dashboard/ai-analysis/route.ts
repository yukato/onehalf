import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { generateAiAnalysis } from '@/lib/ai/analysis';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const refresh = request.nextUrl.searchParams.get('refresh') === 'true';
    const result = await generateAiAnalysis(auth.companySlug, refresh);

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI analysis error:', error);
    return NextResponse.json({ detail: 'AI分析の生成に失敗しました' }, { status: 500 });
  }
}
