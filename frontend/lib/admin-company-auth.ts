import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Admin側の会社別APIルートで使う共通認証ヘルパー。
 * Admin JWTを検証し、companySlugの存在を確認する。
 */
export async function adminCompanyAuth(
  request: NextRequest,
  params: Promise<{ companySlug: string }>
): Promise<{ companySlug: string; adminId: string } | NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const payload = await verifyAccessToken(authHeader.slice(7));
  if (!payload) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { companySlug } = await params;
  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company) {
    return NextResponse.json({ detail: 'Company not found' }, { status: 404 });
  }

  return { companySlug, adminId: payload.sub };
}

/** Type guard: 認証が失敗した場合 NextResponse が返る */
export function isAuthError(
  result: { companySlug: string; adminId: string } | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
