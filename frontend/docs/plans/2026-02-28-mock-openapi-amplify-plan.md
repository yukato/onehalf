# onehalf Mock駆動 + OpenAPI + Amplify 実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** onehalfのフロントエンドをAmplifyデプロイ対応し、Mock駆動でDBなしレビュー可能にし、ZodスキーマからOpenAPIドキュメントを自動生成するワークフローを構築する

**Architecture:** ami11x完全踏襲型。環境変数 `NEXT_PUBLIC_AUTH_MOCK=true` でMock/本番を切替。Mock認証は `/mock-auth/[domain]/[action]` Route Handlerで処理。OpenAPIはZodスキーマ → JSONの自動生成パイプライン。

**Tech Stack:** Next.js 15 App Router, Zod 3, Amplify SSR, Swagger UI (swagger-ui-react)

**参考プロジェクト:** `/Users/yukato/PhpstormProjects/ami/ami11x/frontend/`

---

## Task 1: Amplify設定ファイル追加

**Files:**
- Create: `frontend/amplify.yml`

**Step 1: amplify.yml を作成**

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

**Step 2: .env.local.example にMock環境変数を追加**

既存の `.env.local.example`（もしくは新規作成）に以下を追記:

```env
# Mock認証モード（Amplifyブランチプレビューではtrue）
NEXT_PUBLIC_AUTH_MOCK=false
```

**Step 3: コミット**

```bash
git add frontend/amplify.yml
git commit -m "feat: Amplify SSRデプロイ設定追加"
```

---

## Task 2: Mock認証 Route Handler作成

**Files:**
- Create: `frontend/app/mock-auth/[domain]/[action]/route.ts`

**参考:** ami11x の `app/mock-auth/[domain]/[action]/route.ts`

**Step 1: Route Handler を作成**

onehalfのドメインは `admin` と `company` の2つ。ami11xのパターンをベースに、onehalfの認証フローに合わせて実装。

