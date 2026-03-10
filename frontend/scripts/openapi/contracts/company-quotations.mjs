import { z } from 'zod';
import {
  buildQueryParameters,
  jsonRequestBody,
  jsonResponse,
  ErrorResponseSchema,
  QuotationStatusSchema,
} from './common.mjs';

// ---------------------------------------------------------------------------
// Shared sub-schemas
// ---------------------------------------------------------------------------

const CustomerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
});

const QuotationItemSchema = z.object({
  id: z.string(),
  sortOrder: z.number(),
  productId: z.string().nullable(),
  productCode: z.string().nullable(),
  productName: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unitPrice: z.number(),
  taxRate: z.number(),
  amount: z.number(),
  notes: z.string().nullable(),
});

const QuotationSchema = z.object({
  id: z.string(),
  quotationNumber: z.string(),
  customerId: z.string(),
  customer: CustomerSummarySchema,
  subject: z.string().nullable(),
  quotationDate: z.string(),
  validUntil: z.string().nullable(),
  subtotal: z.number(),
  taxAmount: z.number(),
  totalAmount: z.number(),
  notes: z.string().nullable(),
  internalMemo: z.string().nullable(),
  status: z.string(),
  createdByName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const QuotationWithItemsSchema = QuotationSchema.extend({
  items: z.array(QuotationItemSchema),
});

// ---------------------------------------------------------------------------
// Query parameters
// ---------------------------------------------------------------------------

const ListQuotationsQuerySchema = z.object({
  customerId: z.string().optional(),
  status: QuotationStatusSchema.optional(),
  q: z.string().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
});

// ---------------------------------------------------------------------------
// Request / Response schemas
// ---------------------------------------------------------------------------

const ListQuotationsResponseSchema = z.object({
  quotations: z.array(QuotationSchema),
  total: z.number().int(),
});

const CreateQuotationItemInputSchema = z.object({
  productId: z.string().optional(),
  productCode: z.string().optional(),
  productName: z.string(),
  quantity: z.number(),
  unit: z.string().optional(),
  unitPrice: z.number(),
  taxRate: z.number().optional(),
  notes: z.string().optional(),
});

const CreateQuotationRequestSchema = z.object({
  customerId: z.string(),
  subject: z.string().optional(),
  quotationDate: z.string(),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  internalMemo: z.string().optional(),
  items: z.array(CreateQuotationItemInputSchema).min(1),
});

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

export const listQuotationsContract = {
  path: '/api/company/modules/quotations',
  method: 'get',
  operation: {
    operationId: 'listQuotations',
    summary: 'List quotations',
    description:
      'Retrieve a paginated list of quotations for the authenticated company. Supports filtering by customer, status, and free-text search.',
    tags: ['Company Quotations'],
    security: [{ BearerAuth: [] }],
    parameters: buildQueryParameters(ListQuotationsQuerySchema),
    responses: {
      200: jsonResponse(ListQuotationsResponseSchema, 'Paginated quotation list'),
      401: jsonResponse(ErrorResponseSchema, 'Unauthorized'),
      500: jsonResponse(ErrorResponseSchema, 'Internal server error'),
    },
  },
};

export const createQuotationContract = {
  path: '/api/company/modules/quotations',
  method: 'post',
  operation: {
    operationId: 'createQuotation',
    summary: 'Create a quotation',
    description:
      'Create a new quotation for the authenticated company. Quotation number is generated automatically. Amounts are calculated from items.',
    tags: ['Company Quotations'],
    security: [{ BearerAuth: [] }],
    requestBody: jsonRequestBody(CreateQuotationRequestSchema, 'Quotation data with line items'),
    responses: {
      201: jsonResponse(QuotationWithItemsSchema, 'Quotation created'),
      400: jsonResponse(ErrorResponseSchema, 'Validation error'),
      401: jsonResponse(ErrorResponseSchema, 'Unauthorized'),
      500: jsonResponse(ErrorResponseSchema, 'Internal server error'),
    },
  },
};
