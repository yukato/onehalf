import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { GENDER_LABEL_TO_CODE, STATUS_LABEL_TO_CODE, UserStatusCode } from '@/lib/constants/user';

// 認証チェック
async function checkAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  return verifyAccessToken(token);
}

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; bdUserId: string; error: string }[];
}

// POST /api/black/users/import - ユーザーCSVインポート
export async function POST(request: NextRequest) {
  try {
    const payload = await checkAuth(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ detail: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { detail: 'CSV file is empty or has no data rows' },
        { status: 400 }
      );
    }

    // ヘッダー行を解析
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const requiredFields = ['bd_user_id', 'last_name', 'first_name', 'gender', 'email'];
    const missingFields = requiredFields.filter((f) => !header.includes(f));

    if (missingFields.length > 0) {
      return NextResponse.json(
        { detail: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // マスターデータを取得
    const occupations = await prisma.occupation.findMany();
    const plans = await prisma.plan.findMany();
    const prefectures = await prisma.prefecture.findMany();

    const occupationMap = new Map(occupations.map((o) => [o.name.toLowerCase(), o.id]));
    const planMap = new Map(plans.map((p) => [p.name.toLowerCase(), p.id]));
    const prefectureMap = new Map(prefectures.map((p) => [p.name, p.id]));

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // データ行を処理
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};

      header.forEach((h, idx) => {
        row[h] = values[idx]?.trim() || '';
      });

      try {
        const bdUserId = BigInt(row['bd_user_id']);
        const lastName = row['last_name'];
        const firstName = row['first_name'];
        const email = row['email'];

        // 性別の変換（日本語 or 数値）
        let gender: number;
        const genderValue = row['gender'];
        if (GENDER_LABEL_TO_CODE[genderValue] !== undefined) {
          gender = GENDER_LABEL_TO_CODE[genderValue];
        } else {
          gender = parseInt(genderValue);
        }

        if (!lastName || !firstName || !email || isNaN(gender)) {
          throw new Error('Invalid required field values');
        }

        // 職業IDの解決（名前で検索）
        let occupationId: number | null = null;
        if (row['occupation']) {
          occupationId = occupationMap.get(row['occupation'].toLowerCase()) ?? null;
        }

        // プランIDの解決（名前で検索）
        let planId: number | null = null;
        if (row['plan']) {
          planId = planMap.get(row['plan'].toLowerCase()) ?? null;
        }

        // 都道府県IDの解決（名前で検索）
        let prefectureId: number | null = null;
        if (row['prefecture']) {
          prefectureId = prefectureMap.get(row['prefecture']) ?? null;
        }

        // ステータスの変換（日本語 → 英語コード）
        let currentStatus: UserStatusCode = 'pending';
        if (row['current_status']) {
          const statusValue = row['current_status'];
          if (STATUS_LABEL_TO_CODE[statusValue]) {
            currentStatus = STATUS_LABEL_TO_CODE[statusValue];
          } else if (['pending', 'approved', 'withdrawn', 'suspended'].includes(statusValue)) {
            currentStatus = statusValue as UserStatusCode;
          }
        }

        // upsert（存在すれば更新、なければ作成）
        await prisma.user.upsert({
          where: { bdUserId },
          update: {
            lastName,
            firstName,
            gender,
            email,
            mobileNumber: row['mobile_number'] || null,
            birthday: row['birthday'] ? new Date(row['birthday']) : null,
            occupationId,
            prefectureId,
            currentStatus,
            planId,
            planStartedAt: row['plan_started_at'] ? new Date(row['plan_started_at']) : null,
            score: row['score'] ? parseInt(row['score']) : 100,
          },
          create: {
            bdUserId,
            lastName,
            firstName,
            gender,
            email,
            mobileNumber: row['mobile_number'] || null,
            birthday: row['birthday'] ? new Date(row['birthday']) : null,
            occupationId,
            prefectureId,
            currentStatus,
            planId,
            planStartedAt: row['plan_started_at'] ? new Date(row['plan_started_at']) : null,
            score: row['score'] ? parseInt(row['score']) : 100,
          },
        });

        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: i + 1,
          bdUserId: row['bd_user_id'] || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Import users error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

// CSVの1行をパースする（カンマ区切り、ダブルクォート対応）
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip the next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current);
  return result;
}
