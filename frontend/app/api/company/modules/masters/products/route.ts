import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { listProducts, insertProduct } from '@/lib/masters/queries';

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
    const categoryId = searchParams.get('categoryId') || undefined;
    const q = searchParams.get('q') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await listProducts(payload.companySlug, { categoryId, q, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error('List products error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateCompany(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    if (!body.code || !body.name || body.unitPrice === undefined) {
      return NextResponse.json({ detail: 'code, name, and unitPrice are required' }, { status: 400 });
    }

    const id = await insertProduct(payload.companySlug, {
      code: body.code,
      name: body.name,
      nameKana: body.nameKana,
      categoryId: body.categoryId,
      unit: body.unit,
      unitPrice: body.unitPrice,
      costPrice: body.costPrice,
      taxRate: body.taxRate,
      description: body.description,
    });

    const { getProduct } = await import('@/lib/masters/queries');
    const product = await getProduct(payload.companySlug, id);

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
