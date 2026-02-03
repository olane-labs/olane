# Version 0.8.0 Phase 3: Testing & Deployment

**Date:** 2026-01-29
**Phase:** Testing & Deployment (Phase 3 of 3)
**Status:** Planning
**Priority:** Critical - Blocking Production Deployment

---

## 1. Executive Summary

### Purpose

This document outlines the testing and deployment strategy for @olane/o-server Version 0.8.0. Testing coverage will be built from 0% to 70-85%, ensuring production readiness through comprehensive endpoint, security, and integration testing.

### Test Coverage Goals

- **Minimum (Production Blocker):** 70% code coverage
- **Target:** 75-80% code coverage
- **Aspirational:** 85% code coverage
- **Focus Areas:** Endpoints (100%), JWT middleware (100%), input validation (100%), error handling (100%)

### Deployment Readiness Criteria

**Production deployment is BLOCKED until:**

1. Test coverage reaches minimum 70%
2. All P0 endpoint tests passing (health, /use, convenience)
3. JWT verification tested and working
4. Input validation tests complete
5. Express updated to 4.21.2 (CVE fixes)
6. pnpm audit shows no critical vulnerabilities
7. Cloudflare configuration verified

### Timeline & Effort Estimate

| Phase | Effort | Timeline | Dependencies |
|-------|--------|----------|--------------|
| **Test Infrastructure Setup** | 2-3 hours | Days 1-2 | None |
| **Endpoint Testing** | 10-12 hours | Days 2-5 | Phase 1 (JWT), Phase 2 (Quality) |
| **Security Testing** | 4-6 hours | Days 3-6 | Phase 1 (JWT, validation) |
| **Integration Testing** | 3-4 hours | Days 5-7 | Phase 2 (graceful shutdown) |
| **Dependencies Update** | 2-3 hours | Days 1-2 | None (parallel) |
| **Cloudflare Config** | 2-3 hours | Days 6-7 | All tests passing |
| **Production Checklist** | 1-2 hours | Day 7 | All above complete |
| **TOTAL** | **24-33 hours** | **7-10 days** | Phases 1 & 2 |

**Critical Path:** Endpoint tests depend on Phase 1 JWT implementation. Integration tests depend on Phase 2 graceful shutdown.

---

## 2. Test Infrastructure Setup

### Current State Analysis

**Problem:** Jest is configured but test file tests the wrong package:

```typescript
// test/ai.spec.ts - WRONG PACKAGE
import { oLaneTool } from '@olane/o-lane';  // Tests o-lane, not o-server!
```

**Verdict:**
- Test infrastructure ready (jest.config.js properly configured)
- Tests misdirected to wrong package
- 0% actual o-server coverage

### Fix Test Setup

**Action Items:**

1. **Delete misleading test file** (5 min)
   ```bash
   rm test/ai.spec.ts
   ```

2. **Create proper test structure** (15 min)
   ```
   test/
   ├── fixtures/
   │   ├── mock-node.ts          # Mock oCore node
   │   ├── mock-jwt.ts           # JWT token generation
   │   ├── test-data.ts          # Test addresses/params
   │   └── test-responses.ts     # Standard responses
   ├── helpers/
   │   ├── server-factory.ts     # Create test server instances
   │   ├── request-builder.ts    # Build test requests
   │   └── assertions.ts         # Custom assertions
   ├── unit/
   │   ├── endpoints/
   │   │   ├── health.spec.ts
   │   │   ├── use.spec.ts
   │   │   ├── convenience.spec.ts
   │   │   └── stream.spec.ts
   │   ├── middleware/
   │   │   ├── auth.spec.ts
   │   │   └── error-handler.spec.ts
   │   └── utils/
   │       └── logger.spec.ts
   └── integration/
       ├── server-lifecycle.spec.ts
       ├── request-flow.spec.ts
       └── error-scenarios.spec.ts
   ```

3. **Install additional test dependencies** (10 min)
   ```bash
   pnpm add -D supertest @types/supertest nock
   ```

4. **Enable coverage reporting** (5 min)
   ```javascript
   // jest.config.js - verify these settings exist
   module.exports = {
     collectCoverage: true,
     coverageDirectory: 'coverage',
     coverageReporters: ['text', 'lcov', 'html'],
     coverageThreshold: {
       global: {
         branches: 70,
         functions: 70,
         lines: 70,
         statements: 70
       }
     }
   };
   ```

### Test Utilities

**1. Mock Node Factory** (`test/fixtures/mock-node.ts`):
```typescript
import { oCore } from '@olane/o-core';

export function createMockNode(options = {}) {
  return {
    use: jest.fn().mockResolvedValue({
      result: {
        success: true,
        data: { message: 'Mock response' }
      }
    }),
    ...options
  };
}
```

**2. JWT Token Generator** (`test/fixtures/mock-jwt.ts`):
```typescript
import jwt from 'jsonwebtoken';

export function generateTestToken(payload = {}, secret = 'test-secret') {
  return jwt.sign(
    { userId: 'test-user', ...payload },
    secret,
    { expiresIn: '1h' }
  );
}

export function generateExpiredToken() {
  return jwt.sign(
    { userId: 'test-user' },
    'test-secret',
    { expiresIn: '-1h' }
  );
}
```

**3. Server Factory** (`test/helpers/server-factory.ts`):
```typescript
import { oServer } from '../../src/o-server';
import { createMockNode } from '../fixtures/mock-node';

export function createTestServer(config = {}) {
  const mockNode = createMockNode();
  const server = oServer({
    node: mockNode,
    port: 0, // Random port for testing
    debug: false,
    ...config
  });

  return { server, mockNode };
}
```

### Coverage Tooling

**Enable coverage reports:**
```bash
# Run tests with coverage
pnpm test -- --coverage

# Run tests with coverage threshold enforcement
pnpm test -- --coverage --coverageThreshold='{"global":{"lines":70}}'

# Generate HTML report
pnpm test -- --coverage --coverageReporters=html
# View at: coverage/index.html
```

### Effort Estimate

| Task | Hours |
|------|-------|
| Delete wrong test file | 0.1 |
| Create test structure | 0.3 |
| Install dependencies | 0.2 |
| Create mock utilities | 1.0 |
| Create test helpers | 1.0 |
| Enable coverage reporting | 0.2 |
| **TOTAL** | **2.8 hours** |

---

## 3. Endpoint Testing (Critical Path)

### GET /health

**Purpose:** Health check endpoint verification

**Tests Required:**

```typescript
// test/unit/endpoints/health.spec.ts
describe('GET /api/v1/health', () => {
  let server, mockNode;

  beforeAll(async () => {
    ({ server, mockNode } = createTestServer());
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should return 200 OK when server running', async () => {
    const response = await request(server.app)
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: 'healthy'
      }
    });
  });

  it('should return correct response format with timestamp', async () => {
    const response = await request(server.app)
      .get('/api/v1/health')
      .expect(200);

    expect(response.body.data).toHaveProperty('timestamp');
    expect(typeof response.body.data.timestamp).toBe('number');
  });
});
```

**Effort:** 0.5 hours

---

### POST /use (Primary Endpoint)

**Purpose:** Main node.use() wrapper - most critical endpoint

**Tests Required:**

