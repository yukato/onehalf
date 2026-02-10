import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { listDocuments, insertDocument } from '@/lib/documents/queries';
import { getStorage } from '@/lib/storage';
import { processDocument } from '@/lib/documents/process';
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
    const tagId = searchParams.get('tagId') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await listDocuments(payload.companySlug, { tagId, status, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error('List documents error:', error);
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
    const title = (formData.get('title') as string) || '';
    const tagIdsStr = formData.get('tagIds') as string;

    if (!file) {
      return NextResponse.json({ detail: 'File is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'application/octet-stream';

    const storage = getStorage();
    const s3Result = await storage.upload(buffer, {
      folder: `documents/${payload.companySlug}`,
      originalName: file.name,
      mimeType,
    });

    // アップロードユーザー名を取得
    const user = await prisma.companyUser.findUnique({
      where: { id: BigInt(payload.sub) },
    });
    const uploaderName = user?.username || 'Unknown';

    // DBにレコード作成
    const docId = await insertDocument(payload.companySlug, {
      title: title || file.name,
      originalName: file.name,
      mimeType,
      size: buffer.length,
      s3Path: s3Result.path,
      s3Url: s3Result.url,
      uploadedBy: payload.sub,
      uploadedByName: uploaderName,
    });

    // タグ割り当て
    if (tagIdsStr) {
      let tagIds: string[];
      try {
        const parsed = JSON.parse(tagIdsStr);
        if (!Array.isArray(parsed) || !parsed.every((id: unknown) => typeof id === 'string')) {
          return NextResponse.json({ detail: 'tagIds must be a JSON array of strings' }, { status: 400 });
        }
        tagIds = parsed;
      } catch {
        return NextResponse.json({ detail: 'tagIds is not valid JSON' }, { status: 400 });
      }
      const { updateDocument } = await import('@/lib/documents/queries');
      await updateDocument(payload.companySlug, docId, { tagIds });
    }

    // 非同期でドキュメント処理を開始（fire-and-forget）
    processDocument(payload.companySlug, docId, s3Result.path, mimeType).catch(async (err) => {
      console.error(`Background document processing critically failed [company=${payload.companySlug}, doc=${docId}]:`, err);
      try {
        const { updateDocumentStatus } = await import('@/lib/documents/queries');
        await updateDocumentStatus(payload.companySlug, docId, 'error', { errorMessage: 'ドキュメント処理で予期しないエラーが発生しました。' });
      } catch (fallbackErr) {
        console.error(`Last-resort status update also failed [doc=${docId}]:`, fallbackErr);
      }
    });

    // 作成したドキュメントを返却
    const { getDocument } = await import('@/lib/documents/queries');
    const doc = await getDocument(payload.companySlug, docId);

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error('Upload document error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
