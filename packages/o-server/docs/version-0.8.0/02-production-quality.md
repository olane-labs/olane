# o-server v0.8.0 - Production Code Quality

**Phase**: 2 of 3
**Focus**: Production Code Quality & Reliability
**Date**: January 29, 2026
**Status**: Planning

---

## 1. Executive Summary

### Purpose of This Phase

Version 0.8.0 Phase 2 focuses on elevating code quality to production standards. Building on the security foundations from Phase 1, this phase addresses technical debt, improves maintainability, and ensures reliability under production conditions.

**Why This Matters**:
- Code quality directly impacts reliability and maintainability
- Production deployments require proper error handling and logging
- Type safety prevents runtime errors and enables safe refactoring
- Graceful handling of edge cases improves user experience
- Clean, consistent code reduces onboarding time for new developers

### Key Quality Improvements

| Category | Current State | Target State |
|----------|---------------|--------------|
| **Logging** | Console-based (dev only) | Debug package with namespaces |
| **Type Safety** | ~40% (strict mode off, 17+ `any`) | 95%+ (strict mode on, zero `any`) |
| **Request Timeouts** | None (infinite hang risk) | 30s default, configurable |
| **Graceful Shutdown** | Hard stop (drops connections) | Connection draining with timeout |
| **Error Handling** | Inconsistent, uses `any` | Structured error classes |
| **Code Duplication** | High (duplicate routes) | Extracted common patterns |
| **Code Quality** | 6.5/10 | 9/10 |

### Key Design Decisions

**Logging Strategy**: Use existing `debug` package (already in dependencies) rather than adding pino/winston. This aligns with the simplified scope:
- Debug package is production-ready and lightweight
- Already installed but not yet utilized
- Zero additional dependencies needed
- Supports namespaces for granular control
- Production deployment: Cloudflare handles infrastructure concerns

**Scope Boundaries**:
- ✅ **In Scope**: Code quality, reliability, maintainability
- ❌ **Out of Scope**: Rate limiting (Cloudflare), DDoS protection (Cloudflare), TLS (Cloudflare)
- ❌ **Out of Scope**: Metrics/observability (future phase), advanced monitoring (future phase)

### Estimated Effort and Timeline

**Total Effort**: 32-40 hours (1 week with parallel development)

**Critical Path**: ~20 hours sequential work
**Parallelizable Work**: 12-20 hours across 4 independent streams

**Timeline with Single Developer**: 1 week (5 working days)
**Timeline with Parallel Development**: 3-4 days (using git worktrees)

**Breakdown**:
- Debug Package Optimization: 4-6 hours (Stream 1)
- TypeScript Strict Mode: 10-12 hours (Stream 2)
- Request Timeouts: 3-4 hours (Stream 3)
- Graceful Shutdown: 4-5 hours (Stream 3)
- Error Handling: 6-8 hours (Stream 4, depends on TypeScript)
- Code Cleanup: 5-6 hours (Stream 5)

---

## 2. Debug Package Optimization

### Current Usage

**Status**: Debug package installed but NOT utilized
- Package exists in `dependencies` (v4.4.1)
- No imports in codebase
- Current logging uses console.log/console.error directly
- No namespace strategy
- No production-safe logging patterns

**Current Logger Implementation** (`utils/logger.ts`):
```typescript
export class ServerLogger {
  private debug: boolean;

  constructor(debug: boolean = false) {
    this.debug = debug;
  }

  log(...args: any[]) {
    console.log('[o-server]', ...args);
  }

  error(...args: any[]) {
    console.error('[o-server ERROR]', ...args);
  }

  debugLog(...args: any[]) {
    if (this.debug) {
      console.log('[o-server DEBUG]', ...args);
    }
  }
}
```

**Problems**:
- Uses `any[]` types (loses type safety)
- No structured logging
- No namespaces for different modules
- Manual debug flag checking
- Could accidentally log sensitive data

### Namespace Strategy

**Recommended Namespace Hierarchy**:
```
o-server              # General server operations
o-server:main         # Server lifecycle (start/stop)
o-server:routes       # Route handling
o-server:use          # /use endpoint
o-server:stream       # /use/stream endpoint
o-server:auth         # Authentication
o-server:errors       # Error handling
o-server:jwt          # JWT operations (from Phase 1)
o-server:health       # Health check operations
```

**Usage Examples**:
```typescript
// Main server operations
const debug = Debug('o-server:main');
debug('Server starting on port %d', 3000);

// Route handling
const debugRoutes = Debug('o-server:routes');
debugRoutes('POST /use - address: %s, method: %s', address, method);

// Error handling
const debugErrors = Debug('o-server:errors');
debugErrors('Error mapping: %s -> HTTP %d', error.code, httpStatus);

// JWT operations
const debugJWT = Debug('o-server:jwt');
debugJWT('Verifying token for user: %s', userId);
```

**Enable in Production**:
```bash
# Enable all o-server logs
DEBUG=o-server:* node dist/index.js

# Enable only specific namespaces
DEBUG=o-server:errors,o-server:jwt node dist/index.js

# Disable debug output (default)
node dist/index.js
```

### Production Safety

**Critical Rules**:
1. **Never log sensitive data**: passwords, tokens, API keys, PII
2. **Use structured format strings**: Avoid string concatenation
3. **Log at appropriate level**: Debug vs error distinction
4. **Redact sensitive fields**: Use safe object logging

**Implementation Pattern**:
```typescript
import Debug from 'debug';

const debug = Debug('o-server:auth');

// ✅ GOOD - Structured, safe
debug('User authentication attempt: userId=%s', userId);
debug('JWT verification result: valid=%s, expiresIn=%d', isValid, expiresIn);

// ❌ BAD - Logs sensitive data
debug('User authentication attempt', { password, token }); // DON'T DO THIS

// ✅ GOOD - Redacted sensitive fields
debug('Auth request: %O', {
  userId,
  headers: {
    ...headers,
    authorization: '[REDACTED]',
  },
});

// ✅ GOOD - Error logging without stack traces to user
const debugError = Debug('o-server:errors');
debugError('Error occurred: code=%s, status=%d', error.code, error.status);
// Stack trace goes to debug log, not to user response
```

**Safe Logging Helper**:
```typescript
// utils/safe-logger.ts
import Debug from 'debug';

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'authorization',
  'cookie',
  'secret',
];

export function createSafeDebugger(namespace: string) {
  const debug = Debug(namespace);

  return {
    log(message: string, ...args: unknown[]) {
      debug(message, ...args);
    },

    logObject(message: string, obj: Record<string, unknown>) {
      const safe = redactSensitiveFields(obj);
      debug(message + ': %O', safe);
    },

    error(message: string, error: Error) {
      // Log full error to debug (including stack)
      debug('ERROR: ' + message + ': %O', {
        message: error.message,
        code: (error as any).code,
        stack: error.stack,
      });
    },
  };
}

function redactSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.some(field =>
      key.toLowerCase().includes(field.toLowerCase())
    )) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitiveFields(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}
```

### Configuration

**Environment Variable Usage**:
```bash
# Development - enable all debug output
DEBUG=o-server:* npm run dev

# Production - disable debug (default)
npm start

# Production debugging - enable specific namespaces
DEBUG=o-server:errors,o-server:auth npm start

# Debug output to file
DEBUG=o-server:* npm start 2>&1 | tee server.log

# Wildcard patterns
DEBUG=o-server:*,-o-server:health npm start  # All except health checks
```

**Package.json Scripts Update**:
```json
{
  "scripts": {
    "dev": "DEBUG=o-server:* tsx src/index.ts",
    "dev:verbose": "DEBUG=* tsx src/index.ts",
    "start": "node dist/index.js",
    "start:debug": "DEBUG=o-server:* node dist/index.js"
  }
}
```

### Best Practices

**When to use debug vs console.error**:

| Scenario | Use | Example |
|----------|-----|---------|
| Normal operation flow | `debug()` | Request received, processing started |
| Detailed diagnostics | `debug()` | Parameter values, intermediate results |
| Development info | `debug()` | Function entry/exit, state changes |
| Critical errors | `console.error()` | Unhandled exceptions, startup failures |
| Operational errors | `debug.error()` | Expected errors, validation failures |
| Never use | `console.log()` | Avoid in all production code |

**Recommended Pattern**:
```typescript
import Debug from 'debug';

const debug = Debug('o-server:use');
const debugError = Debug('o-server:errors');

async function handleUseRequest(req: Request, res: Response) {
  debug('Handling /use request: address=%s, method=%s', address, method);

  try {
    const result = await node.use(address, { method, params });
    debug('Request completed successfully');
    return result;
  } catch (error) {
    // Log detailed error to debug output
    debugError('Request failed: %O', {
      address,
      method,
      error: error instanceof Error ? error.message : String(error),
    });

    // Critical errors also to console.error for alerting
    if (isCriticalError(error)) {
      console.error('[o-server CRITICAL]', error);
    }

    throw error;
  }
}
```

### Testing Requirements

**Test Cases**:
1. **Verify debug output is controlled by DEBUG env var**
   - Test: Debug disabled by default
   - Test: Debug enabled with DEBUG=o-server:*
   - Test: Selective namespace filtering works

2. **Verify no sensitive data leaks**
   - Test: Passwords never logged
   - Test: Tokens/API keys redacted
   - Test: Authorization headers masked
   - Test: Error messages don't contain sensitive data

3. **Verify namespace isolation**
   - Test: o-server:auth logs only auth messages
   - Test: o-server:errors logs only errors
   - Test: Wildcard patterns work correctly

4. **Performance testing**
   - Test: Disabled debug has zero overhead
   - Test: Enabled debug doesn't slow critical paths

**Test Implementation**:
```typescript
describe('Debug Package Integration', () => {
  beforeEach(() => {
    delete process.env.DEBUG;
  });

  it('should not produce debug output by default', () => {
    const output = captureConsoleOutput(() => {
      const debug = Debug('o-server:test');
      debug('test message');
    });
    expect(output).toBe('');
  });

  it('should produce output when DEBUG is set', () => {
    process.env.DEBUG = 'o-server:*';
    const output = captureConsoleOutput(() => {
      const debug = Debug('o-server:test');
      debug('test message');
    });
    expect(output).toContain('test message');
  });

  it('should never log sensitive fields', () => {
    process.env.DEBUG = 'o-server:*';
    const output = captureConsoleOutput(() => {
      const logger = createSafeDebugger('o-server:test');
      logger.logObject('auth', {
        userId: '123',
        password: 'secret123',
        apiKey: 'key-abc',
      });
    });

    expect(output).toContain('userId');
    expect(output).not.toContain('secret123');
    expect(output).not.toContain('key-abc');
    expect(output).toContain('[REDACTED]');
  });
});
```

### Effort Estimate

**Total: 4-6 hours**

**Breakdown**:
- Replace ServerLogger with debug package: 1 hour
- Implement safe logging helper: 1 hour
- Update all callsites with namespaces: 1-2 hours
- Testing and verification: 1 hour
- Documentation: 0.5-1 hour

