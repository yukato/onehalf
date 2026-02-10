import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { getTopCustomers, getTopProducts } from '@/lib/dashboard/queries';

async function authenticateCompany(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyCompanyAccessToken(authHeader.slice(7));
}

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateCompany(request);
    if (!payload) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const [customers, products] = await Promise.all([
      getTopCustomers(payload.companySlug, limit),
      getTopProducts(payload.companySlug, limit),
    ]);

    return NextResponse.json({ customers, products });
  } catch (error) {
    console.error('Dashboard rankings error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
