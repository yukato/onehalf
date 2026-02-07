import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';

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
function serializeFeedback(feedback: Record<string, unknown>): Record<string, unknown> {
  const user = feedback.user as Record<string, unknown> | undefined;
  const adminUser = feedback.adminUser as Record<string, unknown> | undefined;

  return {
    ...feedback,
    id: feedback.id?.toString(),
    matchingId: feedback.matchingId?.toString(),
    userId: feedback.userId?.toString(),
    adminUserId: feedback.adminUserId?.toString(),
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
}

// GET /api/black/matchings/[id]/feedbacks - フィードバック一覧取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const feedbacks = await prisma.matchingFeedback.findMany({
      where: { matchingId: BigInt(id) },
      include: {
        user: {
          select: { id: true, lastName: true, firstName: true },
        },
        adminUser: {
          select: { id: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      feedbacks: feedbacks.map((f) => serializeFeedback(f as unknown as Record<string, unknown>)),
    });
  } catch (error) {
    console.error('Get feedbacks error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/black/matchings/[id]/feedbacks - フィードバック作成（評価観点も同時保存）
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    if (!data.userId) {
      return NextResponse.json({ detail: 'ユーザーを選択してください' }, { status: 400 });
    }

    if (!data.content?.trim()) {
      return NextResponse.json({ detail: 'フィードバック内容を入力してください' }, { status: 400 });
    }

    // マッチング確認
    const matching = await prisma.matching.findUnique({
      where: { id: BigInt(id) },
      include: {
        maleUser: { select: { id: true, lastName: true, firstName: true } },
        femaleUser: { select: { id: true, lastName: true, firstName: true } },
      },
    });

    if (!matching) {
      return NextResponse.json({ detail: 'Matching not found' }, { status: 404 });
    }

    // ユーザーがこのマッチングの参加者か確認
    const userId = BigInt(data.userId);
    const isMale = matching.maleUserId === userId;
    const isFemale = matching.femaleUserId === userId;

    if (!isMale && !isFemale) {
      return NextResponse.json(
        { detail: 'このマッチングに参加していないユーザーです' },
        { status: 400 }
      );
    }

    // トランザクションでフィードバック作成と評価更新
    const result = await prisma.$transaction(async (tx) => {
      // フィードバック（感想）作成
      const feedback = await tx.matchingFeedback.create({
        data: {
          matchingId: BigInt(id),
          userId: userId,
          adminUserId: BigInt(payload.sub),
          content: data.content.trim(),
        },
        include: {
          user: { select: { id: true, lastName: true, firstName: true } },
          adminUser: { select: { id: true, username: true } },
        },
      });

      // 評価観点が指定されていれば upsert で保存
      if (data.criteria && Array.isArray(data.criteria) && data.criteria.length > 0) {
        for (const c of data.criteria) {
          await tx.matchingEvaluationCriteria.upsert({
            where: {
              matchingId_userId_criteriaTypeId: {
                matchingId: BigInt(id),
                userId: userId,
                criteriaTypeId: BigInt(c.criteriaTypeId),
              },
            },
            create: {
              matchingId: BigInt(id),
              userId: userId,
              criteriaTypeId: BigInt(c.criteriaTypeId),
              value: c.value,
              createdByAdminId: BigInt(payload.sub),
              updatedByAdminId: BigInt(payload.sub),
            },
            update: {
              value: c.value,
              updatedByAdminId: BigInt(payload.sub),
            },
          });
        }
      }

      // 評価（総合評価）が指定されていれば更新
      if (data.rating !== undefined && data.rating !== null) {
        const updateData = isMale ? { maleRating: data.rating } : { femaleRating: data.rating };
        await tx.matching.update({
          where: { id: BigInt(id) },
          data: updateData,
        });

        // 評価変更のアクティビティログ
        const targetLabel = isMale ? '男性' : '女性';
        const oldRating = isMale ? matching.maleRating : matching.femaleRating;
        const oldRatingStr = oldRating !== null ? `${oldRating}` : '未評価';
        const newRatingStr = `${data.rating}`;

        await tx.matchingActivityLog.create({
          data: {
            matchingId: BigInt(id),
            adminUserId: BigInt(payload.sub),
            type: 'rating_change',
            content: `${targetLabel}評価を変更: ${oldRatingStr} → ${newRatingStr}`,
            metadata: {
              target: isMale ? 'male' : 'female',
              oldRating: oldRating,
              newRating: data.rating,
            },
          },
        });
      }

      // フィードバック追加のアクティビティログ
      const userName = isMale
        ? `${matching.maleUser.lastName} ${matching.maleUser.firstName}`
        : `${matching.femaleUser.lastName} ${matching.femaleUser.firstName}`;

      await tx.matchingActivityLog.create({
        data: {
          matchingId: BigInt(id),
          adminUserId: BigInt(payload.sub),
          type: 'comment',
          content: `${userName}さんのフィードバックを追加:\n${data.content.trim()}`,
          metadata: {
            feedbackId: feedback.id.toString(),
            userId: data.userId,
          },
        },
      });

      return feedback;
    });

    return NextResponse.json(serializeFeedback(result as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Create feedback error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
