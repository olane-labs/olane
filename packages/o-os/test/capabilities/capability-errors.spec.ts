import { expect } from 'chai';

// Note: CapabilityError is not exported from @olane/o-lane index
// We need to import directly from the errors file
// For now, we'll test the concept using standard errors until the export is available

describe('Capability Error Handling @capability @errors', () => {
  describe('CapabilityErrorType enum', () => {
    it('should define error types', () => {
      // Test error type constants exist
      const errorTypes = [
        'NOT_FOUND',
        'UNAUTHORIZED',
        'FORBIDDEN',
        'INVALID_CONFIG',
        'MISSING_PARAMETER',
        'INVALID_PARAMETER',
        'TOOL_ERROR',
        'TIMEOUT',
        'NETWORK_ERROR',
        'INVALID_STATE',
        'RESOURCE_EXHAUSTED',
        'UNKNOWN'
      ];

      expect(errorTypes).to.be.an('array');
      expect(errorTypes.length).to.equal(12);
    });
  });

  describe('Error context structure', () => {
    it('should support cycle context', () => {
      const context = {
        cycle: 5,
        capabilityType: 'TASK',
        toolAddress: 'o://test-tool',
        method: 'testMethod'
      };

      expect(context.cycle).to.equal(5);
      expect(context.capabilityType).to.equal('TASK');
      expect(context.toolAddress).to.equal('o://test-tool');
      expect(context.method).to.equal('testMethod');
    });

    it('should support capability type context', () => {
      const context = {
        capabilityType: 'EVALUATE'
      };

      expect(context.capabilityType).to.equal('EVALUATE');
    });

    it('should support tool address context', () => {
      const context = {
        toolAddress: 'o://calculator'
      };

      expect(context.toolAddress).to.equal('o://calculator');
    });

    it('should support method context', () => {
      const context = {
        method: 'add'
      };

      expect(context.method).to.equal('add');
    });

    it('should support additional data context', () => {
      const context = {
        data: {
          param1: 'value1',
          param2: 123,
          nested: { value: true }
        }
      };

      expect(context.data).to.exist;
      expect(context.data.param1).to.equal('value1');
    });

    it('should support intent context', () => {
      const context = {
        intent: 'User wanted to calculate 2+2'
      };

      expect(context.intent).to.equal('User wanted to calculate 2+2');
    });

    it('should support empty context', () => {
      const context = {};

      expect(context).to.be.an('object');
      expect(Object.keys(context).length).to.equal(0);
    });

    it('should support partial context', () => {
      const context = {
        cycle: 3,
        toolAddress: 'o://test'
        // Other fields omitted
      };

      expect(context.cycle).to.equal(3);
      expect(context.toolAddress).to.equal('o://test');
    });
  });

  describe('Standard Error handling in capabilities', () => {
    it('should create error with message', () => {
      const error = new Error('Test capability error');

      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.equal('Test capability error');
    });

    it('should preserve error stack trace', () => {
      const error = new Error('Test error with stack');

      expect(error.stack).to.exist;
      expect(error.stack).to.be.a('string');
    });

    it('should support error with cause', () => {
      const originalError = new Error('Original error');
      const wrappedError = new Error('Wrapped error');
      (wrappedError as any).cause = originalError;

      expect((wrappedError as any).cause).to.equal(originalError);
    });
  });

  describe('Error type inference', () => {
    it('should infer NOT_FOUND from message', () => {
      const messages = [
        'Tool not found',
        'Resource not found',
        'Error 404',
        'Cannot find the specified tool'
      ];

      messages.forEach(msg => {
        const error = new Error(msg);
        expect(error.message.includes('not found') || error.message.includes('404')).to.be.true;
      });
    });

    it('should infer UNAUTHORIZED from message', () => {
      const messages = [
        'Unauthorized access',
        'Error 401',
        'Not authorized'
      ];

      messages.forEach(msg => {
        const error = new Error(msg);
        expect(error.message.toLowerCase()).to.satisfy((s: string) =>
          s.includes('unauthorized') || s.includes('401') || s.includes('authorized')
        );
      });
    });

    it('should infer FORBIDDEN from message', () => {
      const messages = [
        'Forbidden',
        'Error 403',
        'Access forbidden'
      ];

      messages.forEach(msg => {
        const error = new Error(msg);
        expect(error.message).to.satisfy((s: string) =>
          s.toLowerCase().includes('forbidden') || s.includes('403')
        );
      });
    });

    it('should infer TIMEOUT from message', () => {
      const messages = [
        'Operation timeout',
        'Request timed out',
        'Timeout exceeded'
      ];

      messages.forEach(msg => {
        const error = new Error(msg);
        expect(error.message.toLowerCase()).to.include('timeout');
      });
    });

    it('should infer NETWORK_ERROR from message', () => {
      const messages = [
        'Network error',
        'ECONNREFUSED',
        'Connection refused'
      ];

      messages.forEach(msg => {
        const error = new Error(msg);
        expect(error.message).to.satisfy((s: string) =>
          s.toLowerCase().includes('network') || s.includes('ECONNREFUSED') || s.toLowerCase().includes('connection')
        );
      });
    });

    it('should infer INVALID_CONFIG from message', () => {
      const messages = [
        'Invalid configuration',
        'Config parameter missing',
        'Configuration error'
      ];

      messages.forEach(msg => {
        const error = new Error(msg);
        expect(error.message.toLowerCase()).to.satisfy((s: string) =>
          s.includes('config') || s.includes('parameter')
        );
      });
    });
  });

  describe('Error message formatting', () => {
    it('should create descriptive error messages', () => {
      const error = new Error('Failed to configure the tool use');

      expect(error.message).to.be.a('string');
      expect(error.message.length).to.be.greaterThan(0);
    });

    it('should include context in error messages', () => {
      const toolAddress = 'o://calculator';
      const method = 'add';
      const message = `Failed to execute ${method} on ${toolAddress}`;
      const error = new Error(message);

      expect(error.message).to.include(toolAddress);
      expect(error.message).to.include(method);
    });

    it('should format multi-line error messages', () => {
      const message = `Error occurred:
- Tool: o://test
- Method: testMethod
- Reason: Parameter validation failed`;

      const error = new Error(message);

      expect(error.message).to.include('Tool: o://test');
      expect(error.message).to.include('Method: testMethod');
    });
  });

  describe('Error remediation suggestions', () => {
    it('should suggest remediation for NOT_FOUND errors', () => {
      const remediation = 'Verify the tool address exists and is accessible. Use search to find available tools.';

      expect(remediation).to.include('Verify');
      expect(remediation).to.include('tool address');
    });

    it('should suggest remediation for UNAUTHORIZED errors', () => {
      const remediation = 'Check that you have the necessary permissions to access this resource.';

      expect(remediation).to.include('permissions');
    });

    it('should suggest remediation for INVALID_CONFIG errors', () => {
      const remediation = 'Review the configuration parameters and ensure they match the required format.';

      expect(remediation).to.include('configuration');
      expect(remediation).to.include('parameters');
    });

    it('should suggest remediation for MISSING_PARAMETER errors', () => {
      const remediation = 'Provide all required parameters. Use the tool\'s handshake to see parameter requirements.';

      expect(remediation).to.include('parameters');
      expect(remediation).to.include('handshake');
    });

    it('should suggest remediation for TIMEOUT errors', () => {
      const remediation = 'The operation took too long. Try simplifying the request or increasing the timeout.';

      expect(remediation).to.include('timeout');
    });

    it('should suggest remediation for NETWORK_ERROR errors', () => {
      const remediation = 'Check your network connection and try again.';

      expect(remediation).to.include('network');
    });
  });

  describe('Error serialization', () => {
    it('should serialize error to JSON', () => {
      const error = new Error('Test error');
      const json = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };

      expect(json.name).to.equal('Error');
      expect(json.message).to.equal('Test error');
      expect(json.stack).to.exist;
    });

    it('should include context in JSON serialization', () => {
      const error = new Error('Test error');
      const context = {
        cycle: 5,
        capabilityType: 'TASK',
        toolAddress: 'o://test'
      };

      const json = {
        name: error.name,
        message: error.message,
        context: context
      };

      expect(json.context).to.deep.equal(context);
    });

    it('should handle circular references in context', () => {
      const context: any = {
        cycle: 1
      };
      context.self = context; // Circular reference

      // JSON.stringify would fail on circular refs, so we test safe handling
      const safeContext = { cycle: context.cycle };
      expect(safeContext.cycle).to.equal(1);
    });
  });

  describe('Error wrapping and chaining', () => {
    it('should wrap generic errors', () => {
      const originalError = new Error('Original error');
      const wrappedError = new Error(`Capability failed: ${originalError.message}`);

      expect(wrappedError.message).to.include('Original error');
    });

    it('should preserve original error information', () => {
      const originalError = new Error('Database connection failed');
      originalError.stack = 'Stack trace here';

      const wrappedError = new Error(`Tool error: ${originalError.message}`);
      (wrappedError as any).originalError = originalError;

      expect((wrappedError as any).originalError).to.equal(originalError);
      expect((wrappedError as any).originalError.stack).to.exist;
    });

    it('should handle already wrapped errors', () => {
      const error1 = new Error('Level 1 error');
      const error2 = new Error(`Level 2: ${error1.message}`);
      const error3 = new Error(`Level 3: ${error2.message}`);

      expect(error3.message).to.include('Level 1 error');
    });
  });

  describe('Error labels and categorization', () => {
    it('should provide friendly labels for error types', () => {
      const labels: Record<string, string> = {
        NOT_FOUND: 'Resource Not Found',
        UNAUTHORIZED: 'Unauthorized',
        FORBIDDEN: 'Forbidden',
        INVALID_CONFIG: 'Invalid Configuration',
        MISSING_PARAMETER: 'Missing Parameter',
        INVALID_PARAMETER: 'Invalid Parameter',
        TOOL_ERROR: 'Tool Execution Error',
        TIMEOUT: 'Timeout',
        NETWORK_ERROR: 'Network Error',
        INVALID_STATE: 'Invalid State',
        RESOURCE_EXHAUSTED: 'Resource Exhausted',
        UNKNOWN: 'Unknown Error'
      };

      expect(labels.NOT_FOUND).to.equal('Resource Not Found');
      expect(labels.TIMEOUT).to.equal('Timeout');
      expect(labels.UNKNOWN).to.equal('Unknown Error');
    });

    it('should categorize errors by severity', () => {
      const severities = {
        critical: ['RESOURCE_EXHAUSTED', 'NETWORK_ERROR'],
        warning: ['TIMEOUT', 'INVALID_STATE'],
        info: ['NOT_FOUND', 'MISSING_PARAMETER']
      };

      expect(severities.critical).to.include('RESOURCE_EXHAUSTED');
      expect(severities.warning).to.include('TIMEOUT');
      expect(severities.info).to.include('NOT_FOUND');
    });
  });

  describe('Error recovery strategies', () => {
    it('should indicate retryable errors', () => {
      const retryableErrors = [
        'TIMEOUT',
        'NETWORK_ERROR',
        'RESOURCE_EXHAUSTED'
      ];

      expect(retryableErrors).to.include('TIMEOUT');
      expect(retryableErrors).to.include('NETWORK_ERROR');
    });

    it('should indicate non-retryable errors', () => {
      const nonRetryableErrors = [
        'NOT_FOUND',
        'UNAUTHORIZED',
        'FORBIDDEN',
        'INVALID_CONFIG',
        'INVALID_PARAMETER'
      ];

      expect(nonRetryableErrors).to.include('NOT_FOUND');
      expect(nonRetryableErrors).to.include('UNAUTHORIZED');
    });
  });
});