```typescript
// test/unit/endpoints/use.spec.ts
describe('POST /api/v1/use', () => {
  let server, mockNode;

  beforeEach(async () => {
    ({ server, mockNode } = createTestServer());
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('Success cases', () => {
    it('should execute node.use() successfully with valid params', async () => {
      mockNode.use.mockResolvedValue({
        result: { success: true, data: { userId: '123' } }
      });

      const response = await request(server.app)
        .post('/api/v1/use')
        .send({
          address: 'o://test-tool',
          method: 'get_user',
          params: { userId: '123' }
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: { success: true, data: { userId: '123' } }
      });

      expect(mockNode.use).toHaveBeenCalledWith(
        expect.any(Object), // oAddress instance
        expect.objectContaining({
          method: 'get_user',
          params: { userId: '123' }
        })
      );
    });

    it('should forward optional id parameter', async () => {
      await request(server.app)
        .post('/api/v1/use')
        .send({
          address: 'o://test',
          method: 'test',
          params: {},
          id: 'request-123'
        })
        .expect(200);

      expect(mockNode.use).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          id: 'request-123'
        })
      );
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when address missing', async () => {
      const response = await request(server.app)
        .post('/api/v1/use')
        .send({
          method: 'test',
          params: {}
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.objectContaining({
          code: 'INVALID_PARAMS',
          message: expect.stringContaining('Address is required')
        })
      });
    });

    it('should return 400 when address is empty string', async () => {
      await request(server.app)
        .post('/api/v1/use')
        .send({
          address: '',
          method: 'test'
        })
        .expect(400);
    });

    it('should handle invalid address format', async () => {
      await request(server.app)
        .post('/api/v1/use')
        .send({
          address: 'not-a-valid-address!!!',
          method: 'test'
        })
        .expect(400);
    });
  });

  describe('Execution errors', () => {
    it('should return 404 when node not found', async () => {
      const error = new Error('Node not found');
      error.code = 'NODE_NOT_FOUND';
      mockNode.use.mockRejectedValue(error);

      const response = await request(server.app)
        .post('/api/v1/use')
        .send({
          address: 'o://non-existent',
          method: 'test'
        })
        .expect(404);

      expect(response.body.error.code).toBe('NODE_NOT_FOUND');
    });

    it('should return 404 when tool not found', async () => {
      const error = new Error('Tool not found');
      error.code = 'TOOL_NOT_FOUND';
      mockNode.use.mockRejectedValue(error);

      await request(server.app)
        .post('/api/v1/use')
        .send({
          address: 'o://test',
          method: 'non_existent'
        })
        .expect(404);
    });

    it('should return 500 on execution error', async () => {
      mockNode.use.mockRejectedValue(new Error('Internal error'));

      await request(server.app)
        .post('/api/v1/use')
        .send({
          address: 'o://test',
          method: 'test'
        })
        .expect(500);
    });

    it('should return 504 on timeout', async () => {
      const error = new Error('Request timeout');
      error.code = 'TIMEOUT';
      mockNode.use.mockRejectedValue(error);

      await request(server.app)
        .post('/api/v1/use')
        .send({
          address: 'o://slow-tool',
          method: 'slow_method'
        })
        .expect(504);
    });
  });

  describe('Error message inference', () => {
    it('should infer 404 from "not found" in message', async () => {
      mockNode.use.mockRejectedValue(new Error('Resource not found'));

      const response = await request(server.app)
        .post('/api/v1/use')
        .send({
          address: 'o://test',
          method: 'test'
        })
        .expect(404);

      expect(response.body.error.code).toBe('NODE_NOT_FOUND');
    });
  });
});
```

**Effort:** 3-4 hours

---

### POST /:address/:method (Convenience Endpoint)

**Purpose:** REST-like interface over node.use()

**Tests Required:**

```typescript
// test/unit/endpoints/convenience.spec.ts
describe('POST /api/v1/:address/:method', () => {
  let server, mockNode;

  beforeEach(async () => {
    ({ server, mockNode } = createTestServer());
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('should construct o:// address from URL param', async () => {
    await request(server.app)
      .post('/api/v1/test-tool/get_user')
      .send({ userId: '123' })
      .expect(200);

    expect(mockNode.use).toHaveBeenCalledWith(
      expect.objectContaining({
        toString: expect.any(Function)
      }),
      expect.any(Object)
    );

    const calledAddress = mockNode.use.mock.calls[0][0];
    expect(calledAddress.toString()).toBe('o://test-tool');
  });

  it('should use request body as params', async () => {
    await request(server.app)
      .post('/api/v1/test-tool/get_user')
      .send({ userId: '123', includeProfile: true })
      .expect(200);

    expect(mockNode.use).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        method: 'get_user',
        params: { userId: '123', includeProfile: true }
      })
    );
  });

  it('should execute successfully and return data', async () => {
    mockNode.use.mockResolvedValue({
      result: { success: true, data: { user: 'data' } }
    });

    const response = await request(server.app)
      .post('/api/v1/test-tool/get_user')
      .send({ userId: '123' })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: { success: true, data: { user: 'data' } }
    });
  });

  it('should handle invalid address characters', async () => {
    await request(server.app)
      .post('/api/v1/invalid@tool!/dangerous_method')
      .send({})
      .expect(400);
  });

  it('should return 404 for non-existent method', async () => {
    const error = new Error('Method not found');
    error.code = 'TOOL_NOT_FOUND';
    mockNode.use.mockRejectedValue(error);

    await request(server.app)
      .post('/api/v1/test-tool/non_existent')
      .send({})
      .expect(404);
  });

  it('should validate params structure', async () => {
    // Send invalid JSON
    await request(server.app)
      .post('/api/v1/test-tool/test')
      .set('Content-Type', 'application/json')
      .send('{ invalid json }')
      .expect(400);
  });
});
```

**Effort:** 2-3 hours

---

### POST /use/stream (Streaming Endpoint)

**Purpose:** Server-Sent Events streaming (currently TODO)

**Tests Required:**

```typescript
// test/unit/endpoints/stream.spec.ts
describe('POST /api/v1/use/stream', () => {
  let server, mockNode;

  beforeEach(async () => {
    ({ server, mockNode } = createTestServer());
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('should set SSE headers', async () => {
    const response = await request(server.app)
      .post('/api/v1/use/stream')
      .send({
        address: 'o://test',
        method: 'test'
      });

    expect(response.headers['content-type']).toBe('text/event-stream');
    expect(response.headers['cache-control']).toBe('no-cache');
    expect(response.headers['connection']).toBe('keep-alive');
  });

  it('should stream complete event with result', async () => {
    mockNode.use.mockResolvedValue({
      result: { success: true, data: { value: 42 } }
    });

    const response = await request(server.app)
      .post('/api/v1/use/stream')
      .send({
        address: 'o://test',
        method: 'test'
      })
      .expect(200);

    const data = response.text;
    expect(data).toContain('data: ');
    expect(data).toContain('"type":"complete"');
    expect(data).toContain('"value":42');
  });

  it('should handle errors in stream', async () => {
    mockNode.use.mockRejectedValue(new Error('Stream error'));

    const response = await request(server.app)
      .post('/api/v1/use/stream')
      .send({
        address: 'o://test',
        method: 'test'
      })
      .expect(200);

    const data = response.text;
    expect(data).toContain('"type":"error"');
    expect(data).toContain('Stream error');
  });

  it('should validate address required', async () => {
    await request(server.app)
      .post('/api/v1/use/stream')
      .send({
        method: 'test'
      })
      .expect(400);
  });

  it('should close connection properly', async () => {
    const response = await request(server.app)
      .post('/api/v1/use/stream')
      .send({
        address: 'o://test',
        method: 'test'
      });

    // Connection should be ended after complete
    expect(response.text).toMatch(/\n\n$/);
  });
});
```

