import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DomainType = 'admin' | 'company';
type AuthAction = 'login' | 'refresh' | 'me' | 'logout';

interface MockUser {
  id: string;
  username: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Domain Cookie Names (本番認証と合わせる)
// ---------------------------------------------------------------------------

const DOMAIN_COOKIE_NAMES: Record<DomainType, string> = {
  admin: 'refresh_token',
  company: 'company_refresh_token',
};

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

function isDomainType(value: string): value is DomainType {
  return value === 'admin' || value === 'company';
}

function isAuthAction(value: string): value is AuthAction {
  return value === 'login' || value === 'refresh' || value === 'me' || value === 'logout';
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

function cookieKeys(domain: DomainType) {
  return {
    refreshToken: DOMAIN_COOKIE_NAMES[domain],
    userName: `mock_${domain}_user_name`,
    userEmail: `mock_${domain}_user_email`,
    ...(domain === 'company' ? { companySlug: `mock_${domain}_company_slug` } : {}),
  };
}

// ---------------------------------------------------------------------------
// Default users (シードユーザーに合わせる)
// ---------------------------------------------------------------------------

function getDefaultUser(domain: DomainType): MockUser {
  if (domain === 'company') {
    return { id: '1', username: 'admin', email: 'admin@yagichu.com' };
  }
  return { id: '1', username: 'admin', email: 'm.yukato@gmail.com' };
}

function getDefaultCompanySlug(): string {
  return 'yagichu';
}

// ---------------------------------------------------------------------------
// Read current mock user from cookies
// ---------------------------------------------------------------------------

function getCurrentMockUser(
  domain: DomainType,
  store: Awaited<ReturnType<typeof cookies>>,
): MockUser {
  const keys = cookieKeys(domain);
  const fallback = getDefaultUser(domain);
  return {
    id: fallback.id,
    username: store.get(keys.userName)?.value ?? fallback.username,
    email: store.get(keys.userEmail)?.value ?? fallback.email,
  };
}

function getCurrentCompanySlug(
  store: Awaited<ReturnType<typeof cookies>>,
): string {
  return store.get('mock_company_company_slug')?.value ?? getDefaultCompanySlug();
}

// ---------------------------------------------------------------------------
// Error responses
// ---------------------------------------------------------------------------

function unauthorized(message = '未認証です') {
  return NextResponse.json({ message }, { status: 401 });
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

async function handleLogin(domain: DomainType, request: Request) {
  const body = await request.json().catch(() => ({} as { email?: string; password?: string }));
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

  // Build response body matching production shapes
  let responseBody: Record<string, unknown>;

  if (domain === 'company') {
    const companySlug = getDefaultCompanySlug();
    responseBody = {
      access_token: `mock-access-company-${Date.now()}`,
      token_type: 'bearer',
      companySlug,
      user: {
        id: fallback.id,
        username: userName,
        email,
        role: 'admin',
        company: {
          id: '1',
          name: '株式会社八木厨房機器製作所',
          slug: companySlug,
        },
      },
    };
  } else {
    responseBody = {
      access_token: `mock-access-admin-${Date.now()}`,
      token_type: 'bearer',
      user: {
        id: fallback.id,
        username: userName,
        email,
        role: 'super_admin',
      },
    };
  }

  const response = NextResponse.json(responseBody);

  // Set cookies
  const cookieOpts = {
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };

  response.cookies.set(keys.refreshToken, refreshToken, {
    ...cookieOpts,
    httpOnly: true,
  });
  response.cookies.set(keys.userName, userName, cookieOpts);
  response.cookies.set(keys.userEmail, email, cookieOpts);

  if (domain === 'company') {
    response.cookies.set('mock_company_company_slug', getDefaultCompanySlug(), cookieOpts);
  }

  return response;
}

// ---------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------

async function handleRefresh(domain: DomainType) {
  const keys = cookieKeys(domain);
  const store = await cookies();
  const refreshToken = store.get(keys.refreshToken)?.value;

  if (!refreshToken) {
    return unauthorized('セッションが存在しません');
  }

  return NextResponse.json({
    access_token: `mock-access-${domain}-${Date.now()}`,
    token_type: 'bearer',
  });
}

// ---------------------------------------------------------------------------
// Me
// ---------------------------------------------------------------------------

async function handleMe(domain: DomainType) {
  const keys = cookieKeys(domain);
  const store = await cookies();
  const refreshToken = store.get(keys.refreshToken)?.value;

  if (!refreshToken) {
    return unauthorized('セッションが失効しました');
  }

  const mockUser = getCurrentMockUser(domain, store);
  const now = new Date().toISOString();

  if (domain === 'company') {
    const companySlug = getCurrentCompanySlug(store);
    return NextResponse.json({
      user: {
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        role: 'admin',
        isActive: true,
        createdAt: now,
        lastLogin: now,
        company: {
          id: '1',
          name: '株式会社八木厨房機器製作所',
          slug: companySlug,
        },
      },
    });
  }

  return NextResponse.json({
    user: {
      id: mockUser.id,
      username: mockUser.username,
      email: mockUser.email,
      role: 'super_admin',
      isActive: true,
      createdAt: now,
      lastLogin: now,
    },
  });
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

async function handleLogout(domain: DomainType) {
  const keys = cookieKeys(domain);
  const expiredOpts = { expires: new Date(0), path: '/' };

  const response = NextResponse.json({ ok: true });
  response.cookies.set(keys.refreshToken, '', { httpOnly: true, ...expiredOpts });
  response.cookies.set(keys.userName, '', expiredOpts);
  response.cookies.set(keys.userEmail, '', expiredOpts);

  if (domain === 'company') {
    response.cookies.set('mock_company_company_slug', '', expiredOpts);
  }

  return response;
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

async function dispatch(
  request: Request,
  params: Promise<{ domain: string; action: string }>,
) {
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

// ---------------------------------------------------------------------------
// Exports (Next.js 15 App Router)
// ---------------------------------------------------------------------------

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
