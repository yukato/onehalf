import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { getReceivables } from '@/lib/dashboard/queries';

async function authenticateCompany(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyCompanyAccessToken(authHeader.slice(7));
}

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateCompany(request);
    if (!payload) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

    const receivables = await getReceivables(payload.companySlug);
    return NextResponse.json({ receivables });
  } catch (error) {
    console.error('Dashboard receivables error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