```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

type DomainType = 'admin' | 'company';
type AuthAction = 'login' | 'refresh' | 'me' | 'logout';

// onehalfの既存Cookie名に合わせる
const DOMAIN_COOKIE_NAMES: Record<DomainType, string> = {
  admin: 'refresh_token',
  company: 'company_refresh_token',
};

interface MockUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface MockCompanyUser extends MockUser {
  company: { id: string; name: string; slug: string };
}

function isDomainType(value: string): value is DomainType {
  return value === 'admin' || value === 'company';
}

function isAuthAction(value: string): value is AuthAction {
  return ['login', 'refresh', 'me', 'logout'].includes(value);
}

function cookieKeys(domain: DomainType) {
  return {
    refreshToken: DOMAIN_COOKIE_NAMES[domain],
    userName: `mock_${domain}_user_name`,
    userEmail: `mock_${domain}_user_email`,
    companySlug: `mock_${domain}_company_slug`,
  };
}

function getDefaultUser(domain: DomainType): MockUser {
  if (domain === 'company') {
    return { id: '1', username: 'yagichu_admin', email: 'admin@yagichu.com', role: 'admin' };
  }
  return { id: '1', username: 'yukato', email: 'm.yukato@gmail.com', role: 'super_admin' };
}

function unauthorized(message = '未認証です') {
  return NextResponse.json({ message }, { status: 401 });
}

async function handleLogin(domain: DomainType, request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, string>));
  const email = typeof body.email === 'string' ? body.email : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json(
      { message: 'メールアドレスとパスワードを入力してください' },
      { status: 400 },
    );
  }

  const keys = cookieKeys(domain);
  const fallback = getDefaultUser(domain);
  const userName = email.split('@')[0] || fallback.username;
  const refreshToken = `mock-refresh-${domain}-${Date.now()}`;

  const user: Record<string, unknown> = {
    id: fallback.id,
    username: userName,
    email,
    role: fallback.role,
  };

  const responseBody: Record<string, unknown> = {
    access_token: `mock-access-${domain}-${Date.now()}`,
    token_type: 'bearer',
    user,
  };

  // Company の場合は companySlug を追加
  if (domain === 'company') {
    const slug = body.companySlug || 'yagichu';
    responseBody.companySlug = slug;
    (user as Record<string, unknown>).company = {
      id: '1',
      name: '株式会社八木厨房機器製作所',
      slug,
    };
  }

  const cookieOptions = {
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };

  const response = NextResponse.json(responseBody);
  response.cookies.set(keys.refreshToken, refreshToken, { ...cookieOptions, httpOnly: true });
  response.cookies.set(keys.userName, userName, cookieOptions);
  response.cookies.set(keys.userEmail, email, cookieOptions);
  if (domain === 'company') {
    response.cookies.set(keys.companySlug, body.companySlug || 'yagichu', cookieOptions);
  }

  return response;
}

async function handleRefresh(domain: DomainType) {
  const keys = cookieKeys(domain);
  const store = await cookies();
  if (!store.get(keys.refreshToken)?.value) {
    return unauthorized('セッションが存在しません');
  }
  return NextResponse.json({
    access_token: `mock-access-${domain}-${Date.now()}`,
    token_type: 'bearer',
  });
}

async function handleMe(domain: DomainType) {
  const keys = cookieKeys(domain);
  const store = await cookies();
  if (!store.get(keys.refreshToken)?.value) {
    return unauthorized('セッションが失効しました');
  }

  const fallback = getDefaultUser(domain);
  const user: Record<string, unknown> = {
    id: fallback.id,
    username: store.get(keys.userName)?.value ?? fallback.username,
    email: store.get(keys.userEmail)?.value ?? fallback.email,
    role: fallback.role,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    lastLogin: new Date().toISOString(),
  };

  if (domain === 'company') {
    const slug = store.get(keys.companySlug)?.value ?? 'yagichu';
    (user as Record<string, unknown>).company = {
      id: '1',
      name: '株式会社八木厨房機器製作所',
      slug,
    };
  }

  return NextResponse.json({ user });
}

async function handleLogout(domain: DomainType) {
  const keys = cookieKeys(domain);
  const response = NextResponse.json({ success: true });
  const expiredOptions = { expires: new Date(0), path: '/' };
  response.cookies.set(keys.refreshToken, '', { httpOnly: true, ...expiredOptions });
  response.cookies.set(keys.userName, '', expiredOptions);
  response.cookies.set(keys.userEmail, '', expiredOptions);
  if (domain === 'company') {
    response.cookies.set(keys.companySlug, '', expiredOptions);
  }
  return response;
}

async function dispatch(request: Request, params: Promise<{ domain: string; action: string }>) {
  if (process.env.NEXT_PUBLIC_AUTH_MOCK !== 'true') {
    return NextResponse.json({ message: 'Not Found' }, { status: 404 });
  }

  const { domain: rawDomain, action: rawAction } = await params;
  if (!isDomainType(rawDomain) || !isAuthAction(rawAction)) {
    return NextResponse.json({ message: 'Not Found' }, { status: 404 });
  }

  if (request.method === 'POST' && rawAction === 'login') return handleLogin(rawDomain, request);
  if (request.method === 'POST' && rawAction === 'refresh') return handleRefresh(rawDomain);
  if (request.method === 'GET' && rawAction === 'me') return handleMe(rawDomain);
  if (request.method === 'POST' && rawAction === 'logout') return handleLogout(rawDomain);

  return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ domain: string; action: string }> },
) {
  return dispatch(request, context.params);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ domain: string; action: string }> },
) {
  return dispatch(request, context.params);
}
```

**Step 2: 動作確認**

```bash
NEXT_PUBLIC_AUTH_MOCK=true npm run dev
# 別ターミナルで:
curl -X POST http://localhost:3100/mock-auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"m.yukato@gmail.com","password":"12345678"}'
```