**Effort:** 2-3 hours

**Note:** Streaming endpoint has TODO comment - may need implementation updates in Phase 2.

---

### Endpoint Testing Summary

| Endpoint | Tests | Effort | Dependencies |
|----------|-------|--------|--------------|
| GET /health | 2 | 0.5h | None |
| POST /use | 10 | 3-4h | Phase 1 JWT |
| POST /:address/:method | 6 | 2-3h | Phase 1 JWT |
| POST /use/stream | 5 | 2-3h | Phase 2 streaming |
| **TOTAL** | **23** | **8-10.5h** | Phases 1 & 2 |

---

## 4. JWT Middleware Testing

**Dependencies:** Phase 1 must implement JWT verification middleware

### Tests Required

```typescript
// test/unit/middleware/auth.spec.ts
describe('authMiddleware', () => {
  let server, mockNode;
  const validToken = generateTestToken();
  const expiredToken = generateExpiredToken();

  beforeEach(async () => {
    const mockAuthenticate = jest.fn(async (req) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) throw new Error('No token provided');

      // Verify JWT
      const decoded = jwt.verify(token, 'test-secret');
      return { userId: decoded.userId };
    });

    ({ server, mockNode } = createTestServer({
      authenticate: mockAuthenticate
    }));
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('should authenticate valid token and set req.user', async () => {
    const response = await request(server.app)
      .post('/api/v1/use')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        address: 'o://test',
        method: 'test'
      })
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('should return 401 when token missing', async () => {
    const response = await request(server.app)
      .post('/api/v1/use')
      .send({
        address: 'o://test',
        method: 'test'
      })
      .expect(401);

    expect(response.body.error.message).toContain('No token');
  });

  it('should return 401 when token expired', async () => {
    await request(server.app)
      .post('/api/v1/use')
      .set('Authorization', `Bearer ${expiredToken}`)
      .send({
        address: 'o://test',
        method: 'test'
      })
      .expect(401);
  });

  it('should return 401 when token has invalid signature', async () => {
    const invalidToken = generateTestToken({}, 'wrong-secret');

    await request(server.app)
      .post('/api/v1/use')
      .set('Authorization', `Bearer ${invalidToken}`)
      .send({
        address: 'o://test',
        method: 'test'
      })
      .expect(401);
  });

  it('should return 401 when token malformed', async () => {
    await request(server.app)
      .post('/api/v1/use')
      .set('Authorization', 'Bearer not-a-valid-jwt')
      .send({
        address: 'o://test',
        method: 'test'
      })
      .expect(401);
  });

  it('should return 401 when wrong issuer', async () => {
    const wrongIssuerToken = jwt.sign(
      { userId: 'test' },
      'test-secret',
      { issuer: 'wrong-issuer', expiresIn: '1h' }
    );

    await request(server.app)
      .post('/api/v1/use')
      .set('Authorization', `Bearer ${wrongIssuerToken}`)
      .send({
        address: 'o://test',
        method: 'test'
      })
      .expect(401);
  });

  it('should return 401 when wrong audience', async () => {
    const wrongAudienceToken = jwt.sign(
      { userId: 'test' },
      'test-secret',
      { audience: 'wrong-audience', expiresIn: '1h' }
    );

    await request(server.app)
      .post('/api/v1/use')
      .set('Authorization', `Bearer ${wrongAudienceToken}`)
      .send({
        address: 'o://test',
        method: 'test'
      })
      .expect(401);
  });
});
```

**Effort:** 2-3 hours

---

## 5. Input Validation Testing

**Dependencies:** Phase 1 must implement input validation and sanitization

### Tests Required

```typescript
// test/unit/security/input-validation.spec.ts
describe('Input Validation', () => {
  let server, mockNode;

  beforeEach(async () => {
    ({ server, mockNode } = createTestServer());
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('Address parameter injection', () => {
    it('should block SQL injection in address', async () => {
      await request(server.app)
        .post('/api/v1/use')
        .send({
          address: "o://test'; DROP TABLE users; --",
          method: 'test'
        })
        .expect(400);
    });

    it('should block NoSQL injection in address', async () => {
      await request(server.app)
        .post('/api/v1/use')
        .send({
          address: { $gt: '' },
          method: 'test'
        })
        .expect(400);
    });

    it('should block path traversal in address', async () => {
      await request(server.app)
        .post('/api/v1/:address/:method'.replace(':address', '../../../etc/passwd'))
        .send({})
        .expect(400);
    });
  });

  describe('Method parameter injection', () => {
    it('should block method injection attempts', async () => {
      await request(server.app)
        .post('/api/v1/use')
        .send({
          address: 'o://test',
          method: '__proto__'
        })
        .expect(400);
    });

    it('should block constructor injection', async () => {
      await request(server.app)
        .post('/api/v1/test/constructor')
        .send({})
        .expect(400);
    });
  });

  describe('JSON payload validation', () => {
    it('should reject malformed JSON', async () => {
      await request(server.app)
        .post('/api/v1/use')
        .set('Content-Type', 'application/json')
        .send('{ "address": "o://test", malformed }')
        .expect(400);
    });

    it('should reject oversized payloads', async () => {
      const largePayload = {
        address: 'o://test',
        method: 'test',
        params: { data: 'x'.repeat(11 * 1024 * 1024) } // >10MB
      };

      await request(server.app)
        .post('/api/v1/use')
        .send(largePayload)
        .expect(413);
    });

    it('should block prototype pollution in params', async () => {
      await request(server.app)
        .post('/api/v1/use')
        .send({
          address: 'o://test',
          method: 'test',
          params: {
            '__proto__': { polluted: true }
          }
        })
        .expect(400);
    });
  });

  describe('XSS prevention', () => {
    it('should sanitize XSS in address parameter', async () => {
      mockNode.use.mockRejectedValue(new Error('Node not found'));

      const response = await request(server.app)
        .post('/api/v1/use')
        .send({
          address: 'o://<script>alert("xss")</script>',
          method: 'test'
        });

      // Error message should not contain unescaped script tags
      expect(response.body.error.message).not.toContain('<script>');
    });
  });
});
```

**Effort:** 2-3 hours

---

## 6. Error Handling Testing

**Dependencies:** Phase 2 must improve error handler (no stack traces in production)

### Tests Required

