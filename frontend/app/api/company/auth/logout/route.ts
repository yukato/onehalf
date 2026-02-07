import { NextRequest, NextResponse } from 'next/server';
import { revokeCompanyRefreshToken } from '@/lib/company-auth';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('company_refresh_token')?.value;

    if (refreshToken) {
      await revokeCompanyRefreshToken(refreshToken);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('company_refresh_token');

    return response;
  } catch (error) {
    console.error('Company logout error:', error);
    const response = NextResponse.json({ success: true });
    response.cookies.delete('company_refresh_token');
    return response;
  }
}
