import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { getTopCustomers, getTopProducts } from '@/lib/dashboard/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const [customers, products] = await Promise.all([
      getTopCustomers(auth.companySlug, limit),
      getTopProducts(auth.companySlug, limit),
    ]);

    return NextResponse.json({ customers, products });
  } catch (error) {
    console.error('Dashboard rankings error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