**Files to Modify**:
- `src/utils/logger.ts` - Rewrite with debug package
- `src/o-server.ts` - Update logging calls
- `src/middleware/error-handler.ts` - Update logging
- `src/middleware/auth.ts` - Update logging
- `package.json` - Update scripts
- `README.md` - Document DEBUG usage

---

## 3. TypeScript Strict Mode

### Current State

**tsconfig.json Status**:
```json
{
  "extends": "@tsconfig/node20/tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "module": "ESNext",
    "target": "ES2020",
    "moduleResolution": "node",
    // ❌ Missing: strict mode and related flags
  }
}
```

**Problems**:
- ❌ No `strict: true` flag
- ❌ No `noImplicitAny`
- ❌ No `strictNullChecks`
- ❌ No `noUncheckedIndexedAccess`
- ❌ No `noUnusedLocals` / `noUnusedParameters`

**Type Safety Score**: 4/10 (Poor)

**Known Issues**:
- 17+ instances of explicit `any` type
- Catch blocks use `catch (error: any)`
- Logger accepts `...args: any[]`
- Express app typed as `any` in interfaces
- AuthUser interface has `[key: string]: any` index signature
- Optional fields used as required without checks
- No null/undefined checking

### Migration Approach

**Strategy**: Incremental, file-by-file approach

**Why Incremental**:
- Enables testing after each file
- Reduces risk of breaking changes
- Allows parallel development on non-strict code
- Easier code review
- Can pause/resume migration

**Option A: All-at-Once (NOT RECOMMENDED)**
- Enable all strict flags immediately
- Fix all errors in one large PR
- Risk: 100+ type errors, overwhelming
- Timeline: 12+ hours

**Option B: Incremental (RECOMMENDED)**
- Enable flags one at a time
- Fix errors per flag before next
- Start with critical files first
- Timeline: 10-12 hours, spread across days

**Recommended Order**:
1. `noImplicitAny: true` (Fix explicit `any` types)
2. `strictNullChecks: true` (Add null checks)
3. `strict: true` (Enable all strict checks)
4. `noUncheckedIndexedAccess: true` (Array/object safety)
5. `noUnusedLocals: true`, `noUnusedParameters: true` (Cleanup)

### Expected Errors

**Categories of Issues to Fix**:

**1. Explicit `any` Types (17+ instances)**
```typescript
// ❌ Current
catch (error: any) {
  handleError(error);
}

// ✅ Fixed
catch (error) {
  if (error instanceof Error) {
    handleError(error);
  } else {
    handleError(new Error(String(error)));
  }
}
```

```typescript
// ❌ Current
log(...args: any[]) {
  console.log('[o-server]', ...args);
}

// ✅ Fixed
log(message: string, ...args: unknown[]) {
  console.log('[o-server]', message, ...args);
}
```

**2. Null/Undefined Checks**
```typescript
// ❌ Current
const method = req.body.method;
const result = await node.use(address, { method, params });

// ✅ Fixed
const method = req.body.method;
if (!method) {
  throw new InvalidParamsError('method is required');
}
const result = await node.use(address, { method, params });
```

**3. Index Signatures**
```typescript
// ❌ Current (interfaces/server-config.interface.ts)
export interface AuthUser {
  userId?: string;
  [key: string]: any;
}

// ✅ Fixed
export interface AuthUser {
  userId: string;  // Required, not optional
  email?: string;
  roles?: string[];
  // Remove dangerous [key: string]: any
}
```

**4. Express App Type**
```typescript
// ❌ Current (interfaces/server-config.interface.ts)
export interface ServerInstance {
  app: any;
  start(): Promise<void>;
  stop(): Promise<void>;
}

// ✅ Fixed
import { Express } from 'express';

export interface ServerInstance {
  app: Express;
  start(): Promise<void>;
  stop(): Promise<void>;
}
```

**5. Optional Property Access**
```typescript
// ❌ Current
if (error.message?.includes('not found')) {
  // Handle
}

// ✅ Fixed with strictNullChecks
if (error && 'message' in error &&
    typeof error.message === 'string' &&
    error.message.includes('not found')) {
  // Handle
}
```

### Priority Files

**Phase 1 - Critical Infrastructure (Hours 1-4)**:
1. `interfaces/server-config.interface.ts` - Type definitions
2. `interfaces/response.interface.ts` - Response types
3. `middleware/error-handler.ts` - Error handling
4. `utils/logger.ts` - Logging utilities

**Phase 2 - Core Logic (Hours 5-8)**:
5. `o-server.ts` - Main server implementation (largest file)
6. `middleware/auth.ts` - Authentication

**Phase 3 - Enable Strict Mode (Hours 9-10)**:
7. Update `tsconfig.json` with all strict flags
8. Fix any remaining errors surfaced by strict mode

**Phase 4 - Validation & Cleanup (Hours 11-12)**:
9. Add type guards where needed
10. Remove unused variables/imports
11. Verify build passes with zero errors
12. Run full test suite

### Type Safety Improvements

**Replace All `any` Types**:

**File: o-server.ts**
- Lines 82, 113, 160, 173: `catch (error: any)` → `catch (error)`
- Line 183: `function handleOlaneError(error: any, ...)` → `function handleOlaneError(error: unknown, ...)`

**File: utils/logger.ts**
- Line 8, 12, 16: `...args: any[]` → `message: string, ...args: unknown[]`

**File: middleware/auth.ts**
- Line 21: `catch (error: any)` → `catch (error)`

**File: middleware/error-handler.ts**
- Line 7: `details?: any` → `details?: Record<string, unknown>`

**File: interfaces/server-config.interface.ts**
- Line 34: `app: any` → `app: Express`
- Line 8: `[key: string]: any` → Remove or restrict

**Add Type Guards**:
```typescript
// utils/type-guards.ts
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

export function isOlaneError(value: unknown): value is OlaneError {
  return (
    isError(value) &&
    'code' in value &&
    typeof value.code === 'string'
  );
}

export function hasMessage(value: unknown): value is { message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as any).message === 'string'
  );
}
```

**Usage**:
```typescript
catch (error) {
  if (isOlaneError(error)) {
    // TypeScript knows error has .code property
    handleOlaneError(error);
  } else if (isError(error)) {
    // TypeScript knows error has .message property
    handleGenericError(error);
  } else {
    // Unknown error type
    handleUnknownError(error);
  }
}
```

### Testing Requirements

**Test Strategy**:
1. **Verify compilation**: `tsc --noEmit` must pass with zero errors
2. **Run existing tests**: All tests must pass
3. **Add type-specific tests**: Verify type guards work correctly

**Type Safety Tests**:
```typescript
describe('Type Safety', () => {
  it('should compile with strict mode enabled', () => {
    // This test exists to ensure project compiles
    expect(true).toBe(true);
  });

  it('should handle errors with proper type guards', () => {
    const mockError = new Error('test');
    expect(isError(mockError)).toBe(true);

    const mockOlaneError: OlaneError = Object.assign(
      new Error('test'),
      { code: 'TEST_ERROR', status: 500 }
    );
    expect(isOlaneError(mockOlaneError)).toBe(true);

    const notAnError = { message: 'not an error' };
    expect(isError(notAnError)).toBe(false);
  });

  it('should enforce required fields', () => {
    // TypeScript compiler should catch this at build time
    // This test documents the expected behavior

    // ✅ Valid
    const validUser: AuthUser = { userId: '123' };
    expect(validUser.userId).toBe('123');

    // ❌ TypeScript error (uncomment to verify):
    // const invalidUser: AuthUser = {}; // Error: userId is required
  });
});
```

**Verify No Regressions**:
```bash
# Before enabling strict mode
npm run build  # Should succeed
npm test       # Should pass

# After enabling strict mode
npm run build  # Should still succeed with zero errors
npm test       # Should still pass (no behavioral changes)

# Type check without building
npx tsc --noEmit  # Should show zero errors
```

### Effort Estimate

**Total: 10-12 hours**

**Breakdown**:
- Phase 1 (Interfaces & utilities): 2-3 hours
- Phase 2 (Core logic): 3-4 hours
- Phase 3 (Enable strict mode): 2-3 hours
- Phase 4 (Validation & cleanup): 2 hours
- Testing: 1 hour

**Updated tsconfig.json** (Target):
```json
{
  "extends": "@tsconfig/node20/tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "declarationDir": "./dist",
    "emitDeclarationOnly": false,

    // Module settings
    "module": "ESNext",
    "target": "ES2022",
    "moduleResolution": "bundler",
    "esModuleInterop": true,

    // Strict type-checking options
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,

    // Additional checks
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,

    // Performance
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

---

## 4. Request Timeout Implementation

### Problem

**Current State**: No timeout mechanism exists
- Requests can hang indefinitely
- Long-running `node.use()` calls never timeout
- No way to cancel stuck operations
- Connection pool exhaustion risk

**Impact**:
- User frustration (hung requests)
- Resource exhaustion (connections, memory)
- Cascading failures (upstream services timeout)
- No protection against slow operations

**Example Scenarios**:
```typescript
// Scenario 1: Slow external API
const result = await node.use('o://external-api', {
  method: 'fetch_data',
  params: { url: 'https://slow-api.com' }
});
// If external API is slow, request hangs forever

// Scenario 2: Complex computation
const result = await node.use('o://compute', {
  method: 'process_large_dataset',
  params: { size: '10GB' }
});
// If computation is slow, no timeout
```

### Solution

**Approach**: Add configurable timeout middleware

**Strategy**:
1. Use `express-timeout-handler` middleware (lightweight, battle-tested)
2. Set default timeouts per route type
3. Allow configuration override
4. Proper timeout error responses

**Alternative Considered**: `connect-timeout`
- Older, less maintained
- Requires manual timeout checking with `haltOnTimedout`
- More complex setup

**Decision**: Use `express-timeout-handler`
- Modern, actively maintained
- Cleaner API
- Automatic handling

### Configuration

**Default Timeout Values**:
```typescript
interface TimeoutConfig {
  // Standard requests (POST /use, POST /:address/:method)
  default: number;      // 30 seconds (30000ms)

  // Streaming requests (POST /use/stream)
  stream: number;       // 5 minutes (300000ms)

  // Health checks (GET /health)
  health: number;       // 5 seconds (5000ms)
}
```

**Rationale**:
- **30s default**: Reasonable for most tool calls
- **5min streaming**: Allow for longer operations
- **5s health**: Quick health checks only
- **All configurable**: Can override per deployment

**Configuration Interface**:
```typescript
// interfaces/server-config.interface.ts
export interface ServerConfig {
  node: oCore;
  port?: number;
  basePath?: string;
  cors?: CorsOptions;
  authenticate?: AuthenticateFunction;
  debug?: boolean;

