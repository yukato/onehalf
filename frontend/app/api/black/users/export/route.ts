import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { GENDER_CODE_TO_LABEL, STATUS_CODE_TO_LABEL, UserStatusCode } from '@/lib/constants/user';

// 認証チェック
async function checkAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  return verifyAccessToken(token);
}

// GET /api/black/users/export - ユーザーCSVエクスポート
export async function GET(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'data'; // 'data' or 'template'

    // テンプレートの場合はサンプルデータを返す
    if (type === 'template') {
      const csvHeader =
        'bd_user_id,last_name,first_name,gender,email,mobile_number,birthday,occupation,prefecture,current_status,plan,plan_started_at,score';
      const csvSample =
        '12345,山田,太郎,男性,yamada@example.com,09012345678,1990-01-15,会社員,東京都,承認済,ゴールド,2024-01-01,75';
      const csvContent = `${csvHeader}\n${csvSample}`;

      // BOMを追加してExcelでの日本語文字化けを防ぐ
      const bom = '\uFEFF';

      return new NextResponse(bom + csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="users_template.csv"',
        },
      });
    }

    // 既存データのエクスポート
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      include: {
        occupation: true,
        plan: true,
        prefecture: true,
      },
      orderBy: { id: 'asc' },
    });

    // CSVヘッダー
    const csvHeader =
      'id,bd_user_id,last_name,first_name,gender,email,mobile_number,birthday,occupation,prefecture,current_status,plan,plan_started_at,score,imported_at,created_at';

    // CSVデータ行
    const csvRows = users.map((user) => {
      const formatDate = (date: Date | null) => (date ? date.toISOString().split('T')[0] : '');
      const escapeCSV = (value: string | null | undefined) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // 性別とステータスを日本語に変換
      const genderLabel = GENDER_CODE_TO_LABEL[user.gender] || '';
      const statusLabel =
        STATUS_CODE_TO_LABEL[user.currentStatus as UserStatusCode] || user.currentStatus;

      return [
        user.id.toString(),
        user.bdUserId.toString(),
        escapeCSV(user.lastName),
        escapeCSV(user.firstName),
        genderLabel,
        escapeCSV(user.email),
        escapeCSV(user.mobileNumber),
        formatDate(user.birthday),
        escapeCSV(user.occupation?.name),
        escapeCSV(user.prefecture?.name),
        statusLabel,
        escapeCSV(user.plan?.name),
        formatDate(user.planStartedAt),
        user.score,
        formatDate(user.importedAt),
        formatDate(user.createdAt),
      ].join(',');
    });

    const csvContent = [csvHeader, ...csvRows].join('\n');

    // BOMを追加してExcelでの日本語文字化けを防ぐ
    const bom = '\uFEFF';

    return new NextResponse(bom + csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="users_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export users error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
