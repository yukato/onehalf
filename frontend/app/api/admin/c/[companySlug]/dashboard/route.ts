import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { getDashboardSummary, getRecentOrders, getOrderStatusDistribution } from '@/lib/dashboard/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const [summary, recentOrders, statusDistribution] = await Promise.all([
      getDashboardSummary(auth.companySlug),
      getRecentOrders(auth.companySlug, 5),
      getOrderStatusDistribution(auth.companySlug),
    ]);

    return NextResponse.json({ summary, recentOrders, statusDistribution });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
