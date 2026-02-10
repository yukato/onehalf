import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { getReceivables } from '@/lib/dashboard/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const receivables = await getReceivables(auth.companySlug);
    return NextResponse.json({ receivables });
  } catch (error) {
    console.error('Dashboard receivables error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