```typescript
// test/unit/middleware/error-handler.spec.ts
describe('errorHandler', () => {
  let server, mockNode;

  describe('Production mode', () => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'production';
      ({ server, mockNode } = createTestServer({ debug: false }));
      await server.start();
    });

    afterEach(async () => {
      await server.stop();
      delete process.env.NODE_ENV;
    });

    it('should not expose stack traces in production', async () => {
      mockNode.use.mockRejectedValue(new Error('Internal error'));

      const response = await request(server.app)
        .post('/api/v1/use')
        .send({
          address: 'o://test',
          method: 'test'
        })
        .expect(500);

      expect(response.body.error).not.toHaveProperty('stack');
      expect(response.body.error.details).toBeUndefined();
    });

    it('should use generic error messages in production', async () => {
      mockNode.use.mockRejectedValue(new Error('Sensitive internal error'));

      const response = await request(server.app)
        .post('/api/v1/use')
        .send({
          address: 'o://test',
          method: 'test'
        })
        .expect(500);

      expect(response.body.error.message).not.toContain('Sensitive');
    });
  });

  describe('Development mode', () => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'development';
      ({ server, mockNode } = createTestServer({ debug: true }));
      await server.start();
    });

    afterEach(async () => {
      await server.stop();
      delete process.env.NODE_ENV;
    });

    it('should expose details in development', async () => {
      mockNode.use.mockRejectedValue(new Error('Debug error'));

      const response = await request(server.app)
        .post('/api/v1/use')
        .send({
          address: 'o://test',
          method: 'test'
        })
        .expect(500);

      expect(response.body.error.details).toBeDefined();
    });
  });

  describe('Error response format', () => {
    beforeEach(async () => {
      ({ server, mockNode } = createTestServer());
      await server.start();
    });

    afterEach(async () => {
      await server.stop();
    });

    it('should return consistent error format', async () => {
      mockNode.use.mockRejectedValue(new Error('Test error'));

      const response = await request(server.app)
        .post('/api/v1/use')
        .send({
          address: 'o://test',
          method: 'test'
        })
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String)
        }
      });
    });
  });

  describe('Error code mapping', () => {
    beforeEach(async () => {
      ({ server, mockNode } = createTestServer());
      await server.start();
    });

    afterEach(async () => {
      await server.stop();
    });

    const errorCodeTests = [
      { code: 'NODE_NOT_FOUND', expectedStatus: 404 },
      { code: 'TOOL_NOT_FOUND', expectedStatus: 404 },
      { code: 'INVALID_PARAMS', expectedStatus: 400 },
      { code: 'TIMEOUT', expectedStatus: 504 },
      { code: 'EXECUTION_ERROR', expectedStatus: 500 }
    ];

    errorCodeTests.forEach(({ code, expectedStatus }) => {
      it(`should map ${code} to HTTP ${expectedStatus}`, async () => {
        const error = new Error(`Error: ${code}`);
        error.code = code;
        mockNode.use.mockRejectedValue(error);

        await request(server.app)
          .post('/api/v1/use')
          .send({
            address: 'o://test',
            method: 'test'
          })
          .expect(expectedStatus);
      });
    });
  });
});
```

**Effort:** 1.5-2 hours

---

## 7. Integration Testing

**Dependencies:** Phase 2 must implement graceful shutdown and request timeouts

### Tests Required

```typescript
// test/integration/server-lifecycle.spec.ts
describe('Server Lifecycle', () => {
  it('should start server successfully', async () => {
    const { server } = createTestServer({ port: 0 });
    await expect(server.start()).resolves.not.toThrow();
    await server.stop();
  });

  it('should reject duplicate start', async () => {
    const { server } = createTestServer({ port: 0 });
    await server.start();

    await expect(server.start()).rejects.toThrow();

    await server.stop();
  });

  it('should handle port conflicts gracefully', async () => {
    const { server: server1 } = createTestServer({ port: 9999 });
    const { server: server2 } = createTestServer({ port: 9999 });

    await server1.start();

    await expect(server2.start()).rejects.toThrow(/EADDRINUSE/);

    await server1.stop();
  });

  it('should propagate node errors correctly', async () => {
    const { server, mockNode } = createTestServer();
    await server.start();

    const nodeError = new Error('Node error');
    nodeError.code = 'NODE_ERROR';
    mockNode.use.mockRejectedValue(nodeError);

    const response = await request(server.app)
      .post('/api/v1/use')
      .send({
        address: 'o://test',
        method: 'test'
      });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body.error).toBeDefined();

    await server.stop();
  });

  it('should stop server cleanly', async () => {
    const { server } = createTestServer({ port: 0 });
    await server.start();
    await expect(server.stop()).resolves.not.toThrow();
  });

  it('should handle stop when not started', async () => {
    const { server } = createTestServer({ port: 0 });
    await expect(server.stop()).resolves.not.toThrow();
  });
});

// test/integration/request-flow.spec.ts
describe('Request Flow', () => {
  let server, mockNode;

  beforeAll(async () => {
    ({ server, mockNode } = createTestServer());
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should handle request timeout', async () => {
    mockNode.use.mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ result: { success: true } }), 31000); // >30s
      });
    });

    const response = await request(server.app)
      .post('/api/v1/use')
      .timeout(5000) // 5s test timeout
      .send({
        address: 'o://slow',
        method: 'slow'
      });

    // Should timeout before 31s
    expect(response.status).toBe(504);
  });

  it('should drain connections on shutdown', async () => {
    // Start long-running request
    const longRequest = request(server.app)
      .post('/api/v1/use')
      .send({
        address: 'o://test',
        method: 'test'
      });

    // Stop server (should wait for request to complete)
    const stopPromise = server.stop();

    // Complete the request
    mockNode.use.mockResolvedValue({ result: { success: true } });
    await longRequest;

    // Server should stop after request completes
    await expect(stopPromise).resolves.not.toThrow();
  });

  it('should reflect actual status in health check', async () => {
    const response = await request(server.app)
      .get('/api/v1/health')
      .expect(200);

    expect(response.body.data.status).toBe('healthy');
  });
});
```

**Effort:** 3-4 hours

---

## 8. Dependencies & Updates

**From dependency audit (03-dependency-audit.md):**

### Critical Updates Required

```bash
# 1. Update express to fix CVE-2024-43796 (HIGH) and CVE-2024-47764 (MEDIUM)
pnpm update express@^4.21.2

# 2. Verify no critical vulnerabilities
pnpm audit --prod --audit-level=high

# 3. Update TypeScript (optional but recommended)
pnpm update typescript@^5.7.3

# 4. Verify Jest version (package.json shows 30.0.0, npm latest is 29.7.0)
pnpm list jest
# If on 30.x pre-release, downgrade:
pnpm install -D jest@29.7.0 @types/jest@29.5.13
```

### Dependency Testing Checklist

- [ ] Express 4.21.2 installed and tested
- [ ] pnpm audit shows no high/critical vulnerabilities
- [ ] All tests pass with updated dependencies
- [ ] No breaking changes from dependency updates
- [ ] Lock file (pnpm-lock.yaml) committed to git
- [ ] CI/CD runs pnpm install --frozen-lockfile

### Add Security Scanning to CI/CD

```yaml
# .github/workflows/security.yml
name: Security Audit
on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3

      - run: pnpm install --frozen-lockfile

      - name: Audit production dependencies
        run: pnpm audit --prod --audit-level=moderate

      - name: Fail on high/critical vulnerabilities
        run: pnpm audit --prod --audit-level=high
```

**Effort:** 2-3 hours

---

## 9. Git Worktree Coordination Strategy

### Master Coordination Plan

All three Phase 2 work streams (Security, Quality, Testing) must coordinate through git worktrees and integration branches to prevent conflicts and ensure smooth merging.

### Worktree Workflow

**Create worktrees from main:**

```bash
# From main repo directory: /Users/brendon/Development/highway/olane

# Phase 1: Security (JWT, validation)
git worktree add ../olane-security feat/v0.8.0-security

# Phase 2: Quality (TypeScript, debug, shutdown)
git worktree add ../olane-quality feat/v0.8.0-quality

# Phase 3: Testing (this phase)
git worktree add ../olane-testing feat/v0.8.0-testing

# Integration branch
git worktree add ../olane-integration feat/v0.8.0-integration
```

**Branch naming convention:**
- Security work: `feat/v0.8.0-security`
- Quality work: `feat/v0.8.0-quality`
- Testing work: `feat/v0.8.0-testing`
- Integration: `feat/v0.8.0-integration`

**Keep worktrees in sync with main:**
```bash
# In each worktree, periodically:
git fetch origin main
git rebase origin/main
```

### Integration Branches

**Integration Strategy:**

