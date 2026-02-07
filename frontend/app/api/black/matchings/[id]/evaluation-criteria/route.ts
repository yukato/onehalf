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
function serializeCriteria(criteria: Record<string, unknown>): Record<string, unknown> {
  const criteriaType = criteria.criteriaType as Record<string, unknown> | undefined;
  const createdByAdmin = criteria.createdByAdmin as Record<string, unknown> | undefined;
  const updatedByAdmin = criteria.updatedByAdmin as Record<string, unknown> | undefined;

  return {
    id: criteria.id?.toString(),
    matchingId: criteria.matchingId?.toString(),
    userId: criteria.userId?.toString(),
    criteriaTypeId: criteria.criteriaTypeId?.toString(),
    value: criteria.value,
    createdByAdminId: criteria.createdByAdminId?.toString(),
    updatedByAdminId: criteria.updatedByAdminId?.toString(),
    createdAt: criteria.createdAt,
    updatedAt: criteria.updatedAt,
    criteriaType: criteriaType
      ? {
          id: criteriaType.id?.toString(),
          code: criteriaType.code,
          name: criteriaType.name,
          description: criteriaType.description,
          fieldType: criteriaType.fieldType,
          options: criteriaType.options,
          sortOrder: criteriaType.sortOrder,
          isActive: criteriaType.isActive,
        }
      : null,
    createdByAdmin: createdByAdmin
      ? {
          id: createdByAdmin.id?.toString(),
          username: createdByAdmin.username,
        }
      : null,
    updatedByAdmin: updatedByAdmin
      ? {
          id: updatedByAdmin.id?.toString(),
          username: updatedByAdmin.username,
        }
      : null,
  };
}

// GET /api/black/matchings/[id]/evaluation-criteria - 評価観点一覧取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // クエリ条件
    const where: { matchingId: bigint; userId?: bigint } = {
      matchingId: BigInt(id),
    };
    if (userId) {
      where.userId = BigInt(userId);
    }

    const criteria = await prisma.matchingEvaluationCriteria.findMany({
      where,
      include: {
        criteriaType: true,
        createdByAdmin: {
          select: { id: true, username: true },
        },
        updatedByAdmin: {
          select: { id: true, username: true },
        },
      },
      orderBy: [{ userId: 'asc' }, { criteriaType: { sortOrder: 'asc' } }],
    });

    return NextResponse.json({
      criteria: criteria.map((c) => serializeCriteria(c as unknown as Record<string, unknown>)),
    });
  } catch (error) {
    console.error('Get evaluation criteria error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/black/matchings/[id]/evaluation-criteria - 評価観点保存（upsert）
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

    if (!data.criteria || !Array.isArray(data.criteria) || data.criteria.length === 0) {
      return NextResponse.json({ detail: '評価観点を入力してください' }, { status: 400 });
    }

    // マッチング確認
    const matching = await prisma.matching.findUnique({
      where: { id: BigInt(id) },
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

    // トランザクションで評価観点を upsert
    const results = await prisma.$transaction(async (tx) => {
      const savedCriteria = [];

      for (const c of data.criteria) {
        const criteria = await tx.matchingEvaluationCriteria.upsert({
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
          include: {
            criteriaType: true,
            createdByAdmin: {
              select: { id: true, username: true },
            },
            updatedByAdmin: {
              select: { id: true, username: true },
            },
          },
        });

        savedCriteria.push(criteria);
      }

      return savedCriteria;
    });

    return NextResponse.json({
      criteria: results.map((c) => serializeCriteria(c as unknown as Record<string, unknown>)),
    });
  } catch (error) {
    console.error('Save evaluation criteria error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