  // New: Timeout configuration
  timeout?: {
    default?: number;    // Default: 30000ms
    stream?: number;     // Default: 300000ms
    health?: number;     // Default: 5000ms
    onTimeout?: (req: Request, res: Response) => void;
  };
}
```

**Implementation**:
```typescript
// o-server.ts
import timeoutHandler from 'express-timeout-handler';

export function oServer(config: ServerConfig): ServerInstance {
  const {
    timeout = {
      default: 30000,
      stream: 300000,
      health: 5000,
    },
  } = config;

  // Health check with short timeout
  app.get(
    `${basePath}/health`,
    timeoutHandler.set(timeout.health),
    (req: Request, res: Response) => {
      res.json({
        success: true,
        data: { status: 'healthy', timestamp: Date.now() },
      });
    }
  );

  // Standard requests with default timeout
  app.post(
    `${basePath}/use`,
    timeoutHandler.set(timeout.default),
    async (req: Request, res: Response, next) => {
      // Route handler
    }
  );

  // Streaming with extended timeout
  app.post(
    `${basePath}/use/stream`,
    timeoutHandler.set(timeout.stream),
    async (req: Request, res: Response, next) => {
      // Streaming handler
    }
  );

  // Custom timeout handler
  app.use(timeoutHandler.handler({
    timeout: timeout.default,
    onTimeout: timeout.onTimeout || defaultTimeoutHandler,
    onDelayedResponse: (req, method, args, requestTime) => {
      debug('Delayed response: method=%s, time=%d', method, requestTime);
    },
  }));
}

function defaultTimeoutHandler(req: Request, res: Response) {
  const error: OlaneError = new Error('Request timeout');
  error.code = 'TIMEOUT';
  error.status = 504;

  res.status(504).json({
    success: false,
    error: {
      code: 'TIMEOUT',
      message: 'Request timeout - operation took too long',
    },
  });
}
```

### Error Handling

**Timeout Error Format**:
```json
{
  "success": false,
  "error": {
    "code": "TIMEOUT",
    "message": "Request timeout - operation took too long"
  }
}
```

**HTTP Status**: 504 Gateway Timeout

**Logging**:
```typescript
const debugTimeout = Debug('o-server:timeout');

function handleTimeout(req: Request, res: Response) {
  debugTimeout('Request timeout: path=%s, method=%s, duration=%d',
    req.path,
    req.method,
    Date.now() - req.startTime
  );

  // Return error response
  res.status(504).json({
    success: false,
    error: {
      code: 'TIMEOUT',
      message: 'Request timeout',
    },
  });
}
```

**Integration with Existing Error Handler**:
```typescript
// middleware/error-handler.ts
export function errorHandler(
  err: OlaneError,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Handle timeout errors specifically
  if (err.code === 'TIMEOUT') {
    debugError('Request timeout: %O', {
      path: req.path,
      method: req.method,
      duration: Date.now() - (req as any).startTime,
    });
  }

  // Existing error handling...
}
```

### Testing Requirements

**Test Cases**:

**1. Default Timeout Works**:
```typescript
describe('Request Timeouts', () => {
  it('should timeout after 30s by default', async () => {
    // Mock slow node.use() call
    const slowNode = {
      use: jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 35000))
      ),
    };

    const server = oServer({ node: slowNode });
    await server.start();

    const response = await fetch('http://localhost:3000/api/v1/use', {
      method: 'POST',
      body: JSON.stringify({
        address: 'o://slow-tool',
        method: 'slow_method',
      }),
    });

    expect(response.status).toBe(504);
    const data = await response.json();
    expect(data.error.code).toBe('TIMEOUT');

    await server.stop();
  });

  it('should respect custom timeout configuration', async () => {
    const server = oServer({
      node: mockNode,
      timeout: {
        default: 5000, // 5 second timeout
      },
    });

    // Test that 6-second request times out
    // Test that 4-second request succeeds
  });

  it('should use different timeout for streaming', async () => {
    const server = oServer({
      node: mockNode,
      timeout: {
        stream: 60000, // 1 minute
      },
    });

    // Test streaming endpoint has longer timeout
  });

  it('should use short timeout for health checks', async () => {
    const server = oServer({
      node: mockNode,
      timeout: {
        health: 1000, // 1 second
      },
    });

    // Test health check times out quickly
  });
});
```

**2. Timeout Error Format**:
```typescript
it('should return proper error format on timeout', async () => {
  const response = await fetch(/* timeout scenario */);
  const data = await response.json();

  expect(data).toEqual({
    success: false,
    error: {
      code: 'TIMEOUT',
      message: expect.stringContaining('timeout'),
    },
  });
});
```

**3. Logging**:
```typescript
it('should log timeout events', async () => {
  const debugOutput = captureDebugOutput('o-server:timeout', async () => {
    // Trigger timeout
  });

  expect(debugOutput).toContain('Request timeout');
  expect(debugOutput).toContain('path=/api/v1/use');
});
```

**4. No Timeout for Fast Requests**:
```typescript
it('should not timeout fast requests', async () => {
  const fastNode = {
    use: jest.fn().mockResolvedValue({ result: { data: 'fast' } }),
  };

  const server = oServer({ node: fastNode });

  const response = await fetch(/* fast request */);
  expect(response.status).toBe(200);
});
```

### Effort Estimate

**Total: 3-4 hours**

**Breakdown**:
- Install and configure middleware: 0.5 hours
- Update ServerConfig interface: 0.5 hours
- Implement timeout handlers: 1 hour
- Add timeout error handling: 0.5 hours
- Testing: 1 hour
- Documentation: 0.5 hours

**Dependencies**:
- Add `express-timeout-handler` package
- Update ServerConfig interface
- Coordinate with error handling improvements

---

## 5. Graceful Shutdown

### Current State

**Implementation** (o-server.ts lines 230-246):
```typescript
async stop(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }

    server.close((err) => {
      if (err) {
        reject(err);
      } else {
        logger.log('Server stopped');
        resolve();
      }
    });
  });
}
```

**Problems**:
1. **No connection draining**: `server.close()` stops accepting new connections but doesn't wait for existing ones
2. **No timeout**: If connections don't close, waits forever
3. **No signal handlers**: Doesn't handle SIGTERM/SIGINT
4. **No coordination**: Doesn't coordinate with node lifecycle
5. **Drops in-flight requests**: Active requests are terminated abruptly

**Impact**:
- Data loss (incomplete writes)
- User errors (request failed unexpectedly)
- Poor deployment experience (rolling updates fail)
- No zero-downtime deploys possible

### Implementation

**Approach**: Connection draining with forced timeout

**Strategy**:
1. Stop accepting new connections (`server.close()`)
2. Track active connections
3. Wait for connections to finish naturally
4. Force close after timeout
5. Coordinate with node shutdown
6. Handle OS signals (SIGTERM, SIGINT)

**Connection Tracking**:
```typescript
// Track active connections
const connections = new Set<Socket>();

// Track when connection was established
server.on('connection', (conn: Socket) => {
  connections.add(conn);

  conn.on('close', () => {
    connections.delete(conn);
  });
});
```

**Graceful Shutdown Implementation**:
```typescript
import { Socket } from 'net';

async stop(options?: { timeout?: number }): Promise<void> {
  const debug = Debug('o-server:shutdown');
  const shutdownTimeout = options?.timeout || 30000; // 30s default

  debug('Shutdown initiated: activeConnections=%d', connections.size);

  return new Promise((resolve, reject) => {
    if (!server) {
      debug('No server to stop');
      resolve();
      return;
    }

    // Set flag to reject new requests
    isShuttingDown = true;

    // Stop accepting new connections
    server.close((err) => {
      if (err) {
        debug('Error closing server: %O', err);
        reject(err);
      } else {
        debug('Server closed successfully');
        resolve();
      }
    });

    // Wait for existing connections to finish, with timeout
    const timeoutHandle = setTimeout(() => {
      debug('Shutdown timeout reached, forcing close: activeConnections=%d',
        connections.size
      );

      // Force close all connections
      connections.forEach((conn) => {
        debug('Destroying connection forcefully');
        conn.destroy();
      });

      // Don't wait for server.close callback
      resolve();
    }, shutdownTimeout);

    // If all connections close naturally before timeout
    const checkInterval = setInterval(() => {
      if (connections.size === 0) {
        debug('All connections closed gracefully');
        clearTimeout(timeoutHandle);
        clearInterval(checkInterval);
      }
    }, 100);
  });
}
```

**Reject New Requests During Shutdown**:
```typescript
let isShuttingDown = false;

// Add middleware to reject requests during shutdown
app.use((req: Request, res: Response, next: NextFunction) => {
  if (isShuttingDown) {
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Server is shutting down',
      },
    });
    return;
  }
  next();
});
```

### Timeout

**Default Timeout**: 30 seconds

**Rationale**:
- Most requests complete in < 30s
- Allows streaming requests to finish
- Prevents indefinite hangs
- Kubernetes default grace period is 30s

**Configurable**:
```typescript
interface ServerConfig {
  // ... existing fields

  shutdown?: {
    timeout?: number;           // Default: 30000ms
    onShutdownStart?: () => void;
    onShutdownComplete?: () => void;
  };
}

// Usage
const server = oServer({
  node,
  shutdown: {
    timeout: 60000, // 1 minute for long-running operations
    onShutdownStart: () => console.log('Shutting down...'),
    onShutdownComplete: () => console.log('Shutdown complete'),
  },
});
```

**Timeout Behavior**:
```typescript
// After timeout, force close all connections
connections.forEach((conn) => {
  if (!conn.destroyed) {
    debug('Force closing connection: remoteAddress=%s',
      conn.remoteAddress
    );
    conn.destroy();
  }
});
```

### Signal Handlers

**Handle Process Signals**:
```typescript
export function oServer(config: ServerConfig): ServerInstance {
  // ... existing setup

  const instance: ServerInstance = {
    app,
    start,
    stop,
  };

  // Register signal handlers
  if (config.gracefulShutdown !== false) {
    registerShutdownHandlers(instance);
  }

  return instance;
}

