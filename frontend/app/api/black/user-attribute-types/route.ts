import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';

async function checkAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  return verifyAccessToken(token);
}

// GET /api/black/user-attribute-types - 属性タイプ一覧取得
export async function GET(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const attributeTypes = await prisma.userAttributeType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      attributeTypes: attributeTypes.map((at) => ({
        id: at.id.toString(),
        code: at.code,
        name: at.name,
        fieldType: at.fieldType,
        options: at.options,
        targetGender: at.targetGender,
        relatedPreferenceCode: at.relatedPreferenceCode,
        sortOrder: at.sortOrder,
        isActive: at.isActive,
        createdAt: at.createdAt.toISOString(),
        updatedAt: at.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Get user attribute types error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
