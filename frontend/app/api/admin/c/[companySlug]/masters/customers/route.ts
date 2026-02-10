import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { listCustomers, insertCustomer } from '@/lib/masters/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;
    const q = searchParams.get('q') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await listCustomers(auth.companySlug, { type, q, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error('List customers error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    if (!body.code || !body.name) {
      return NextResponse.json({ detail: 'code and name are required' }, { status: 400 });
    }

    const id = await insertCustomer(auth.companySlug, {
      code: body.code,
      name: body.name,
      nameKana: body.nameKana,
      customerType: body.customerType || 'customer',
      postalCode: body.postalCode,
      address: body.address,
      phone: body.phone,
      fax: body.fax,
      email: body.email,
      contactPerson: body.contactPerson,
      paymentTerms: body.paymentTerms,
      notes: body.notes,
    });

    const { getCustomer } = await import('@/lib/masters/queries');
    const customer = await getCustomer(auth.companySlug, id);

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
