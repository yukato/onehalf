import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { getFileUrl } from '@/lib/s3';

// URLかどうかを判定
function isExternalUrl(path: string): boolean {
  return path.startsWith('http://') || path.startsWith('https://');
}

// ファイルのURLを取得（外部URLならそのまま、S3パスならCDN URLに変換）
function resolveFileUrl(path: string): string {
  return isExternalUrl(path) ? path : getFileUrl(path);
}

// ユーザーデータからプロフィール画像URLを取得
function getUserProfileImageUrl(user: Record<string, unknown>): string | null {
  const userFiles = user.userFiles as
    | Array<{ file: { path: string }; isPrimary: boolean; sortOrder: number }>
    | undefined;
  if (userFiles && userFiles.length > 0) {
    const primaryFile = userFiles.find((f) => f.isPrimary) || userFiles[0];
    return resolveFileUrl(primaryFile.file.path);
  }
  return null;
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

// BigIntをstringに変換するシリアライザ
function serializeMatching(matching: Record<string, unknown>): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    ...matching,
    id: matching.id?.toString(),
    maleUserId: matching.maleUserId?.toString(),
    femaleUserId: matching.femaleUserId?.toString(),
    venueId: matching.venueId?.toString() || null,
    arrangedByAdminId: matching.arrangedByAdminId?.toString(),
  };

  // ネストしたオブジェクトのBigInt変換
  if (matching.maleUser && typeof matching.maleUser === 'object') {
    const maleUser = matching.maleUser as Record<string, unknown>;
    const occupation = maleUser.occupation as Record<string, unknown> | null;
    serialized.maleUser = {
      ...maleUser,
      id: maleUser.id?.toString(),
      profileImageUrl: getUserProfileImageUrl(maleUser),
      occupation: occupation ? { id: occupation.id, name: occupation.name } : null,
    };
    delete (serialized.maleUser as Record<string, unknown>).userFiles;
  }
  if (matching.femaleUser && typeof matching.femaleUser === 'object') {
    const femaleUser = matching.femaleUser as Record<string, unknown>;
    const occupation = femaleUser.occupation as Record<string, unknown> | null;
    serialized.femaleUser = {
      ...femaleUser,
      id: femaleUser.id?.toString(),
      profileImageUrl: getUserProfileImageUrl(femaleUser),
      occupation: occupation ? { id: occupation.id, name: occupation.name } : null,
    };
    delete (serialized.femaleUser as Record<string, unknown>).userFiles;
  }
  if (matching.venue && typeof matching.venue === 'object') {
    const venue = matching.venue as Record<string, unknown>;
    serialized.venue = {
      ...venue,
      id: venue.id?.toString(),
    };
  }
  if (matching.arrangedByAdmin && typeof matching.arrangedByAdmin === 'object') {
    const admin = matching.arrangedByAdmin as Record<string, unknown>;
    serialized.arrangedByAdmin = {
      ...admin,
      id: admin.id?.toString(),
    };
  }

  return serialized;
}

