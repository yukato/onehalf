import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { updateTag, deleteTag } from '@/lib/documents/queries';

async function authenticateCompany(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyCompanyAccessToken(authHeader.slice(7));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateCompany(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    await updateTag(payload.companySlug, id, {
      name: body.name,
      slug: body.slug,
      color: body.color,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update tag error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateCompany(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await deleteTag(payload.companySlug, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete tag error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
