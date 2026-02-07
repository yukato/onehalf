import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { uploadToS3, deleteFromS3, getFileUrl } from '@/lib/s3';

// URLかどうかを判定
function isExternalUrl(path: string): boolean {
  return path.startsWith('http://') || path.startsWith('https://');
}

// ファイルのURLを取得（外部URLならそのまま、S3パスならCDN URLに変換）
function resolveFileUrl(path: string): string {
  return isExternalUrl(path) ? path : getFileUrl(path);
}

// 認証チェック
async function checkAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  return verifyAccessToken(token);
}

// BigIntをstringに変換
function serializeFile(file: Record<string, unknown>) {
  return {
    ...file,
    id: file.id?.toString(),
    userId: file.userId?.toString(),
    fileId: file.fileId?.toString(),
    file: file.file
      ? {
          ...(file.file as Record<string, unknown>),
          id: (file.file as Record<string, unknown>).id?.toString(),
          size: (file.file as Record<string, unknown>).size?.toString(),
        }
      : undefined,
  };
}

// GET /api/black/users/[id]/files - ユーザーのファイル一覧取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // "profile", "interview", "kyc", "date_hearing"

    const where: Record<string, unknown> = { userId: BigInt(id) };
    if (type) {
      where.type = type;
    }

    const userFiles = await prisma.userFile.findMany({
      where,
      include: { file: true },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      files: userFiles.map((uf) => ({
        ...serializeFile(uf as unknown as Record<string, unknown>),
        url: resolveFileUrl(uf.file.path),
      })),
    });
  } catch (error) {
    console.error('Get user files error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/black/users/[id]/files - ファイルアップロード
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = BigInt(id);

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'profile';
    const isPrimary = formData.get('isPrimary') === 'true';

    if (!file) {
      return NextResponse.json({ detail: 'No file provided' }, { status: 400 });
    }

    // ファイルサイズチェック（50MB）
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ detail: 'File too large (max 50MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;

    // 画像の場合、サイズを取得（sharpを使う場合は後で追加）
    let width: number | undefined;
    let height: number | undefined;

    // S3にアップロード
    const uploadResult = await uploadToS3(buffer, {
      folder: `users/${id}/${type}`,
      originalName: file.name,
      mimeType,
      width,
      height,
    });

    // DBに保存
    const dbFile = await prisma.file.create({
      data: {
        path: uploadResult.path,
        originalName: file.name,
        mimeType: uploadResult.mimeType,
        size: BigInt(uploadResult.size),
        width: uploadResult.width,
        height: uploadResult.height,
      },
    });

    // isPrimaryがtrueの場合、同じtypeの他のファイルのisPrimaryをfalseに
    if (isPrimary) {
      await prisma.userFile.updateMany({
        where: { userId, type, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // 最大sortOrderを取得
    const maxSort = await prisma.userFile.aggregate({
      where: { userId, type },
      _max: { sortOrder: true },
    });

    const userFile = await prisma.userFile.create({
      data: {
        userId,
        fileId: dbFile.id,
        type,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        isPrimary,
      },
      include: { file: true },
    });

    return NextResponse.json(
      {
        ...serializeFile(userFile as unknown as Record<string, unknown>),
        url: resolveFileUrl(dbFile.path),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Upload file error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/black/users/[id]/files - URL登録
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = BigInt(id);

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { url, type = 'interview', isPrimary = false } = body;

    if (!url || !isExternalUrl(url)) {
      return NextResponse.json({ detail: 'Valid URL is required' }, { status: 400 });
    }

    // URLからファイル名とMIMEタイプを推測
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const originalName = pathname.split('/').pop() || 'link';

    // 拡張子からMIMEタイプを推測
    const ext = originalName.split('.').pop()?.toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext) {
      const mimeMap: Record<string, string> = {
        mp4: 'video/mp4',
        webm: 'video/webm',
        mov: 'video/quicktime',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        m4a: 'audio/mp4',
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
      };
      mimeType = mimeMap[ext] || mimeType;
    }

    // DBに保存（pathにURLをそのまま保存）
    const dbFile = await prisma.file.create({
      data: {
        path: url,
        originalName,
        mimeType,
        size: BigInt(0), // 外部URLなのでサイズは不明
      },
    });

    // isPrimaryがtrueの場合、同じtypeの他のファイルのisPrimaryをfalseに
    if (isPrimary) {
      await prisma.userFile.updateMany({
        where: { userId, type, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // 最大sortOrderを取得
    const maxSort = await prisma.userFile.aggregate({
      where: { userId, type },
      _max: { sortOrder: true },
    });

    const userFile = await prisma.userFile.create({
      data: {
        userId,
        fileId: dbFile.id,
        type,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        isPrimary,
      },
      include: { file: true },
    });

    return NextResponse.json(
      {
        ...serializeFile(userFile as unknown as Record<string, unknown>),
        url,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register URL error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/black/users/[id]/files?fileId=xxx - ファイル削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userFileId = searchParams.get('fileId');

    if (!userFileId) {
      return NextResponse.json({ detail: 'fileId is required' }, { status: 400 });
    }

    const userFile = await prisma.userFile.findFirst({
      where: {
        id: BigInt(userFileId),
        userId: BigInt(id),
      },
      include: { file: true },
    });

    if (!userFile) {
      return NextResponse.json({ detail: 'File not found' }, { status: 404 });
    }

    // S3から削除（外部URLの場合はスキップ）
    if (!isExternalUrl(userFile.file.path)) {
      try {
        await deleteFromS3(userFile.file.path);
      } catch (e) {
        console.error('S3 delete error:', e);
      }
    }

    // DBから削除（CASCADE でuserFileも削除される）
    await prisma.file.delete({ where: { id: userFile.fileId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
