/**
 * Dangerous property names that should be removed to prevent prototype pollution
 */
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * Recursively sanitizes parameters by removing dangerous properties
 * that could lead to prototype pollution attacks
 *
 * Security features:
 * - Removes __proto__, constructor, and prototype properties
 * - Recursive traversal for nested objects
 * - Array handling
 * - Preserves safe nested structures
 *
 * @param params - The parameters to sanitize (can be any type)
 * @returns Sanitized copy of the parameters
 */
export function sanitizeParams(params: any): any {
  // Handle null and undefined
  if (params === null || params === undefined) {
    return params;
  }

  // Handle primitives (string, number, boolean)
  if (typeof params !== 'object') {
    return params;
  }

  // Handle arrays - recursively sanitize each element
  if (Array.isArray(params)) {
    return params.map((item) => sanitizeParams(item));
  }

  // Handle objects - create sanitized copy
  const sanitized: any = {};

  for (const key in params) {
    // Skip if not own property
    if (!Object.prototype.hasOwnProperty.call(params, key)) {
      continue;
    }

    // Skip dangerous keys (case-sensitive check)
    if (DANGEROUS_KEYS.includes(key)) {
      continue;
    }

    // Also check case-insensitive variants to be extra safe
    const lowerKey = key.toLowerCase();
    if (DANGEROUS_KEYS.some((dk) => dk.toLowerCase() === lowerKey)) {
      continue;
    }

    // Recursively sanitize the value
    sanitized[key] = sanitizeParams(params[key]);
  }

  return sanitized;
}
