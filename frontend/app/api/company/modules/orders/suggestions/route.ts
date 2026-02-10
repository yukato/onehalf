import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { getOrderSuggestions } from '@/lib/ai/suggestions';

async function authenticateCompany(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyCompanyAccessToken(authHeader.slice(7));
}

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateCompany(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    if (!customerId) {
      return NextResponse.json({ detail: 'customerId is required' }, { status: 400 });
    }

    const suggestion = await getOrderSuggestions(payload.companySlug, customerId);
    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error('Get order suggestions error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
