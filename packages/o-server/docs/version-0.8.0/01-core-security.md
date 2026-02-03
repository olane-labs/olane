# Version 0.8.0 - Core Security Implementation Plan

**Date**: January 29, 2026
**Package**: @olane/o-server
**Phase**: Core Security (JWT + Input Validation)
**Target Version**: 0.8.0

---

## 1. Executive Summary

### Purpose of This Phase

Version 0.8.0 addresses **critical security vulnerabilities** identified in the security assessment that make o-server unsuitable for production deployment. This phase focuses on **foundational security controls** that can be implemented independently and in parallel.

**Scope**: This phase implements the essential security baseline for o-server as a REST-to-Olane bridge:
- JWT token verification middleware (clients handle OAuth, o-server validates tokens)
- Input validation and sanitization (address, method, params)
- Information disclosure prevention (secure error responses)
- Express CVE fixes (path traversal, open redirect)

**Out of Scope** (handled by Cloudflare or deferred):
- HTTPS/TLS termination (Cloudflare handles)
- Rate limiting (Cloudflare handles)
- DDoS protection (Cloudflare handles)
- OAuth provider implementation (clients handle)
- Session management (stateless design)
- RBAC/Authorization (deferred to v0.9.0)

### Key Security Improvements

| Security Control | Current State | Target State | Risk Reduction |
|-----------------|---------------|--------------|----------------|
| JWT Verification | None (optional auth) | Mandatory JWT validation | Critical → Low |
| Input Validation | None | Address/method/params validation | High → Low |
| Error Responses | Stack traces exposed | Sanitized error messages | Medium → Low |
| Express Version | 4.19.2 (2 CVEs) | 4.21.2 (CVEs fixed) | High → Low |

### Architecture Context

```
┌─────────────┐
│  Cloudflare │  → TLS termination
│             │  → Rate limiting
│             │  → DDoS protection
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────┐
│  o-server (v0.8.0)              │
│  ┌───────────────────────────┐  │
│  │ JWT Verification          │  │  ← NEW
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ Input Validation          │  │  ← NEW
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ Secure Error Handler      │  │  ← UPDATED
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ REST-to-Olane Bridge      │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
       │
       ↓
┌─────────────┐
│  Olane OS   │  → Node operations
│  Network    │  → Distributed tools
└─────────────┘
```

### Estimated Effort and Timeline

| Work Stream | Tasks | Hours | Can Parallelize |
|-------------|-------|-------|-----------------|
| Stream 1: JWT Middleware | Implementation + Tests | 12-16 | Yes |
| Stream 2: Input Validation | Implementation + Tests | 16-20 | Yes |
| Stream 3: Error Hardening | Implementation + Tests | 6-8 | Yes |
| Stream 4: Express Update | Update + Testing | 4-6 | Yes |
| Integration & Testing | Merge + E2E Tests | 8-12 | No (sequential) |

**Total Estimated Effort**: 46-62 hours (6-8 working days)
**With Parallel Development**: 2-3 working days (with 4 developers)
**Single Developer**: 6-8 working days

**Risk Assessment**:
- Low risk: Independent work streams with minimal dependencies
- Medium complexity: Well-defined scope, standard security patterns
- High value: Addresses 4 critical vulnerabilities

---

## 2. JWT Verification Implementation

### Overview

Implement mandatory JWT verification middleware to authenticate all incoming requests. This replaces the optional `authenticate` function with a robust, standard JWT implementation.

### Architecture

```typescript
Request Flow:
1. Client sends request with: Authorization: Bearer <JWT>
2. JWT Middleware extracts token
3. Verify signature (using public key or secret)
4. Validate claims (exp, iss, aud)
5. Attach user to req.user
6. Pass to route handlers
```

### Middleware Design

**File**: `src/middleware/jwt-auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JWTConfig {
  /** JWT verification method */
  method: 'secret' | 'publicKey';

  /** Secret key (for HMAC algorithms: HS256, HS384, HS512) */
  secret?: string;

  /** Public key (for RSA/ECDSA algorithms: RS256, ES256) */
  publicKey?: string;

  /** Expected issuer (iss claim) */
  issuer?: string | string[];

  /** Expected audience (aud claim) */
  audience?: string | string[];

  /** Allowed algorithms */
  algorithms?: jwt.Algorithm[];

  /** Clock tolerance in seconds (for exp/nbf validation) */
  clockTolerance?: number;
}

export interface JWTPayload {
  /** Subject (user ID) */
  sub: string;

  /** Issuer */
  iss?: string;

  /** Audience */
  aud?: string | string[];

  /** Expiration time (Unix timestamp) */
  exp: number;

  /** Not before time (Unix timestamp) */
  nbf?: number;

  /** Issued at (Unix timestamp) */
  iat?: number;

  /** Additional custom claims */
  [key: string]: any;
}

export function jwtAuthMiddleware(config: JWTConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authorization header required',
          },
        });
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN_FORMAT',
            message: 'Authorization header must be: Bearer <token>',
          },
        });
      }

      const token = parts[1];

      // 2. Verify token
      const verifyOptions: jwt.VerifyOptions = {
        algorithms: config.algorithms || ['RS256', 'HS256'],
        issuer: config.issuer,
        audience: config.audience,
        clockTolerance: config.clockTolerance || 0,
      };

      let payload: JWTPayload;
      if (config.method === 'secret') {
        if (!config.secret) {
          throw new Error('JWT secret not configured');
        }
        payload = jwt.verify(token, config.secret, verifyOptions) as JWTPayload;
      } else {
        if (!config.publicKey) {
          throw new Error('JWT public key not configured');
        }
        payload = jwt.verify(token, config.publicKey, verifyOptions) as JWTPayload;
      }

      // 3. Validate required claims
      if (!payload.sub) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Token missing required claim: sub',
          },
        });
      }

      // 4. Attach payload to request
      req.user = payload;

      next();
    } catch (error: any) {
      // Handle specific JWT errors
      let code = 'INVALID_TOKEN';
      let message = 'Token validation failed';

      if (error.name === 'TokenExpiredError') {
        code = 'TOKEN_EXPIRED';
        message = 'Token has expired';
      } else if (error.name === 'JsonWebTokenError') {
        code = 'INVALID_TOKEN';
        message = 'Invalid token';
      } else if (error.name === 'NotBeforeError') {
        code = 'TOKEN_NOT_ACTIVE';
        message = 'Token not yet valid';
      }

      res.status(401).json({
        success: false,
        error: { code, message },
      });
    }
  };
}
```

### Token Validation

**What to Validate**:
1. **Signature**: Cryptographic verification using secret or public key
2. **Expiration** (`exp`): Token must not be expired
3. **Not Before** (`nbf`): Token must be currently valid
4. **Issuer** (`iss`): Token must be from expected issuer(s)
5. **Audience** (`aud`): Token must be for expected audience(s)
6. **Required Claims** (`sub`): Subject (user ID) must be present