Expected: `{"access_token":"mock-access-admin-...","token_type":"bearer","user":{...}}`

**Step 3: コミット**

```bash
git add frontend/app/mock-auth/
git commit -m "feat: Mock認証Route Handler追加（admin/company対応）"
```

---

## Task 3: middleware.tsにMockモード対応追加

**Files:**
- Modify: `frontend/middleware.ts`

**Step 1: 現在のmiddleware.tsを読んで理解**

現在の実装はシンプル:
- `/admin/*` → `refresh_token` Cookie確認
- `/company/*` → `company_refresh_token` Cookie確認

**Step 2: Mock対応を追加**

変更点: Mockモード時は既存のCookie名と同じCookieを使うため（mock-authがそう設定する）、実質middleware側の変更は不要。ただし、`/mock-auth` パスをpublicルートとして許可する必要がある。

```typescript
// middleware.ts の matcher に mock-auth を除外に追加
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|api|mock-auth|.*\\..*).*)'],
};
```

**Step 3: 動作確認**

Mock認証でログインし、`/admin/*` にアクセスできることを確認。

**Step 4: コミット**

```bash
git add frontend/middleware.ts
git commit -m "feat: middlewareにmock-authパス除外追加"
```

---

## Task 4: APIクライアントにMockモード切替追加

**Files:**
- Modify: `frontend/lib/api.ts`
- Modify: `frontend/lib/company-api.ts`

**Step 1: lib/api.ts（AdminApiClient）にMock切替を追加**

`login()` メソッドの認証エンドポイントを環境変数で切替:

```typescript
// class ApiClient 内に追加
private get isMock(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_MOCK === 'true';
}

private getAuthEndpoint(action: string): string {
  if (this.isMock) return `/mock-auth/admin/${action}`;
  return `/api/admin/auth/${action}`;
}
```

以下のメソッドで `/api/admin/auth/*` のパスを `this.getAuthEndpoint()` に置換:
- `login()`: `/api/admin/auth/login` → `this.getAuthEndpoint('login')`
- `refresh()` (内部の `tryRefreshToken`): `/api/admin/auth/refresh` → `this.getAuthEndpoint('refresh')`
- `getMe()`: `/api/admin/auth/me` → `this.getAuthEndpoint('me')`
- `logout()`: `/api/admin/auth/logout` → `this.getAuthEndpoint('logout')`

**Step 2: lib/company-api.ts（CompanyApiClient）にMock切替を追加**

同様のパターン:

```typescript
private get isMock(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_MOCK === 'true';
}

private getAuthEndpoint(action: string): string {
  if (this.isMock) return `/mock-auth/company/${action}`;
  return `/api/company/auth/${action}`;
}
```

**Step 3: 動作確認**

```bash
NEXT_PUBLIC_AUTH_MOCK=true npm run dev
# ブラウザで /admin/login にアクセス、ログイン操作が成功するか確認
```

**Step 4: コミット**

```bash
git add frontend/lib/api.ts frontend/lib/company-api.ts
git commit -m "feat: APIクライアントにMock認証エンドポイント切替追加"
```

---

## Task 5: Mockデータ層の基盤作成

**Files:**
- Create: `frontend/lib/mock/index.ts`
- Create: `frontend/lib/mock/admin-companies.ts`
- Create: `frontend/lib/mock/company-dashboard.ts`
- Create: `frontend/lib/mock/company-orders.ts`

**Step 1: 既存の types/index.ts から主要な型を確認**

発注(Order)、企業(Company)、ダッシュボード関連の型を読み取り、それに準拠したMockデータを作成。

**Step 2: lib/mock/index.ts を作成**

```typescript
export * from './admin-companies';
export * from './company-dashboard';
export * from './company-orders';
```

**Step 3: lib/mock/admin-companies.ts を作成**

既存の prisma/seed.ts のデータを参考に、企業一覧のMockデータを作成。types/index.ts の Company 型に準拠。

