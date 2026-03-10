import { z } from 'zod';
import { jsonRequestBody, jsonResponse, ErrorResponseSchema } from './common.mjs';

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
  user: z.object({
    id: z.string(),
    username: z.string(),
    email: z.string().email(),
    role: z.string(),
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
  }),
});

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

export const adminLoginContract = {
  path: '/api/admin/auth/login',
  method: 'post',
  operation: {
    operationId: 'adminLogin',
    summary: 'Admin login',
    description: 'Authenticate an admin user with email and password. Returns a JWT access token and sets a refresh token cookie.',
    tags: ['Admin Auth'],
    requestBody: jsonRequestBody(LoginRequestSchema, 'Login credentials'),
    responses: {
      200: jsonResponse(LoginResponseSchema, 'Login successful'),
      400: jsonResponse(ErrorResponseSchema, 'Missing email or password'),
      401: jsonResponse(ErrorResponseSchema, 'Invalid credentials'),
      500: jsonResponse(ErrorResponseSchema, 'Internal server error'),
    },
  },
};

export const adminMeContract = {
  path: '/api/admin/auth/me',
  method: 'get',
  operation: {
    operationId: 'adminMe',
    summary: 'Get current admin user',
    description: 'Returns the currently authenticated admin user profile. Requires Bearer token in Authorization header.',
    tags: ['Admin Auth'],
    security: [{ BearerAuth: [] }],
    responses: {
      200: jsonResponse(MeResponseSchema, 'Current user info'),
      401: jsonResponse(ErrorResponseSchema, 'Unauthorized'),
      500: jsonResponse(ErrorResponseSchema, 'Internal server error'),
    },
  },
};