**Validation Flow**:
```
Token → Extract → Verify Signature → Check Expiration →
Validate Issuer → Validate Audience → Check Required Claims →
Attach to Request
```

### Configuration

**Environment Variables** (`.env`):
```bash
# JWT Configuration
JWT_METHOD=publicKey                    # 'secret' or 'publicKey'
JWT_SECRET=your-secret-key              # For HMAC (HS256)
JWT_PUBLIC_KEY=path/to/public-key.pem   # For RSA (RS256)
JWT_ISSUER=https://auth.example.com     # Expected issuer
JWT_AUDIENCE=https://api.example.com    # Expected audience
JWT_ALGORITHMS=RS256,RS384               # Allowed algorithms
JWT_CLOCK_TOLERANCE=5                   # Seconds tolerance for exp/nbf
```

**Server Config Interface** (`src/interfaces/server-config.interface.ts`):
```typescript
import { JWTConfig } from '../middleware/jwt-auth.js';

export interface ServerConfig {
  // ... existing fields ...

  /**
   * JWT authentication configuration (REQUIRED in production)
   * @deprecated authenticate - use jwtConfig instead
   */
  jwtConfig?: JWTConfig;

  /**
   * Legacy authentication function (deprecated)
   * Will be removed in v0.9.0
   */
  authenticate?: AuthenticateFunction;
}
```

**Integration** (`src/o-server.ts`):
```typescript
// Validation: Require JWT in production
if (process.env.NODE_ENV === 'production') {
  if (!config.jwtConfig) {
    throw new Error('jwtConfig is required in production mode');
  }
}

// Apply JWT middleware (if configured)
if (config.jwtConfig) {
  app.use(basePath, jwtAuthMiddleware(config.jwtConfig));
} else if (config.authenticate) {
  // Legacy support (deprecated)
  console.warn('DEPRECATION WARNING: authenticate function is deprecated. Use jwtConfig instead.');
  app.use(basePath, authMiddleware(config.authenticate));
}
```

### Error Handling

**JWT-Specific Errors**:
| Error Type | HTTP Status | Error Code | Message |
|-----------|-------------|------------|---------|
| Missing token | 401 | MISSING_TOKEN | Authorization header required |
| Invalid format | 401 | INVALID_TOKEN_FORMAT | Must be: Bearer <token> |
| Invalid signature | 401 | INVALID_TOKEN | Invalid token |
| Expired token | 401 | TOKEN_EXPIRED | Token has expired |
| Not yet valid | 401 | TOKEN_NOT_ACTIVE | Token not yet valid |
| Invalid issuer | 401 | INVALID_TOKEN | Token from invalid issuer |
| Invalid audience | 401 | INVALID_TOKEN | Token for invalid audience |
| Missing claims | 401 | INVALID_TOKEN | Token missing required claims |

**Error Response Format**:
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Token has expired"
  }
}
```

### Testing Requirements

**Unit Tests** (`src/tests/middleware/jwt-auth.test.ts`):

1. **Valid Token Tests**:
   - ✅ Should accept valid token with correct signature
   - ✅ Should attach payload to req.user
   - ✅ Should accept token with valid issuer
   - ✅ Should accept token with valid audience
   - ✅ Should accept token within expiration time

2. **Invalid Token Tests**:
   - ✅ Should reject missing Authorization header
   - ✅ Should reject invalid header format (not "Bearer <token>")
   - ✅ Should reject token with invalid signature
   - ✅ Should reject expired token
   - ✅ Should reject token from wrong issuer
   - ✅ Should reject token for wrong audience
   - ✅ Should reject token missing required claims (sub)

3. **Algorithm Tests**:
   - ✅ Should accept token signed with allowed algorithm (RS256)
   - ✅ Should reject token signed with disallowed algorithm (HS256 when only RS256 allowed)
   - ✅ Should accept token signed with HMAC secret (HS256)

4. **Clock Tolerance Tests**:
   - ✅ Should accept token within clock tolerance window
   - ✅ Should reject token outside clock tolerance

5. **Configuration Tests**:
   - ✅ Should throw error if secret not provided when method=secret
   - ✅ Should throw error if publicKey not provided when method=publicKey

**Integration Tests** (`src/tests/integration/jwt-flow.test.ts`):

1. **End-to-End Flow**:
   - ✅ Should authenticate request and call node.use()
   - ✅ Should reject request without token
   - ✅ Should pass user info to downstream handlers

2. **Multiple Issuers**:
   - ✅ Should accept tokens from multiple configured issuers

3. **Multiple Audiences**:
   - ✅ Should accept tokens for multiple configured audiences

**Test Utilities**:
```typescript
// src/tests/utils/jwt-test-helper.ts
import jwt from 'jsonwebtoken';

export function generateTestToken(payload: object, options: {
  secret?: string;
  privateKey?: string;
  expiresIn?: string | number;
  algorithm?: jwt.Algorithm;
}) {
  // Helper to generate test JWTs
}

export function generateExpiredToken() {
  // Helper to generate expired JWT
}

export function generateKeyPair() {
  // Helper to generate RSA key pair for tests
}
```

### Effort Estimate

| Task | Hours | Dependencies |
|------|-------|--------------|
| Implement JWT middleware | 4-5 | None |
| Add configuration interfaces | 1-2 | None |
| Integrate into o-server.ts | 2-3 | Middleware complete |
| Unit tests | 3-4 | Middleware complete |
| Integration tests | 2-3 | Integration complete |
| Documentation | 1-2 | All complete |

**Total: 12-16 hours**

**Parallelize Opportunity**: Can develop in parallel with other streams (no dependencies).

---

## 3. Input Validation & Sanitization

### Overview

Implement comprehensive input validation for all user-provided data (address, method, params) to prevent injection attacks, path traversal, and prototype pollution.

### Architecture

```
Request → Extract Input → Validate Address → Validate Method →
Validate Params → Sanitize → Pass to Handler
```

### Address Parameter Validation

**Threats**:
- Path traversal: `o://../../../admin`
- Protocol manipulation: `file://`, `http://`
- Special characters: null bytes, control characters
- Whitelist bypass attempts

