import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { listOcrExtractions, insertOcrExtraction } from '@/lib/ocr/queries';
import { performOcrExtraction } from '@/lib/ocr/extract';
import { getStorage } from '@/lib/storage';
import { prisma } from '@/lib/prisma';

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
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await listOcrExtractions(payload.companySlug, { status, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error('List OCR extractions error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticateCompany(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sourceType = (formData.get('sourceType') as string) || 'upload';

    if (!file) {
      return NextResponse.json({ detail: 'File is required' }, { status: 400 });
    }

    // Validate image type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ detail: '画像ファイルのみアップロードできます' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = getStorage();
    const uploadResult = await storage.upload(buffer, {
      folder: `ocr/${payload.companySlug}`,
      originalName: file.name,
      mimeType: file.type,
    });

    // Get uploader name
    const user = await prisma.companyUser.findUnique({
      where: { id: BigInt(payload.sub) },
    });
    const uploaderName = user?.username || 'Unknown';

    // Insert OCR extraction record
    const ocrId = await insertOcrExtraction(payload.companySlug, {
      sourceImagePath: uploadResult.path,
      sourceImageUrl: uploadResult.url,
      sourceType: sourceType as 'fax' | 'email' | 'upload',
      createdBy: payload.sub,
      createdByName: uploaderName,
    });

    // Start OCR extraction asynchronously
    performOcrExtraction(payload.companySlug, ocrId, uploadResult.path).catch((err) => {
      console.error(`Background OCR extraction failed [company=${payload.companySlug}, ocr=${ocrId}]:`, err);
    });

    // Return the created record
    const { getOcrExtraction } = await import('@/lib/ocr/queries');
    const extraction = await getOcrExtraction(payload.companySlug, ocrId);

    return NextResponse.json(extraction, { status: 201 });
  } catch (error) {
    console.error('Upload OCR image error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
