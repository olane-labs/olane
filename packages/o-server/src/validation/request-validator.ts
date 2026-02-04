import { z } from 'zod';
import { ValidationError } from './validation-error.js';

/**
 * Schema for POST /use endpoint
 * Validates the main node.use() request format
 */
export const useRequestSchema = z.object({
  address: z.string().min(1, 'address is required'),
  method: z.string().min(1, 'method is required'),
  params: z.any().optional(),
  id: z.string().optional(),
});

/**
 * Schema for POST /:address/:method endpoint
 * This endpoint accepts any body as params
 */
export const convenienceRequestSchema = z.any();

/**
 * Schema for POST /use/stream endpoint
 * Similar to useRequestSchema but without id
 */
export const streamRequestSchema = z.object({
  address: z.string().min(1, 'address is required'),
  method: z.string().min(1, 'method is required'),
  params: z.any().optional(),
});

/**
 * Validates request data against a Zod schema
 *
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @returns The validated and parsed data
 * @throws {ValidationError} If validation fails
 */
export function validateRequest<T>(data: unknown, schema: z.ZodSchema<T>): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format Zod errors into a readable message
      const message = error.errors
        .map((e) => {
          const path = e.path.join('.');
          return path ? `${path}: ${e.message}` : e.message;
        })
        .join(', ');

      throw new ValidationError(
        `Invalid request: ${message}`,
        'INVALID_PARAMS'
      );
    }
    // Re-throw non-Zod errors
    throw error;
  }
}