**Validation Rules**:
```typescript
// src/validation/address-validator.ts

export interface AddressValidationConfig {
  /** Allowed address patterns (regex) */
  allowedPatterns?: RegExp[];

  /** Blocked address patterns (regex) */
  blockedPatterns?: RegExp[];

  /** Maximum address length */
  maxLength?: number;

  /** Require addresses to be in allowlist */
  requireAllowlist?: boolean;
}

export class AddressValidator {
  private config: AddressValidationConfig;

  constructor(config: AddressValidationConfig = {}) {
    this.config = {
      maxLength: 256,
      requireAllowlist: false,
      ...config,
    };
  }

  validate(addressStr: string): void {
    // 1. Check presence
    if (!addressStr || typeof addressStr !== 'string') {
      throw new ValidationError('Address is required and must be a string');
    }

    // 2. Check length
    if (addressStr.length > this.config.maxLength!) {
      throw new ValidationError(`Address exceeds maximum length of ${this.config.maxLength}`);
    }

    // 3. Check format - must start with o://
    if (!addressStr.startsWith('o://')) {
      throw new ValidationError('Address must start with o://');
    }

    // 4. Check for path traversal patterns
    if (addressStr.includes('..') || addressStr.includes('//')) {
      throw new ValidationError('Invalid address: path traversal detected');
    }

    // 5. Check for control characters and null bytes
    if (/[\x00-\x1F\x7F]/.test(addressStr)) {
      throw new ValidationError('Invalid address: control characters detected');
    }

    // 6. Check blocked patterns
    if (this.config.blockedPatterns) {
      for (const pattern of this.config.blockedPatterns) {
        if (pattern.test(addressStr)) {
          throw new ValidationError('Address matches blocked pattern');
        }
      }
    }

    // 7. Check allowlist (if required)
    if (this.config.requireAllowlist && this.config.allowedPatterns) {
      const isAllowed = this.config.allowedPatterns.some(pattern =>
        pattern.test(addressStr)
      );
      if (!isAllowed) {
        throw new ValidationError('Address not in allowlist');
      }
    }

    // 8. Validate oAddress construction
    try {
      new oAddress(addressStr);
    } catch (error) {
      throw new ValidationError('Invalid address format');
    }
  }
}

export class ValidationError extends Error {
  code = 'VALIDATION_ERROR';
  status = 400;
}
```

### Method Parameter Validation

**Threats**:
- Private method access: `_private_method`, `__internal`
- Prototype pollution: `__proto__`, `constructor`, `prototype`
- Special properties: `toString`, `valueOf`

**Validation Rules**:
```typescript
// src/validation/method-validator.ts

export interface MethodValidationConfig {
  /** Allowed method names (whitelist) */
  allowedMethods?: string[];

  /** Blocked method patterns */
  blockedPatterns?: RegExp[];

  /** Allow private methods (starting with _) */
  allowPrivateMethods?: boolean;

  /** Maximum method name length */
  maxLength?: number;
}

export class MethodValidator {
  private config: MethodValidationConfig;

  constructor(config: MethodValidationConfig = {}) {
    this.config = {
      allowPrivateMethods: false,
      maxLength: 128,
      ...config,
    };
  }

  validate(method: string): void {
    // 1. Check presence
    if (!method || typeof method !== 'string') {
      throw new ValidationError('Method is required and must be a string');
    }

    // 2. Check length
    if (method.length > this.config.maxLength!) {
      throw new ValidationError(`Method name exceeds maximum length of ${this.config.maxLength}`);
    }

    // 3. Prevent prototype pollution
    const dangerousProperties = ['__proto__', 'constructor', 'prototype'];
    if (dangerousProperties.includes(method)) {
      throw new ValidationError('Invalid method name');
    }

    // 4. Check for private methods
    if (!this.config.allowPrivateMethods && method.startsWith('_')) {
      throw new ValidationError('Cannot invoke private methods');
    }

    // 5. Validate characters (alphanumeric + underscore only)
    if (!/^[a-zA-Z0-9_]+$/.test(method)) {
      throw new ValidationError('Method name contains invalid characters');
    }

    // 6. Check blocked patterns
    if (this.config.blockedPatterns) {
      for (const pattern of this.config.blockedPatterns) {
        if (pattern.test(method)) {
          throw new ValidationError('Method matches blocked pattern');
        }
      }
    }

    // 7. Check whitelist (if provided)
    if (this.config.allowedMethods && this.config.allowedMethods.length > 0) {
      if (!this.config.allowedMethods.includes(method)) {
        throw new ValidationError('Method not in allowlist');
      }
    }
  }
}
```

### Request Body Validation

**Threats**:
- Prototype pollution via params object
- Excessive nesting depth
- Circular references
- Type confusion attacks

**Validation Approach**: Use Zod for schema validation

```typescript
// src/validation/request-validator.ts
import { z } from 'zod';

// Schema for /use endpoint
export const UseRequestSchema = z.object({
  address: z.string().min(1).max(256),
  method: z.string().min(1).max(128),
  params: z.record(z.any()).optional(),
  id: z.string().or(z.number()).optional(),
});

export type UseRequest = z.infer<typeof UseRequestSchema>;

// Validation function
export function validateUseRequest(body: unknown): UseRequest {
  try {
    return UseRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new ValidationError(`Validation failed: ${messages.join(', ')}`);
    }
    throw error;
  }
}

// Sanitize params to prevent prototype pollution
export function sanitizeParams(params: any): any {
  if (!params || typeof params !== 'object') {
    return params;
  }

  // Remove dangerous properties
  const dangerous = ['__proto__', 'constructor', 'prototype'];
  const sanitized = { ...params };

  for (const key of dangerous) {
    delete sanitized[key];
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (sanitized[key] && typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeParams(sanitized[key]);
    }
  }

  return sanitized;
}
```

### Implementation Approach

**File Structure**:
```
src/validation/
  ├── address-validator.ts       # Address validation
  ├── method-validator.ts        # Method validation
  ├── request-validator.ts       # Request schema validation
  └── validation-error.ts        # Custom error class
```

**Integration** (`src/o-server.ts`):
```typescript
import { AddressValidator } from './validation/address-validator.js';
import { MethodValidator } from './validation/method-validator.js';
import { validateUseRequest, sanitizeParams } from './validation/request-validator.js';

// Initialize validators
const addressValidator = new AddressValidator(config.addressValidation);
const methodValidator = new MethodValidator(config.methodValidation);

// Apply to /use endpoint
app.post(`${basePath}/use`, async (req: Request, res: Response, next) => {
  try {
    // 1. Validate request schema
    const validatedBody = validateUseRequest(req.body);

    // 2. Validate address
    addressValidator.validate(validatedBody.address);

    // 3. Validate method
    if (validatedBody.method) {
      methodValidator.validate(validatedBody.method);
    }

    // 4. Sanitize params
    const sanitizedParams = sanitizeParams(validatedBody.params);

    // 5. Create address and call node
    const address = new oAddress(validatedBody.address);
    const result = await node.use(address, {
      method: validatedBody.method,
      params: sanitizedParams,
      id: validatedBody.id,
    });

    res.json({ success: true, data: result.result });
  } catch (error: any) {
    handleOlaneError(error, next);
  }
});
```

### Testing Requirements

**Unit Tests**:

