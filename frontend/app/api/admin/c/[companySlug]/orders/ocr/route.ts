import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { listOcrExtractions, insertOcrExtraction } from '@/lib/ocr/queries';
import { performOcrExtraction } from '@/lib/ocr/extract';
import { getStorage } from '@/lib/storage';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await listOcrExtractions(auth.companySlug, { status, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin list OCR extractions error:', error);
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sourceType = (formData.get('sourceType') as string) || 'upload';

    if (!file) {
      return NextResponse.json({ detail: 'File is required' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ detail: '画像ファイルのみアップロードできます' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = getStorage();
    const uploadResult = await storage.upload(buffer, {
      folder: `ocr/${auth.companySlug}`,
      originalName: file.name,
      mimeType: file.type,
    });

    // Get admin user name
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: BigInt(auth.adminId) },
    });
    const uploaderName = adminUser?.username || 'Admin';

    const ocrId = await insertOcrExtraction(auth.companySlug, {
      sourceImagePath: uploadResult.path,
      sourceImageUrl: uploadResult.url,
      sourceType: sourceType as 'fax' | 'email' | 'upload',
      createdBy: auth.adminId,
      createdByName: uploaderName,
    });

    // Start OCR extraction asynchronously
    performOcrExtraction(auth.companySlug, ocrId, uploadResult.path).catch((err) => {
      console.error(`Background OCR extraction failed [company=${auth.companySlug}, ocr=${ocrId}]:`, err);
    });

    const { getOcrExtraction } = await import('@/lib/ocr/queries');
    const extraction = await getOcrExtraction(auth.companySlug, ocrId);

    return NextResponse.json(extraction, { status: 201 });
  } catch (error) {
    console.error('Admin upload OCR image error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
