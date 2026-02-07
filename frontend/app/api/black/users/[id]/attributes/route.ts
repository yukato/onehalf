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

// GET /api/black/users/[id]/attributes - ユーザーの属性取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // ユーザー存在確認
    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
    });

    if (!user) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    const attributes = await prisma.userAttribute.findMany({
      where: { userId: BigInt(id) },
      include: {
        attributeType: true,
      },
    });

    return NextResponse.json({
      attributes: attributes.map((attr) => ({
        id: attr.id.toString(),
        userId: attr.userId.toString(),
        attributeTypeId: attr.attributeTypeId.toString(),
        attributeType: {
          id: attr.attributeType.id.toString(),
          code: attr.attributeType.code,
          name: attr.attributeType.name,
          fieldType: attr.attributeType.fieldType,
          options: attr.attributeType.options,
          targetGender: attr.attributeType.targetGender,
          relatedPreferenceCode: attr.attributeType.relatedPreferenceCode,
          sortOrder: attr.attributeType.sortOrder,
        },
        value: attr.value,
        createdAt: attr.createdAt.toISOString(),
        updatedAt: attr.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Get user attributes error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/black/users/[id]/attributes - ユーザーの属性保存
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { attributes } = await request.json();

    // ユーザー存在確認
    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
    });

    if (!user) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    // トランザクションで属性を更新
    await prisma.$transaction(async (tx) => {
      for (const attr of attributes) {
        const attributeType = await tx.userAttributeType.findUnique({
          where: { id: BigInt(attr.attributeTypeId) },
        });

        if (!attributeType) {
          throw new Error(`Attribute type ${attr.attributeTypeId} not found`);
        }

        await tx.userAttribute.upsert({
          where: {
            userId_attributeTypeId: {
              userId: BigInt(id),
              attributeTypeId: BigInt(attr.attributeTypeId),
            },
          },
          update: {
            value: attr.value,
          },
          create: {
            userId: BigInt(id),
            attributeTypeId: BigInt(attr.attributeTypeId),
            value: attr.value,
          },
        });
      }
    });

    // 更新後の属性を取得して返す
    const updatedAttributes = await prisma.userAttribute.findMany({
      where: { userId: BigInt(id) },
      include: {
        attributeType: true,
      },
    });

    return NextResponse.json({
      attributes: updatedAttributes.map((attr) => ({
        id: attr.id.toString(),
        userId: attr.userId.toString(),
        attributeTypeId: attr.attributeTypeId.toString(),
        attributeType: {
          id: attr.attributeType.id.toString(),
          code: attr.attributeType.code,
          name: attr.attributeType.name,
          fieldType: attr.attributeType.fieldType,
          options: attr.attributeType.options,
          targetGender: attr.attributeType.targetGender,
          relatedPreferenceCode: attr.attributeType.relatedPreferenceCode,
          sortOrder: attr.attributeType.sortOrder,
        },
        value: attr.value,
        createdAt: attr.createdAt.toISOString(),
        updatedAt: attr.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Save user attributes error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