function registerShutdownHandlers(instance: ServerInstance) {
  const debug = Debug('o-server:signals');

  // SIGTERM - Graceful termination (Kubernetes, Docker)
  process.on('SIGTERM', async () => {
    debug('SIGTERM received, starting graceful shutdown');
    try {
      await instance.stop();
      debug('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      debug('Error during shutdown: %O', error);
      process.exit(1);
    }
  });

  // SIGINT - Ctrl+C (terminal)
  process.on('SIGINT', async () => {
    debug('SIGINT received, starting graceful shutdown');
    try {
      await instance.stop();
      debug('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      debug('Error during shutdown: %O', error);
      process.exit(1);
    }
  });

  // Optional: SIGUSR2 for nodemon
  process.once('SIGUSR2', async () => {
    debug('SIGUSR2 received (nodemon), starting graceful shutdown');
    try {
      await instance.stop();
      process.kill(process.pid, 'SIGUSR2');
    } catch (error) {
      process.exit(1);
    }
  });
}
```

**Coordinate with Node Lifecycle**:
```typescript
async stop(options?: { timeout?: number }): Promise<void> {
  const debug = Debug('o-server:shutdown');

  // 1. Stop HTTP server
  debug('Stopping HTTP server...');
  await stopHttpServer(options);

  // 2. Stop the Olane node (if it has a stop method)
  if (node && typeof (node as any).stop === 'function') {
    debug('Stopping Olane node...');
    await (node as any).stop();
  }

  debug('Shutdown complete');
}
```

### Testing Requirements

**Test Cases**:

**1. Graceful Shutdown - No Active Connections**:
```typescript
describe('Graceful Shutdown', () => {
  it('should stop immediately when no active connections', async () => {
    const server = oServer({ node: mockNode });
    await server.start();

    const startTime = Date.now();
    await server.stop();
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(1000); // Should be fast
  });
});
```

**2. Wait for Active Connections**:
```typescript
it('should wait for active connections to finish', async () => {
  const server = oServer({ node: mockNode });
  await server.start();

  // Start a long-running request
  const requestPromise = fetch('http://localhost:3000/api/v1/use', {
    method: 'POST',
    body: JSON.stringify({
      address: 'o://slow',
      method: 'process',
    }),
  });

  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Start shutdown (should wait for request)
  const stopPromise = server.stop({ timeout: 10000 });

  // Request should complete
  const response = await requestPromise;
  expect(response.status).toBe(200);

  // Shutdown should complete after request
  await stopPromise;
});
```

**3. Force Close After Timeout**:
```typescript
it('should force close connections after timeout', async () => {
  const server = oServer({
    node: mockNode,
    shutdown: { timeout: 2000 }, // 2 second timeout
  });
  await server.start();

  // Start request that never finishes
  const requestPromise = fetch(/* hung request */);

  // Shutdown with short timeout
  const startTime = Date.now();
  await server.stop();
  const duration = Date.now() - startTime;

  // Should timeout after ~2 seconds
  expect(duration).toBeGreaterThan(1900);
  expect(duration).toBeLessThan(2500);

  // Request should be terminated
  await expect(requestPromise).rejects.toThrow();
});
```

**4. Reject New Connections During Shutdown**:
```typescript
it('should reject new requests during shutdown', async () => {
  const server = oServer({ node: mockNode });
  await server.start();

  // Start shutdown (but don't await)
  const stopPromise = server.stop({ timeout: 10000 });

  // Try to make new request
  const response = await fetch('http://localhost:3000/api/v1/health');

  expect(response.status).toBe(503);
  const data = await response.json();
  expect(data.error.code).toBe('SERVICE_UNAVAILABLE');

  await stopPromise;
});
```

**5. Signal Handlers**:
```typescript
it('should handle SIGTERM gracefully', async () => {
  const server = oServer({ node: mockNode });
  await server.start();

  // Trigger SIGTERM
  process.emit('SIGTERM');

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 500));

  // Server should be stopped
  await expect(
    fetch('http://localhost:3000/api/v1/health')
  ).rejects.toThrow();
});
```

**6. Coordinate with Node Lifecycle**:
```typescript
it('should stop node after stopping server', async () => {
  const mockNode = {
    use: jest.fn(),
    stop: jest.fn().mockResolvedValue(undefined),
  };

  const server = oServer({ node: mockNode });
  await server.start();
  await server.stop();

  expect(mockNode.stop).toHaveBeenCalled();
});
```

### Effort Estimate

**Total: 4-5 hours**

**Breakdown**:
- Connection tracking: 1 hour
- Graceful shutdown logic: 1.5 hours
- Signal handler registration: 0.5 hours
- Node lifecycle coordination: 0.5 hours
- Testing: 1 hour
- Documentation: 0.5 hours

**Files to Modify**:
- `src/o-server.ts` - Main implementation
- `src/interfaces/server-config.interface.ts` - Add shutdown config
- `README.md` - Document graceful shutdown

---

## 6. Error Handling Improvements

### Remove `any` Types

**Current Issues** (from strict mode analysis):

**o-server.ts**:
- Lines 82, 113, 160, 173: `catch (error: any)`
- Line 183: `function handleOlaneError(error: any, ...)`

**middleware/auth.ts**:
- Line 21: `catch (error: any)`

**middleware/error-handler.ts**:
- Line 7: `details?: any`

**utils/logger.ts**:
- Lines 8, 12, 16: `...args: any[]`

**Replacement Strategy**:
```typescript
// ❌ Current
catch (error: any) {
  if (error.code === 'TIMEOUT') { ... }
}

// ✅ Fixed
catch (error) {
  if (isOlaneError(error) && error.code === 'TIMEOUT') { ... }
  else if (isError(error)) { ... }
  else { ... }
}
```

### Error Class Hierarchy

**Create Structured Error Classes**:

**File: `errors/base.error.ts`**:
```typescript
export abstract class OlaneServerError extends Error {
  abstract readonly code: string;
  abstract readonly status: number;

  constructor(
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      // Never include details in JSON (could be sensitive)
    };
  }
}
```

**File: `errors/client.errors.ts`**:
```typescript
export class InvalidParamsError extends OlaneServerError {
  readonly code = 'INVALID_PARAMS';
  readonly status = 400;

  constructor(message: string = 'Invalid parameters') {
    super(message);
  }
}

export class UnauthorizedError extends OlaneServerError {
  readonly code = 'UNAUTHORIZED';
  readonly status = 401;

  constructor(message: string = 'Authentication required') {
    super(message);
  }
}

export class NotFoundError extends OlaneServerError {
  readonly code = 'NOT_FOUND';
  readonly status = 404;

  constructor(message: string = 'Resource not found') {
    super(message);
  }
}

export class TimeoutError extends OlaneServerError {
  readonly code = 'TIMEOUT';
  readonly status = 504;

  constructor(message: string = 'Request timeout') {
    super(message);
  }
}
```

**File: `errors/server.errors.ts`**:
```typescript
export class ExecutionError extends OlaneServerError {
  readonly code = 'EXECUTION_ERROR';
  readonly status = 500;

  constructor(message: string = 'Execution error') {
    super(message);
  }
}

export class ServiceUnavailableError extends OlaneServerError {
  readonly code = 'SERVICE_UNAVAILABLE';
  readonly status = 503;

  constructor(message: string = 'Service unavailable') {
    super(message);
  }
}
```

**File: `errors/index.ts`**:
```typescript
export * from './base.error.js';
export * from './client.errors.js';
export * from './server.errors.js';

// Type guard
export function isOlaneServerError(error: unknown): error is OlaneServerError {
  return error instanceof OlaneServerError;
}
```

### Consistent Patterns

**Replace String-Based Error Detection**:

**Before** (o-server.ts line 199):
```typescript
} else if (error.message?.includes('not found')) {
  olaneError.code = 'NODE_NOT_FOUND';
  olaneError.status = 404;
}
```

**After**:
```typescript
// Use error classes instead
if (isNodeNotFoundError(error)) {
  throw new NotFoundError('Node not found');
}
```

**Standard Error Handling Pattern**:
```typescript
// In route handlers
async function handleUseRequest(req: Request, res: Response, next: NextFunction) {
  try {
    // Validation
    if (!req.body.address) {
      throw new InvalidParamsError('address is required');
    }

    // Business logic
    const result = await node.use(address, { method, params });

    // Success response
    res.json({
      success: true,
      data: result.result,
    });
  } catch (error) {
    // Pass to error handler - it knows how to handle OlaneServerError
    next(error);
  }
}
```

**Update Error Handler**:
```typescript
// middleware/error-handler.ts
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const debug = Debug('o-server:errors');

  // Handle OlaneServerError instances
  if (isOlaneServerError(err)) {
    debug('Olane error: code=%s, status=%d, message=%s',
      err.code,
      err.status,
      err.message
    );

    return res.status(err.status).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // Handle standard errors
  if (err instanceof Error) {
    debug('Unexpected error: %s', err.message);

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
      },
    });
  }

  // Unknown error type
  debug('Unknown error type: %O', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
```

### Integration with JWT

**Auth Error Handling** (coordinate with Phase 1):

**Before** (middleware/auth.ts):
```typescript
catch (error: any) {
  res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: error.message || 'Authentication failed',
    },
  });
}
```

**After**:
```typescript
catch (error) {
  // Distinguish auth failure from internal error
  if (isAuthenticationError(error)) {
    // Expected auth failure
    next(new UnauthorizedError('Authentication failed'));
  } else if (isError(error)) {
    // Unexpected error during auth
    const debug = Debug('o-server:auth');
    debug('Internal error during authentication: %s', error.message);
    next(new ExecutionError('Authentication system error'));
  } else {
    next(new ExecutionError('Unknown authentication error'));
  }
}
```

**JWT-Specific Errors**:
```typescript
// errors/jwt.errors.ts
export class InvalidTokenError extends OlaneServerError {
  readonly code = 'INVALID_TOKEN';
  readonly status = 401;

  constructor(reason: string) {
    super(`Invalid token: ${reason}`);
  }
}

export class ExpiredTokenError extends OlaneServerError {
  readonly code = 'EXPIRED_TOKEN';
  readonly status = 401;

  constructor() {
    super('Token has expired');
  }
}

// Usage in JWT middleware
if (decoded.exp && decoded.exp < Date.now() / 1000) {
  throw new ExpiredTokenError();
}

