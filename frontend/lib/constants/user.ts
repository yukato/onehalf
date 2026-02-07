// ユーザーステータスのマッピング
export const USER_STATUS = {
  pending: { code: 'pending', label: '審査中' },
  approved: { code: 'approved', label: '承認済' },
  withdrawn: { code: 'withdrawn', label: '退会済' },
  suspended: { code: 'suspended', label: '停止中' },
} as const;

export type UserStatusCode = keyof typeof USER_STATUS;

// 日本語ラベル → コード
export const STATUS_LABEL_TO_CODE: Record<string, UserStatusCode> = {
  審査中: 'pending',
  承認済: 'approved',
  退会済: 'withdrawn',
  停止中: 'suspended',
};

// コード → 日本語ラベル
export const STATUS_CODE_TO_LABEL: Record<UserStatusCode, string> = {
  pending: '審査中',
  approved: '承認済',
  withdrawn: '退会済',
  suspended: '停止中',
};

// 性別のマッピング
export const GENDER = {
  male: { code: 1, label: '男性' },
  female: { code: 2, label: '女性' },
} as const;

// 日本語ラベル → コード
export const GENDER_LABEL_TO_CODE: Record<string, number> = {
  男性: 1,
  女性: 2,
};

// コード → 日本語ラベル
export const GENDER_CODE_TO_LABEL: Record<number, string> = {
  1: '男性',
  2: '女性',
};
