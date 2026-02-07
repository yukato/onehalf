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

// BigIntをstringに変換
function serializeUser(user: Record<string, unknown>): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    ...user,
    id: user.id?.toString(),
    bdUserId: user.bdUserId?.toString(),
  };

  if (user.occupation && typeof user.occupation === 'object') {
    serialized.occupation = user.occupation;
  }
  if (user.prefecture && typeof user.prefecture === 'object') {
    serialized.prefecture = user.prefecture;
  }
  if (user.plan && typeof user.plan === 'object') {
    serialized.plan = user.plan;
  }

  // プロフィール画像URL
  const userFiles = user.userFiles as
    | Array<{ file: { path: string }; isPrimary: boolean; sortOrder: number }>
    | undefined;
  if (userFiles && userFiles.length > 0) {
    // プライマリ画像またはソート順最初の画像をメインとして使用
    const primaryFile = userFiles.find((f) => f.isPrimary) || userFiles[0];
    serialized.profileImageUrl = getFileUrl(primaryFile.file.path);
    // 全プロフィール画像のURL一覧
    serialized.profileImages = userFiles.map((f) => getFileUrl(f.file.path));
  } else {
    serialized.profileImageUrl = null;
    serialized.profileImages = [];
  }

  // userFilesは返さない
  delete serialized.userFiles;

  return serialized;
}

// 年齢計算
function calculateAge(birthday: Date | null): number | null {
  if (!birthday) return null;
  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const m = today.getMonth() - birthday.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) {
    age--;
  }
  return age;
}

// 適合度スコア計算
function calculateMatchScore(
  candidate: Record<string, unknown>,
  preferences: { preferenceTypeCode: string; value: unknown }[]
): number {
  if (preferences.length === 0) return 0;

  let matchedCount = 0;
  let totalChecked = 0;

  for (const pref of preferences) {
    const value = pref.value as Record<string, unknown> | string | string[];

    switch (pref.preferenceTypeCode) {
      case 'desired_age': {
        const candidateBirthday = candidate.birthday as Date | null;
        const age = calculateAge(candidateBirthday);
        if (age !== null && typeof value === 'object' && !Array.isArray(value)) {
          const rangeValue = value as { min?: number | null; max?: number | null };
          totalChecked++;
          const minOk =
            rangeValue.min === null || rangeValue.min === undefined || age >= rangeValue.min;
          const maxOk =
            rangeValue.max === null || rangeValue.max === undefined || age <= rangeValue.max;
          if (minOk && maxOk) matchedCount++;
        }
        break;
      }

      case 'desired_occupation': {
        const candidateOccupation = candidate.occupation as { name?: string } | null;
        if (candidateOccupation?.name && Array.isArray(value) && value.length > 0) {
          totalChecked++;
          if (value.includes(candidateOccupation.name)) matchedCount++;
        }
        break;
      }

      case 'desired_location': {
        const candidatePrefecture = candidate.prefecture as { name?: string } | null;
        if (candidatePrefecture?.name && Array.isArray(value) && value.length > 0) {
          totalChecked++;
          // 都道府県名が選択肢に含まれているか、地域名に含まれているかをチェック
          const prefName = candidatePrefecture.name;
          const isMatch = value.some((v) => {
            if (v === prefName) return true;
            // 地域マッチング（簡易版）
            if (v.includes('東京') && prefName === '東京都') return true;
            if (v.includes('神奈川') && prefName === '神奈川県') return true;
            if (v.includes('千葉') && prefName === '千葉県') return true;
            if (v.includes('埼玉') && prefName === '埼玉県') return true;
            if (v.includes('大阪') && prefName === '大阪府') return true;
            if (v.includes('京都') && prefName === '京都府') return true;
            if (v.includes('兵庫') && prefName === '兵庫県') return true;
            if (v.includes('愛知') && prefName === '愛知県') return true;
            if (
              v.includes('関東') &&
              ['東京都', '神奈川県', '千葉県', '埼玉県', '茨城県', '栃木県', '群馬県'].includes(
                prefName
              )
            )
              return true;
            if (
              v.includes('関西') &&
              ['大阪府', '京都府', '兵庫県', '奈良県', '和歌山県', '滋賀県', '三重県'].includes(
                prefName
              )
            )
              return true;
            return false;
          });
          if (isMatch) matchedCount++;
        }
        break;
      }

      // 他の条件も追加可能
    }
  }

  if (totalChecked === 0) return 0;
  return Math.round((matchedCount / totalChecked) * 100);
}

