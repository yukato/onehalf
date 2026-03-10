import { z } from 'zod';

// ---------------------------------------------------------------------------
// Zod -> JSON Schema helper (zod v4 has built-in z.toJSONSchema())
// ---------------------------------------------------------------------------

export function zodToSchema(schema) {
  return z.toJSONSchema(schema, { target: 'openapi-3.1' });
}

// ---------------------------------------------------------------------------
// OpenAPI helper builders
// ---------------------------------------------------------------------------

/**
 * Build query parameters array from a zod object schema.
 * Each top-level key becomes a separate query parameter.
 */
export function buildQueryParameters(schema) {
  const jsonSchema = zodToSchema(schema);
  const required = jsonSchema.required ?? [];
  return Object.entries(jsonSchema.properties ?? {}).map(([name, propSchema]) => ({
    name,
    in: 'query',
    required: required.includes(name),
    schema: propSchema,
  }));
}

/**
 * Build a single path parameter.
 */
export function buildPathParameter(name, schema, description) {
  return {
    name,
    in: 'path',
    required: true,
    description,
    schema: zodToSchema(schema),
  };
}

/**
 * Build a JSON response object for a given status code.
 */
export function jsonResponse(schema, description = 'Successful response') {
  return {
    description,
    content: {
      'application/json': {
        schema: zodToSchema(schema),
      },
    },
  };
}

/**
 * Build a JSON request body.
 */
export function jsonRequestBody(schema, description = 'Request body') {
  return {
    required: true,
    description,
    content: {
      'application/json': {
        schema: zodToSchema(schema),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// onehalf domain status enums (mirrors types/index.ts)
// ---------------------------------------------------------------------------

export const OrderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'in_production',
  'ready',
  'partially_delivered',
  'delivered',
  'completed',
  'cancelled',
]);

export const OrderTypeSchema = z.enum([
  'general',
  'repair',
  'machine',
  'small_item',
]);

export const QuotationStatusSchema = z.enum([
  'draft',
  'sent',
  'approved',
  'rejected',
  'expired',
]);

export const InvoiceStatusSchema = z.enum([
  'draft',
  'issued',
  'sent',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
]);

export const DeliveryNoteStatusSchema = z.enum([
  'draft',
  'issued',
  'delivered',
  'confirmed',
]);

export const CustomerTypeSchema = z.enum([
  'customer',
  'supplier',
  'both',
]);

// ---------------------------------------------------------------------------
// Common reusable schemas
// ---------------------------------------------------------------------------

export const ErrorResponseSchema = z.object({
  detail: z.string(),
});
