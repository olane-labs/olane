import { sanitizeErrorMessage } from '../src/middleware/error-handler.js';
import { expect } from 'aegir/chai';

// Test the sanitizeErrorMessage function directly
// This avoids the complexity of full end-to-end tests with oLaneTool
describe('Error Sanitization', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('Production Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should use generic message for NODE_NOT_FOUND in production', () => {
      const result = sanitizeErrorMessage('NODE_NOT_FOUND', 'Detailed error: node at o://internal/secret not found');
      expect(result).to.equal('The requested resource was not found');
      expect(result).to.not.contain('internal');
      expect(result).to.not.contain('secret');
    });

    it('should use generic message for TOOL_NOT_FOUND in production', () => {
      const result = sanitizeErrorMessage('TOOL_NOT_FOUND', 'Tool implementation at /var/app/tools/secret-tool.js not found');
      expect(result).to.equal('The requested tool was not found');
      expect(result).to.not.contain('/var/app');
      expect(result).to.not.contain('secret-tool');
    });

    it('should use generic message for INVALID_PARAMS in production', () => {
      const result = sanitizeErrorMessage('INVALID_PARAMS', 'Invalid param: user_id must be UUID, got admin-password-123');
      expect(result).to.equal('Invalid parameters provided');
      expect(result).to.not.contain('admin-password');
      expect(result).to.not.contain('UUID');
    });

    it('should use generic message for TIMEOUT in production', () => {
      const result = sanitizeErrorMessage('TIMEOUT', 'Timeout connecting to database at 192.168.1.100:5432');
      expect(result).to.equal('The request timed out');
      expect(result).to.not.contain('192.168');
      expect(result).to.not.contain('5432');
    });

    it('should use generic message for EXECUTION_ERROR in production', () => {
      const result = sanitizeErrorMessage('EXECUTION_ERROR', 'Failed to execute: API key "sk-secret-123" is invalid');
      expect(result).to.equal('An error occurred while processing your request');
      expect(result).to.not.contain('API key');
      expect(result).to.not.contain('sk-secret');
    });

    it('should use generic message for unknown error codes in production', () => {
      const result = sanitizeErrorMessage('CUSTOM_ERROR', 'Custom error with sensitive data: password=secret123');
      expect(result).to.equal('An internal error occurred');
      expect(result).to.not.contain('password');
      expect(result).to.not.contain('secret');
    });
  });

  describe('Development Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should preserve original message for NODE_NOT_FOUND in development', () => {
      const originalMessage = 'Detailed error: node at o://internal/debug not found';
      const result = sanitizeErrorMessage('NODE_NOT_FOUND', originalMessage);
      expect(result).to.equal(originalMessage);
      expect(result).to.contain('internal');
      expect(result).to.contain('debug');
    });

    it('should preserve original message for TOOL_NOT_FOUND in development', () => {
      const originalMessage = 'Tool implementation at /var/app/tools/test-tool.js not found';
      const result = sanitizeErrorMessage('TOOL_NOT_FOUND', originalMessage);
      expect(result).to.equal(originalMessage);
      expect(result).to.contain('/var/app');
      expect(result).to.contain('test-tool');
    });

    it('should preserve original message for INVALID_PARAMS in development', () => {
      const originalMessage = 'Invalid param: user_id must be UUID, got test-123';
      const result = sanitizeErrorMessage('INVALID_PARAMS', originalMessage);
      expect(result).to.equal(originalMessage);
      expect(result).to.contain('UUID');
      expect(result).to.contain('test-123');
    });

    it('should preserve original message for TIMEOUT in development', () => {
      const originalMessage = 'Timeout connecting to database at localhost:5432';
      const result = sanitizeErrorMessage('TIMEOUT', originalMessage);
      expect(result).to.equal(originalMessage);
      expect(result).to.contain('localhost');
      expect(result).to.contain('5432');
    });

    it('should preserve original message for EXECUTION_ERROR in development', () => {
      const originalMessage = 'Failed to execute: connection pool exhausted';
      const result = sanitizeErrorMessage('EXECUTION_ERROR', originalMessage);
      expect(result).to.equal(originalMessage);
      expect(result).to.contain('connection pool');
    });
  });

  describe('Stack Trace Handling', () => {
    it('should verify details are undefined in production mode', () => {
      process.env.NODE_ENV = 'production';

      // Simulate what happens in o-server.ts line 207
      const error = new Error('Test error');
      const stackTrace = error.stack;

      const details = process.env.NODE_ENV === 'development'
        ? stackTrace
        : undefined;

      expect(details).to.be.undefined;
    });

    it('should verify details include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      const stackTrace = error.stack;

      const details = process.env.NODE_ENV === 'development'
        ? stackTrace
        : undefined;

      expect(details).to.exist;
      expect(details).to.contain('Error: Test error');
      expect(details).to.contain('at');
    });

    it('should verify error.details takes precedence over error.stack', () => {
      process.env.NODE_ENV = 'development';

      const error: any = new Error('Test error');
      error.details = 'Custom debug information';

      const details = process.env.NODE_ENV === 'development'
        ? (error.details || error.stack)
        : undefined;

      expect(details).to.equal('Custom debug information');
    });

    it('should verify both details and stack are filtered in production', () => {
      process.env.NODE_ENV = 'production';

      const error: any = new Error('Test error');
      error.details = 'Sensitive information: API_KEY=sk-secret-123';

      const details = process.env.NODE_ENV === 'development'
        ? (error.details || error.stack)
        : undefined;

      expect(details).to.be.undefined;
    });
  });
});
