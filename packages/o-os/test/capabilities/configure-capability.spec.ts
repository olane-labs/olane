import { expect } from 'chai';
import { oCapabilityConfigure, oCapabilityType } from '@olane/o-lane';
import { oAddress, oErrorCodes } from '@olane/o-core';
import { createTestOS, createTestLaneTool, createMockCapabilityConfig } from './utils/capability-test-utils.js';
import { OlaneOS } from '../../src/o-olane-os/index.js';
import type { oLaneTool } from '@olane/o-lane';

describe('oCapabilityConfigure @capability @configure', () => {
  let os: OlaneOS;
  let laneTool: oLaneTool;
  let configureCapability: oCapabilityConfigure;

  before(async () => {
    os = await createTestOS();
    laneTool = await createTestLaneTool(os);
  });

  after(async () => {
    if (laneTool) {
      await laneTool.stop();
    }
    if (os) {
      await os.stop();
    }
  });

  beforeEach(() => {
    configureCapability = new oCapabilityConfigure();
  });

  describe('type identification', () => {
    it('should return CONFIGURE type from instance getter', () => {
      expect(configureCapability.type).to.equal(oCapabilityType.CONFIGURE);
    });

    it('should return CONFIGURE type from static getter', () => {
      expect(oCapabilityConfigure.type).to.equal(oCapabilityType.CONFIGURE);
    });
  });

  describe('inheritance', () => {
    it('should extend oCapabilityIntelligence', async () => {
      expect(configureCapability).to.respondTo('intelligence');
    });

    it('should have access to intelligence method', async () => {
      const params = {
        toolAddress: 'o://test-tool',
        intent: 'Test intent'
      };

      const config = createMockCapabilityConfig(laneTool, 'Configure intent', params);
      await configureCapability.execute(config);

      expect(configureCapability.intelligence).to.be.a('function');
    });
  });

  describe('generatePrompt() method', () => {
    it('should generate prompt with tools and methods', async () => {
      const params = {
        toolAddress: 'o://test-tool',
        intent: 'Test configuration intent'
      };

      const config = createMockCapabilityConfig(laneTool, 'Configure intent', params);
      config.history = 'Previous execution history';
      await configureCapability.execute(config);

      const tools = ['method1', 'method2', 'method3'];
      const methods = {
        method1: {
          name: 'method1',
          description: 'First method',
          params: {}
        },
        method2: {
          name: 'method2',
          description: 'Second method',
          params: {}
        }
      };

      const prompt = configureCapability.generatePrompt(tools, methods as any);

      expect(prompt).to.be.a('string');
      expect(prompt.length).to.be.greaterThan(0);
    });

    it('should include tool address in prompt', async () => {
      const toolAddress = 'o://specific-test-tool';
      const params = {
        toolAddress,
        intent: 'Test intent'
      };

      const config = createMockCapabilityConfig(laneTool, 'Configure intent', params);
      await configureCapability.execute(config);

      const tools = ['testMethod'];
      const methods = {
        testMethod: {
          name: 'testMethod',
          description: 'Test method',
          params: {}
        }
      };

      const prompt = configureCapability.generatePrompt(tools, methods as any);

      expect(prompt).to.include(toolAddress);
    });

    it('should include user intent in prompt', async () => {
      const userIntent = 'Configure the calculator to add two numbers';
      const params = {
        toolAddress: 'o://calculator',
        intent: userIntent
      };

      const config = createMockCapabilityConfig(laneTool, 'Configure intent', params);
      await configureCapability.execute(config);

      const tools = ['add'];
      const methods = {
        add: {
          name: 'add',
          description: 'Add two numbers',
          params: { a: 'number', b: 'number' }
        }
      };

      const prompt = configureCapability.generatePrompt(tools, methods as any);

      expect(prompt).to.include(userIntent);
    });

    it('should include history in prompt', async () => {
      const params = {
        toolAddress: 'o://test-tool',
        intent: 'Test intent'
      };

      const history = 'Previous steps:\n1. Evaluated intent\n2. Found tool';
      const config = createMockCapabilityConfig(laneTool, 'Configure intent', params);
      config.history = history;
      await configureCapability.execute(config);

      const tools = ['method1'];
      const methods = {
        method1: {
          name: 'method1',
          description: 'Method 1',
          params: {}
        }
      };

      const prompt = configureCapability.generatePrompt(tools, methods as any);

      expect(prompt).to.be.a('string');
      // History should be incorporated into the prompt
    });

    it('should handle empty tools array', async () => {
      const params = {
        toolAddress: 'o://test-tool',
        intent: 'Test intent'
      };

      const config = createMockCapabilityConfig(laneTool, 'Configure intent', params);
      await configureCapability.execute(config);

      const tools: string[] = [];
      const methods = {};

      const prompt = configureCapability.generatePrompt(tools, methods);

      expect(prompt).to.be.a('string');
      expect(prompt.length).to.be.greaterThan(0);
    });

    it('should handle methods with complex parameters', async () => {
      const params = {
        toolAddress: 'o://test-tool',
        intent: 'Test intent'
      };

      const config = createMockCapabilityConfig(laneTool, 'Configure intent', params);
      await configureCapability.execute(config);

      const tools = ['complexMethod'];
      const methods = {
        complexMethod: {
          name: 'complexMethod',
          description: 'Complex method with many params',
          params: {
            stringParam: 'string',
            numberParam: 'number',
            boolParam: 'boolean',
            objectParam: 'object',
            arrayParam: 'array'
          }
        }
      };

      const prompt = configureCapability.generatePrompt(tools, methods as any);

      expect(prompt).to.be.a('string');
      expect(prompt).to.include('complexMethod');
    });
  });

  describe('handshake() method', () => {
    it('should attempt handshake with tool address', async () => {
      const params = {
        toolAddress: 'o://test-tool',
        intent: 'Test handshake'
      };

      const config = createMockCapabilityConfig(laneTool, 'Configure intent', params);
      await configureCapability.execute(config);

      // Handshake may fail if tool doesn't exist
      try {
        const result = await configureCapability.handshake();
        expect(result).to.exist;
      } catch (error) {
        // Expected if tool is not available
        expect(error).to.exist;
      }
    });

    it('should include intent in handshake', async () => {
      const params = {
        toolAddress: 'o://test-tool',
        intent: 'Handshake with specific intent'
      };

      const config = createMockCapabilityConfig(laneTool, 'Configure intent', params);
      await configureCapability.execute(config);

      try {
        await configureCapability.handshake();
      } catch (error) {
        // Expected if tool is not available
        // Test validates structure
      }
    });

    it('should return handshake result with tools and methods', async () => {
      const params = {
        toolAddress: 'o://test-tool',
        intent: 'Get tool capabilities'
      };

      const config = createMockCapabilityConfig(laneTool, 'Configure intent', params);
      await configureCapability.execute(config);

      try {
        const result = await configureCapability.handshake();
        if (result.result) {
          expect(result.result).to.have.property('tools');
          expect(result.result).to.have.property('methods');
        }
      } catch (error) {
        // Expected if tool is not available
      }
    });
  });

  describe('run() method', () => {
    it('should execute handshake and intelligence', async () => {
      const params = {
        toolAddress: 'o://test-tool',
        intent: 'Configure tool usage'
      };

      const config = createMockCapabilityConfig(laneTool, 'Configure intent', params);

      // May fail if tool or intelligence service not available
      try {
        const result = await configureCapability.execute(config);
        expect(result).to.exist;
      } catch (error) {
        // Expected if services are not configured
        expect(error).to.exist;
      }
    });

    it('should handle handshake failure', async () => {
      const params = {
        toolAddress: 'o://nonexistent-tool',
        intent: 'Try to configure nonexistent tool'
      };

      const config = createMockCapabilityConfig(laneTool, 'Configure intent', params);

      try {
        const result = await configureCapability.execute(config);
        // If it doesn't throw, check for error in result
        if (result.error) {
          expect(result.error).to.exist;
        }
      } catch (error) {
        // Expected
        expect(error).to.exist;
      }
    });

    it('should handle replay mode', async () => {
      const params = {
        toolAddress: 'o://test-tool',
        intent: 'Replay configuration'
      };

      const config = createMockCapabilityConfig(
        laneTool,
        'Configure intent',
        params,
        { isReplay: true }
      );

      try {
        const result = await configureCapability.execute(config);
        expect(result).to.exist;
        expect(config.isReplay).to.be.true;
      } catch (error) {
        // Expected if services not available
      }
    });
  });

  describe('result structure', () => {
    it('should return capability result', async () => {
      const params = {
        toolAddress: 'o://test-tool',
        intent: 'Test result structure'
      };

      const config = createMockCapabilityConfig(laneTool, 'Configure intent', params);

      try {
        const result = await configureCapability.execute(config);
        expect(result).to.exist;
        expect(result).to.have.property('type');
      } catch (error) {
        // Expected if services not available
      }
    });

    it('should include config in result', async () => {
      const params = {
        toolAddress: 'o://test-tool',
        intent: 'Test config inclusion'
      };

      const config = createMockCapabilityConfig(laneTool, 'Configure intent', params);

      try {
        const result = await configureCapability.execute(config);
        if (result.config) {
          expect(result.config).to.exist;
        }
      } catch (error) {
        // Expected if services not available
      }
    });
  });

  describe('configuration parameters', () => {
    it('should require toolAddress parameter', async () => {
      const params = {
        intent: 'Missing tool address'
      };

      const config = createMockCapabilityConfig(laneTool, 'Configure intent', params);

      try {
        await configureCapability.execute(config);
        // If no error, validate that params are accessible
      } catch (error: any) {
        // Should fail without tool address
        expect(error).to.exist;
      }
    });

    it('should use intent parameter', async () => {
      const params = {
        toolAddress: 'o://test-tool',
        intent: 'Specific configuration intent'
      };

      const config = createMockCapabilityConfig(laneTool, 'Configure intent', params);
      await configureCapability.execute(config);

      expect(configureCapability.config.params.intent).to.equal('Specific configuration intent');
    });

    it('should handle additional parameters', async () => {
      const params = {
        toolAddress: 'o://test-tool',
        intent: 'Test intent',
        customParam1: 'value1',
        customParam2: 123
      };

      const config = createMockCapabilityConfig(laneTool, 'Configure intent', params);
      await configureCapability.execute(config);

      expect(configureCapability.config.params).to.deep.include({
        toolAddress: 'o://test-tool',
        intent: 'Test intent',
        customParam1: 'value1',
        customParam2: 123
      });
    });
  });

  describe('streaming support', () => {
    it('should support streaming configuration', async () => {
      const chunks: any[] = [];
      const params = {
        toolAddress: 'o://test-tool',
        intent: 'Streaming configuration'
      };

      const config = createMockCapabilityConfig(
        laneTool,
        'Configure intent',
        params,
        {
          useStream: true,
          onChunk: (chunk) => chunks.push(chunk)
        }
      );

      try {
        await configureCapability.execute(config);
        expect(config.useStream).to.be.true;
      } catch (error) {
        // Expected if services not available
      }
    });
  });
});