```
main
  ├── feat/v0.8.0-security     (Phase 1)
  ├── feat/v0.8.0-quality      (Phase 2)
  ├── feat/v0.8.0-testing      (Phase 3)
  └── feat/v0.8.0-integration  (Merge target)
```

**Integration branch workflow:**

1. **Security merges first:**
   ```bash
   git checkout feat/v0.8.0-integration
   git merge feat/v0.8.0-security
   # Run tests
   pnpm test
   ```

2. **Quality merges second:**
   ```bash
   git merge feat/v0.8.0-quality
   # Resolve conflicts (likely in package.json, tsconfig.json)
   # Run tests
   pnpm test
   ```

3. **Testing merges last:**
   ```bash
   git merge feat/v0.8.0-testing
   # Run full test suite
   pnpm test -- --coverage
   # Verify 70% coverage achieved
   ```

4. **Integration testing on combined branch:**
   ```bash
   # Run all tests
   pnpm test -- --coverage --verbose

   # Run linting
   pnpm run lint

   # Build project
   pnpm run build

   # Manual QA testing
   ```

5. **Final merge to main:**
   ```bash
   git checkout main
   git merge feat/v0.8.0-integration --no-ff
   git push origin main
   ```

### Merge Strategy

**Order of operations:**

1. **Phase 1 (Security) merges first** - Establishes JWT middleware, input validation
   - Files touched: `src/middleware/auth.ts`, `src/middleware/validation.ts`
   - Risk: Low conflict potential

2. **Phase 2 (Quality) merges second** - TypeScript strict mode, debug logging, graceful shutdown
   - Files touched: `tsconfig.json`, `src/o-server.ts`, `src/utils/logger.ts`
   - Risk: Medium conflict potential (o-server.ts modified by Phase 1)

3. **Phase 3 (Testing) added throughout** - Tests written as TDD for Phases 1 & 2
   - Files touched: `test/**/*.spec.ts`, new test files
   - Risk: Low conflict potential (new files)

**Parallel work:**
- Testing can write tests in parallel with implementation
- Use TDD: Write failing tests first, then implement features
- Tests should be on feat/v0.8.0-testing branch, synced with security/quality branches

### Conflict Resolution Strategy

**Expected conflicts:**

1. **package.json:**
   - Security adds JWT dependencies
   - Quality updates TypeScript version
   - Testing adds test dependencies
   - **Resolution:** Manual merge, keep all additions

2. **tsconfig.json:**
   - Quality enables strict mode
   - **Resolution:** Keep quality branch changes

3. **src/o-server.ts:**
   - Security adds JWT middleware
   - Quality adds graceful shutdown
   - **Resolution:** Keep both, order: JSON parsing → CORS → JWT → routes → error handler

4. **jest.config.js:**
   - Testing updates coverage thresholds
   - **Resolution:** Keep testing branch changes

**Conflict resolution process:**

```bash
# When conflict occurs:
git status  # Identify conflicted files

# For each file:
git diff --ours --theirs <file>  # Review differences
# Edit file to resolve conflicts
git add <file>

# Complete merge:
git commit
pnpm test  # Verify tests pass after resolution
```

### Testing at Integration Points

**When to run full test suite:**

1. **After each phase merge to integration branch:**
   ```bash
   pnpm test -- --coverage
   # Verify no regressions
   ```

2. **Before merging integration to main:**
   ```bash
   pnpm test -- --coverage --verbose
   pnpm run lint
   pnpm run build
   # All must pass
   ```

3. **After merge to main:**
   ```bash
   # CI/CD automatically runs full suite
   # Monitor for failures
   ```

**Integration test checklist:**

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Coverage threshold met (70%)
- [ ] No linting errors
- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] Manual smoke testing passes

---

## 10. Cloudflare Configuration Notes

### What Cloudflare Provides

**Cloudflare handles edge security:**

1. **TLS Termination**
   - o-server receives HTTP from Cloudflare (not HTTPS)
   - Cloudflare handles SSL/TLS certificates
   - No need for HTTPS in o-server

2. **Rate Limiting**
   - Configured at Cloudflare dashboard
   - Per-IP rate limits
   - Per-endpoint rate limits
   - DDoS protection

3. **DDoS Protection**
   - Automatic DDoS mitigation
   - Challenge pages for suspicious traffic
   - IP reputation filtering

4. **WAF (Web Application Firewall)**
   - OWASP Top 10 protection
   - SQL injection blocking
   - XSS filtering
   - Configurable rules

### What o-server Must Handle

**Application-level security (Cloudflare passes through):**

1. **JWT Verification**
   - Cloudflare passes Authorization header through
   - o-server must verify JWT signature
   - o-server must check expiration, issuer, audience

2. **Input Validation**
   - Cloudflare provides basic WAF
   - o-server must validate business logic
   - o-server must sanitize parameters

3. **Business Logic Errors**
   - Node not found (404)
   - Method not found (404)
   - Invalid parameters (400)
   - Execution errors (500)

### Configuration Checklist

**Cloudflare Settings:**

- [ ] **SSL/TLS Mode: Full** (not Flexible)
  - Cloudflare → o-server uses HTTP
  - Client → Cloudflare uses HTTPS
  - Full mode ensures encryption end-to-end

- [ ] **Rate Limiting Rules Configured**
  ```
  Example rules:
  - /api/v1/use: 100 requests per minute per IP
  - /api/v1/health: 1000 requests per minute per IP
  - Burst: 200 requests per 10 seconds
  ```

- [ ] **Origin IP Verification**
  - Trust X-Forwarded-For header from Cloudflare
  - Verify requests come from Cloudflare IPs only
  - Reject direct access to origin server

- [ ] **Health Check Endpoint Configured**
  - Cloudflare monitors /api/v1/health
  - Auto-failover to backup if unhealthy
  - Health check frequency: 60 seconds