// GET /api/black/users/[id]/candidates - マッチング候補者一覧取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // ソースユーザー取得
    const sourceUser = await prisma.user.findUnique({
      where: { id: BigInt(id) },
      include: {
        preferences: {
          include: {
            preferenceType: true,
          },
        },
      },
    });

    if (!sourceUser) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    // 異性のユーザーを検索
    const targetGender = sourceUser.gender === 1 ? 2 : 1;

    const where: Record<string, unknown> = {
      gender: targetGender,
      currentStatus: 'approved',
      deletedAt: null,
      id: { not: BigInt(id) }, // 自分自身を除外
    };

    // 検索条件
    if (q) {
      where.OR = [
        { lastName: { contains: q } },
        { firstName: { contains: q } },
        { email: { contains: q } },
        { bdUserId: isNaN(parseInt(q)) ? undefined : BigInt(q) },
      ].filter((condition) => {
        const values = Object.values(condition);
        return values.every((v) => v !== undefined);
      });
    }

    // 追加フィルター
    const prefectureId = searchParams.get('prefectureId');
    const occupationId = searchParams.get('occupationId');
    const ageMin = searchParams.get('ageMin');
    const ageMax = searchParams.get('ageMax');

    if (prefectureId) {
      where.prefectureId = parseInt(prefectureId);
    }
    if (occupationId) {
      where.occupationId = parseInt(occupationId);
    }

    // 年齢フィルター
    if (ageMin || ageMax) {
      const today = new Date();
      if (ageMax) {
        const minBirthday = new Date(
          today.getFullYear() - parseInt(ageMax) - 1,
          today.getMonth(),
          today.getDate()
        );
        where.birthday = { ...((where.birthday as object) || {}), gte: minBirthday };
      }
      if (ageMin) {
        const maxBirthday = new Date(
          today.getFullYear() - parseInt(ageMin),
          today.getMonth(),
          today.getDate()
        );
        where.birthday = { ...((where.birthday as object) || {}), lte: maxBirthday };
      }
    }

    const [candidates, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          occupation: true,
          prefecture: true,
          plan: true,
          userFiles: {
            where: {
              type: 'profile',
            },
            include: {
              file: true,
            },
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          },
        },
        orderBy: { score: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    // 各候補者との過去のマッチング履歴を取得
    const candidateIds = candidates.map((c) => c.id);
    const pastMatchings = await prisma.matching.findMany({
      where: {
        OR: [
          {
            maleUserId: BigInt(id),
            femaleUserId: { in: candidateIds },
          },
          {
            femaleUserId: BigInt(id),
            maleUserId: { in: candidateIds },
          },
        ],
      },
      include: {
        venue: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startAt: 'desc' },
    });

    // 候補者IDごとにマッチング履歴をグループ化
    const matchingsByCandidate: Record<string, typeof pastMatchings> = {};
    for (const matching of pastMatchings) {
      const candidateId =
        sourceUser.gender === 1 ? matching.femaleUserId.toString() : matching.maleUserId.toString();
      if (!matchingsByCandidate[candidateId]) {
        matchingsByCandidate[candidateId] = [];
      }
      matchingsByCandidate[candidateId].push(matching);
    }

    // ソースユーザーの希望条件を取得
    const sourcePreferences = sourceUser.preferences.map((p) => ({
      preferenceTypeCode: p.preferenceType.code,
      value: p.value,
    }));

    // 候補者に適合度スコアと過去マッチング履歴を付与
    const candidatesWithScore = candidates.map((candidate) => {
      const matchScore = calculateMatchScore(
        candidate as unknown as Record<string, unknown>,
        sourcePreferences
      );
      const candidateMatchings = matchingsByCandidate[candidate.id.toString()] || [];
      return {
        ...serializeUser(candidate as unknown as Record<string, unknown>),
        matchScore,
        pastMatchings: candidateMatchings.map((m) => ({
          id: m.id.toString(),
          startAt: m.startAt.toISOString(),
          endAt: m.endAt.toISOString(),
          currentStatus: m.currentStatus,
          venue: m.venue ? { id: m.venue.id.toString(), name: m.venue.name } : null,
        })),
        pastMatchingCount: candidateMatchings.length,
      };
    });

    // 適合度でソート（高い順）
    candidatesWithScore.sort((a, b) => (b.matchScore as number) - (a.matchScore as number));

    return NextResponse.json({
      candidates: candidatesWithScore,
      total,
      sourceUser: {
        id: sourceUser.id.toString(),
        lastName: sourceUser.lastName,
        firstName: sourceUser.firstName,
        gender: sourceUser.gender,
        preferences: sourcePreferences,
      },
    });
  } catch (error) {
    console.error('Get candidates error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
