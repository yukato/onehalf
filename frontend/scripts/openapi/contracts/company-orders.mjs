import { z } from 'zod';
import {
  buildQueryParameters,
  jsonRequestBody,
  jsonResponse,
  ErrorResponseSchema,
  OrderStatusSchema,
  OrderTypeSchema,
} from './common.mjs';

// ---------------------------------------------------------------------------
// Shared sub-schemas
// ---------------------------------------------------------------------------

const CustomerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
});

const OrderItemSchema = z.object({
  id: z.string(),
  sortOrder: z.number(),
  productId: z.string().nullable(),
  productCode: z.string().nullable(),
  productName: z.string(),
  quantity: z.number(),
  deliveredQuantity: z.number(),
  unit: z.string(),
  unitPrice: z.number(),
  taxRate: z.number(),
  amount: z.number(),
  notes: z.string().nullable(),
});

const OrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  salesNumber: z.string().nullable(),
  customerId: z.string(),
  customer: CustomerSummarySchema,
  quotationId: z.string().nullable(),
  orderDate: z.string(),
  deliveryDate: z.string().nullable(),
  subtotal: z.number(),
  taxAmount: z.number(),
  totalAmount: z.number(),
  notes: z.string().nullable(),
  internalMemo: z.string().nullable(),
  status: z.string(),
  orderType: z.string(),
  customFields: z.record(z.string(), z.unknown()).nullable(),
  createdByName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const OrderWithItemsSchema = OrderSchema.extend({
  items: z.array(OrderItemSchema),
});

// ---------------------------------------------------------------------------
// Query parameters
// ---------------------------------------------------------------------------

const ListOrdersQuerySchema = z.object({
  customerId: z.string().optional(),
  status: OrderStatusSchema.optional(),
  orderType: OrderTypeSchema.optional(),
  q: z.string().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
});

// ---------------------------------------------------------------------------
// Request / Response schemas
// ---------------------------------------------------------------------------

const ListOrdersResponseSchema = z.object({
  orders: z.array(OrderSchema),
  total: z.number().int(),
});

const CreateOrderItemInputSchema = z.object({
  productId: z.string().optional(),
  productCode: z.string().optional(),
  productName: z.string(),
  quantity: z.number(),
  unit: z.string().optional(),
  unitPrice: z.number(),
  taxRate: z.number().optional(),
  notes: z.string().optional(),
});

const CreateOrderRequestSchema = z.object({
  customerId: z.string(),
  quotationId: z.string().optional(),
  orderDate: z.string(),
  deliveryDate: z.string().optional(),
  notes: z.string().optional(),
  internalMemo: z.string().optional(),
  orderType: OrderTypeSchema.optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  items: z.array(CreateOrderItemInputSchema).min(1),
});

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

export const listOrdersContract = {
  path: '/api/company/modules/orders',
  method: 'get',
  operation: {
    operationId: 'listOrders',
    summary: 'List orders',
    description:
      'Retrieve a paginated list of orders for the authenticated company. Supports filtering by customer, status, order type, and free-text search.',
    tags: ['Company Orders'],
    security: [{ BearerAuth: [] }],
    parameters: buildQueryParameters(ListOrdersQuerySchema),
    responses: {
      200: jsonResponse(ListOrdersResponseSchema, 'Paginated order list'),
      401: jsonResponse(ErrorResponseSchema, 'Unauthorized'),
      500: jsonResponse(ErrorResponseSchema, 'Internal server error'),
    },
  },
};

export const createOrderContract = {
  path: '/api/company/modules/orders',
  method: 'post',
  operation: {
    operationId: 'createOrder',
    summary: 'Create an order',
    description:
      'Create a new order for the authenticated company. Order number and sales number are generated automatically. Amounts are calculated from items.',
    tags: ['Company Orders'],
    security: [{ BearerAuth: [] }],
    requestBody: jsonRequestBody(CreateOrderRequestSchema, 'Order data with line items'),
    responses: {
      201: jsonResponse(OrderWithItemsSchema, 'Order created'),
      400: jsonResponse(ErrorResponseSchema, 'Validation error'),
      401: jsonResponse(ErrorResponseSchema, 'Unauthorized'),
      500: jsonResponse(ErrorResponseSchema, 'Internal server error'),
    },
  },
};
