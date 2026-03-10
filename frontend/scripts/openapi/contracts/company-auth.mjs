import { z } from 'zod';
import { jsonRequestBody, jsonResponse, ErrorResponseSchema } from './common.mjs';

// ---------------------------------------------------------------------------
// Shared sub-schemas
// ---------------------------------------------------------------------------

const CompanyInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

// ---------------------------------------------------------------------------
// Request / Response schemas
// ---------------------------------------------------------------------------

const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const LoginResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('bearer'),
  companySlug: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    email: z.string().email(),
    role: z.string(),
    company: CompanyInfoSchema,
  }),
});

const MeResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    username: z.string(),
    email: z.string().email().nullable(),
    role: z.string(),
    isActive: z.boolean().optional(),
    createdAt: z.string().optional(),
    lastLogin: z.string().nullable().optional(),
    company: CompanyInfoSchema,
  }),
});

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

export const companyLoginContract = {
  path: '/api/company/auth/login',
  method: 'post',
  operation: {
    operationId: 'companyLogin',
    summary: 'Company user login',
    description:
      'Authenticate a company user with email and password. Returns a JWT access token, the company slug, user profile with company info, and sets a refresh token cookie.',
    tags: ['Company Auth'],
    requestBody: jsonRequestBody(LoginRequestSchema, 'Login credentials'),
    responses: {
      200: jsonResponse(LoginResponseSchema, 'Login successful'),
      400: jsonResponse(ErrorResponseSchema, 'Missing email or password'),
      401: jsonResponse(ErrorResponseSchema, 'Invalid credentials'),
      500: jsonResponse(ErrorResponseSchema, 'Internal server error'),
    },
  },
};

export const companyMeContract = {
  path: '/api/company/auth/me',
  method: 'get',
  operation: {
    operationId: 'companyMe',
    summary: 'Get current company user',
    description:
      'Returns the currently authenticated company user profile including company info. Requires Bearer token in Authorization header.',
    tags: ['Company Auth'],
    security: [{ BearerAuth: [] }],
    responses: {
      200: jsonResponse(MeResponseSchema, 'Current user info'),
      401: jsonResponse(ErrorResponseSchema, 'Unauthorized'),
      500: jsonResponse(ErrorResponseSchema, 'Internal server error'),
    },
  },
};
