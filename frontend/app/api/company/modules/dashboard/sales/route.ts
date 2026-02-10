import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { getDailySales, getMonthlySales } from '@/lib/dashboard/queries';

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
    const now = new Date();
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()));
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1));

    const [daily, monthly] = await Promise.all([
      getDailySales(payload.companySlug, year, month),
      getMonthlySales(payload.companySlug, year),
    ]);

    return NextResponse.json({ daily, monthly });
  } catch (error) {
    console.error('Dashboard sales error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