**Step 4: lib/mock/company-dashboard.ts を作成**

ダッシュボード表示に必要なサマリーデータのMock。

**Step 5: lib/mock/company-orders.ts を作成**

発注一覧のMockデータ（5-10件）。

**Step 6: コミット**

```bash
git add frontend/lib/mock/
git commit -m "feat: Mockデータ基盤追加（企業一覧、ダッシュボード、発注）"
```

---

## Task 6: データフェッチ抽象化層の作成

**Files:**
- Create: `frontend/lib/data/index.ts`
- Create: `frontend/lib/data/dashboard.ts`
- Create: `frontend/lib/data/orders.ts`
- Modify: 該当するServer Component pages

**Step 1: lib/data/dashboard.ts を作成**

```typescript
import { prisma } from '@/lib/prisma';
import { mockDashboardData } from '@/lib/mock';

const IS_MOCK = process.env.NEXT_PUBLIC_AUTH_MOCK === 'true';

export async function getDashboardData(companySlug: string) {
  if (IS_MOCK) return mockDashboardData;

  // 既存のPrismaクエリをここに移動
  // ...
}
```

**Step 2: lib/data/orders.ts を作成**

同様のパターンで発注データのフェッチ関数を抽象化。

**Step 3: 該当ページでデータフェッチ関数を使用するように変更**

Server Component内で直接 `prisma.*` を呼んでいる箇所を `lib/data/*.ts` 経由に変更。
※ 全ページを一度にやる必要はない。主要ページから段階的に。

**Step 4: 動作確認**

```bash
# 本番モード（Prisma使用）
npm run dev
# Mockモード
NEXT_PUBLIC_AUTH_MOCK=true npm run dev
```

**Step 5: コミット**

```bash
git add frontend/lib/data/
git commit -m "feat: データフェッチ抽象化層追加（Mock/Prisma切替）"
```

---

## Task 7: OpenAPI生成パイプライン構築

**Files:**
- Create: `frontend/scripts/generate-openapi.mjs`
- Create: `frontend/scripts/openapi/build-openapi.mjs`
- Create: `frontend/scripts/openapi/contracts/common.mjs`
- Create: `frontend/scripts/openapi/contracts/index.mjs`

**参考:** ami11xの `scripts/openapi/` をそのまま移植、タイトル・サーバーURLを変更

**Step 1: scripts/openapi/build-openapi.mjs を作成**

ami11xからそのままコピー（汎用ビルダーのため変更不要）:

```javascript
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function buildOpenApiDocument({ title, version, description, serverUrl, contracts }) {
  const paths = {};
  for (const contract of contracts) {
    if (!paths[contract.path]) paths[contract.path] = {};
    paths[contract.path][contract.method] = contract.operation;
  }
  return {
    openapi: '3.1.0',
    info: { title, version, description },
    servers: [{ url: serverUrl }],
    paths,
  };
}

export function writeOpenApiDocument(outputPath, doc) {
  const outPath = resolve(process.cwd(), outputPath);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(doc, null, 2));
  return outPath;
}
```

**Step 2: scripts/openapi/contracts/common.mjs を作成**

onehalf固有のスキーマ定義（OrderStatus, QuotationStatus, InvoiceStatus 等）を追加:

```javascript
import { z } from 'zod';

// onehalf固有のステータス定義
export const OrderStatusSchema = z.enum(['draft', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled']);
export const QuotationStatusSchema = z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']);
export const InvoiceStatusSchema = z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']);
export const DeliveryNoteStatusSchema = z.enum(['draft', 'issued', 'delivered', 'confirmed']);

export const ErrorResponseSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export function zodToSchema(schema) {
  return z.toJSONSchema(schema, { reused: 'inline' });
}

export function buildQueryParameters(schema) {
  return Object.entries(schema.shape).map(([name, s]) => ({
    name, in: 'query', required: false, schema: zodToSchema(s),
  }));
}

export function buildPathParameter(name, schema, description = undefined) {
  return {
    name, in: 'path', required: true,
    ...(description ? { description } : {}),
    schema: zodToSchema(schema),
  };
}

export function jsonResponse(schema, description = 'Success') {
  return {
    description,
    content: { 'application/json': { schema: zodToSchema(schema) } },
  };
}
```

