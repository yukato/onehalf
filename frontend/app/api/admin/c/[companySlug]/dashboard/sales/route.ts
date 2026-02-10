import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { getDailySales, getMonthlySales } from '@/lib/dashboard/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()));
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1));

    const [daily, monthly] = await Promise.all([
      getDailySales(auth.companySlug, year, month),
      getMonthlySales(auth.companySlug, year),
    ]);

    return NextResponse.json({ daily, monthly });
  } catch (error) {
    console.error('Dashboard sales error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
