import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { getAutoGenerateSuggestions } from '@/lib/ai/suggestions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const suggestions = await getAutoGenerateSuggestions(auth.companySlug);
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Admin get suggestions error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
