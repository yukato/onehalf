import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { getFileUrl } from '@/lib/s3';
import type { Prisma } from '@/lib/generated/prisma';

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
    const maleUserFiles = maleUser.userFiles as
      | Array<{ file: { path: string }; isPrimary: boolean }>
      | undefined;
    let maleProfileImageUrl: string | null = null;
    let maleProfileImages: string[] = [];
    if (maleUserFiles && maleUserFiles.length > 0) {
      const primaryFile = maleUserFiles.find((f) => f.isPrimary) || maleUserFiles[0];
      maleProfileImageUrl = getFileUrl(primaryFile.file.path);
      maleProfileImages = maleUserFiles.map((f) => getFileUrl(f.file.path));
    }
    const maleOccupation = maleUser.occupation as { id: number; name: string } | null;
    const malePrefecture = maleUser.prefecture as { id: number; name: string } | null;
    const malePlan = maleUser.plan as { id: number; name: string; code: string } | null;
    serialized.maleUser = {
      id: maleUser.id?.toString(),
      lastName: maleUser.lastName,
      firstName: maleUser.firstName,
      birthday: maleUser.birthday,
      currentStatus: maleUser.currentStatus,
      occupation: maleOccupation,
      prefecture: malePrefecture,
      plan: malePlan,
      profileImageUrl: maleProfileImageUrl,
      profileImages: maleProfileImages,
    };
  }
  if (matching.femaleUser && typeof matching.femaleUser === 'object') {
    const femaleUser = matching.femaleUser as Record<string, unknown>;
    const femaleUserFiles = femaleUser.userFiles as
      | Array<{ file: { path: string }; isPrimary: boolean }>
      | undefined;
    let femaleProfileImageUrl: string | null = null;
    let femaleProfileImages: string[] = [];
    if (femaleUserFiles && femaleUserFiles.length > 0) {
      const primaryFile = femaleUserFiles.find((f) => f.isPrimary) || femaleUserFiles[0];
      femaleProfileImageUrl = getFileUrl(primaryFile.file.path);
      femaleProfileImages = femaleUserFiles.map((f) => getFileUrl(f.file.path));
    }
    const femaleOccupation = femaleUser.occupation as { id: number; name: string } | null;
    const femalePrefecture = femaleUser.prefecture as { id: number; name: string } | null;
    const femalePlan = femaleUser.plan as { id: number; name: string; code: string } | null;
    serialized.femaleUser = {
      id: femaleUser.id?.toString(),
      lastName: femaleUser.lastName,
      firstName: femaleUser.firstName,
      birthday: femaleUser.birthday,
      currentStatus: femaleUser.currentStatus,
      occupation: femaleOccupation,
      prefecture: femalePrefecture,
      plan: femalePlan,
      profileImageUrl: femaleProfileImageUrl,
      profileImages: femaleProfileImages,
    };
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

  // feedbacksのシリアライズ
  if (matching.feedbacks && Array.isArray(matching.feedbacks)) {
    serialized.feedbacks = matching.feedbacks.map((fb: Record<string, unknown>) => {
      const user = fb.user as Record<string, unknown> | undefined;
      const adminUser = fb.adminUser as Record<string, unknown> | undefined;
      return {
        id: fb.id?.toString(),
        matchingId: fb.matchingId?.toString(),
        userId: fb.userId?.toString(),
        adminUserId: fb.adminUserId?.toString(),
        content: fb.content,
        createdAt: fb.createdAt,
        user: user
          ? {
              id: user.id?.toString(),
              lastName: user.lastName,
              firstName: user.firstName,
            }
          : null,
        adminUser: adminUser
          ? {
              id: adminUser.id?.toString(),
              username: adminUser.username,
            }
          : null,
      };
    });
  }

  return serialized;
}