if (!decoded.userId) {
  throw new InvalidTokenError('Missing userId claim');
}
```

### Testing Requirements

**Test Error Class Hierarchy**:
```typescript
describe('Error Classes', () => {
  it('should create InvalidParamsError correctly', () => {
    const error = new InvalidParamsError('Missing field');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(OlaneServerError);
    expect(error.code).toBe('INVALID_PARAMS');
    expect(error.status).toBe(400);
    expect(error.message).toBe('Missing field');
  });

  it('should serialize to JSON without details', () => {
    const error = new ExecutionError('Internal error');
    const json = error.toJSON();

    expect(json).toEqual({
      code: 'EXECUTION_ERROR',
      message: 'Internal error',
      status: 500,
    });
    expect(json).not.toHaveProperty('details');
  });

  it('should identify OlaneServerError with type guard', () => {
    const error = new NotFoundError();
    expect(isOlaneServerError(error)).toBe(true);

    const stdError = new Error('standard');
    expect(isOlaneServerError(stdError)).toBe(false);
  });
});
```

**Test Error Handler Integration**:
```typescript
describe('Error Handler', () => {
  it('should handle OlaneServerError correctly', async () => {
    const server = oServer({
      node: {
        use: jest.fn().mockRejectedValue(
          new NotFoundError('Tool not found')
        ),
      },
    });

    await server.start();

    const response = await fetch('http://localhost:3000/api/v1/use', {
      method: 'POST',
      body: JSON.stringify({
        address: 'o://missing',
        method: 'test',
      }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Tool not found',
      },
    });

    await server.stop();
  });

  it('should handle unexpected errors safely', async () => {
    const server = oServer({
      node: {
        use: jest.fn().mockRejectedValue(
          new Error('Unexpected database error')
        ),
      },
    });

    const response = await fetch(/* ... */);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
    expect(data.error.message).not.toContain('database'); // Sanitized
  });
});
```

**Test No Information Leakage**:
```typescript
it('should not leak internal details in errors', async () => {
  const server = oServer({
    node: {
      use: jest.fn().mockRejectedValue(
        new Error('Database connection failed at /internal/path/db.ts:42')
      ),
    },
  });

  const response = await fetch(/* ... */);
  const data = await response.json();

  // Should not contain file paths or internal details
  expect(JSON.stringify(data)).not.toContain('/internal/path');
  expect(JSON.stringify(data)).not.toContain(':42');
  expect(data.error.message).toBe('An internal error occurred');
});
```

### Effort Estimate

**Total: 6-8 hours**

**Dependencies**: Must complete TypeScript strict mode first

**Breakdown**:
- Create error class hierarchy: 2 hours
- Update error handler: 1 hour
- Replace all error handling callsites: 2 hours
- Integrate with JWT errors: 1 hour
- Testing: 1.5 hours
- Documentation: 0.5 hour

**Files to Create**:
- `src/errors/base.error.ts`
- `src/errors/client.errors.ts`
- `src/errors/server.errors.ts`
- `src/errors/jwt.errors.ts` (from Phase 1)
- `src/errors/index.ts`

**Files to Modify**:
- `src/o-server.ts` - Replace error handling
- `src/middleware/error-handler.ts` - Use error classes
- `src/middleware/auth.ts` - Use error classes
- All route handlers - Use new error classes

---

## 7. Code Cleanup

### Duplicate Code

**Issue**: Routes at lines 54-85 and 89-117 have ~90% overlap

**Current Duplication**:
```typescript
// Route 1: POST /use
app.post(`${basePath}/use`, async (req: Request, res: Response, next) => {
  try {
    const { address: addressStr, method, params, id } = req.body;

    if (!addressStr) {
      const error: OlaneError = new Error('Address is required');
      error.code = 'INVALID_PARAMS';
      error.status = 400;
      throw error;
    }

    const address = new oAddress(addressStr);
    const result = await node.use(address, { method, params, id });

    const response: SuccessResponse = {
      success: true,
      data: result.result,
    };

    res.json(response);
  } catch (error: any) {
    handleOlaneError(error, next);
  }
});

// Route 2: POST /:address/:method (nearly identical!)
app.post(`${basePath}/:address/:method`, async (req, res, next) => {
  try {
    const { address: addressParam, method } = req.params;
    const params = req.body;

    const address = new oAddress(`o://${addressParam}`);
    const result = await node.use(address, { method, params });

    const response: SuccessResponse = {
      success: true,
      data: result.result,
    };

    res.json(response);
  } catch (error: any) {
    handleOlaneError(error, next);
  }
});
```

**Extract Common Handler**:
```typescript
// Extracted handler
async function handleToolRequest(
  address: oAddress,
  method: string | undefined,
  params: unknown,
  id?: string,
): Promise<SuccessResponse> {
  const debug = Debug('o-server:use');

  debug('Calling tool: address=%s, method=%s', address.toString(), method);

  const result = await node.use(address, {
    method,
    params,
    id,
  });

  debug('Tool call successful');

  return {
    success: true,
    data: result.result,
  };
}

