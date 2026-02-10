import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDocument, updateDocument, deleteDocument } from '@/lib/documents/queries';
import { getStorage } from '@/lib/storage';

async function authenticateAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyAccessToken(authHeader.slice(7));
}

async function resolveCompany(companySlug: string) {
  return prisma.company.findUnique({ where: { slug: companySlug } });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { companySlug, id } = await params;
    const company = await resolveCompany(companySlug);
    if (!company) {
      return NextResponse.json({ detail: 'Company not found' }, { status: 404 });
    }

    const doc = await getDocument(companySlug, id);
    if (!doc) {
      return NextResponse.json({ detail: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(doc);
  } catch (error) {
    console.error('Admin get document error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { companySlug, id } = await params;
    const company = await resolveCompany(companySlug);
    if (!company) {
      return NextResponse.json({ detail: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();
    const existing = await getDocument(companySlug, id);
    if (!existing) {
      return NextResponse.json({ detail: 'Document not found' }, { status: 404 });
    }

    await updateDocument(companySlug, id, {
      title: body.title,
      tagIds: body.tagIds,
    });

    const updated = await getDocument(companySlug, id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Admin update document error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { companySlug, id } = await params;
    const company = await resolveCompany(companySlug);
    if (!company) {
      return NextResponse.json({ detail: 'Company not found' }, { status: 404 });
    }

    const s3Path = await deleteDocument(companySlug, id);
    if (s3Path) {
      try {
        await getStorage().delete(s3Path);
      } catch (err) {
        console.error(`[ORPHAN] Storage delete failed, orphaned file: ${s3Path}`, err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete document error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