**Step 3: 最初の契約ファイルを作成（認証API）**

`scripts/openapi/contracts/admin-auth.mjs`:

```javascript
import { z } from 'zod';
import { ErrorResponseSchema, jsonResponse } from './common.mjs';

const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const LoginResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('bearer'),
  user: z.object({
    id: z.string(),
    username: z.string(),
    email: z.string().email(),
    role: z.enum(['super_admin', 'admin']),
  }),
});

const MeResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    username: z.string(),
    email: z.string().email(),
    role: z.string(),
    isActive: z.boolean(),
    createdAt: z.string(),
    lastLogin: z.string().nullable(),
  }),
});

export const adminLoginContract = {
  path: '/api/admin/auth/login',
  method: 'post',
  operation: {
    summary: 'Admin login',
    tags: ['AdminAuth'],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: zodToSchema(LoginRequestSchema) } },
    },
    responses: {
      '200': jsonResponse(LoginResponseSchema),
      '401': jsonResponse(ErrorResponseSchema, 'Invalid credentials'),
    },
  },
};

export const adminMeContract = {
  path: '/api/admin/auth/me',
  method: 'get',
  operation: {
    summary: 'Get current admin user',
    tags: ['AdminAuth'],
    responses: {
      '200': jsonResponse(MeResponseSchema),
      '401': jsonResponse(ErrorResponseSchema, 'Unauthorized'),
    },
  },
};
```

**Step 4: scripts/openapi/contracts/index.mjs を作成**

```javascript
import { adminLoginContract, adminMeContract } from './admin-auth.mjs';

export const openapiContracts = [
  adminLoginContract,
  adminMeContract,
  // 今後追加: companyAuth, orders, quotations, invoices, ...
];
```

**Step 5: scripts/generate-openapi.mjs を作成**

```javascript
import { openapiContracts } from './openapi/contracts/index.mjs';
import { buildOpenApiDocument, writeOpenApiDocument } from './openapi/build-openapi.mjs';

const doc = buildOpenApiDocument({
  title: 'onehalf API',
  version: '0.1.0',
  description: 'Generated from zod contracts in scripts/openapi/contracts',
  serverUrl: 'http://localhost:3100',
  contracts: openapiContracts,
});

const outPath = writeOpenApiDocument('public/openapi/openapi.json', doc);
console.log(`Generated: ${outPath}`);
```

**Step 6: 生成実行**

```bash
cd frontend && node scripts/generate-openapi.mjs
```

Expected: `Generated: /Users/yukato/.../frontend/public/openapi/openapi.json`

**Step 7: コミット**

```bash
git add frontend/scripts/openapi/ frontend/scripts/generate-openapi.mjs frontend/public/openapi/
git commit -m "feat: OpenAPI生成パイプライン構築（Zod契約 → JSON）"
```

---

## Task 8: npm scripts追加

**Files:**
- Modify: `frontend/package.json`

**Step 1: scripts セクションに追加**

```json
{
  "scripts": {
    "openapi": "node scripts/generate-openapi.mjs",
    "openapi:check": "npm run openapi && git diff --exit-code -- public/openapi/openapi.json"
  }
}
```

**Step 2: 動作確認**

```bash
npm run openapi
# → Generated: ...

npm run openapi:check
# → 差分なければ exit 0
```

**Step 3: コミット**

```bash
git add frontend/package.json
git commit -m "feat: OpenAPI生成 npm scripts追加"
```

---

## Task 9: Swagger UI表示ページ追加

**Files:**
- Create: `frontend/app/openapi/page.tsx`

**Step 1: swagger-ui-react をインストール**

