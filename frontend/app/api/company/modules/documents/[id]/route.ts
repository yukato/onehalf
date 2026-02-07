import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { getDocument, updateDocument, deleteDocument } from '@/lib/documents/queries';
import { deleteFromS3 } from '@/lib/s3';

async function authenticateCompany(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyCompanyAccessToken(authHeader.slice(7));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticateCompany(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const doc = await getDocument(payload.companySlug, id);
    if (!doc) {
      return NextResponse.json({ detail: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(doc);
  } catch (error) {
    console.error('Get document error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
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

    const existing = await getDocument(payload.companySlug, id);
    if (!existing) {
      return NextResponse.json({ detail: 'Document not found' }, { status: 404 });
    }

    await updateDocument(payload.companySlug, id, {
      title: body.title,
      tagIds: body.tagIds,
    });

    const updated = await getDocument(payload.companySlug, id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update document error:', error);
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
    const s3Path = await deleteDocument(payload.companySlug, id);

    if (s3Path) {
      try {
        await deleteFromS3(s3Path);
      } catch (err) {
        console.error('Failed to delete from S3:', err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
