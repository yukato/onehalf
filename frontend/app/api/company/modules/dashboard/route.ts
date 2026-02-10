import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { getDashboardSummary, getRecentOrders, getOrderStatusDistribution } from '@/lib/dashboard/queries';

async function authenticateCompany(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyCompanyAccessToken(authHeader.slice(7));
}

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateCompany(request);
    if (!payload) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });

    const [summary, recentOrders, statusDistribution] = await Promise.all([
      getDashboardSummary(payload.companySlug),
      getRecentOrders(payload.companySlug, 5),
      getOrderStatusDistribution(payload.companySlug),
    ]);

    return NextResponse.json({ summary, recentOrders, statusDistribution });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