```bash
cd frontend && npm install swagger-ui-react
npm install -D @types/swagger-ui-react
```

**Step 2: OpenAPI表示ページを作成**

```tsx
'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function OpenApiPage() {
  return (
    <div style={{ margin: '0 auto', maxWidth: 1200, padding: '2rem' }}>
      <SwaggerUI url="/openapi/openapi.json" />
    </div>
  );
}
```

**Step 3: 動作確認**

```bash
npm run dev
# ブラウザで http://localhost:3100/openapi にアクセス
```

Expected: Swagger UIが表示され、Admin Auth APIのドキュメントが閲覧可能。

**Step 4: middleware.tsでopenapipパスを認証除外に追加**

```typescript
// middleware.ts: publicルートに /openapi を追加
if (pathname === '/' || pathname === '/admin/login' || pathname === '/company/login' || pathname.startsWith('/openapi')) {
  return NextResponse.next();
}
```

**Step 5: コミット**

```bash
git add frontend/app/openapi/ frontend/middleware.ts frontend/package.json frontend/package-lock.json
git commit -m "feat: Swagger UI表示ページ追加（/openapi）"
```

---

## Task 10: 追加のOpenAPI契約定義（主要API）

**Files:**
- Create: `frontend/scripts/openapi/contracts/company-auth.mjs`
- Create: `frontend/scripts/openapi/contracts/company-orders.mjs`
- Create: `frontend/scripts/openapi/contracts/company-quotations.mjs`
- Modify: `frontend/scripts/openapi/contracts/index.mjs`

**Step 1: company-auth.mjs を作成**

Company認証APIの契約（login, me, refresh, logout）。

**Step 2: company-orders.mjs を作成**

発注API（一覧取得、作成、更新、削除）の契約。

**Step 3: company-quotations.mjs を作成**

見積API（一覧取得、作成、更新、削除）の契約。

**Step 4: index.mjs に追加**

全契約をエクスポート配列に追加。

**Step 5: OpenAPI再生成**

```bash
npm run openapi
```

**Step 6: コミット**

```bash
git add frontend/scripts/openapi/contracts/ frontend/public/openapi/
git commit -m "feat: 主要API（認証・発注・見積）のOpenAPI契約追加"
```

---

## Task 11: GitHub Actions CI設定

**Files:**
- Create: `.github/workflows/frontend-checks.yml`

**Step 1: CIワークフロー作成**

```yaml
name: Frontend Checks

on:
  pull_request:
    paths:
      - 'frontend/**'

jobs:
  checks:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --passWithNoTests
      - run: npm run openapi:check
```

**Step 2: コミット**

```bash
git add .github/workflows/frontend-checks.yml
git commit -m "ci: フロントエンドCI追加（lint + test + openapi:check）"
```

---

## 実装順序と依存関係

```
Task 1 (Amplify) ──────────────────────────────> 独立
Task 2 (Mock認証) ─┐
Task 3 (Middleware) ─┼─> Task 4 (APIクライアント) ─> Task 5 (Mockデータ) ─> Task 6 (データ抽象化)
Task 7 (OpenAPI基盤) ─> Task 8 (npm scripts) ─> Task 9 (Swagger UI) ─> Task 10 (追加契約)
Task 11 (CI) ──────────────────────────────────> Task 8の後
```

**並行実行可能:**
- Task 1 + Task 2 + Task 7 は独立して着手可能
- Task 5 + Task 8 は並行可能
- Task 9 + Task 10 は Task 8 完了後に並行可能

---

## 段階的展開メモ

上記タスクで基盤が完成した後、以下を段階的に追加:
- 追加Mockデータ: invoices, delivery-notes, documents, masters
- 追加OpenAPI契約: 全APIエンドポイント分
- 追加データ抽象化: 全Server Componentページ分
- Playwright E2Eテスト: `NEXT_PUBLIC_AUTH_MOCK=true` で実行
