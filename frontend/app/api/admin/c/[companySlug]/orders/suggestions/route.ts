import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { getOrderSuggestions } from '@/lib/ai/suggestions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    if (!customerId) {
      return NextResponse.json({ detail: 'customerId is required' }, { status: 400 });
    }

    const suggestion = await getOrderSuggestions(auth.companySlug, customerId);
    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error('Admin get order suggestions error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
