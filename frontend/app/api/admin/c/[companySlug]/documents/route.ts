import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listDocuments, insertDocument } from '@/lib/documents/queries';
import { uploadToS3 } from '@/lib/s3';
import { processDocument } from '@/lib/documents/process';

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
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { companySlug } = await params;
    const company = await resolveCompany(companySlug);
    if (!company) {
      return NextResponse.json({ detail: 'Company not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tagId') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await listDocuments(companySlug, { tagId, status, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin list documents error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { companySlug } = await params;
    const company = await resolveCompany(companySlug);
    if (!company) {
      return NextResponse.json({ detail: 'Company not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string) || '';
    const tagIdsStr = formData.get('tagIds') as string;

    if (!file) {
      return NextResponse.json({ detail: 'File is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'application/octet-stream';

    const s3Result = await uploadToS3(buffer, {
      folder: `documents/${companySlug}`,
      originalName: file.name,
      mimeType,
    });

    // Admin側ではアップロード者名をAdminユーザーから取得
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: BigInt(payload.sub) },
    });
    const uploaderName = adminUser?.username || 'Admin';

    const docId = await insertDocument(companySlug, {
      title: title || file.name,
      originalName: file.name,
      mimeType,
      size: buffer.length,
      s3Path: s3Result.path,
      s3Url: s3Result.url,
      uploadedBy: payload.sub,
      uploadedByName: uploaderName,
    });

    if (tagIdsStr) {
      const { updateDocument } = await import('@/lib/documents/queries');
      const tagIds = JSON.parse(tagIdsStr) as string[];
      await updateDocument(companySlug, docId, { tagIds });
    }

    processDocument(companySlug, docId, s3Result.path, mimeType).catch((err) => {
      console.error('Background document processing failed:', err);
    });

    const { getDocument } = await import('@/lib/documents/queries');
    const doc = await getDocument(companySlug, docId);

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error('Admin upload document error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