// GET /api/black/matchings/[id] - マッチング詳細取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const matching = await prisma.matching.findUnique({
      where: { id: BigInt(id) },
      include: {
        maleUser: {
          select: {
            id: true,
            lastName: true,
            firstName: true,
            birthday: true,
            currentStatus: true,
            occupation: { select: { id: true, name: true } },
            prefecture: { select: { id: true, name: true } },
            plan: { select: { id: true, name: true, code: true } },
            userFiles: {
              where: { type: 'profile' },
              include: { file: true },
              orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            },
          },
        },
        femaleUser: {
          select: {
            id: true,
            lastName: true,
            firstName: true,
            birthday: true,
            currentStatus: true,
            occupation: { select: { id: true, name: true } },
            prefecture: { select: { id: true, name: true } },
            plan: { select: { id: true, name: true, code: true } },
            userFiles: {
              where: { type: 'profile' },
              include: { file: true },
              orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            },
          },
        },
        venue: true,
        arrangedByAdmin: {
          select: { id: true, username: true },
        },
        feedbacks: {
          include: {
            user: {
              select: { id: true, lastName: true, firstName: true },
            },
            adminUser: {
              select: { id: true, username: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!matching) {
      return NextResponse.json({ detail: 'Matching not found' }, { status: 404 });
    }

    return NextResponse.json(serializeMatching(matching as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Get matching error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// ステータスラベル
const STATUS_LABELS: Record<string, string> = {
  pending: '調整中',
  confirmed: '確定',
  completed: '完了',
  cancelled: 'キャンセル',
};

// 日時フォーマット（ログ用）
function formatDateTimeForLog(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${d} ${h}:${min}`;
}

// PUT /api/black/matchings/[id] - マッチング更新
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    // 既存確認（会場名も取得）
    const existing = await prisma.matching.findUnique({
      where: { id: BigInt(id) },
      include: {
        venue: { select: { name: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ detail: 'Matching not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const activityLogs: { type: string; content: string; metadata?: Prisma.InputJsonValue }[] = [];

    if (data.maleUserId !== undefined) {
      const maleUser = await prisma.user.findUnique({
        where: { id: BigInt(data.maleUserId) },
      });
      if (!maleUser || maleUser.gender !== 1) {
        return NextResponse.json({ detail: '無効な男性会員です' }, { status: 400 });
      }
      updateData.maleUserId = BigInt(data.maleUserId);
    }

    if (data.femaleUserId !== undefined) {
      const femaleUser = await prisma.user.findUnique({
        where: { id: BigInt(data.femaleUserId) },
      });
      if (!femaleUser || femaleUser.gender !== 2) {
        return NextResponse.json({ detail: '無効な女性会員です' }, { status: 400 });
      }
      updateData.femaleUserId = BigInt(data.femaleUserId);
    }

    // 日時変更の検出
    if (data.startAt !== undefined || data.endAt !== undefined) {
      const newStartAt = data.startAt ? new Date(data.startAt) : existing.startAt;
      const newEndAt = data.endAt ? new Date(data.endAt) : existing.endAt;

      const startChanged =
        data.startAt !== undefined && newStartAt.getTime() !== existing.startAt.getTime();
      const endChanged =
        data.endAt !== undefined && newEndAt.getTime() !== existing.endAt.getTime();

      if (startChanged || endChanged) {
        activityLogs.push({
          type: 'date_change',
          content: `日時を変更: ${formatDateTimeForLog(existing.startAt)} 〜 ${formatDateTimeForLog(existing.endAt)} → ${formatDateTimeForLog(newStartAt)} 〜 ${formatDateTimeForLog(newEndAt)}`,
          metadata: {
            oldStartAt: existing.startAt.toISOString(),
            oldEndAt: existing.endAt.toISOString(),
            newStartAt: newStartAt.toISOString(),
            newEndAt: newEndAt.toISOString(),
          },
        });
      }

      if (data.startAt !== undefined) updateData.startAt = newStartAt;
      if (data.endAt !== undefined) updateData.endAt = newEndAt;
    }

    // ステータス変更の検出
    if (data.currentStatus !== undefined && data.currentStatus !== existing.currentStatus) {
      const oldLabel = STATUS_LABELS[existing.currentStatus] || existing.currentStatus;
      const newLabel = STATUS_LABELS[data.currentStatus] || data.currentStatus;
      activityLogs.push({
        type: 'status_change',
        content: `ステータスを変更: ${oldLabel} → ${newLabel}`,
        metadata: {
          oldStatus: existing.currentStatus,
          newStatus: data.currentStatus,
        },
      });
      updateData.currentStatus = data.currentStatus;
    }

    // 会場変更の検出
    if (data.venueId !== undefined) {
      let newVenueName: string | null = null;

      if (data.venueId === null) {
        updateData.venueId = null;
      } else {
        const venue = await prisma.matchingVenue.findUnique({
          where: { id: BigInt(data.venueId) },
        });
        if (!venue) {
          return NextResponse.json({ detail: 'レストランが見つかりません' }, { status: 400 });
        }
        updateData.venueId = BigInt(data.venueId);
        newVenueName = venue.name;
      }

      const oldVenueId = existing.venueId?.toString() || null;
      const newVenueId = data.venueId?.toString() || null;

      if (oldVenueId !== newVenueId) {
        const oldVenueName = existing.venue?.name || '未設定';
        activityLogs.push({
          type: 'venue_change',
          content: `会場を変更: ${oldVenueName} → ${newVenueName || '未設定'}`,
          metadata: {
            oldVenueId: oldVenueId,
            oldVenueName: oldVenueName,
            newVenueId: newVenueId,
            newVenueName: newVenueName,
          },
        });
      }
    }

    // 評価変更の検出
    if (data.maleRating !== undefined && data.maleRating !== existing.maleRating) {
      const oldRating = existing.maleRating !== null ? `${existing.maleRating}` : '未評価';
      const newRating = data.maleRating !== null ? `${data.maleRating}` : '未評価';
      activityLogs.push({
        type: 'rating_change',
        content: `男性評価を変更: ${oldRating} → ${newRating}`,
        metadata: {
          target: 'male',
          oldRating: existing.maleRating,
          newRating: data.maleRating,
        },
      });
      updateData.maleRating = data.maleRating;
    }

    if (data.femaleRating !== undefined && data.femaleRating !== existing.femaleRating) {
      const oldRating = existing.femaleRating !== null ? `${existing.femaleRating}` : '未評価';
      const newRating = data.femaleRating !== null ? `${data.femaleRating}` : '未評価';
      activityLogs.push({
        type: 'rating_change',
        content: `女性評価を変更: ${oldRating} → ${newRating}`,
        metadata: {
          target: 'female',
          oldRating: existing.femaleRating,
          newRating: data.femaleRating,
        },
      });
      updateData.femaleRating = data.femaleRating;
    }

    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

    // トランザクションで更新とログ作成を実行
    const matching = await prisma.$transaction(async (tx) => {
      // マッチング更新
      const updated = await tx.matching.update({
        where: { id: BigInt(id) },
        data: updateData,
        include: {
          maleUser: {
            select: { id: true, lastName: true, firstName: true },
          },
          femaleUser: {
            select: { id: true, lastName: true, firstName: true },
          },
          venue: {
            select: { id: true, name: true, genre: true, city: true },
          },
          arrangedByAdmin: {
            select: { id: true, username: true },
          },
        },
      });

      // アクティビティログ作成
      if (activityLogs.length > 0) {
        await tx.matchingActivityLog.createMany({
          data: activityLogs.map((log) => ({
            matchingId: BigInt(id),
            adminUserId: BigInt(payload.sub),
            type: log.type,
            content: log.content,
            metadata: log.metadata ?? undefined,
          })),
        });
      }

      return updated;
    });

    return NextResponse.json(serializeMatching(matching as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Update matching error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/black/matchings/[id] - マッチング削除
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

    // 既存確認
    const existing = await prisma.matching.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existing) {
      return NextResponse.json({ detail: 'Matching not found' }, { status: 404 });
    }

    // フィードバックがある場合は先に削除
    await prisma.matchingFeedback.deleteMany({
      where: { matchingId: BigInt(id) },
    });

    await prisma.matching.delete({
      where: { id: BigInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete matching error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
