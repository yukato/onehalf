import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './prisma';
import { hashPassword, verifyPassword } from './auth';
import { randomBytes } from 'crypto';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production'
);
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

export { hashPassword, verifyPassword };

export interface CompanyJWTPayload {
  sub: string;
  username: string;
  role: string;
  companyId: string;
  companySlug: string;
  type: 'company_access';
}

export async function createCompanyAccessToken(user: {
  id: string;
  username: string;
  role: string;
  companyId: string;
  companySlug: string;
}): Promise<string> {
  return new SignJWT({
    sub: user.id,
    username: user.username,
    role: user.role,
    companyId: user.companyId,
    companySlug: user.companySlug,
    type: 'company_access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function createCompanyRefreshToken(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const token = randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);

  await prisma.companySession.create({
    data: {
      userId: BigInt(userId),
      refreshToken: token,
      userAgent,
      ipAddress,
      expiresAt,
    },
  });

  return token;
}

export async function verifyCompanyAccessToken(token: string): Promise<CompanyJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== 'company_access') {
      return null;
    }
    return payload as unknown as CompanyJWTPayload;
  } catch {
    return null;
  }
}

export async function verifyCompanyRefreshToken(
  token: string
): Promise<{ userId: string; sessionId: string; companyId: string } | null> {
  const session = await prisma.companySession.findUnique({
    where: { refreshToken: token },
    include: {
      user: {
        include: { company: true },
      },
    },
  });

  if (
    !session ||
    session.expiresAt < new Date() ||
    !session.user.isActive ||
    !session.user.company.isActive
  ) {
    return null;
  }

  return {
    userId: session.userId.toString(),
    sessionId: session.id,
    companyId: session.user.companyId.toString(),
  };
}

export async function revokeCompanyRefreshToken(token: string): Promise<void> {
  await prisma.companySession.deleteMany({
    where: { refreshToken: token },
  });
}

export async function revokeAllCompanyUserSessions(userId: string): Promise<void> {
  await prisma.companySession.deleteMany({
    where: { userId: BigInt(userId) },
  });
}