// Route 1: POST /use
app.post(`${basePath}/use`, async (req: Request, res: Response, next) => {
  try {
    const { address: addressStr, method, params, id } = req.body;

    if (!addressStr) {
      throw new InvalidParamsError('address is required');
    }

    const address = new oAddress(addressStr);
    const response = await handleToolRequest(address, method, params, id);

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Route 2: POST /:address/:method
app.post(`${basePath}/:address/:method`, async (req, res, next) => {
  try {
    const { address: addressParam, method } = req.params;
    const params = req.body;

    const address = new oAddress(`o://${addressParam}`);
    const response = await handleToolRequest(address, method, params);

    res.json(response);
  } catch (error) {
    next(error);
  }
});
```

**Benefits**:
- Single source of truth for tool calling logic
- Easier to add features (logging, metrics, etc.)
- Reduced maintenance burden
- Better testability

### Remove Dead Code

**Unused Dependencies** (package.json):
```json
{
  "dependencies": {
    "debug": "^4.4.1",    // ✅ Will be used in Phase 2
    "dotenv": "^16.5.0"   // ❌ Not used, remove
  }
}
```

**Action**: Remove `dotenv` dependency
```bash
pnpm remove dotenv
```

**Unused Imports**:
Run ESLint with `noUnusedLocals` and `noUnusedParameters` to identify:
```bash
npx tsc --noEmit --noUnusedLocals --noUnusedParameters
```

**Dead Code Examples**:
```typescript
// Check for unused variables
// Check for unreachable code
// Check for commented-out code (remove or document why)
```

### Consistent Formatting

**ESLint Configuration**:

**Current**: Basic ESLint setup
**Target**: Strict, consistent formatting

**Update `.eslintrc.json`**:
```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "no-console": ["warn", { "allow": ["error"] }],
    "prefer-const": "error"
  }
}
```

**Run Fixes**:
```bash
# Check for issues
pnpm run lint

# Auto-fix what's possible
pnpm run lint:fix

# Format with Prettier
npx prettier --write "src/**/*.ts"
```

### Code Organization

**Current Structure**:
```
src/
├── o-server.ts               # 250 lines - could be split
├── middleware/
│   ├── auth.ts
│   └── error-handler.ts
├── utils/
│   └── logger.ts
└── interfaces/
    ├── server-config.interface.ts
    └── response.interface.ts
```

**Improvements**:

**1. Extract Route Handlers**:
```
src/
├── o-server.ts               # Factory only, ~100 lines
├── routes/
│   ├── health.route.ts       # Health check
│   ├── use.route.ts          # POST /use
│   ├── convenience.route.ts  # POST /:address/:method
│   └── stream.route.ts       # POST /use/stream
├── handlers/
│   └── tool-request.handler.ts  # Shared handler
├── middleware/
├── utils/
├── errors/                   # New - error classes
└── interfaces/
```

**2. Better File Organization**:
```typescript
// src/o-server.ts (slimmed down)
export function oServer(config: ServerConfig): ServerInstance {
  const app = express();
  const logger = setupLogger(config.debug);

  // Apply middleware
  setupMiddleware(app, config);

  // Register routes
  registerHealthRoute(app, config);
  registerUseRoute(app, config);
  registerConvenienceRoute(app, config);
  registerStreamRoute(app, config);

  // Error handling
  app.use(errorHandler);

  // Return server instance
  return createServerInstance(app, config);
}
```

**Benefits**:
- Easier navigation
- Better separation of concerns
- Easier testing (test routes independently)
- Clearer dependencies

**Decision**: Keep current structure for now, extract routes if o-server.ts grows beyond 300 lines

### Effort Estimate

**Total: 5-6 hours**

**Breakdown**:
- Extract duplicate route handling: 1.5 hours
- Remove dead code: 0.5 hours
- ESLint fixes: 1 hour
- Code organization (if needed): 2 hours
- Testing: 1 hour

**Files to Modify**:
- `src/o-server.ts` - Extract common logic
- `package.json` - Remove unused dependencies
- `.eslintrc.json` - Stricter rules
- All source files - ESLint fixes

---

## 8. Parallel Development Strategy

### Git Worktree Approach

**What is Git Worktree?**
- Create multiple working directories for the same repository
- Each worktree has its own branch
- Work on multiple features simultaneously without stashing
- Perfect for parallel development streams

**Setup**:
```bash
# From main repo
cd /Users/brendon/Development/highway/olane

# Create worktrees for each stream
git worktree add ../olane-debug feat/v0.8.0-debug-package
git worktree add ../olane-strict feat/v0.8.0-typescript-strict
git worktree add ../olane-timeouts feat/v0.8.0-timeouts-shutdown
git worktree add ../olane-errors feat/v0.8.0-error-handling
git worktree add ../olane-cleanup feat/v0.8.0-code-cleanup

# List worktrees
git worktree list
```

**Working in Worktrees**:
```bash
# Stream 1: Debug improvements
cd ../olane-debug
# Make changes, commit, push
git add .
git commit -m "feat(o-server): implement debug package logging"
git push origin feat/v0.8.0-debug-package

# Stream 2: TypeScript strict (parallel)
cd ../olane-strict
# Make changes independently
git add .
git commit -m "feat(o-server): enable TypeScript strict mode"
git push origin feat/v0.8.0-typescript-strict
```

**Cleanup After Merge**:
```bash
# Remove worktree after PR merged
git worktree remove ../olane-debug

# Or prune stale worktrees
git worktree prune
```

### Branch Naming

**Convention**: `feat/v0.8.0-<stream-name>`

**Branch Names**:
```
feat/v0.8.0-debug-package       # Stream 1: Debug improvements
feat/v0.8.0-typescript-strict   # Stream 2: TypeScript strict mode
feat/v0.8.0-timeouts-shutdown   # Stream 3: Timeouts + graceful shutdown
feat/v0.8.0-error-handling      # Stream 4: Error handling refactor
feat/v0.8.0-code-cleanup        # Stream 5: Code cleanup
```

**Why This Naming**:
- `feat/` - Feature branches
- `v0.8.0` - Version number for tracking
- Descriptive suffix - Clear purpose

**Alternative for Hotfixes**:
```
fix/v0.8.0-<issue>     # For bug fixes during development
chore/v0.8.0-<task>    # For non-feature work
```

### Work Streams

**Stream 1: Debug Improvements (Independent)**
- **Duration**: 4-6 hours
- **Dependencies**: None
- **Branch**: `feat/v0.8.0-debug-package`
- **Work**:
  - Replace ServerLogger with debug package
  - Add safe logging helpers
  - Update all logging callsites
  - Add tests
- **Can Start**: Immediately
- **Merge Priority**: Medium (no blockers)

**Stream 2: TypeScript Strict Mode (Independent)**
- **Duration**: 10-12 hours
- **Dependencies**: None (can start independently)
- **Branch**: `feat/v0.8.0-typescript-strict`
- **Work**:
  - Enable strict mode incrementally
  - Fix all type errors
  - Add type guards
  - Replace `any` types
- **Can Start**: Immediately
- **Merge Priority**: High (blocks Stream 4)

**Stream 3: Timeouts + Graceful Shutdown (Related)**
- **Duration**: 7-9 hours
- **Dependencies**: None
- **Branch**: `feat/v0.8.0-timeouts-shutdown`
- **Work**:
  - Add timeout middleware
  - Implement graceful shutdown
  - Add signal handlers
  - Add tests
- **Can Start**: Immediately
- **Merge Priority**: Medium
- **Note**: These are related features, keep in one stream

**Stream 4: Error Handling Refactor (Depends on Stream 2)**
- **Duration**: 6-8 hours
- **Dependencies**: TypeScript strict mode (Stream 2)
- **Branch**: `feat/v0.8.0-error-handling`
- **Work**:
  - Create error class hierarchy
  - Update error handler
  - Replace error handling callsites
  - Add tests
- **Can Start**: After Stream 2 merged
- **Merge Priority**: High

**Stream 5: Code Cleanup (Independent, Low Priority)**
- **Duration**: 5-6 hours
- **Dependencies**: None
- **Branch**: `feat/v0.8.0-code-cleanup`
- **Work**:
  - Extract duplicate code
  - Remove dead code
  - ESLint fixes
  - Organizational improvements
- **Can Start**: Immediately
- **Merge Priority**: Low (nice to have)

### Merge Strategy

**Order of Merging**:

```
Timeline (Single Developer):
Day 1: Start Stream 1, 2, 3 (parallel using worktrees)
Day 2: Continue Stream 1, 2, 3
Day 3: Merge Stream 1 → main
       Merge Stream 3 → main
       Merge Stream 2 → main (important: merge after 1 & 3)
Day 4: Start Stream 4 (depends on Stream 2)
       Start Stream 5 (if time)
Day 5: Merge Stream 4 → main
       Merge Stream 5 → main
       Final integration testing
```

**Merge Order** (with rationale):

**1. Stream 1 (Debug) → main** (Day 3 morning)
- **Why First**: Independent, small changes
- **Risk**: Low
- **PR Size**: ~10 files changed
- **Review Time**: 30 minutes

**2. Stream 3 (Timeouts/Shutdown) → main** (Day 3 afternoon)
- **Why Second**: Independent, doesn't conflict with Stream 2
- **Risk**: Low-medium
- **PR Size**: ~5 files changed
- **Review Time**: 45 minutes

**3. Stream 2 (TypeScript Strict) → main** (Day 3 evening)
- **Why Third**: Largest changes, blocks Stream 4
- **Risk**: Medium (many files changed)
- **PR Size**: ~15 files changed
- **Review Time**: 1-2 hours
- **Note**: Merge after Stream 1 & 3 to minimize conflicts

**4. Stream 4 (Error Handling) → main** (Day 4 evening)
- **Why Fourth**: Depends on Stream 2 being merged
- **Risk**: Medium
- **PR Size**: ~12 files changed
- **Review Time**: 1 hour

**5. Stream 5 (Code Cleanup) → main** (Day 5)
- **Why Last**: Lowest priority, cosmetic changes
- **Risk**: Low
- **PR Size**: ~8 files changed
- **Review Time**: 30 minutes

**Merge Commands**:
```bash
# Example: Merging Stream 1
cd /Users/brendon/Development/highway/olane

# Ensure main is up to date
git checkout main
git pull origin main

# Merge feature branch (using GitHub PR or locally)
# Via GitHub: Create PR from feat/v0.8.0-debug-package → main

# Or locally (fast-forward merge):
git merge --ff-only feat/v0.8.0-debug-package

# Push to main
git push origin main

# Clean up worktree
git worktree remove ../olane-debug
```

**Conflict Resolution**:
```bash
# If conflicts occur during merge
git checkout main
git merge feat/v0.8.0-<stream>
# Fix conflicts in files
git add .
git commit
git push origin main
```

---

## 9. Dependencies & Sequencing

### Dependencies from Phase 1 (Security)

**Phase 1 Deliverables** (from `01-security-hardening.md`):
1. JWT implementation
2. Rate limiting (via Cloudflare, configuration only)
3. Security headers (Helmet middleware)
4. Input validation (Zod schemas)
5. Body size limits
6. Error sanitization

**Dependencies for Phase 2**:

**Hard Dependency**: JWT Implementation
- **Why**: Error handling must integrate with JWT errors
- **Stream Affected**: Stream 4 (Error Handling)
- **Action**: Wait for Phase 1 JWT implementation before Stream 4
- **Example**:
  ```typescript
  // From Phase 1
  export class InvalidTokenError extends OlaneServerError {
    readonly code = 'INVALID_TOKEN';
    readonly status = 401;
  }

  // Phase 2 Stream 4 extends error hierarchy
  import { InvalidTokenError, ExpiredTokenError } from './jwt.errors.js';
  ```

**Soft Dependencies** (nice to have, not blockers):
- **Body size limits**: Phase 2 can proceed without, but should coordinate
- **Input validation**: Phase 2 error handling can integrate validation errors
- **Error sanitization**: Phase 2 improves on Phase 1's foundation

**Recommendation**:
- Start Phase 2 Streams 1, 2, 3, 5 immediately (independent)
- Wait for Phase 1 JWT completion before Stream 4
- Coordinate with Phase 1 team on error classes

### What Can Run in Parallel

**Fully Independent Streams** (no conflicts):

**Group A** (can all run simultaneously):
- Stream 1 (Debug Package)
- Stream 2 (TypeScript Strict)
- Stream 3 (Timeouts/Shutdown)
- Stream 5 (Code Cleanup)

**Why No Conflicts**:
- Different files modified
- Different areas of concern
- No shared dependencies

**Example Parallel Workflow**:
```
Developer 1: Stream 1 (Debug Package)
Developer 2: Stream 2 (TypeScript Strict)
Developer 3: Stream 3 (Timeouts/Shutdown)
Developer 4: Stream 5 (Code Cleanup)

All work independently in separate worktrees
Merge in sequence: Stream 1 → 3 → 2 → 5
```

**Single Developer Parallel Work**:
```
Morning: Set up all worktrees, start Stream 1
Afternoon: Switch to Stream 2, make progress
Evening: Switch to Stream 3, make progress
Next Day: Continue rotating between streams
```

**Conflict Risk Assessment**:
| Stream Pair | Conflict Risk | Notes |
|-------------|--------------|-------|
| 1 ↔ 2 | Low | Different files mostly |
| 1 ↔ 3 | Very Low | No overlap |
| 1 ↔ 5 | Low | Debug vs cleanup |
| 2 ↔ 3 | Very Low | No overlap |
| 2 ↔ 5 | Medium | Both touch many files |
| 3 ↔ 5 | Low | Different concerns |

### What Must Be Sequential

**Sequential Dependencies**:

**1. TypeScript Strict (Stream 2) MUST complete before Error Handling (Stream 4)**

**Why**:
- Error handling relies on proper types
- `catch (error: any)` must be fixed before creating error classes
- Type guards need strict mode to work correctly

**Example**:
```typescript
// Stream 2 fixes this:
catch (error: any) {  // ❌ Not strict-mode compliant
  handleError(error);
}

// Stream 4 builds on the fix:
catch (error) {  // ✅ Fixed by Stream 2
  if (isOlaneServerError(error)) {  // ✅ Type guard from Stream 4
    // Handle
  }
}
```

**2. Phase 1 JWT MUST complete before Stream 4**

**Why**:
- Stream 4 extends error hierarchy from Phase 1
- JWT error classes are base for Stream 4

**Sequence**:
```
Phase 1 JWT (1-2 days)
  ↓
Stream 2 TypeScript Strict (2 days)
  ↓
Stream 4 Error Handling (1-2 days)
```

**3. All Streams MUST merge before final integration testing**

**Why**:
- Integration testing requires complete codebase
- Performance testing needs all features
- Cannot release until all streams merged

### Critical Path

**Longest Dependency Chain**:

```
Start
  ↓
Phase 1 JWT Implementation (2 days)
  ↓
Stream 2: TypeScript Strict (2-3 days)
  ↓
Stream 4: Error Handling (1-2 days)
  ↓
Integration Testing (0.5 days)
  ↓
End

Total Critical Path: 5.5-7.5 days
```

**Non-Critical Paths** (can run parallel):
```
Path A: Stream 1 (Debug) → 1 day
Path B: Stream 3 (Timeouts/Shutdown) → 1.5 days
Path C: Stream 5 (Code Cleanup) → 1 day
```

**Timeline Visualization**:
```
Day 0:  Phase 1 JWT (dependency)
Day 1:  Phase 1 JWT
        Stream 1 (Start) ←┐
        Stream 3 (Start) ←┤ Parallel
        Stream 5 (Start) ←┘
Day 2:  Stream 2 (Start) ← Critical path
        Stream 1 (Complete)
        Stream 3 (Complete)
        Stream 5 (Complete)
Day 3:  Stream 2 (Continue)
        Merge: 1, 3, 5
Day 4:  Stream 2 (Complete)
        Stream 4 (Start) ← Depends on 2
        Merge: 2
Day 5:  Stream 4 (Complete)
        Merge: 4
        Integration Testing
        Release v0.8.0 Phase 2

Total: 5 days (with parallel work)
Without parallel: 9+ days
```

**Optimization Opportunity**:
- With multiple developers: 3-4 days (max parallelism)
- With single developer: 5 days (limited parallelism via worktrees)

### Integration Points

**When Streams Merge**:

**Integration Point 1: After Stream 1, 3, 5 merge** (Day 3)
- **Test**: Debug logging works with timeouts
- **Test**: Graceful shutdown logging correct
- **Test**: ESLint passes on merged code
- **Risk**: Low (independent features)

**Integration Point 2: After Stream 2 merges** (Day 4)
- **Test**: All code compiles with strict mode
- **Test**: No type errors
- **Test**: Previous merges still work with strict types
- **Risk**: Medium (affects all code)

**Integration Point 3: After Stream 4 merges** (Day 5)
- **Test**: Error handling works with all features
- **Test**: JWT errors integrate correctly
- **Test**: Debug logging shows error details
- **Test**: Timeouts produce correct errors
- **Risk**: Medium (central feature)

**Final Integration Point: All Streams Merged** (Day 5 afternoon)
- **Test**: Full end-to-end test suite
- **Test**: Load testing with all features
- **Test**: Debug output verification
- **Test**: Error scenarios
- **Test**: Graceful shutdown under load
- **Risk**: High (complete system)

**Integration Testing Checklist**:
```bash
# After each merge
npm run build           # Must succeed
npm test               # All tests pass
npm run lint           # Zero warnings/errors
npm run type-check     # Zero type errors

# Final integration (all merged)
npm run build
npm test
npm run test:integration
npm run test:e2e
npm run lint
npm run type-check

# Manual testing
DEBUG=o-server:* npm start   # Verify debug output
curl http://localhost:3000/api/v1/health  # Health check
# Test timeout scenarios
# Test graceful shutdown (Ctrl+C)
# Test error scenarios
```

---

## 10. Acceptance Criteria

### Debug Package

**Criteria**:
- ✅ ServerLogger replaced with debug package
- ✅ Proper namespaces implemented (o-server:main, o-server:auth, etc.)
- ✅ No sensitive data logged (passwords, tokens redacted)
- ✅ DEBUG environment variable controls output
- ✅ Production deployment has debug disabled by default
- ✅ All logging callsites updated
- ✅ Safe logging helpers implemented
- ✅ Tests verify no sensitive data leaks

**Verification**:
```bash
# Debug disabled by default
npm start
# → No debug output

# Debug enabled for all
DEBUG=o-server:* npm start
# → See all debug output

# Selective debug
DEBUG=o-server:errors npm start
# → See only error debug output

# Verify no sensitive data
DEBUG=o-server:* npm start
# Make request with password/token
# → Should see [REDACTED] in logs
```

**Test Coverage**: 100% of logger usage tested

### TypeScript Strict Mode

**Criteria**:
- ✅ tsconfig.json has `strict: true` enabled
- ✅ All strict flags enabled (see section 3)
- ✅ Zero type errors when compiling
- ✅ Zero explicit `any` types in codebase
- ✅ Type guards implemented for error handling
- ✅ All optional properties properly checked
- ✅ Index signatures safe
- ✅ All tests pass with strict mode

**Verification**:
```bash
# Build with zero errors
npm run build
# → Exit code 0, no errors

# Type check
npx tsc --noEmit
# → Zero errors

# Check for 'any' types
grep -r ": any" src/
# → Zero results

# Run tests
npm test
# → All pass
```

**Files Changed**: 15-20 files

### Timeouts

**Criteria**:
- ✅ All endpoints have appropriate timeouts
- ✅ Default timeout: 30 seconds
- ✅ Streaming timeout: 5 minutes
- ✅ Health check timeout: 5 seconds
- ✅ Timeout errors return HTTP 504
- ✅ Timeout error format correct
- ✅ Configuration interface updated
- ✅ Tests verify timeout behavior

**Verification**:
```bash
# Test default timeout (30s)
time curl -X POST http://localhost:3000/api/v1/use \
  -H "Content-Type: application/json" \
  -d '{"address":"o://slow","method":"hang"}'
# → Should timeout after ~30 seconds with 504

# Test custom timeout
# Start server with 5s timeout
# → Should timeout after ~5 seconds

# Test streaming timeout different from default
# → Streaming should have longer timeout
```

**Test Coverage**: All timeout scenarios tested

### Graceful Shutdown

**Criteria**:
- ✅ Server stops accepting new connections on shutdown
- ✅ Existing connections allowed to complete
- ✅ Force close after timeout (default 30s)
- ✅ Signal handlers registered (SIGTERM, SIGINT)
- ✅ Node lifecycle coordinated
- ✅ New requests rejected during shutdown (503)
- ✅ Tests verify graceful shutdown behavior
- ✅ Zero data loss during shutdown

**Verification**:
```bash
# Test graceful shutdown
npm start
# Make long-running request
curl -X POST http://localhost:3000/api/v1/use ...
# In another terminal, send SIGTERM
kill -TERM $(pgrep node)
# → Request should complete successfully
# → Server should stop after request completes

# Test force shutdown after timeout
# Make request that never completes
# Send SIGTERM
# → After 30s, should force close

# Test new requests rejected during shutdown
# Send SIGTERM
# Immediately make new request
# → Should get 503 Service Unavailable
```

**Test Coverage**: All shutdown scenarios tested

### Error Handling

**Criteria**:
- ✅ Error class hierarchy implemented
- ✅ All errors extend OlaneServerError
- ✅ Zero explicit `any` types in error handling
- ✅ Type guards implemented (isOlaneServerError, etc.)
- ✅ Consistent error patterns across all endpoints
- ✅ JWT errors integrated
- ✅ No stack traces in responses
- ✅ Error sanitization implemented
- ✅ Tests verify error handling

**Verification**:
```bash
# Check error class hierarchy exists
ls src/errors/
# → base.error.ts, client.errors.ts, server.errors.ts, jwt.errors.ts

# Verify no 'any' in error handling
grep -r "catch.*any" src/
# → Zero results

# Test error responses
curl -X POST http://localhost:3000/api/v1/use \
  -H "Content-Type: application/json" \
  -d '{"address":"o://missing","method":"test"}'
# → Should return proper error format, no stack traces

# Verify error format
# → All errors follow ErrorResponse interface
# → No internal details leaked
```

**Test Coverage**: All error types tested

### Code Quality

**Criteria**:
- ✅ ESLint passing with zero warnings
- ✅ No duplicate code (common handlers extracted)
- ✅ No unused dependencies
- ✅ No unused imports
- ✅ Consistent formatting (Prettier)
- ✅ No magic numbers
- ✅ All files < 300 lines
- ✅ Code coverage > 80%

**Verification**:
```bash
# ESLint
npm run lint
# → Zero warnings, zero errors

# Check file sizes
find src -name "*.ts" -exec wc -l {} \;
# → All files < 300 lines

# Check for unused code
npx tsc --noEmit --noUnusedLocals --noUnusedParameters
# → Zero errors

# Test coverage
npm run test:coverage
# → Coverage > 80%

# Formatting
npx prettier --check "src/**/*.ts"
# → All files formatted
```

**Metrics**:
- Code quality score: 9/10 (up from 6.5/10)
- Type safety: 95%+ (up from 40%)
- Test coverage: 80%+ (up from ~5%)

---

## 11. Implementation Checklist

### Stream 1: Debug Package (4-6 hours)

**Phase 1: Setup** (1 hour)
- [ ] Create git worktree: `git worktree add ../olane-debug feat/v0.8.0-debug-package` (5 min)
- [ ] Verify debug package installed: `pnpm list debug` (5 min)
- [ ] Create `src/utils/safe-logger.ts` with redaction helpers (30 min)
- [ ] Update `src/utils/logger.ts` to use debug package (20 min)
- **Dependencies**: None
- **Assignable to**: Stream 1

**Phase 2: Implementation** (2 hours)
- [ ] Replace console.log in `o-server.ts` with debug namespaces (45 min)
  - [ ] `Debug('o-server:main')` for server lifecycle
  - [ ] `Debug('o-server:use')` for /use endpoint
  - [ ] `Debug('o-server:stream')` for streaming endpoint
- [ ] Update `middleware/error-handler.ts` with `Debug('o-server:errors')` (20 min)
- [ ] Update `middleware/auth.ts` with `Debug('o-server:auth')` (20 min)
- [ ] Add JWT debug namespace `Debug('o-server:jwt')` (15 min, coordinate with Phase 1)
- [ ] Update package.json scripts with DEBUG (10 min)
- [ ] Test debug output with DEBUG=o-server:* (10 min)
- **Dependencies**: None
- **Assignable to**: Stream 1

**Phase 3: Testing** (1 hour)
- [ ] Write test: debug disabled by default (15 min)
- [ ] Write test: debug enabled with DEBUG env var (15 min)
- [ ] Write test: sensitive data redaction (20 min)
- [ ] Write test: namespace filtering works (10 min)
- **Dependencies**: Phase 2
- **Assignable to**: Stream 1

**Phase 4: Documentation** (0.5-1 hour)
- [ ] Update README with DEBUG usage (20 min)
- [ ] Document namespace hierarchy (15 min)
- [ ] Add examples to docs (15 min)
- **Dependencies**: Phase 3
- **Assignable to**: Stream 1

**Total: 4-6 hours**

---

### Stream 2: TypeScript Strict Mode (10-12 hours)

**Phase 1: Interfaces** (2-3 hours)
- [ ] Create git worktree: `git worktree add ../olane-strict feat/v0.8.0-typescript-strict` (5 min)
- [ ] Update `interfaces/server-config.interface.ts` (1 hour)
  - [ ] Change `app: any` → `app: Express`
  - [ ] Make `AuthUser.userId` required (not optional)
  - [ ] Remove `[key: string]: any` from AuthUser
  - [ ] Add timeout config interface
  - [ ] Add shutdown config interface
- [ ] Update `interfaces/response.interface.ts` (30 min)
  - [ ] Change `details?: any` → `details?: Record<string, unknown>`
- [ ] Update `middleware/error-handler.ts` types (45 min)
  - [ ] Update OlaneError interface
  - [ ] Remove `any` types
- [ ] Create `src/utils/type-guards.ts` (30 min)
  - [ ] `isError()`
  - [ ] `isOlaneError()`
  - [ ] `hasMessage()`
- **Dependencies**: None
- **Assignable to**: Stream 2

**Phase 2: Core Logic** (3-4 hours)
- [ ] Update `o-server.ts` (2 hours)
  - [ ] Fix catch blocks: `catch (error: any)` → `catch (error)` (30 min)
  - [ ] Add type guards in error handling (30 min)
  - [ ] Fix `handleOlaneError(error: any)` → `handleOlaneError(error: unknown)` (30 min)
  - [ ] Add null checks for optional properties (30 min)
- [ ] Update `middleware/auth.ts` (1 hour)
  - [ ] Fix catch block `catch (error: any)` (15 min)
  - [ ] Add type guards (20 min)
  - [ ] Validate user object structure (25 min)
- [ ] Update `utils/logger.ts` (1 hour)
  - [ ] Change `...args: any[]` → proper types (30 min)
  - [ ] Add type-safe logging methods (30 min)
- **Dependencies**: Phase 1
- **Assignable to**: Stream 2

**Phase 3: Enable Strict Mode** (2-3 hours)
- [ ] Update `tsconfig.json` with all strict flags (15 min)
  - [ ] `strict: true`
  - [ ] `noImplicitAny: true`
  - [ ] `strictNullChecks: true`
  - [ ] All other strict flags (see section 3)
- [ ] Run `tsc --noEmit` and fix all errors (1.5-2 hours)
  - [ ] Fix null/undefined checks
  - [ ] Fix implicit any types
  - [ ] Fix strict property initialization
- [ ] Verify build passes: `npm run build` (15 min)
- [ ] Run all tests: `npm test` (15 min)
- **Dependencies**: Phase 2
- **Assignable to**: Stream 2

**Phase 4: Cleanup** (2 hours)
- [ ] Enable `noUnusedLocals` and fix (30 min)
- [ ] Enable `noUnusedParameters` and fix (30 min)
- [ ] Remove any remaining `any` types (30 min)
- [ ] Final verification: `npx tsc --noEmit` (15 min)
- [ ] Final testing: `npm test` (15 min)
- **Dependencies**: Phase 3
- **Assignable to**: Stream 2

**Phase 5: Testing** (1 hour)
- [ ] Write type guard tests (30 min)
- [ ] Write type safety verification tests (30 min)
- **Dependencies**: Phase 4
- **Assignable to**: Stream 2

**Total: 10-12 hours**

---

### Stream 3: Timeouts + Graceful Shutdown (7-9 hours)

**Phase 1: Request Timeouts** (3-4 hours)
- [ ] Create git worktree: `git worktree add ../olane-timeouts feat/v0.8.0-timeouts-shutdown` (5 min)
- [ ] Install timeout middleware: `pnpm add express-timeout-handler` (5 min)
- [ ] Update `interfaces/server-config.interface.ts` with timeout config (20 min)
- [ ] Implement timeout middleware in `o-server.ts` (1 hour)
  - [ ] Default timeout for /use routes (20 min)
  - [ ] Streaming timeout for /use/stream (20 min)
  - [ ] Health check timeout (20 min)
- [ ] Implement timeout error handler (30 min)
- [ ] Add debug logging for timeouts (20 min)
- [ ] Test timeout behavior manually (30 min)
- **Dependencies**: None
- **Assignable to**: Stream 3

**Phase 2: Graceful Shutdown** (4-5 hours)
- [ ] Implement connection tracking (1 hour)
  - [ ] Track active connections in Set
  - [ ] Add connection event handlers
  - [ ] Remove connections on close
- [ ] Update `stop()` method (1.5 hours)
  - [ ] Stop accepting new connections
  - [ ] Wait for connections to finish
  - [ ] Force close after timeout
  - [ ] Add shutdown flag
- [ ] Implement middleware to reject requests during shutdown (30 min)
- [ ] Add signal handlers (SIGTERM, SIGINT, SIGUSR2) (45 min)
- [ ] Coordinate with node lifecycle (30 min)
- [ ] Add debug logging for shutdown (20 min)
- **Dependencies**: Phase 1
- **Assignable to**: Stream 3

**Phase 3: Testing** (1 hour)
- [ ] Write timeout tests (30 min)
  - [ ] Test default timeout
  - [ ] Test custom timeout
  - [ ] Test streaming timeout
- [ ] Write graceful shutdown tests (30 min)
  - [ ] Test graceful close
  - [ ] Test force close after timeout
  - [ ] Test reject new requests
- **Dependencies**: Phase 2
- **Assignable to**: Stream 3

**Phase 4: Documentation** (0.5 hour)
- [ ] Document timeout configuration (15 min)
- [ ] Document graceful shutdown behavior (15 min)
- **Dependencies**: Phase 3
- **Assignable to**: Stream 3

**Total: 7-9 hours**

---

### Stream 4: Error Handling (6-8 hours)

**IMPORTANT: Wait for Stream 2 (TypeScript Strict) to complete before starting**

**Phase 1: Error Class Hierarchy** (2 hours)
- [ ] **Wait for Stream 2 merge** (blocker)
- [ ] Create git worktree: `git worktree add ../olane-errors feat/v0.8.0-error-handling` (5 min)
- [ ] Create `src/errors/base.error.ts` (30 min)
  - [ ] OlaneServerError base class
  - [ ] toJSON() method
- [ ] Create `src/errors/client.errors.ts` (30 min)
  - [ ] InvalidParamsError
  - [ ] UnauthorizedError
  - [ ] NotFoundError
  - [ ] TimeoutError
- [ ] Create `src/errors/server.errors.ts` (30 min)
  - [ ] ExecutionError
  - [ ] ServiceUnavailableError
- [ ] Create `src/errors/jwt.errors.ts` (20 min, coordinate with Phase 1)
  - [ ] InvalidTokenError
  - [ ] ExpiredTokenError
- [ ] Create `src/errors/index.ts` with exports and type guards (10 min)
- **Dependencies**: Stream 2 (TypeScript Strict)
- **Assignable to**: Stream 4

**Phase 2: Update Error Handler** (1 hour)
- [ ] Update `middleware/error-handler.ts` (45 min)
  - [ ] Handle OlaneServerError instances
  - [ ] Use type guards
  - [ ] Remove any types
  - [ ] Add debug logging
- [ ] Test error handler manually (15 min)
- **Dependencies**: Phase 1
- **Assignable to**: Stream 4

**Phase 3: Update Callsites** (2 hours)
- [ ] Update `o-server.ts` (1 hour)
  - [ ] Replace handleOlaneError with error classes
  - [ ] Use throw new InvalidParamsError() instead of manual error construction
  - [ ] Update all catch blocks to use error classes
- [ ] Update `middleware/auth.ts` (30 min)
  - [ ] Use UnauthorizedError
  - [ ] Distinguish auth failure from internal error
- [ ] Update route handlers (30 min)
  - [ ] Use appropriate error classes
  - [ ] Remove manual error construction
- **Dependencies**: Phase 2
- **Assignable to**: Stream 4

**Phase 4: Testing** (1.5 hours)
- [ ] Write error class tests (30 min)
  - [ ] Test each error class
  - [ ] Test toJSON() method
  - [ ] Test type guards
- [ ] Write error handler integration tests (45 min)
  - [ ] Test error response format
  - [ ] Test no information leakage
  - [ ] Test all error types
- [ ] Run full test suite (15 min)
- **Dependencies**: Phase 3
- **Assignable to**: Stream 4

**Phase 5: Documentation** (0.5 hour)
- [ ] Document error class hierarchy (20 min)
- [ ] Document error response format (10 min)
- **Dependencies**: Phase 4
- **Assignable to**: Stream 4

**Total: 6-8 hours**

---

### Stream 5: Code Cleanup (5-6 hours)

**Phase 1: Extract Duplicate Code** (1.5 hours)
- [ ] Create git worktree: `git worktree add ../olane-cleanup feat/v0.8.0-code-cleanup` (5 min)
- [ ] Extract common handler from /use routes (1 hour)
  - [ ] Create `handleToolRequest()` function
  - [ ] Update POST /use to use handler
  - [ ] Update POST /:address/:method to use handler
  - [ ] Test routes still work
- [ ] Remove other duplicate code (25 min)
- **Dependencies**: None
- **Assignable to**: Stream 5

**Phase 2: Remove Dead Code** (0.5 hours)
- [ ] Remove unused dependencies (15 min)
  - [ ] Remove dotenv: `pnpm remove dotenv`
  - [ ] Verify build still works
- [ ] Remove unused imports (15 min)
  - [ ] Run `npx tsc --noEmit --noUnusedLocals --noUnusedParameters`
  - [ ] Remove flagged imports
- **Dependencies**: None
- **Assignable to**: Stream 5

**Phase 3: ESLint Fixes** (1 hour)
- [ ] Update `.eslintrc.json` with strict rules (15 min)
- [ ] Run `npm run lint` and fix warnings (30 min)
- [ ] Run `npm run lint:fix` (15 min)
- **Dependencies**: None
- **Assignable to**: Stream 5

**Phase 4: Code Organization** (2 hours, optional)
- [ ] Evaluate if o-server.ts > 300 lines (10 min)
- [ ] If yes, extract routes to separate files (1.5 hours)
  - [ ] Create routes/ directory
  - [ ] Extract health route
  - [ ] Extract use routes
  - [ ] Extract stream route
- [ ] Update imports (20 min)
- **Dependencies**: Phase 1
- **Assignable to**: Stream 5
- **Note**: Only if time permits

**Phase 5: Testing** (1 hour)
- [ ] Run full test suite (15 min)
- [ ] Verify ESLint passes (10 min)
- [ ] Verify build passes (10 min)
- [ ] Manual testing (25 min)
- **Dependencies**: Phases 1-4
- **Assignable to**: Stream 5

**Total: 5-6 hours (or 3-4 hours without Phase 4)**

---

### Final Integration (0.5 days = 4 hours)

**All streams must be merged before this phase**

**Phase 1: Merge Verification** (1 hour)
- [ ] Verify all streams merged to main (10 min)
- [ ] Pull latest main: `git pull origin main` (5 min)
- [ ] Clean build: `npm run deep:clean && pnpm install && npm run build` (15 min)
- [ ] Run all tests: `npm test` (15 min)
- [ ] Run lint: `npm run lint` (10 min)
- [ ] Run type check: `npx tsc --noEmit` (5 min)
- **Dependencies**: All streams merged
- **Assignable to**: Lead developer

**Phase 2: Integration Testing** (2 hours)
- [ ] Test debug output (30 min)
  - [ ] Verify DEBUG=o-server:* works
  - [ ] Verify namespaces work
  - [ ] Verify no sensitive data logged
- [ ] Test timeouts (30 min)
  - [ ] Test default timeout
  - [ ] Test streaming timeout
  - [ ] Test timeout errors
- [ ] Test graceful shutdown (30 min)
  - [ ] Test SIGTERM handling
  - [ ] Test connection draining
  - [ ] Test force close
- [ ] Test error handling (30 min)
  - [ ] Test all error types
  - [ ] Test error format
  - [ ] Test no information leakage
- **Dependencies**: Phase 1
- **Assignable to**: QA or lead developer

**Phase 3: Documentation** (1 hour)
- [ ] Update main README (30 min)
  - [ ] Debug usage
  - [ ] Timeout configuration
  - [ ] Graceful shutdown behavior
  - [ ] Error handling
- [ ] Update CHANGELOG (15 min)
- [ ] Create release notes (15 min)
- **Dependencies**: Phase 2
- **Assignable to**: Lead developer or technical writer

**Total: 4 hours**

---

## Total Estimated Effort

### By Stream

| Stream | Hours | Days (8h) |
|--------|-------|-----------|
| Stream 1: Debug | 4-6 | 0.5-0.75 |
| Stream 2: TypeScript Strict | 10-12 | 1.25-1.5 |
| Stream 3: Timeouts/Shutdown | 7-9 | 0.9-1.1 |
| Stream 4: Error Handling | 6-8 | 0.75-1 |
| Stream 5: Code Cleanup | 5-6 | 0.6-0.75 |
| Final Integration | 4 | 0.5 |
| **Total** | **36-45** | **4.5-5.6** |

### With Parallelization (Single Developer)

**Timeline**: 5 days (1 week)

```
Day 1: Streams 1, 3, 5 (start all, rotate)
Day 2: Streams 1, 3, 5 (complete), Stream 2 (start)
Day 3: Stream 2 (continue), merge 1, 3, 5
Day 4: Stream 2 (complete, merge), Stream 4 (start)
Day 5: Stream 4 (complete, merge), Integration testing
```

### With Parallelization (Multiple Developers)

**Timeline**: 3-4 days

```
Day 1-2: All streams run in parallel (4 developers)
Day 3: Stream 4 starts (after Stream 2), final merges
Day 4: Integration testing
```

---

## Summary

Version 0.8.0 Phase 2 elevates o-server to production code quality standards through:

1. **Debug Package Integration** - Production-safe logging with namespaces
2. **TypeScript Strict Mode** - 95%+ type safety, zero `any` types
3. **Request Timeouts** - Prevent hung connections, configurable per route
4. **Graceful Shutdown** - Zero-downtime deploys, connection draining
5. **Error Handling** - Structured error classes, consistent patterns
6. **Code Cleanup** - DRY principles, no dead code, ESLint compliance

**Quality Improvement**: 6.5/10 → 9/10
**Type Safety**: 40% → 95%+
**Estimated Effort**: 36-45 hours (1 week with parallel development)

The phase is designed for parallel development using git worktrees, with clear dependencies and integration points. Stream 2 (TypeScript Strict) is on the critical path, blocking Stream 4 (Error Handling). All other streams can run independently.

Upon completion, o-server will be production-ready with enterprise-grade code quality, proper error handling, and operational reliability.
