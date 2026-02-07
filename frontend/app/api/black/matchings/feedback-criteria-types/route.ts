import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { MatchingEvaluationCriteriaType } from '@/lib/generated/prisma';

// GET: 評価観点マスタの取得
export async function GET() {
  try {
    const criteriaTypes = await prisma.matchingEvaluationCriteriaType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // BigInt を文字列に変換
    const serializedCriteriaTypes = criteriaTypes.map((ct: MatchingEvaluationCriteriaType) => ({
      id: ct.id.toString(),
      code: ct.code,
      name: ct.name,
      description: ct.description,
      fieldType: ct.fieldType,
      options: ct.options,
      sortOrder: ct.sortOrder,
      isActive: ct.isActive,
    }));

    return NextResponse.json({ criteriaTypes: serializedCriteriaTypes });
  } catch (error) {
    console.error('Error fetching evaluation criteria types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evaluation criteria types' },
      { status: 500 }
    );
  }
}