// GET /api/black/matchings - マッチング一覧取得
export async function GET(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    const q = searchParams.get('q') || ''; // ユーザー検索クエリ
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {};

    if (status) {
      where.currentStatus = status;
    }

    if (fromDate) {
      where.startAt = {
        ...((where.startAt as object) || {}),
        gte: new Date(fromDate),
      };
    }

    if (toDate) {
      where.startAt = {
        ...((where.startAt as object) || {}),
        lte: new Date(toDate + 'T23:59:59'),
      };
    }

    // ユーザー名検索（男性または女性の姓・名で検索）
    if (q) {
      where.OR = [
        {
          maleUser: {
            OR: [{ lastName: { contains: q } }, { firstName: { contains: q } }],
          },
        },
        {
          femaleUser: {
            OR: [{ lastName: { contains: q } }, { firstName: { contains: q } }],
          },
        },
      ];
    }

    const [matchings, total] = await Promise.all([
      prisma.matching.findMany({
        where,
        include: {
          maleUser: {
            select: {
              id: true,
              lastName: true,
              firstName: true,
              birthday: true,
              occupation: { select: { id: true, name: true } },
              userFiles: {
                where: { type: 'profile' },
                include: { file: true },
                orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                take: 1,
              },
            },
          },
          femaleUser: {
            select: {
              id: true,
              lastName: true,
              firstName: true,
              birthday: true,
              occupation: { select: { id: true, name: true } },
              userFiles: {
                where: { type: 'profile' },
                include: { file: true },
                orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                take: 1,
              },
            },
          },
          venue: {
            select: { id: true, name: true, genre: true, city: true },
          },
          arrangedByAdmin: {
            select: { id: true, username: true },
          },
        },
        orderBy: { id: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.matching.count({ where }),
    ]);

    return NextResponse.json({
      matchings: matchings.map((m) => serializeMatching(m as unknown as Record<string, unknown>)),
      total,
    });
  } catch (error) {
    console.error('Get matchings error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/black/matchings - マッチング作成
export async function POST(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // バリデーション
    if (!data.maleUserId) {
      return NextResponse.json({ detail: '男性会員は必須です' }, { status: 400 });
    }
    if (!data.femaleUserId) {
      return NextResponse.json({ detail: '女性会員は必須です' }, { status: 400 });
    }
    if (!data.startAt) {
      return NextResponse.json({ detail: '開始日時は必須です' }, { status: 400 });
    }
    if (!data.endAt) {
      return NextResponse.json({ detail: '終了日時は必須です' }, { status: 400 });
    }

    // ユーザー存在チェック
    const maleUser = await prisma.user.findUnique({
      where: { id: BigInt(data.maleUserId) },
    });
    if (!maleUser) {
      return NextResponse.json({ detail: '男性会員が見つかりません' }, { status: 400 });
    }
    if (maleUser.gender !== 1) {
      return NextResponse.json({ detail: '男性会員に女性が選択されています' }, { status: 400 });
    }

    const femaleUser = await prisma.user.findUnique({
      where: { id: BigInt(data.femaleUserId) },
    });
    if (!femaleUser) {
      return NextResponse.json({ detail: '女性会員が見つかりません' }, { status: 400 });
    }
    if (femaleUser.gender !== 2) {
      return NextResponse.json({ detail: '女性会員に男性が選択されています' }, { status: 400 });
    }

    // 会場存在チェック
    if (data.venueId) {
      const venue = await prisma.matchingVenue.findUnique({
        where: { id: BigInt(data.venueId) },
      });
      if (!venue) {
        return NextResponse.json({ detail: 'レストランが見つかりません' }, { status: 400 });
      }
    }

    // トランザクションで作成とログを同時に実行
    const matching = await prisma.$transaction(async (tx) => {
      const created = await tx.matching.create({
        data: {
          maleUserId: BigInt(data.maleUserId),
          femaleUserId: BigInt(data.femaleUserId),
          startAt: new Date(data.startAt),
          endAt: new Date(data.endAt),
          currentStatus: 'pending',
          venueId: data.venueId ? BigInt(data.venueId) : null,
          arrangedByAdminId: BigInt(payload.sub),
          notes: data.notes?.trim() || null,
        },
        include: {
          maleUser: {
            select: {
              id: true,
              lastName: true,
              firstName: true,
              birthday: true,
              occupation: { select: { id: true, name: true } },
              userFiles: {
                where: { type: 'profile' },
                include: { file: true },
                orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                take: 1,
              },
            },
          },
          femaleUser: {
            select: {
              id: true,
              lastName: true,
              firstName: true,
              birthday: true,
              occupation: { select: { id: true, name: true } },
              userFiles: {
                where: { type: 'profile' },
                include: { file: true },
                orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                take: 1,
              },
            },
          },
          venue: {
            select: { id: true, name: true, genre: true, city: true },
          },
          arrangedByAdmin: {
            select: { id: true, username: true },
          },
        },
      });

      // 作成ログを記録
      await tx.matchingActivityLog.create({
        data: {
          matchingId: created.id,
          adminUserId: BigInt(payload.sub),
          type: 'created',
          content: 'マッチングを作成しました',
        },
      });

      return created;
    });

    return NextResponse.json(serializeMatching(matching as unknown as Record<string, unknown>), {
      status: 201,
    });
  } catch (error) {
    console.error('Create matching error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