1. **Address Validation** (`src/tests/validation/address-validator.test.ts`):
   - ✅ Should accept valid o:// addresses
   - ✅ Should reject missing address
   - ✅ Should reject addresses without o:// prefix
   - ✅ Should reject path traversal patterns (.., //)
   - ✅ Should reject control characters
   - ✅ Should reject addresses exceeding max length
   - ✅ Should enforce allowlist when required
   - ✅ Should block addresses matching blocked patterns

2. **Method Validation** (`src/tests/validation/method-validator.test.ts`):
   - ✅ Should accept valid method names
   - ✅ Should reject missing method
   - ✅ Should reject private methods (unless allowed)
   - ✅ Should reject prototype pollution attempts (__proto__, constructor)
   - ✅ Should reject methods with invalid characters
   - ✅ Should reject methods exceeding max length
   - ✅ Should enforce method whitelist when provided

3. **Params Sanitization** (`src/tests/validation/request-validator.test.ts`):
   - ✅ Should sanitize __proto__ from params
   - ✅ Should sanitize constructor from params
   - ✅ Should recursively sanitize nested objects
   - ✅ Should preserve valid params
   - ✅ Should handle arrays in params
   - ✅ Should handle null/undefined params

4. **Schema Validation**:
   - ✅ Should validate valid request body
   - ✅ Should reject request with missing required fields
   - ✅ Should reject request with invalid types
   - ✅ Should validate optional fields

**Integration Tests**:

1. **Injection Attempts** (`src/tests/integration/security.test.ts`):
   - ✅ Should reject path traversal in address
   - ✅ Should reject prototype pollution in method
   - ✅ Should reject prototype pollution in params
   - ✅ Should reject private method invocation
   - ✅ Should accept valid requests after validation

### Effort Estimate

| Task | Hours | Dependencies |
|------|-------|--------------|
| Implement address validator | 3-4 | None |
| Implement method validator | 3-4 | None |
| Implement request schema validation | 3-4 | None |
| Implement params sanitization | 2-3 | None |
| Integrate into endpoints | 2-3 | Validators complete |
| Unit tests | 4-5 | Validators complete |
| Integration tests | 2-3 | Integration complete |
| Documentation | 1-2 | All complete |

**Total: 16-20 hours**

**Parallelize Opportunity**: Can develop in parallel with JWT stream.

---

## 4. Information Disclosure Prevention

### Overview

Remove stack traces and sensitive information from error responses to prevent information disclosure attacks.

### Current Issues

**Locations**:
1. `src/o-server.ts:207`: Stack trace attached to error details
2. `src/middleware/error-handler.ts:24`: Details exposed in development mode

**Evidence**:
```typescript
// o-server.ts:207
olaneError.details = error.details || error.stack;  // ❌ Stack trace

// error-handler.ts:24
details: process.env.NODE_ENV === 'development' ? err.details : undefined,
// ❌ Still exposes details in development
```

### Secure Error Responses

**Error Response Strategy**:

1. **Production Mode**:
   - Generic error messages only
   - No stack traces
   - No internal paths
   - No dependency versions
   - No detailed error info

2. **Development Mode**:
   - Detailed errors for debugging
   - Stack traces included
   - Additional context
   - Clear separation from production behavior

**Implementation**:

```typescript
// src/middleware/error-handler.ts (UPDATED)

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;  // Only in development
  };
}

export function errorHandler(
  err: OlaneError,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Determine status code
  const status = err.status || 500;

  // Sanitize error message
  const message = sanitizeErrorMessage(err.message, isDevelopment);

  // Build error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: message,
    },
  };

  // Add details ONLY in development
  if (isDevelopment && err.details) {
    errorResponse.error.details = err.details;
  }

  // Log error (but not to client)
  console.error('[o-server ERROR]', {
    code: err.code,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(status).json(errorResponse);
}

function sanitizeErrorMessage(message: string, isDevelopment: boolean): string {
  if (!isDevelopment) {
    // In production, return generic messages for certain error types
    const genericMessages: Record<string, string> = {
      'INTERNAL_ERROR': 'An internal error occurred',
      'UNAUTHORIZED': 'Authentication failed',
      'FORBIDDEN': 'Access denied',
      'NOT_FOUND': 'Resource not found',
    };

    // If message contains sensitive patterns, use generic message
    const sensitivePatterns = [
      /\bat\s+\w+\s+\([^)]+\)/,  // Stack trace pattern
      /Error:\s+[A-Z]{4,}/,      // Error codes
      /\/[a-zA-Z0-9_\-/.]+/,     // File paths
      /node_modules/,            // Dependency paths
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(message)) {
        return 'An error occurred';
      }
    }
  }

  return message;
}
```

**Update error creation** (`src/o-server.ts`):

```typescript
// src/o-server.ts (UPDATED)

// Remove stack trace attachment
function handleOlaneError(error: any, next: NextFunction) {
  const olaneError: OlaneError = error instanceof Error ? error : new Error(String(error));

  // Set error properties
  olaneError.code = error.code || 'INTERNAL_ERROR';
  olaneError.status = error.status || 500;

  // ❌ REMOVE THIS:
  // olaneError.details = error.details || error.stack;

  // ✅ ONLY attach details in development
  if (process.env.NODE_ENV === 'development') {
    olaneError.details = error.details || error.stack;
  }

  next(olaneError);
}
```

### Debug Mode

**Ensure debug mode is disabled in production**:

```typescript
// src/o-server.ts

export function oServer(config: ServerConfig): ServerInstance {
  // Validate production config
  if (process.env.NODE_ENV === 'production') {
    if (config.debug) {
      throw new Error('Debug mode must be disabled in production');
    }
  }

  // ... rest of server setup
}
```

### Secure Logging

**Prevent sensitive data in logs**:

```typescript
// src/utils/logger.ts (UPDATED)

export class ServerLogger {
  private debug: boolean;

  constructor(debug: boolean = false) {
    // Force disable debug in production
    this.debug = process.env.NODE_ENV === 'production' ? false : debug;

    if (process.env.NODE_ENV === 'production' && debug) {
      console.warn('[o-server] WARNING: Debug mode disabled in production');
    }
  }

  log(...args: any[]) {
    // Sanitize log output
    const sanitized = this.sanitizeLogArgs(args);
    console.log('[o-server]', ...sanitized);
  }

  debugLog(...args: any[]) {
    if (this.debug) {
      const sanitized = this.sanitizeLogArgs(args);
      console.log('[o-server DEBUG]', ...sanitized);
    }
  }

  private sanitizeLogArgs(args: any[]): any[] {
    return args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        return this.sanitizeObject(arg);
      }
      return arg;
    });
  }

  private sanitizeObject(obj: any): any {
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'apiKey',
      'authorization',
      'cookie',
    ];

    const sanitized = { ...obj };
    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    }
    return sanitized;
  }
}
```

### Testing Requirements

**Unit Tests**:

1. **Error Handler** (`src/tests/middleware/error-handler.test.ts`):
   - ✅ Should return generic error in production
   - ✅ Should include stack trace in development
   - ✅ Should sanitize error messages with sensitive patterns
   - ✅ Should not expose file paths in production
   - ✅ Should log errors without exposing to client

2. **Logger** (`src/tests/utils/logger.test.ts`):
   - ✅ Should disable debug mode in production
   - ✅ Should sanitize sensitive fields in logs
   - ✅ Should warn when debug mode forced off

**Integration Tests**:

1. **Error Responses** (`src/tests/integration/error-responses.test.ts`):
   - ✅ Should return safe error responses in production mode
   - ✅ Should not expose stack traces to clients
   - ✅ Should return different responses in dev vs prod

### Effort Estimate

| Task | Hours | Dependencies |
|------|-------|--------------|
| Update error handler | 2-3 | None |
| Implement message sanitization | 2-3 | None |
| Update logger | 1-2 | None |
| Remove stack trace attachments | 1 | None |
| Unit tests | 2-3 | Implementation complete |
| Integration tests | 1-2 | Integration complete |
| Documentation | 1 | All complete |

**Total: 6-8 hours**

**Parallelize Opportunity**: Can develop in parallel with JWT and validation streams.

---

## 5. Express CVE Fixes

### Overview

Update Express from 4.19.2 to 4.21.2 to address two security vulnerabilities.

### Current Version

**package.json**:
```json
"dependencies": {
  "express": "^4.19.2"
}
```

### Target Version

**Target**: `express@4.21.2`

### CVEs Addressed

#### CVE-2024-43796: Path Traversal (HIGH - CVSS 7.5)

**Description**: Path traversal vulnerability in `express.static()` middleware allows attackers to access files outside the intended directory.

**Impact**:
- Unauthorized file system access
- Exposure of sensitive files
- Potential for remote code execution (if attacker can access configuration files)

**Fixed in**: Express 4.20.0

**Mitigation**: Update to 4.21.2 (includes fix from 4.20.0)

**Note**: o-server does NOT use `express.static()`, so not directly vulnerable, but updating is still important for defense-in-depth.

#### CVE-2024-47764: Open Redirect (MEDIUM - CVSS 6.1)

**Description**: Open redirect vulnerability via malformed URLs allows attackers to redirect users to malicious sites.

**Impact**:
- Phishing attacks
- Malware distribution
- Session hijacking via redirect chains

**Fixed in**: Express 4.21.1

**Mitigation**: Update to 4.21.2 (includes fix from 4.21.1)

**Note**: o-server does NOT use redirects, but updating is still important.

### Migration Steps

**Step 1: Update package.json**

```json
{
  "dependencies": {
    "express": "^4.21.2"
  }
}
```

**Step 2: Install updated dependencies**

```bash
pnpm install
```

**Step 3: Check for breaking changes**

Express 4.x to 4.21.2 has no breaking changes. However, verify:

1. **Middleware behavior**: No changes in middleware execution order
2. **Error handling**: Error handler signature unchanged
3. **Request/Response API**: No changes to req/res objects
4. **TypeScript types**: Update `@types/express` to match

**Step 4: Update TypeScript types**

```json
{
  "devDependencies": {
    "@types/express": "^4.17.21"
  }
}
```

**Step 5: Run tests**

```bash
pnpm test
```

### Testing Requirements

**Regression Tests**:

1. **Basic Functionality** (`src/tests/integration/express-update.test.ts`):
   - ✅ POST /api/v1/use endpoint still works
   - ✅ POST /api/v1/:address/:method endpoint still works
   - ✅ GET /api/v1/health endpoint still works
   - ✅ Middleware chain executes correctly
   - ✅ Error handler catches errors

2. **Request/Response Objects**:
   - ✅ req.body parsed correctly
   - ✅ req.params extracted correctly
   - ✅ req.headers accessible
   - ✅ res.json() formats responses correctly
   - ✅ res.status() sets status codes

3. **Authentication Flow**:
   - ✅ JWT middleware executes before routes
   - ✅ Error responses formatted correctly

4. **CORS**:
   - ✅ CORS middleware still works
   - ✅ Preflight requests handled

**Security Tests**:

1. **CVE-2024-43796 (Path Traversal)**:
   - ✅ Verify express.static() not used (already true)
   - ✅ Document that o-server not vulnerable

2. **CVE-2024-47764 (Open Redirect)**:
   - ✅ Verify no redirect endpoints (already true)
   - ✅ Document that o-server not vulnerable

### Rollback Plan

If issues arise after update:

1. **Revert package.json**:
   ```json
   "express": "^4.19.2"
   ```

2. **Reinstall dependencies**:
   ```bash
   pnpm install
   ```

3. **Document issues** and investigate before re-attempting

### Effort Estimate

| Task | Hours | Dependencies |
|------|-------|--------------|
| Update package.json | 0.5 | None |
| Install and verify build | 0.5 | None |
| Run regression tests | 1-2 | None |
| Fix any issues (if needed) | 1-2 | Issues found |
| Update documentation | 0.5 | All complete |
| Security verification | 1 | All complete |

**Total: 4-6 hours**

**Parallelize Opportunity**: Can develop and test in parallel with other streams.

---

## 6. Parallel Development Strategy

### Git Worktree Approach

**Why Worktrees?**
- Work on multiple features simultaneously
- No branch switching (saves time)
- Independent build/test environments
- Merge conflicts detected early

**Setup**:

```bash
# From main working directory
cd /path/to/olane

# Create worktrees for each work stream
git worktree add ../olane-jwt feat/v0.8.0-jwt-auth
git worktree add ../olane-validation feat/v0.8.0-input-validation
git worktree add ../olane-errors feat/v0.8.0-error-hardening
git worktree add ../olane-express feat/v0.8.0-express-update

# List worktrees
git worktree list
```

**Directory Structure**:
```
/workspace/
  ├── olane/                    (main - integration branch)
  ├── olane-jwt/                (Stream 1 worktree)
  ├── olane-validation/         (Stream 2 worktree)
  ├── olane-errors/             (Stream 3 worktree)
  └── olane-express/            (Stream 4 worktree)
```

### Branch Naming

| Stream | Branch Name | Purpose |
|--------|------------|---------|
| Stream 1 | `feat/v0.8.0-jwt-auth` | JWT verification middleware |
| Stream 2 | `feat/v0.8.0-input-validation` | Address/method/params validation |
| Stream 3 | `feat/v0.8.0-error-hardening` | Secure error responses |
| Stream 4 | `feat/v0.8.0-express-update` | Express dependency update |
| Integration | `feat/v0.8.0-core-security` | Final integration branch |

### Work Streams

#### Stream 1: JWT Middleware (Independent)

**Files Modified**:
- `src/middleware/jwt-auth.ts` (NEW)
- `src/interfaces/server-config.interface.ts` (MODIFIED)
- `src/o-server.ts` (MODIFIED - add JWT middleware)
- `src/tests/middleware/jwt-auth.test.ts` (NEW)
- `src/tests/integration/jwt-flow.test.ts` (NEW)

**Dependencies**: None (fully independent)

**Developer**: Can work solo

**Timeline**: 12-16 hours

#### Stream 2: Input Validation (Independent)

**Files Modified**:
- `src/validation/address-validator.ts` (NEW)
- `src/validation/method-validator.ts` (NEW)
- `src/validation/request-validator.ts` (NEW)
- `src/validation/validation-error.ts` (NEW)
- `src/o-server.ts` (MODIFIED - add validation)
- `src/tests/validation/*.test.ts` (NEW)
- `src/tests/integration/security.test.ts` (NEW)

**Dependencies**: None (fully independent)

**Developer**: Can work solo

**Timeline**: 16-20 hours

#### Stream 3: Error Response Hardening (Minimal Dependencies)

**Files Modified**:
- `src/middleware/error-handler.ts` (MODIFIED)
- `src/utils/logger.ts` (MODIFIED)
- `src/o-server.ts` (MODIFIED - remove stack trace attachment)
- `src/tests/middleware/error-handler.test.ts` (MODIFIED)
- `src/tests/utils/logger.test.ts` (MODIFIED)

**Dependencies**: None (fully independent)

**Developer**: Can work solo

**Timeline**: 6-8 hours

#### Stream 4: Express Update (Independent)

**Files Modified**:
- `package.json` (MODIFIED - update express version)
- `src/tests/integration/express-update.test.ts` (NEW)

**Dependencies**: None (can test independently)

**Developer**: Can work solo

**Timeline**: 4-6 hours

### Merge Strategy

**Order of Merging**:

```
1. Stream 4 (Express Update)         → Integration Branch
   └─ Reason: Foundation, no conflicts expected

2. Stream 3 (Error Hardening)         → Integration Branch
   └─ Reason: Small changes, minimal conflicts

3. Stream 1 (JWT Middleware)          → Integration Branch
   └─ Reason: Middleware layer, may conflict with Stream 2

4. Stream 2 (Input Validation)        → Integration Branch
   └─ Reason: Largest changes, integrate last

5. Integration Testing                → Main
   └─ Run full E2E tests before merging to main
```

**Conflict Resolution**:

Most likely conflict point: `src/o-server.ts`

**Expected conflicts**:
- All streams modify `o-server.ts` to integrate their features
- Middleware registration order
- Error handling flow

**Resolution strategy**:
1. Merge in order (Express → Errors → JWT → Validation)
2. For each merge, resolve conflicts by:
   - Preserving middleware order: JWT → Validation
   - Chaining error handlers
   - Combining configuration interfaces

**Example conflict resolution** (`src/o-server.ts`):

```typescript
// After merging all streams, middleware order should be:

// 1. JSON body parser
app.use(express.json({ limit: '1mb' }));  // From Stream 2 (validation)

// 2. CORS
if (corsConfig) {
  app.use(cors(corsConfig));
}

// 3. JWT Authentication
if (config.jwtConfig) {
  app.use(basePath, jwtAuthMiddleware(config.jwtConfig));  // From Stream 1
}

// 4. Routes with validation
app.post(`${basePath}/use`, async (req, res, next) => {
  try {
    // Validation from Stream 2
    const validatedBody = validateUseRequest(req.body);
    addressValidator.validate(validatedBody.address);
    methodValidator.validate(validatedBody.method);

    // ... rest of handler
  } catch (error) {
    // Error handler from Stream 3
    handleOlaneError(error, next);
  }
});

// 5. Error handler (must be last)
app.use(errorHandler);  // From Stream 3
```

### Integration Points

**Point 1: Server Configuration Interface**

All streams add configuration options. Merge should combine:

```typescript
// Combined from all streams
export interface ServerConfig {
  // Existing
  node: oNode;
  port?: number;
  basePath?: string;
  cors?: CorsOptions;
  debug?: boolean;

  // Stream 1: JWT
  jwtConfig?: JWTConfig;

  // Stream 2: Validation
  addressValidation?: AddressValidationConfig;
  methodValidation?: MethodValidationConfig;

  // Stream 3: (no new config)
  // Stream 4: (no new config)
}
```

**Point 2: Middleware Chain**

Order matters:
1. Body parser (Stream 2)
2. CORS (existing)
3. JWT auth (Stream 1)
4. Routes with validation (Stream 2)
5. Error handler (Stream 3)

**Point 3: Error Handling**

Stream 3 updates error handler. Streams 1 & 2 throw errors. Ensure:
- All errors pass through updated error handler
- Error codes standardized
- Stack traces removed (Stream 3)

**Point 4: Testing**

Each stream has unit tests. Integration branch needs:
- Combined E2E tests
- Test all features together
- Test error paths with all middleware

---

## 7. Dependencies & Sequencing

### Independent Tasks (Can Run in Parallel)

```
┌─────────────────────┐
│ Stream 1: JWT       │  (12-16h)
└─────────────────────┘

┌─────────────────────┐
│ Stream 2: Validation│  (16-20h)
└─────────────────────┘

┌─────────────────────┐
│ Stream 3: Errors    │  (6-8h)
└─────────────────────┘

┌─────────────────────┐
│ Stream 4: Express   │  (4-6h)
└─────────────────────┘
```

**No blocking dependencies between streams.**

### Sequential Tasks (Must Be Sequential)

```
All Streams Complete
       ↓
Integration Branch
       ↓
Merge Stream 4 (Express)
       ↓
Merge Stream 3 (Errors)
       ↓
Merge Stream 1 (JWT)
       ↓
Merge Stream 2 (Validation)
       ↓
Resolve Conflicts
       ↓
Integration Testing (8-12h)
       ↓
Final E2E Tests
       ↓
Merge to Main
```

### Critical Path

**Longest Dependency Chain**:

```
Stream 2 (Input Validation): 16-20h
       ↓
Integration Testing: 8-12h
       ↓
TOTAL: 24-32h
```

**Critical Path**: Stream 2 (longest individual task) + Integration Testing

**Parallel Speedup**:
- With 4 developers: 20h (longest stream) + 12h (integration) = **32h** (~4 working days)
- With 1 developer: 46h (all streams) + 12h (integration) = **58h** (~7 working days)

### Integration Timeline

**With 4 Developers** (parallel):

```
Day 1-2: All 4 streams in progress
  Developer A: JWT middleware
  Developer B: Input validation
  Developer C: Error hardening
  Developer D: Express update

Day 2-3: Integration work
  All developers: Merge streams in order
  All developers: Resolve conflicts
  All developers: Integration testing

Day 4: Final testing and release
```

**With 1 Developer** (sequential):

```
Day 1-2: Stream 4 (Express, fastest) + Stream 3 (Errors)
Day 3-4: Stream 1 (JWT)
Day 5-6: Stream 2 (Validation, longest)
Day 7-8: Integration and testing
```

### Merge Dependencies

```
Stream 4 (Express)
  ↓ (no dependencies)
Stream 3 (Errors)
  ↓ (uses Stream 4)
Stream 1 (JWT)
  ↓ (uses Stream 3 error handler)
Stream 2 (Validation)
  ↓ (uses Stream 3 error handler)
Integration Testing
  ↓ (needs all streams)
Main Branch
```

---

## 8. Acceptance Criteria

### Security Tests Passing

**Required Test Scenarios**:

1. **JWT Authentication**:
   - ✅ Valid JWT token authenticates successfully
   - ✅ Invalid JWT token rejected (401)
   - ✅ Expired JWT token rejected (401)
   - ✅ Missing JWT token rejected (401)
   - ✅ JWT with wrong issuer rejected (401)
   - ✅ JWT with wrong audience rejected (401)
   - ✅ JWT signed with disallowed algorithm rejected (401)

2. **Input Validation**:
   - ✅ Valid address accepted
   - ✅ Path traversal in address rejected (400)
   - ✅ Invalid address format rejected (400)
   - ✅ Private method invocation blocked (400)
   - ✅ Prototype pollution in method rejected (400)
   - ✅ Prototype pollution in params sanitized
   - ✅ Valid requests with sanitized params succeed

3. **Error Responses**:
   - ✅ Production mode: No stack traces in responses
   - ✅ Production mode: Generic error messages
   - ✅ Development mode: Stack traces included
   - ✅ All errors return consistent format

4. **Express Update**:
   - ✅ All existing functionality works
   - ✅ No regressions introduced
   - ✅ Version is 4.21.2 or higher

### No Information Disclosure

**Verification Method**:

1. **Error Response Audit**:
   ```bash
   # Test error responses in production mode
   NODE_ENV=production npm test -- error-responses

   # Verify no stack traces
   grep -r "error.stack" dist/
   # Should return: 0 results
   ```

2. **Manual Testing**:
   ```bash
   # Trigger various errors and inspect responses
   # Should NOT contain:
   # - Stack traces
   # - File paths
   # - Module names
   # - Internal error details
   ```

3. **Automated Checks**:
   ```typescript
   // In tests
   expect(errorResponse.error).not.toHaveProperty('stack');
   expect(errorResponse.error).not.toHaveProperty('details');
   expect(errorResponse.error.message).not.toMatch(/at \w+ \(/);
   expect(errorResponse.error.message).not.toMatch(/node_modules/);
   ```

### JWT Validation Working

**Test Scenarios**:

1. **Valid Token Flow**:
   ```typescript
   // Generate valid token
   const token = jwt.sign({ sub: 'user123' }, secret, { expiresIn: '1h' });

   // Make request
   const response = await fetch('/api/v1/use', {
     headers: { Authorization: `Bearer ${token}` },
     method: 'POST',
     body: JSON.stringify({ address: 'o://test', method: 'ping' })
   });

   // Should succeed
   expect(response.status).toBe(200);
   expect(response.data.success).toBe(true);
   ```

2. **Invalid Token Flow**:
   ```typescript
   // Invalid signature
   const response = await fetch('/api/v1/use', {
     headers: { Authorization: `Bearer invalid-token` },
     // ...
   });

   expect(response.status).toBe(401);
   expect(response.data.error.code).toBe('INVALID_TOKEN');
   ```

3. **Token Expiration**:
   ```typescript
   // Expired token
   const token = jwt.sign({ sub: 'user123' }, secret, { expiresIn: '-1h' });

   const response = await fetch('/api/v1/use', {
     headers: { Authorization: `Bearer ${token}` },
     // ...
   });

   expect(response.status).toBe(401);
   expect(response.data.error.code).toBe('TOKEN_EXPIRED');
   ```

### Input Validation Complete

**Coverage Requirements**:

1. **Address Validation**: 100% coverage
   - All validation rules tested
   - All error cases covered
   - Integration with endpoints tested

2. **Method Validation**: 100% coverage
   - All validation rules tested
   - Private method blocking tested
   - Prototype pollution prevention tested

3. **Params Sanitization**: 100% coverage
   - All dangerous properties removed
   - Nested objects sanitized
   - Valid params preserved

**Verification**:
```bash
# Run coverage report
npm test -- --coverage

# Check coverage thresholds
# Address validator: 100%
# Method validator: 100%
# Request validator: 100%
```

### Express Updated

**Version Verification**:

```bash
# Check installed version
npm list express
# Should show: express@4.21.2 or higher

# Check package.json
grep '"express"' package.json
# Should show: "express": "^4.21.2"

# Verify no vulnerabilities
npm audit --production
# Should show: 0 vulnerabilities
```

**Regression Testing**:
```bash
# Run all tests
npm test

# All tests should pass
# No functionality should be broken
```

---

## 9. Implementation Checklist

### Stream 1: JWT Middleware (12-16 hours)

- [ ] **Create JWT middleware** (4-5h)
  - File: `src/middleware/jwt-auth.ts`
  - Implement token extraction
  - Implement signature verification
  - Implement claims validation
  - Handle JWT-specific errors
  - Dependencies: None
  - Stream: 1

- [ ] **Add JWT configuration interface** (1-2h)
  - File: `src/interfaces/server-config.interface.ts`
  - Add JWTConfig interface
  - Add JWTPayload interface
  - Update ServerConfig interface
  - Dependencies: None
  - Stream: 1

- [ ] **Integrate JWT middleware** (2-3h)
  - File: `src/o-server.ts`
  - Import and apply middleware
  - Add production validation
  - Add deprecation warning for old auth
  - Dependencies: JWT middleware complete
  - Stream: 1

- [ ] **JWT unit tests** (3-4h)
  - File: `src/tests/middleware/jwt-auth.test.ts`
  - Test valid tokens
  - Test invalid/expired/missing tokens
  - Test different algorithms
  - Test configuration errors
  - Dependencies: JWT middleware complete
  - Stream: 1

- [ ] **JWT integration tests** (2-3h)
  - File: `src/tests/integration/jwt-flow.test.ts`
  - Test end-to-end authentication flow
  - Test multiple issuers/audiences
  - Dependencies: Integration complete
  - Stream: 1

### Stream 2: Input Validation (16-20 hours)

- [ ] **Create address validator** (3-4h)
  - File: `src/validation/address-validator.ts`
  - Implement validation rules
  - Check format, path traversal, patterns
  - Dependencies: None
  - Stream: 2

- [ ] **Create method validator** (3-4h)
  - File: `src/validation/method-validator.ts`
  - Implement validation rules
  - Block private methods, prototype pollution
  - Dependencies: None
  - Stream: 2

- [ ] **Create request validator** (3-4h)
  - File: `src/validation/request-validator.ts`
  - Add Zod schemas
  - Implement params sanitization
  - Dependencies: None
  - Stream: 2

- [ ] **Create validation error class** (1h)
  - File: `src/validation/validation-error.ts`
  - Define ValidationError class
  - Dependencies: None
  - Stream: 2

- [ ] **Integrate validation** (2-3h)
  - File: `src/o-server.ts`
  - Apply validators to /use endpoint
  - Apply validators to /:address/:method endpoint
  - Dependencies: All validators complete
  - Stream: 2

- [ ] **Validation unit tests** (4-5h)
  - Files: `src/tests/validation/*.test.ts`
  - Test address validation
  - Test method validation
  - Test params sanitization
  - Dependencies: Validators complete
  - Stream: 2

- [ ] **Validation integration tests** (2-3h)
  - File: `src/tests/integration/security.test.ts`
  - Test injection attempts
  - Test valid requests after validation
  - Dependencies: Integration complete
  - Stream: 2

### Stream 3: Error Response Hardening (6-8 hours)

- [ ] **Update error handler** (2-3h)
  - File: `src/middleware/error-handler.ts`
  - Implement message sanitization
  - Remove details in production
  - Add secure error responses
  - Dependencies: None
  - Stream: 3

- [ ] **Update logger** (1-2h)
  - File: `src/utils/logger.ts`
  - Disable debug in production
  - Sanitize sensitive fields
  - Dependencies: None
  - Stream: 3

- [ ] **Remove stack trace attachment** (1h)
  - File: `src/o-server.ts`
  - Remove `error.stack` assignment
  - Only attach in development
  - Dependencies: None
  - Stream: 3

- [ ] **Error handler unit tests** (2-3h)
  - File: `src/tests/middleware/error-handler.test.ts`
  - Test production vs development responses
  - Test message sanitization
  - Dependencies: Error handler complete
  - Stream: 3

- [ ] **Logger unit tests** (1-2h)
  - File: `src/tests/utils/logger.test.ts`
  - Test debug mode enforcement
  - Test sensitive field sanitization
  - Dependencies: Logger complete
  - Stream: 3

- [ ] **Error response integration tests** (1-2h)
  - File: `src/tests/integration/error-responses.test.ts`
  - Test safe error responses end-to-end
  - Dependencies: Integration complete
  - Stream: 3

### Stream 4: Express Update (4-6 hours)

- [ ] **Update package.json** (0.5h)
  - File: `package.json`
  - Update express to ^4.21.2
  - Dependencies: None
  - Stream: 4

- [ ] **Install and verify build** (0.5h)
  - Run: `pnpm install`
  - Run: `pnpm build`
  - Verify no build errors
  - Dependencies: package.json updated
  - Stream: 4

- [ ] **Run regression tests** (1-2h)
  - Run all existing tests
  - Verify no failures
  - Dependencies: Install complete
  - Stream: 4

- [ ] **Create Express update tests** (1-2h)
  - File: `src/tests/integration/express-update.test.ts`
  - Test all endpoints still work
  - Test middleware chain
  - Dependencies: None
  - Stream: 4

- [ ] **Security verification** (1h)
  - Run: `npm audit`
  - Verify CVEs resolved
  - Document security improvements
  - Dependencies: Tests passing
  - Stream: 4

- [ ] **Update documentation** (0.5h)
  - Document Express version
  - Document CVEs fixed
  - Dependencies: All complete
  - Stream: 4

### Integration Phase (8-12 hours)

- [ ] **Create integration branch** (0.5h)
  - Branch: `feat/v0.8.0-core-security`
  - Dependencies: All streams ready
  - Sequential

- [ ] **Merge Stream 4 (Express)** (1h)
  - Merge feat/v0.8.0-express-update
  - Run tests
  - Dependencies: Integration branch created
  - Sequential

- [ ] **Merge Stream 3 (Errors)** (1-2h)
  - Merge feat/v0.8.0-error-hardening
  - Resolve conflicts in o-server.ts
  - Run tests
  - Dependencies: Stream 4 merged
  - Sequential

- [ ] **Merge Stream 1 (JWT)** (2-3h)
  - Merge feat/v0.8.0-jwt-auth
  - Resolve conflicts in o-server.ts
  - Verify middleware order
  - Run tests
  - Dependencies: Stream 3 merged
  - Sequential

- [ ] **Merge Stream 2 (Validation)** (2-3h)
  - Merge feat/v0.8.0-input-validation
  - Resolve conflicts in o-server.ts
  - Verify validation integration
  - Run tests
  - Dependencies: Stream 1 merged
  - Sequential

- [ ] **Full E2E testing** (3-4h)
  - Test all features together
  - Test error paths
  - Test security scenarios
  - Dependencies: All merges complete
  - Sequential

- [ ] **Final documentation** (1-2h)
  - Update README
  - Update CHANGELOG
  - Document breaking changes
  - Dependencies: All testing complete
  - Sequential

- [ ] **Merge to main** (0.5h)
  - Create PR: feat/v0.8.0-core-security → main
  - Review and approve
  - Merge to main
  - Dependencies: Final docs complete
  - Sequential

---

## Total Estimated Effort

### By Work Stream

| Stream | Hours | Can Parallelize |
|--------|-------|-----------------|
| Stream 1: JWT Middleware | 12-16 | Yes |
| Stream 2: Input Validation | 16-20 | Yes |
| Stream 3: Error Hardening | 6-8 | Yes |
| Stream 4: Express Update | 4-6 | Yes |
| **Subtotal (Parallel)** | **38-50** | - |
| Integration & Testing | 8-12 | No (sequential) |
| **Total** | **46-62 hours** | - |

### Timeline Scenarios

**With 4 Developers (Parallel Development)**:
- Development: 20h (longest stream)
- Integration: 12h
- **Total: ~32 hours (~4 working days)**

**With 2 Developers**:
- Development: ~40h (two streams per developer)
- Integration: 12h
- **Total: ~52 hours (~6.5 working days)**

**With 1 Developer (Sequential)**:
- Development: 50h (all streams)
- Integration: 12h
- **Total: ~62 hours (~8 working days)**

### Recommended Approach

**Best**: 4 developers working in parallel → **4 working days**
- Fastest time to completion
- Early conflict detection
- Knowledge sharing

---

## Appendix: Dependencies

### New Dependencies

```json
{
  "dependencies": {
    "express": "^4.21.2",          // Updated
    "jsonwebtoken": "^9.0.2",      // NEW - JWT verification
    "zod": "^3.22.4"               // NEW - Request validation
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.5" // NEW - JWT types
  }
}
```

### Environment Variables

```bash
# JWT Configuration
JWT_METHOD=publicKey
JWT_SECRET=your-secret-key
JWT_PUBLIC_KEY=/path/to/public-key.pem
JWT_ISSUER=https://auth.example.com
JWT_AUDIENCE=https://api.example.com
JWT_ALGORITHMS=RS256,RS384
JWT_CLOCK_TOLERANCE=5

# Server Configuration
NODE_ENV=production
PORT=3000
BASE_PATH=/api/v1
DEBUG=false
```

---

**End of Document**
