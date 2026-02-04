import { createJwtMiddleware, JwtConfig } from '../src/middleware/jwt-auth.js';
import { sanitizeErrorMessage } from '../src/middleware/error-handler.js';
import { expect } from 'aegir/chai';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('JWT Authentication', () => {
  // Test keys
  const testSecret = 'test-secret-key-for-hs256';

  // Generate RSA key pair for testing
  const rsaPrivateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/vLMOT+2FnPB3xCLnRvCmFJQFmXwJvHFM
qUBMQFmG+hCDaS3o6JdBk0xKyLpXCzRjv1hpT+0tFQjZWVDZDUVnAJBBKFxhDMQi
yPnCpVj6x5C6vYmXlN6WVdKaZG3hqjjyXRWqJxB2tIfPPHrNnRpqWvfJJFVH3WJ3
VvkNLWcPqJ6w3LpHPKvqkJCUGLpLYLQHDHqRbWlh2M8OPzKPdLQHDqTlLXqJLHBY
j+aKxQP8l7GzKC8LJNlQFEsKHLwNXM+vL9QJXlQxBVKP9m8IJQVJKH3m8xPqYLmQ
z9aQG7PkLxHvKF7RqnLQJLYQF8L9QxGxYH3QDwIDAQABAoIBAFDXkqLxjJQFZwp4
zLl2KJvXd1YqqCJDd1qXxmLxPQFMBd8xPXJYLCUQR0l2Ek7Fx6l0Y8L+QYXm8cAq
gLqLXdPqJgGNmKLFXqV2YQHqG8CqLJPKqLXdPQFMBd8xP3JYLCUQRql2Ek7Fx6l0
Y8L+QYXm8cAqgLqLXdPqJgGNmKLFXqV2YQHqG8CqLJPKqLXdPQFMBd8xP3JYLCUQ
R0l2Ek7Fx6l0Y8L+QYXm8cAqgLqLXdPqJgGNmKLFXqV2YQHqG8CqLJPKqLXdPQFM
Bd8xP3JYLCUQR0l2Ek7Fx6l0Y8L+QYXm8cAqgLqLXdPqJgGNmKLFXqV2YQHqG8Cq
LJPKqLXdECgYEA8qZLV3PqJ9CqLJPKqLXdPQFMBd8xP3JYLCUQR0l2Ek7Fx6l0Y8
L+QYXm8cAqgLqLXdPqJgGNmKLFXqV2YQHqG8CqLJPKqLXdPQFMBd8xP3JYLCUQR0
l2Ek7Fx6ECgYEA3QHqG8CqLJPKqLXdPQFMBd8xP3JYLCUQR0l2Ek7Fx6l0Y8L+QY
Xm8cAqgLqLXdPqJgGNmKLFXqV2YQHqG8CqLJPKqLXdPQFMBd8xP3JYLCUQR0l2Ek
7Fx6l0CgYAYQHqG8CqLJPKqLXdPQFMBd8xP3JYLCUQR0l2Ek7Fx6l0Y8L+QYXm8c
AqgLqLXdPqJgGNmKLFXqV2YQHqG8CqLJPKqLXdPQFMBd8xP3JYLCUQR0l2Ek7Fx6
l0Y8L+QYXm8cAqgLqLXdPqJgGNmKLFXqV2YQHqG8CqLJPKqLXdPQFMBd8xP3JYLC
UQECCL+QYXm8cAqgLqLXdPqJgGNmKLFXqV2YQHqG8CqLJPKqLXdPQFMBd8xP3JY
LCUQECgYEAwQHqG8CqLJPKqLXdPQFMBd8xP3JYLCUQR0l2Ek7Fx6l0Y8L+QYXm8c
AqgLqLXdPqJgGNmKLFXqV2YQHqG8CqLJPKqLXdPQFMBd8xP3JYLCUQR0l2Ek7Fx6
l0Y8L+QYXm8cAqgLqLXdPqJgGNmKLFXqV2YQHqG8CqLJPKqLXdPQFMBd8xP3JYLC
UQE=
-----END RSA PRIVATE KEY-----`;

  const rsaPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xfn/vLMO
T+2FnPB3xCLnRvCmFJQFmXwJvHFMqUBMQFmG+hCDaS3o6JdBk0xKyLpXCzRjv1hp
T+0tFQjZWVDZDUVnAJBBKFxhDMQiyPnCpVj6x5C6vYmXlN6WVdKaZG3hqjjyXRWq
JxB2tIfPPHrNnRpqWvfJJFVH3WJ3VvkNLWcPqJ6w3LpHPKvqkJCUGLpLYLQHDHqR
bWlh2M8OPzKPdLQHDqTlLXqJLHBYj+aKxQP8l7GzKC8LJNlQFEsKHLwNXM+vL9QJ
XlQxBVKP9m8IJQVJKH3m8xPqYLmQz9aQG7PkLxHvKF7RqnLQJLYQF8L9QxGxYH3Q
DwIDAQAB
-----END PUBLIC KEY-----`;

  let tmpDir: string;
  let publicKeyPath: string;

  before(() => {
    // Create temp directory for test files
    tmpDir = join(tmpdir(), 'o-server-jwt-test-' + Date.now());
    mkdirSync(tmpDir, { recursive: true });

    // Write public key to file
    publicKeyPath = join(tmpDir, 'public-key.pem');
    writeFileSync(publicKeyPath, rsaPublicKey);
  });

  after(() => {
    // Cleanup temp files
    try {
      unlinkSync(publicKeyPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  // Helper to create mock Express request/response/next
  function createMockReq(authHeader?: string): Request {
    return {
      headers: authHeader ? { authorization: authHeader } : {},
      path: '/api/v1/use',
    } as Request;
  }

  function createMockRes(): Response {
    return {} as Response;
  }

  function createMockNext(): { next: NextFunction; error?: any } {
    const mock = {
      next: (err?: any) => {
        if (err) {
          mock.error = err;
        }
      },
      error: undefined,
    };
    return mock;
  }

  describe('Valid Token Tests', () => {
    it('should accept valid RS256 token', async () => {
      const token = jwt.sign(
        {
          sub: 'user123',
          iss: 'test-issuer',
          aud: 'test-audience',
        },
        rsaPrivateKey,
        { algorithm: 'RS256', expiresIn: '1h' }
      );

      const config: JwtConfig = {
        method: 'publicKey',
        publicKeyPath,
        issuer: 'test-issuer',
        audience: 'test-audience',
      };

      const middleware = createJwtMiddleware(config);
      const req = createMockReq(`Bearer ${token}`);
      const res = createMockRes();
      const { next, error } = createMockNext();

      await middleware(req, res, next);

      expect(error).to.be.undefined;
      expect((req as any).jwt).to.exist;
      expect((req as any).jwt.sub).to.equal('user123');
    });

    it('should accept valid HS256 token', async () => {
      const token = jwt.sign(
        {
          sub: 'user456',
          iss: 'test-issuer',
          aud: 'test-audience',
        },
        testSecret,
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      const config: JwtConfig = {
        method: 'secret',
        secret: testSecret,
        issuer: 'test-issuer',
        audience: 'test-audience',
      };

      const middleware = createJwtMiddleware(config);
      const req = createMockReq(`Bearer ${token}`);
      const res = createMockRes();
      const { next, error } = createMockNext();

      await middleware(req, res, next);

      expect(error).to.be.undefined;
      expect((req as any).jwt).to.exist;
      expect((req as any).jwt.sub).to.equal('user456');
    });

    it('should validate all claims correctly', async () => {
      const token = jwt.sign(
        {
          sub: 'user789',
          iss: 'test-issuer',
          aud: 'test-audience',
          customClaim: 'customValue',
        },
        testSecret,
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      const config: JwtConfig = {
        method: 'secret',
        secret: testSecret,
        issuer: 'test-issuer',
        audience: 'test-audience',
      };

      const middleware = createJwtMiddleware(config);
      const req = createMockReq(`Bearer ${token}`);
      const res = createMockRes();
      const { next, error } = createMockNext();

      await middleware(req, res, next);

      expect(error).to.be.undefined;
      expect((req as any).jwt).to.exist;
      expect((req as any).jwt.sub).to.equal('user789');
      expect((req as any).jwt.iss).to.equal('test-issuer');
      expect((req as any).jwt.aud).to.equal('test-audience');
      expect((req as any).jwt.customClaim).to.equal('customValue');
    });

    it('should make token payload accessible in req.user', async () => {
      const token = jwt.sign(
        {
          sub: 'user999',
          name: 'Test User',
        },
        testSecret,
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      const config: JwtConfig = {
        method: 'secret',
        secret: testSecret,
      };

      const middleware = createJwtMiddleware(config);
      const req = createMockReq(`Bearer ${token}`);
      const res = createMockRes();
      const { next, error } = createMockNext();

      await middleware(req, res, next);

      expect(error).to.be.undefined;
      expect((req as any).user).to.exist;
      expect((req as any).user.userId).to.equal('user999');
      expect((req as any).user.sub).to.equal('user999');
      expect((req as any).user.name).to.equal('Test User');
    });
  });

  describe('Invalid Token Tests', () => {
    it('should reject request with missing Authorization header', async () => {
      const config: JwtConfig = {
        method: 'secret',
        secret: testSecret,
      };

      const middleware = createJwtMiddleware(config);
      const req = createMockReq(); // No auth header
      const res = createMockRes();
      const { next, error } = createMockNext();

      await middleware(req, res, next);

      expect(error).to.exist;
      expect(error.code).to.equal('MISSING_TOKEN');
      expect(error.status).to.equal(401);
      expect(error.message).to.contain('No authorization token');
    });

    it('should reject malformed header (no Bearer prefix)', async () => {
      const token = jwt.sign({ sub: 'user123' }, testSecret, { expiresIn: '1h' });

      const config: JwtConfig = {
        method: 'secret',
        secret: testSecret,
      };

      const middleware = createJwtMiddleware(config);
      const req = createMockReq(token); // No "Bearer " prefix
      const res = createMockRes();
      const { next, error } = createMockNext();

      await middleware(req, res, next);

      expect(error).to.exist;
      expect(error.code).to.equal('INVALID_TOKEN_FORMAT');
      expect(error.status).to.equal(401);
      expect(error.message).to.contain('Invalid authorization format');
    });

    it('should reject expired token', async () => {
      const token = jwt.sign(
        { sub: 'user123' },
        testSecret,
        { algorithm: 'HS256', expiresIn: '-1h' } // Already expired
      );

      const config: JwtConfig = {
        method: 'secret',
        secret: testSecret,
      };

      const middleware = createJwtMiddleware(config);
      const req = createMockReq(`Bearer ${token}`);
      const res = createMockRes();
      const { next, error } = createMockNext();

      await middleware(req, res, next);

      expect(error).to.exist;
      expect(error.code).to.equal('TOKEN_EXPIRED');
      expect(error.status).to.equal(401);
      expect(error.message).to.contain('expired');
    });

    it('should reject token not yet valid (nbf)', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
      const token = jwt.sign(
        {
          sub: 'user123',
          nbf: futureTime,
        },
        testSecret,
        { algorithm: 'HS256', expiresIn: '2h' }
      );

      const config: JwtConfig = {
        method: 'secret',
        secret: testSecret,
      };

      const middleware = createJwtMiddleware(config);
      const req = createMockReq(`Bearer ${token}`);
      const res = createMockRes();
      const { next, error } = createMockNext();

      await middleware(req, res, next);

      expect(error).to.exist;
      expect(error.code).to.equal('TOKEN_NOT_ACTIVE');
      expect(error.status).to.equal(401);
      expect(error.message).to.contain('not yet valid');
    });

    it('should reject token with invalid signature', async () => {
      const token = jwt.sign({ sub: 'user123' }, 'wrong-secret', { expiresIn: '1h' });

      const config: JwtConfig = {
        method: 'secret',
        secret: testSecret,
      };

      const middleware = createJwtMiddleware(config);
      const req = createMockReq(`Bearer ${token}`);
      const res = createMockRes();
      const { next, error } = createMockNext();

      await middleware(req, res, next);

      expect(error).to.exist;
      expect(error.code).to.equal('INVALID_TOKEN');
      expect(error.status).to.equal(401);
    });

    it('should reject token with wrong issuer', async () => {
      const token = jwt.sign(
        {
          sub: 'user123',
          iss: 'wrong-issuer',
        },
        testSecret,
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      const config: JwtConfig = {
        method: 'secret',
        secret: testSecret,
        issuer: 'expected-issuer',
      };

      const middleware = createJwtMiddleware(config);
      const req = createMockReq(`Bearer ${token}`);
      const res = createMockRes();
      const { next, error } = createMockNext();

      await middleware(req, res, next);

      expect(error).to.exist;
      expect(error.code).to.equal('INVALID_TOKEN');
      expect(error.status).to.equal(401);
    });

    it('should reject token with wrong audience', async () => {
      const token = jwt.sign(
        {
          sub: 'user123',
          aud: 'wrong-audience',
        },
        testSecret,
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      const config: JwtConfig = {
        method: 'secret',
        secret: testSecret,
        audience: 'expected-audience',
      };

      const middleware = createJwtMiddleware(config);
      const req = createMockReq(`Bearer ${token}`);
      const res = createMockRes();
      const { next, error } = createMockNext();

      await middleware(req, res, next);

      expect(error).to.exist;
      expect(error.code).to.equal('INVALID_TOKEN');
      expect(error.status).to.equal(401);
    });

    it('should reject token with unsupported algorithm', async () => {
      const token = jwt.sign(
        { sub: 'user123' },
        testSecret,
        { algorithm: 'HS512', expiresIn: '1h' }
      );

      const config: JwtConfig = {
        method: 'secret',
        secret: testSecret,
        algorithms: ['HS256'], // Only HS256 allowed
      };

      const middleware = createJwtMiddleware(config);
      const req = createMockReq(`Bearer ${token}`);
      const res = createMockRes();
      const { next, error } = createMockNext();

      await middleware(req, res, next);

      expect(error).to.exist;
      expect(error.code).to.equal('INVALID_TOKEN');
      expect(error.status).to.equal(401);
    });
  });

  describe('Configuration Tests', () => {
    it('should work with RS256 and public key file', async () => {
      const token = jwt.sign(
        { sub: 'user123' },
        rsaPrivateKey,
        { algorithm: 'RS256', expiresIn: '1h' }
      );

      const config: JwtConfig = {
        method: 'publicKey',
        publicKeyPath,
      };

      const middleware = createJwtMiddleware(config);
      const req = createMockReq(`Bearer ${token}`);
      const res = createMockRes();
      const { next, error } = createMockNext();

      await middleware(req, res, next);

      expect(error).to.be.undefined;
      expect((req as any).jwt).to.exist;
    });

    it('should work with HS256 and secret', async () => {
      const token = jwt.sign(
        { sub: 'user123' },
        testSecret,
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      const config: JwtConfig = {
        method: 'secret',
        secret: testSecret,
      };

      const middleware = createJwtMiddleware(config);
      const req = createMockReq(`Bearer ${token}`);
      const res = createMockRes();
      const { next, error } = createMockNext();

      await middleware(req, res, next);

      expect(error).to.be.undefined;
      expect((req as any).jwt).to.exist;
    });

    it('should respect clock tolerance for exp/nbf', async () => {
      // Token expires in 3 seconds
      const token = jwt.sign(
        { sub: 'user123' },
        testSecret,
        { algorithm: 'HS256', expiresIn: '3s' }
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 4000));

      const config: JwtConfig = {
        method: 'secret',
        secret: testSecret,
        clockTolerance: 10, // 10 second tolerance
      };

      const middleware = createJwtMiddleware(config);
      const req = createMockReq(`Bearer ${token}`);
      const res = createMockRes();
      const { next, error } = createMockNext();

      await middleware(req, res, next);

      // Should pass because of clock tolerance
      expect(error).to.be.undefined;
      expect((req as any).jwt).to.exist;
    });
  });

  describe('Error Message Sanitization', () => {
    let originalNodeEnv: string | undefined;

    beforeEach(() => {
      originalNodeEnv = process.env.NODE_ENV;
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should sanitize MISSING_TOKEN in production', () => {
      process.env.NODE_ENV = 'production';
      const result = sanitizeErrorMessage('MISSING_TOKEN', 'No authorization token provided');
      expect(result).to.equal('Authentication required');
    });

    it('should sanitize INVALID_TOKEN_FORMAT in production', () => {
      process.env.NODE_ENV = 'production';
      const result = sanitizeErrorMessage('INVALID_TOKEN_FORMAT', 'Invalid authorization format');
      expect(result).to.equal('Invalid authentication format');
    });

    it('should sanitize TOKEN_EXPIRED in production', () => {
      process.env.NODE_ENV = 'production';
      const result = sanitizeErrorMessage('TOKEN_EXPIRED', 'Token has expired');
      expect(result).to.equal('Authentication token has expired');
    });

    it('should sanitize TOKEN_NOT_ACTIVE in production', () => {
      process.env.NODE_ENV = 'production';
      const result = sanitizeErrorMessage('TOKEN_NOT_ACTIVE', 'Token is not yet valid');
      expect(result).to.equal('Authentication token not yet valid');
    });

    it('should sanitize INVALID_TOKEN in production', () => {
      process.env.NODE_ENV = 'production';
      const result = sanitizeErrorMessage('INVALID_TOKEN', 'Token verification failed');
      expect(result).to.equal('Invalid authentication token');
    });
  });
});
