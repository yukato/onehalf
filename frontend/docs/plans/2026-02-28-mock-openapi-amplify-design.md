# onehalf Mock駆動 + OpenAPI + Amplify 設計

**日付**: 2026-02-28
**参考**: ami11x プロジェクトの既存実装

## 背景

onehalfは現在Next.js APIルートでPrisma直接アクセスしているが、以下を実現したい:

1. **Amplify SSRデプロイ**: ブランチごとにプレビュー環境
2. **Mock駆動レビュー**: DB不要でUI完全動作 → ブランチPRレビュー可能
3. **OpenAPI生成**: MockのZodスキーマからAPI仕様書を自動生成 → バックエンド開発の契約書

## アーキテクチャ

- **アプローチ**: ami11x完全踏襲型
- **バックエンド**: Next.js APIルート（メイン）+ Python FastAPI（AI/RAG）の併存
- **Mock/本番切替**: `NEXT_PUBLIC_AUTH_MOCK=true` 環境変数

## Section 1: Amplify設定

`frontend/amplify.yml`:

```yaml
version: 1
applications:
  - appRoot: frontend
    frontend:
      phases:
        preBuild:
          commands:
            - nvm install 20
            - nvm use 20
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
          - .next/cache/**/*
```

- ブランチプレビュー: Amplifyコンソールで「ブランチ自動デプロイ」有効化
- 環境変数: `NEXT_PUBLIC_AUTH_MOCK=true` をブランチプレビューに設定
- `output: 'standalone'` はAmplify SSRと互換性あり

## Section 2: Mock認証システム

`app/mock-auth/[domain]/[action]/route.ts`

- ドメイン: `admin`, `company`
- アクション: `login`, `refresh`, `me`, `logout`
- Cookie管理: refreshToken, userName, userEmail
- `lib/api.ts` / `lib/company-api.ts` にMockモード判定追加
- `middleware.ts` にMock対応追加

## Section 3: Mockデータ層

```
lib/mock/
├── admin-companies.ts
├── admin-users.ts
├── company-dashboard.ts
├── company-orders.ts
├── company-quotations.ts
├── company-invoices.ts
├── company-delivery-notes.ts
├── company-documents.ts
├── company-masters.ts
├── shared-adapters.ts
└── index.ts
```

データフェッチ抽象化パターン:

```typescript
// lib/data/orders.ts
const IS_MOCK = process.env.NEXT_PUBLIC_AUTH_MOCK === 'true'
export async function getOrders(slug: string) {
  if (IS_MOCK) return mockCompanyOrders
  return prisma.order.findMany(...)
}
```

段階的対応: ダッシュボード → 発注管理 → その他ページ

## Section 4: OpenAPI生成

```
scripts/
├── generate-openapi.mjs
└── openapi/
    ├── build-openapi.mjs
    └── contracts/
        ├── index.mjs
        ├── common.mjs
        ├── admin-auth.mjs
        ├── company-auth.mjs
        ├── company-orders.mjs
        └── ...
```

- 出力: `public/openapi/openapi.json`
- GUI: `app/openapi/page.tsx` (Swagger UI)
- npm scripts: `openapi`, `openapi:check`

Python連携:
```
Zod Schema → openapi.json → Python FastAPI実装
```

## Section 5: CI/ワークフロー

開発フロー:
1. ブランチ作成
2. フロントエンド開発（Mockモード）
3. Zodスキーマでcontract定義
4. `npm run openapi` → openapi.json更新
5. PRプッシュ → Amplifyブランチプレビュー（Mockモード）
6. レビュアーがプレビューURLで動作確認
7. マージ後、openapi.jsonをバックエンドに共有

CIチェック:
- `npm run openapi:check`
- `npm run lint`
- `npm run test`
