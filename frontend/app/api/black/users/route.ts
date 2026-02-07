import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { getFileUrl } from '@/lib/s3';

// 認証チェック
async function checkAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  return verifyAccessToken(token);
}

// URLかどうかを判定
function isExternalUrl(path: string): boolean {
  return path.startsWith('http://') || path.startsWith('https://');
}

// ファイルのURLを取得（外部URLならそのまま、S3パスならCDN URLに変換）
function resolveFileUrl(path: string): string {
  return isExternalUrl(path) ? path : getFileUrl(path);
}

// BigIntをstringに変換するシリアライザ
function serializeUser(user: Record<string, unknown>) {
  const serialized: Record<string, unknown> = {
    ...user,
    id: user.id?.toString(),
    bdUserId: user.bdUserId?.toString(),
  };

  // プロフィール画像URL
  const userFiles = user.userFiles as
    | Array<{ file: { path: string }; isPrimary: boolean; sortOrder: number }>
    | undefined;
  if (userFiles && userFiles.length > 0) {
    const primaryFile = userFiles.find((f) => f.isPrimary) || userFiles[0];
    serialized.profileImageUrl = resolveFileUrl(primaryFile.file.path);
  } else {
    serialized.profileImageUrl = null;
  }

  // userFilesは返さない
  delete serialized.userFiles;

  return serialized;
}

// GET /api/black/users - ユーザー一覧取得
export async function GET(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const q = searchParams.get('q') || '';
    const includeDeleted = searchParams.get('include_deleted') === 'true';

    // フィルタパラメータ
    const gender = searchParams.get('gender');
    const status = searchParams.get('status');
    const planId = searchParams.get('plan_id');
    const prefectureId = searchParams.get('prefecture_id');
    const occupationId = searchParams.get('occupation_id');
    const score = searchParams.get('score');
    const age = searchParams.get('age');

    const orConditions = [];
    if (q) {
      orConditions.push({ lastName: { contains: q } });
      orConditions.push({ firstName: { contains: q } });
      orConditions.push({ email: { contains: q } });
      // 数値の場合のみbdUserIdで検索
      const numericQ = parseInt(q);
      if (!isNaN(numericQ)) {
        orConditions.push({ bdUserId: BigInt(numericQ) });
      }
    }

    // フィルタ条件を構築
    const andConditions: Record<string, unknown>[] = [];
    if (gender) {
      andConditions.push({ gender: parseInt(gender) });
    }
    if (status) {
      andConditions.push({ currentStatus: status });
    }
    if (planId) {
      andConditions.push({ planId: parseInt(planId) });
    }
    if (prefectureId) {
      andConditions.push({ prefectureId: parseInt(prefectureId) });
    }
    if (occupationId) {
      andConditions.push({ occupationId: parseInt(occupationId) });
    }
    if (score) {
      // スコアフィルタ: "100", "90-99", "80-89", etc.
      if (score === '100') {
        andConditions.push({ score: 100 });
      } else if (score === '0-59') {
        andConditions.push({ score: { lt: 60 } });
      } else {
        const [minStr, maxStr] = score.split('-');
        const min = parseInt(minStr);
        const max = parseInt(maxStr);
        if (!isNaN(min) && !isNaN(max)) {
          andConditions.push({ score: { gte: min, lte: max } });
        }
      }
    }
    if (age) {
      // 年齢フィルタ: 誕生日から計算
      const today = new Date();
      if (age === '50+') {
        // 50歳以上 = 50年以上前に生まれた
        const maxBirthday = new Date(today.getFullYear() - 50, today.getMonth(), today.getDate());
        andConditions.push({ birthday: { lte: maxBirthday } });
      } else {
        const [minAgeStr, maxAgeStr] = age.split('-');
        const minAge = parseInt(minAgeStr);
        const maxAge = parseInt(maxAgeStr);
        if (!isNaN(minAge) && !isNaN(maxAge)) {
          // minAge歳 = (minAge+1)年前の誕生日より後
          // maxAge歳 = maxAge年前の誕生日以前
          const minBirthday = new Date(
            today.getFullYear() - maxAge - 1,
            today.getMonth(),
            today.getDate()
          );
          const maxBirthday = new Date(
            today.getFullYear() - minAge,
            today.getMonth(),
            today.getDate()
          );
          andConditions.push({ birthday: { gt: minBirthday, lte: maxBirthday } });
        }
      }
    }

    const where = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(orConditions.length > 0 ? { OR: orConditions } : {}),
      ...(andConditions.length > 0 ? { AND: andConditions } : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          occupation: true,
          plan: true,
          prefecture: true,
          userFiles: {
            where: { type: 'profile' },
            include: { file: true },
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            take: 1,
          },
        },
        orderBy: { id: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users: users.map(serializeUser),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/black/users - ユーザー作成
export async function POST(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    if (
      !data.bdUserId ||
      !data.lastName ||
      !data.firstName ||
      !data.email ||
      data.gender === undefined
    ) {
      return NextResponse.json(
        { detail: 'bdUserId, lastName, firstName, email, and gender are required' },
        { status: 400 }
      );
    }

    // bdUserIdの重複チェック
    const existing = await prisma.user.findUnique({
      where: { bdUserId: BigInt(data.bdUserId) },
    });
    if (existing) {
      return NextResponse.json(
        { detail: 'User with this bdUserId already exists' },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: {
        bdUserId: BigInt(data.bdUserId),
        lastName: data.lastName,
        firstName: data.firstName,
        gender: data.gender,
        email: data.email,
        mobileNumber: data.mobileNumber || null,
        birthday: data.birthday ? new Date(data.birthday) : null,
        occupationId: data.occupationId || null,
        prefectureId: data.prefectureId || null,
        currentStatus: data.currentStatus || 'pending',
        planId: data.planId || null,
        planStartedAt: data.planStartedAt ? new Date(data.planStartedAt) : null,
        score: data.score ?? 0,
      },
      include: {
        occupation: true,
        plan: true,
        prefecture: true,
      },
    });

    return NextResponse.json(serializeUser(user), { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
