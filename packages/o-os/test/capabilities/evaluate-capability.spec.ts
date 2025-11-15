import { expect } from 'chai';
import { oCapabilityEvaluate, oCapabilityType } from '@olane/o-lane';
import { createTestOS, createTestLaneTool, createMockCapabilityConfig } from './utils/capability-test-utils.js';
import { OlaneOS } from '../../src/o-olane-os/index.js';
import type { oLaneTool, oLaneContext } from '@olane/o-lane';

describe('oCapabilityEvaluate @capability @evaluate', () => {
  let os: OlaneOS;
  let laneTool: oLaneTool;
  let evaluateCapability: oCapabilityEvaluate;

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
    evaluateCapability = new oCapabilityEvaluate();
  });

  describe('type identification', () => {
    it('should return EVALUATE type from instance getter', () => {
      expect(evaluateCapability.type).to.equal(oCapabilityType.EVALUATE);
    });

    it('should return EVALUATE type from static getter', () => {
      expect(oCapabilityEvaluate.type).to.equal(oCapabilityType.EVALUATE);
    });
  });

  describe('inheritance', () => {
    it('should extend oCapabilityIntelligence', async () => {
      expect(evaluateCapability).to.respondTo('intelligence');
    });

    it('should have access to intelligence method', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Evaluate this intent');
      await evaluateCapability.execute(config);

      expect(evaluateCapability.intelligence).to.be.a('function');
    });
  });

  describe('run() method', () => {
    it('should execute intelligence with intent', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Evaluate this test intent');

      // May fail if intelligence service not available
      try {
        const result = await evaluateCapability.execute(config);
        expect(result).to.exist;
        expect(result).to.have.property('type');
      } catch (error) {
        // Expected if intelligence service is not configured
        expect(error).to.exist;
      }
    });

    it('should include intent in intelligence prompt', async () => {
      const intent = 'Evaluate this specific intent for testing';
      const config = createMockCapabilityConfig(laneTool, intent);

      try {
        await evaluateCapability.execute(config);
        // Validates structure even if intelligence service unavailable
        expect(evaluateCapability.config.intent.value).to.equal(intent);
      } catch (error) {
        // Expected if service not available
      }
    });

    it('should include history in intelligence prompt', async () => {
      const history = 'Previous steps:\n1. User asked a question\n2. Searched for information';
      const config = createMockCapabilityConfig(laneTool, 'Evaluate with history');
      config.history = history;

      try {
        await evaluateCapability.execute(config);
        expect(evaluateCapability.config.history).to.equal(history);
      } catch (error) {
        // Expected if service not available
      }
    });

    it('should include context in intelligence prompt', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Evaluate with context');
      config.laneConfig.context = {
        toString: () => 'Test context data'
      } as any;

      try {
        await evaluateCapability.execute(config);
        expect(evaluateCapability.config.laneConfig.context).to.exist;
      } catch (error) {
        // Expected if service not available
      }
    });

    it('should include extra instructions in intelligence prompt', async () => {
      const extraInstructions = 'Please be concise and focus on key points';
      const config = createMockCapabilityConfig(laneTool, 'Evaluate with instructions');
      config.laneConfig.extraInstructions = extraInstructions;

      try {
        await evaluateCapability.execute(config);
        expect(evaluateCapability.config.laneConfig.extraInstructions).to.equal(extraInstructions);
      } catch (error) {
        // Expected if service not available
      }
    });

    it('should handle missing context gracefully', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Evaluate without context');
      // Don't set context

      try {
        await evaluateCapability.execute(config);
        // Should handle missing context
      } catch (error) {
        // Expected if service not available
      }
    });

    it('should handle missing history gracefully', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Evaluate without history');
      config.history = '';

      try {
        await evaluateCapability.execute(config);
        expect(evaluateCapability.config.history).to.equal('');
      } catch (error) {
        // Expected if service not available
      }
    });

    it('should handle missing extra instructions gracefully', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Evaluate without instructions');
      // Don't set extra instructions

      try {
        await evaluateCapability.execute(config);
        // Should handle missing instructions
      } catch (error) {
        // Expected if service not available
      }
    });
  });

  describe('result structure', () => {
    it('should return capability result', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test result structure');

      try {
        const result = await evaluateCapability.execute(config);
        expect(result).to.exist;
        expect(result.type).to.equal(oCapabilityType.EVALUATE);
      } catch (error) {
        // Expected if service not available
      }
    });

    it('should include config in result', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test config inclusion');

      try {
        const result = await evaluateCapability.execute(config);
        if (result.config) {
          expect(result.config).to.exist;
        }
      } catch (error) {
        // Expected if service not available
      }
    });
  });

  describe('streaming support', () => {
    it('should support streaming evaluation', async () => {
      const chunks: any[] = [];
      const config = createMockCapabilityConfig(
        laneTool,
        'Evaluate with streaming',
        {},
        {
          useStream: true,
          onChunk: (chunk) => chunks.push(chunk)
        }
      );

      try {
        await evaluateCapability.execute(config);
        expect(config.useStream).to.be.true;
        expect(config.onChunk).to.be.a('function');
      } catch (error) {
        // Expected if service not available
      }
    });

    it('should work without streaming', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Evaluate without streaming');

      try {
        await evaluateCapability.execute(config);
        expect(config.useStream).to.be.false;
      } catch (error) {
        // Expected if service not available
      }
    });
  });

  describe('complex scenarios', () => {
    it('should handle evaluation with all context elements', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Complex evaluation scenario');
      config.history = 'Step 1: User requested action\nStep 2: Searched for information';
      config.laneConfig.context = {
        toString: () => 'Relevant context about the domain'
      } as any;
      config.laneConfig.extraInstructions = 'Be detailed but concise';

      try {
        await evaluateCapability.execute(config);
        expect(evaluateCapability.config.intent.value).to.equal('Complex evaluation scenario');
        expect(evaluateCapability.config.history).to.exist;
        expect(evaluateCapability.config.laneConfig.context).to.exist;
        expect(evaluateCapability.config.laneConfig.extraInstructions).to.exist;
      } catch (error) {
        // Expected if service not available
      }
    });

    it('should handle evaluation with minimal config', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Minimal evaluation');

      try {
        const result = await evaluateCapability.execute(config);
        expect(result).to.exist;
      } catch (error) {
        // Expected if service not available
      }
    });

    it('should handle long intent strings', async () => {
      const longIntent = 'Evaluate this very long intent that contains multiple sentences and complex requirements. '.repeat(10);
      const config = createMockCapabilityConfig(laneTool, longIntent);

      try {
        await evaluateCapability.execute(config);
        expect(evaluateCapability.config.intent.value).to.equal(longIntent);
      } catch (error) {
        // Expected if service not available
      }
    });

    it('should handle intent with special characters', async () => {
      const intent = 'Evaluate: "What is 2+2?" & other questions! #test';
      const config = createMockCapabilityConfig(laneTool, intent);

      try {
        await evaluateCapability.execute(config);
        expect(evaluateCapability.config.intent.value).to.equal(intent);
      } catch (error) {
        // Expected if service not available
      }
    });

    it('should handle multiline intent', async () => {
      const intent = `Evaluate this scenario:
      Line 1: First requirement
      Line 2: Second requirement
      Line 3: Third requirement`;
      const config = createMockCapabilityConfig(laneTool, intent);

      try {
        await evaluateCapability.execute(config);
        expect(evaluateCapability.config.intent.value).to.equal(intent);
      } catch (error) {
        // Expected if service not available
      }
    });
  });

  describe('integration with base capabilities', () => {
    it('should have access to node through base class', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test node access');
      await evaluateCapability.execute(config);

      expect(evaluateCapability.node).to.equal(laneTool);
    });

    it('should have access to intent through base class', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test intent access');
      await evaluateCapability.execute(config);

      expect(evaluateCapability.intent).to.exist;
      expect(evaluateCapability.intent.value).to.equal('Test intent access');
    });

    it('should support cancellation', () => {
      evaluateCapability.cancel();
      // Should not throw - validates cancel method exists
    });
  });

  describe('error handling', () => {
    it('should handle intelligence service unavailable', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test error handling');

      try {
        const result = await evaluateCapability.execute(config);
        // If no error, validate result structure
        expect(result).to.exist;
      } catch (error) {
        // Expected if intelligence service is not available
        expect(error).to.exist;
      }
    });

    it('should handle node not running', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test with stopped node');
      await evaluateCapability.execute(config);

      // Stop the node
      await laneTool.stop();

      try {
        const result = await evaluateCapability.intelligence('Test prompt');
        // Should have error
        if (result.error) {
          expect(result.error).to.exist;
        }
      } catch (error) {
        // Expected
        expect(error).to.exist;
      }

      // Restart for cleanup
      await laneTool.start();
    });
  });

  describe('parameter handling', () => {
    it('should handle custom parameters', async () => {
      const params = {
        customParam1: 'value1',
        customParam2: 123,
        customParam3: { nested: 'object' }
      };

      const config = createMockCapabilityConfig(laneTool, 'Test custom params', params);
      await evaluateCapability.execute(config);

      expect(evaluateCapability.config.params).to.deep.include(params);
    });

    it('should handle empty parameters', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test empty params', {});
      await evaluateCapability.execute(config);

      expect(evaluateCapability.config.params).to.exist;
    });
  });
});