- [ ] **Caching Rules**
  - No caching for /api/v1/* (dynamic content)
  - Cache-Control: no-cache headers set
  - Bypass cache for authenticated requests

- [ ] **Firewall Rules**
  - Block requests without Authorization header (except /health)
  - Whitelist known good IPs (optional)
  - Challenge mode for suspicious IPs

### Testing with Cloudflare

**Local testing (without Cloudflare):**

```bash
# Start server locally
pnpm run dev

# Test directly
curl -X POST http://localhost:3000/api/v1/use \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"address":"o://test","method":"test"}'
```

**Staging testing (through Cloudflare):**

```bash
# Test through Cloudflare staging
curl -X POST https://staging-api.olane.com/api/v1/use \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"address":"o://test","method":"test"}'

# Verify X-Forwarded-For header is set by Cloudflare
curl -v https://staging-api.olane.com/api/v1/health
# Look for: X-Forwarded-For: <your-ip>
```

**Rate limit testing:**

```bash
# Test rate limiting (should get 429 after limit)
for i in {1..150}; do
  curl -X GET https://staging-api.olane.com/api/v1/health
done
# Expect 429 Too Many Requests after 100-120 requests
```

**Cloudflare + o-server integration checklist:**

- [ ] Server receives X-Forwarded-For header
- [ ] Server trusts Cloudflare IPs only
- [ ] Rate limiting works (429 returned after limit)
- [ ] Health check reflects actual server status
- [ ] JWT verification works through Cloudflare
- [ ] No direct access to origin server (only through Cloudflare)

### Cloudflare-Specific Environment Variables

```bash
# .env.production
NODE_ENV=production
PORT=8080

# Trust Cloudflare proxy
TRUST_PROXY=true

# Cloudflare IP ranges (for verification)
CLOUDFLARE_IPS=173.245.48.0/20,103.21.244.0/22,...

# Health check secret (optional - prevent abuse)
HEALTH_CHECK_SECRET=<random-secret>
```

**Effort:** 2-3 hours (Cloudflare configuration + testing)

---

## 11. Production Deployment Checklist

### Security Checklist

- [ ] **JWT verification implemented and tested**
  - Valid token passes
  - Invalid token rejected (401)
  - Expired token rejected (401)
  - Malformed token rejected (401)

- [ ] **Input validation complete**
  - Address parameter sanitized
  - Method parameter sanitized
  - Params validated
  - Oversized payloads rejected (413)
  - SQL/NoSQL injection blocked

- [ ] **Error handling hardened**
  - No stack traces in production
  - Generic error messages in production
  - Sensitive data not logged

- [ ] **Express updated to 4.21.2**
  - CVE-2024-43796 fixed (path traversal)
  - CVE-2024-47764 fixed (open redirect)

- [ ] **pnpm audit clean**
  - No critical vulnerabilities
  - No high vulnerabilities
  - Medium/low acceptable with mitigation

### Quality Checklist

- [ ] **TypeScript strict mode enabled**
  - No `any` types in production code
  - All types properly defined
  - No type errors

- [ ] **Graceful shutdown implemented**
  - Server drains connections
  - In-flight requests complete
  - Server stops cleanly

- [ ] **Request timeouts configured**
  - Timeout set (30 seconds recommended)
  - 504 returned on timeout
  - Resources cleaned up

- [ ] **Debug logging configured**
  - Debug namespace: `o-server:*`
  - No sensitive data in logs
  - Production logging to file/service

### Testing Checklist

- [ ] **Test coverage ≥ 70%**
  - All endpoints tested
  - JWT middleware tested
  - Error handling tested
  - Integration tests passing

- [ ] **All tests passing**
  - Unit tests: 100% passing
  - Integration tests: 100% passing
  - No flaky tests

- [ ] **Security tests passing**
  - Injection tests
  - XSS tests
  - Auth bypass tests

### Dependencies Checklist

- [ ] **Express 4.21.2 installed**
- [ ] **All dependencies up-to-date**
- [ ] **Lock file committed (pnpm-lock.yaml)**
- [ ] **No critical vulnerabilities**

### Infrastructure Checklist

- [ ] **Environment variables documented**
  ```bash
  NODE_ENV=production
  PORT=8080
  JWT_SECRET=<secret>
  JWT_ISSUER=<issuer>
  JWT_AUDIENCE=<audience>
  ```

- [ ] **Cloudflare configured**
  - SSL mode: Full
  - Rate limiting enabled
  - Health check configured
  - Firewall rules set

- [ ] **Monitoring configured**
  - Error logging to service (Sentry, LogRocket, etc.)
  - Performance monitoring
  - Uptime monitoring
  - Alert thresholds set

- [ ] **Load testing passed**
  - 100 concurrent requests
  - 1000 requests per minute
  - No memory leaks
  - Response time < 500ms p95

### Deployment Process Checklist

- [ ] **Rollback plan documented**
  - Previous version tagged
  - Rollback procedure tested
  - Rollback time < 5 minutes

- [ ] **Staging deployment successful**
  - All tests passing in staging
  - Manual QA complete
  - Soak test complete (24 hours)

- [ ] **Production deployment plan**
  - Deployment window scheduled
  - Stakeholders notified
  - Monitoring dashboard open
  - Rollback trigger criteria defined

---

## 12. Dependencies from Previous Phases

### Phase 1 (Security) - BLOCKING

**Must complete before testing can be fully written:**

| Phase 1 Feature | Testing Dependency | Status |
|-----------------|-------------------|--------|
| JWT middleware | Can write JWT middleware tests | REQUIRED |
| Input validation | Can write validation tests | REQUIRED |
| Error hardening | Can write error handling tests | REQUIRED |
| Sanitization | Can write injection tests | REQUIRED |

**Testing can start early using TDD:**
- Write failing tests first
- Implement Phase 1 features to make tests pass
- Iterative development

### Phase 2 (Quality) - PARALLEL

**Can run in parallel, tests verify quality:**

| Phase 2 Feature | Testing Dependency | Status |
|-----------------|-------------------|--------|
| TypeScript strict | Tests ensure no regressions | VERIFIES |
| Graceful shutdown | Integration tests verify | VERIFIES |
| Request timeouts | Tests verify timeout behavior | VERIFIES |
| Debug logging | Tests verify no sensitive data | VERIFIES |

**Testing strategy:**
- Write tests alongside Phase 2 implementation
- Tests act as specification for quality improvements
- Continuous testing as features are implemented

---

## 13. Parallel Testing Strategy

### Test Writing Timeline

**Tests can be written before implementation (TDD):**

```
Week 1:
  ├── Day 1-2: Write endpoint test stubs (use mocks)
  ├── Day 2-3: Phase 1 implements JWT → tests start passing
  ├── Day 3-4: Write validation tests
  ├── Day 4-5: Phase 1 implements validation → tests start passing
  └── Day 5-7: Write integration tests

Week 2:
  ├── Day 1-2: Phase 2 implements quality features
  ├── Day 2-3: Tests verify no regressions
  ├── Day 3-4: Final test coverage push
  └── Day 5-7: Integration testing, deployment prep
```

### Work Streams

**Stream 1: Endpoint Tests (Independent)**
- Can start immediately with stubs
- Mock node.use() responses
- Test endpoint logic in isolation
- **Effort:** 8-10 hours
- **Dependencies:** None (use mocks)

**Stream 2: JWT Middleware Tests (Dependent)**
- Depends on Phase 1 JWT implementation
- Can write failing tests first (TDD)
- Tests pass once JWT middleware implemented
- **Effort:** 2-3 hours
- **Dependencies:** Phase 1 JWT middleware

**Stream 3: Integration Tests (Dependent)**
- Depends on Phase 2 graceful shutdown
- Tests server lifecycle
- Tests request timeouts
- **Effort:** 3-4 hours
- **Dependencies:** Phase 2 graceful shutdown, timeouts

**Stream 4: Security Tests (Dependent)**
- Depends on Phase 1 validation implementation
- Tests injection attacks
- Tests XSS prevention
- **Effort:** 2-3 hours
- **Dependencies:** Phase 1 input validation

### Continuous Integration

**Run tests on each worktree branch:**

```bash
# In feat/v0.8.0-security branch
pnpm test -- test/unit/middleware/auth.spec.ts

# In feat/v0.8.0-quality branch
pnpm test -- test/integration/server-lifecycle.spec.ts

# In feat/v0.8.0-testing branch
pnpm test -- --coverage
```

**CI/CD configuration:**

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches:
      - main
      - 'feat/v0.8.0-*'
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3

      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint
      - run: pnpm run build
      - run: pnpm test -- --coverage

      - name: Coverage threshold
        run: |
          # Fail if coverage < 70%
          pnpm test -- --coverage --coverageThreshold='{"global":{"lines":70}}'
```

---

## 14. Acceptance Criteria

### Coverage Criteria

- [ ] **70-85% code coverage achieved**
  - Lines: ≥70%
  - Branches: ≥70%
  - Functions: ≥70%
  - Statements: ≥70%

- [ ] **100% coverage of critical paths**
  - All endpoints tested
  - JWT middleware tested
  - Input validation tested
  - Error handling tested

### Endpoint Testing Criteria

- [ ] **GET /health tested**
  - Returns 200 OK
  - Returns correct format
  - Includes timestamp

- [ ] **POST /use tested**
  - Valid request succeeds
  - Invalid JWT rejected (401)
  - Missing address rejected (400)
  - Node not found returns 404
  - Execution errors return 500
  - Timeout returns 504

- [ ] **POST /:address/:method tested**
  - Constructs o:// address correctly
  - Uses body as params
  - Handles errors properly

- [ ] **POST /use/stream tested**
  - Sets SSE headers
  - Streams complete event
  - Handles errors in stream

### Security Verification Criteria

- [ ] **JWT verification working**
  - Valid token passes
  - Invalid token rejected
  - Expired token rejected
  - Malformed token rejected

- [ ] **Input validation complete**
  - SQL injection blocked
  - NoSQL injection blocked
  - XSS prevented
  - Path traversal blocked
  - Prototype pollution prevented

- [ ] **Error handling secure**
  - No stack traces in production
  - No sensitive data in errors
  - Generic error messages in production

### Integration Testing Criteria

- [ ] **Startup tested**
  - Server starts successfully
  - Port conflicts handled
  - Initialization errors handled

- [ ] **Shutdown tested**
  - Server stops cleanly
  - Connections drained
  - In-flight requests complete

- [ ] **Timeouts tested**
  - Request timeout enforced
  - 504 returned on timeout
  - Resources cleaned up

### Dependency Criteria

- [ ] **Express 4.21.2 installed**
  - CVEs fixed
  - Tests pass with new version

- [ ] **pnpm audit clean**
  - No critical vulnerabilities
  - No high vulnerabilities

- [ ] **Lock file committed**
  - pnpm-lock.yaml in git
  - CI/CD uses frozen-lockfile

### Production Readiness Criteria

- [ ] **All tests passing**
  - Unit tests: 100%
  - Integration tests: 100%
  - No flaky tests

- [ ] **Cloudflare configured**
  - SSL mode set
  - Rate limiting enabled
  - Health check working

- [ ] **Monitoring configured**
  - Error logging
  - Performance monitoring
  - Alerts set up

- [ ] **Deployment plan ready**
  - Rollback plan documented
  - Stakeholders notified
  - Monitoring dashboard ready

---

## 15. Implementation Checklist

### Phase 3A: Test Infrastructure (Days 1-2)

**Total: 2-3 hours**

- [ ] Delete misleading test file (test/ai.spec.ts) - **5 min**
- [ ] Create test directory structure - **15 min**
- [ ] Install test dependencies (supertest, nock) - **10 min**
- [ ] Create mock node factory - **30 min**
- [ ] Create JWT token generator - **30 min**
- [ ] Create server factory helper - **30 min**
- [ ] Enable coverage reporting in jest.config.js - **5 min**
- [ ] Verify coverage threshold enforcement - **15 min**

**Dependencies:** None
**Can be done in parallel with:** Phase 1 security work

---

### Phase 3B: Endpoint Tests (Days 2-5)

**Total: 8-10 hours**

#### GET /health (0.5 hours)
- [ ] Write test: returns 200 OK - **10 min**
- [ ] Write test: returns correct format with timestamp - **10 min**
- [ ] Run tests, verify passing - **10 min**

**Dependencies:** None
**Can be done in parallel with:** Phase 1 JWT implementation

---

#### POST /use (3-4 hours)
- [ ] Write success test: valid params execute successfully - **30 min**
- [ ] Write success test: forwards optional id parameter - **15 min**
- [ ] Write validation test: missing address returns 400 - **15 min**
- [ ] Write validation test: empty address returns 400 - **15 min**
- [ ] Write validation test: invalid address format - **20 min**
- [ ] Write error test: NODE_NOT_FOUND returns 404 - **20 min**
- [ ] Write error test: TOOL_NOT_FOUND returns 404 - **20 min**
- [ ] Write error test: execution error returns 500 - **15 min**
- [ ] Write error test: timeout returns 504 - **20 min**
- [ ] Write error test: infers 404 from "not found" message - **20 min**
- [ ] Run tests, debug failures - **30-60 min**

**Dependencies:** Phase 1 JWT middleware (for auth tests)
**Can be done in parallel with:** Phase 2 quality work (use mocks initially)

---

#### POST /:address/:method (2-3 hours)
- [ ] Write test: constructs o:// address from URL param - **30 min**
- [ ] Write test: uses request body as params - **20 min**
- [ ] Write test: executes successfully - **20 min**
- [ ] Write test: handles invalid address characters - **20 min**
- [ ] Write test: returns 404 for non-existent method - **20 min**
- [ ] Write test: validates params structure - **20 min**
- [ ] Run tests, debug failures - **30-60 min**

**Dependencies:** Same as POST /use
**Can be done in parallel with:** POST /use tests

---

#### POST /use/stream (2-3 hours)
- [ ] Write test: sets SSE headers - **30 min**
- [ ] Write test: streams complete event with result - **30 min**
- [ ] Write test: handles errors in stream - **30 min**
- [ ] Write test: validates address required - **15 min**
- [ ] Write test: closes connection properly - **20 min**
- [ ] Run tests, debug failures - **30-60 min**

**Dependencies:** Phase 2 streaming implementation (TODO in code)
**Can be done in parallel with:** Other endpoint tests
**Note:** May need to wait for Phase 2 to complete streaming TODO

---

### Phase 3C: Security Tests (Days 3-6)

**Total: 4-6 hours**

#### JWT Middleware Tests (2-3 hours)
- [ ] Write test: valid token passes - **20 min**
- [ ] Write test: missing token returns 401 - **15 min**
- [ ] Write test: expired token returns 401 - **20 min**
- [ ] Write test: invalid signature returns 401 - **20 min**
- [ ] Write test: malformed token returns 401 - **15 min**
- [ ] Write test: wrong issuer returns 401 - **20 min**
- [ ] Write test: wrong audience returns 401 - **20 min**
- [ ] Run tests, debug failures - **30-60 min**

**Dependencies:** Phase 1 JWT middleware implementation (BLOCKING)
**Can be done in parallel with:** Nothing (must wait for Phase 1)

---

#### Input Validation Tests (2-3 hours)
- [ ] Write test: blocks SQL injection in address - **20 min**
- [ ] Write test: blocks NoSQL injection in address - **20 min**
- [ ] Write test: blocks path traversal - **20 min**
- [ ] Write test: blocks method injection (__proto__) - **20 min**
- [ ] Write test: blocks constructor injection - **15 min**
- [ ] Write test: rejects malformed JSON - **15 min**
- [ ] Write test: rejects oversized payloads - **20 min**
- [ ] Write test: blocks prototype pollution - **20 min**
- [ ] Write test: sanitizes XSS in address - **20 min**
- [ ] Run tests, debug failures - **30-60 min**

**Dependencies:** Phase 1 input validation implementation (BLOCKING)
**Can be done in parallel with:** JWT tests (if both Phase 1 features ready)

---

### Phase 3D: Error Handling Tests (Days 4-6)

**Total: 1.5-2 hours**

- [ ] Write test: no stack traces in production - **15 min**
- [ ] Write test: generic messages in production - **15 min**
- [ ] Write test: exposes details in development - **15 min**
- [ ] Write test: consistent error format - **15 min**
- [ ] Write test: maps NODE_NOT_FOUND to 404 - **10 min**
- [ ] Write test: maps TOOL_NOT_FOUND to 404 - **10 min**
- [ ] Write test: maps INVALID_PARAMS to 400 - **10 min**
- [ ] Write test: maps TIMEOUT to 504 - **10 min**
- [ ] Write test: maps EXECUTION_ERROR to 500 - **10 min**
- [ ] Run tests, debug failures - **20-30 min**

**Dependencies:** Phase 2 error handler improvements (BLOCKING)
**Can be done in parallel with:** Integration tests (if Phase 2 ready)

---

### Phase 3E: Integration Tests (Days 5-7)

**Total: 3-4 hours**

- [ ] Write test: server starts successfully - **20 min**
- [ ] Write test: rejects duplicate start - **20 min**
- [ ] Write test: handles port conflicts - **20 min**
- [ ] Write test: propagates node errors - **20 min**
- [ ] Write test: stops server cleanly - **15 min**
- [ ] Write test: handles stop when not started - **15 min**
- [ ] Write test: handles request timeout - **30 min**
- [ ] Write test: drains connections on shutdown - **30 min**
- [ ] Write test: health check reflects actual status - **15 min**
- [ ] Run tests, debug failures - **45-60 min**

**Dependencies:** Phase 2 graceful shutdown, timeouts (BLOCKING)
**Can be done in parallel with:** Nothing (must wait for Phase 2)

---

### Phase 3F: Dependencies Update (Days 1-2)

**Total: 2-3 hours**

- [ ] Update express to 4.21.2 - **15 min**
- [ ] Run pnpm audit, verify no critical CVEs - **15 min**
- [ ] Update TypeScript to 5.7.3 (optional) - **15 min**
- [ ] Verify Jest version, downgrade if needed - **30 min**
- [ ] Run all tests with updated dependencies - **30 min**
- [ ] Fix any breaking changes - **30-60 min**
- [ ] Commit lock file (pnpm-lock.yaml) - **5 min**
- [ ] Add pnpm audit to CI/CD - **30 min**

**Dependencies:** None
**Can be done in parallel with:** Test infrastructure setup

---

### Phase 3G: Cloudflare Configuration (Days 6-7)

**Total: 2-3 hours**

- [ ] Configure SSL mode (Full) - **15 min**
- [ ] Set up rate limiting rules - **30 min**
- [ ] Configure health check endpoint - **15 min**
- [ ] Set up firewall rules - **20 min**
- [ ] Test through Cloudflare staging - **30 min**
- [ ] Test rate limiting - **15 min**
- [ ] Verify X-Forwarded-For header - **15 min**
- [ ] Document Cloudflare configuration - **30 min**

**Dependencies:** All tests passing, server deployed to staging
**Can be done in parallel with:** Nothing (final step)

---

### Phase 3H: Production Checklist (Day 7)

**Total: 1-2 hours**

- [ ] Verify test coverage ≥ 70% - **15 min**
- [ ] Run full test suite, verify 100% passing - **15 min**
- [ ] Run pnpm audit, verify clean - **10 min**
- [ ] Verify TypeScript strict mode enabled - **10 min**
- [ ] Verify no `any` types in production code - **15 min**
- [ ] Review error handling (no stack traces) - **15 min**
- [ ] Document environment variables - **20 min**
- [ ] Create deployment plan - **20 min**
- [ ] Create rollback plan - **20 min**

**Dependencies:** All above phases complete
**Can be done in parallel with:** Nothing (final verification)

---

## Summary: Total Effort Estimates

### By Phase

| Phase | Description | Effort | Timeline |
|-------|-------------|--------|----------|
| 3A | Test Infrastructure | 2-3h | Days 1-2 |
| 3B | Endpoint Tests | 8-10h | Days 2-5 |
| 3C | Security Tests | 4-6h | Days 3-6 |
| 3D | Error Handling Tests | 1.5-2h | Days 4-6 |
| 3E | Integration Tests | 3-4h | Days 5-7 |
| 3F | Dependencies Update | 2-3h | Days 1-2 |
| 3G | Cloudflare Config | 2-3h | Days 6-7 |
| 3H | Production Checklist | 1-2h | Day 7 |
| **TOTAL** | **24-33 hours** | **7-10 days** |

### Critical Path

**Longest dependency chain (blocking):**

```
Day 1-2: Test Infrastructure (2-3h)
  ↓
Day 2-3: Phase 1 implements JWT (outside Phase 3)
  ↓
Day 3-4: JWT Middleware Tests (2-3h)
  ↓
Day 4-5: Phase 1 implements validation (outside Phase 3)
  ↓
Day 5-6: Input Validation Tests (2-3h)
  ↓
Day 6-7: Phase 2 implements graceful shutdown (outside Phase 3)
  ↓
Day 7: Integration Tests (3-4h)
  ↓
Day 8: Cloudflare Config (2-3h)
  ↓
Day 9: Production Checklist (1-2h)

TOTAL CRITICAL PATH: ~15-20 hours over 9 days
```

**Parallel work:**
- Endpoint tests (8-10h) can be done in parallel with Phase 1/2 work
- Dependencies update (2-3h) can be done in parallel with test infrastructure
- Error handling tests (1.5-2h) can be done in parallel with integration tests

---

## Overall v0.8.0 Timeline

### All Three Phases

| Phase | Description | Effort | Timeline | Dependencies |
|-------|-------------|--------|----------|--------------|
| **Phase 1** | Security (JWT, validation) | 18-24h | Week 1 (5-7 days) | None |
| **Phase 2** | Quality (TS, debug, shutdown) | 16-20h | Week 1-2 (5-7 days) | Partial Phase 1 |
| **Phase 3** | Testing & Deployment | 24-33h | Week 2 (7-10 days) | Phases 1 & 2 |
| **Integration** | Merge & test all phases | 4-6h | Week 2-3 (2-3 days) | All phases |
| **TOTAL** | **62-83 hours** | **19-27 days** | **3-4 weeks** |

### Conservative Timeline (1 developer, part-time)

- **Week 1:** Phase 1 (Security)
- **Week 2:** Phase 2 (Quality) + start Phase 3 (Testing infrastructure)
- **Week 3:** Phase 3 (Testing) + Integration
- **Week 4:** Cloudflare config + Production deployment

**Total: 4 weeks**

### Aggressive Timeline (1 developer, full-time)

- **Week 1:** Phases 1 & 2 in parallel
- **Week 2:** Phase 3 (Testing) + Integration
- **Week 3:** Cloudflare config + Production deployment

**Total: 2-3 weeks**

### Optimal Timeline (2 developers)

- **Developer A:** Phase 1 (Security) → Phase 3 Security Tests
- **Developer B:** Phase 2 (Quality) → Phase 3 Endpoint/Integration Tests
- **Both:** Integration + Deployment

**Total: 2 weeks**

---

## Conclusion

This comprehensive testing and deployment plan ensures @olane/o-server reaches production readiness with:

1. **70-85% test coverage** covering all critical paths
2. **Security verified** through JWT and input validation tests
3. **Integration tested** with lifecycle and request flow tests
4. **Dependencies updated** with CVEs fixed
5. **Cloudflare configured** for edge security
6. **Production checklist** complete

**Next Steps:**

1. Review and approve this plan
2. Set up git worktrees for parallel development
3. Begin Phase 3A (Test Infrastructure)
4. Write tests as TDD for Phases 1 & 2
5. Integrate all phases on feat/v0.8.0-integration branch
6. Deploy to staging and test through Cloudflare
7. Complete production checklist
8. Deploy to production with confidence

**Production deployment is achievable in 2-4 weeks with this structured approach.**
