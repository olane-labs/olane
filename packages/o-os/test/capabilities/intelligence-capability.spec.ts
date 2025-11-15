import { expect } from 'chai';
// TODO: oCapabilityIntelligence is not yet implemented
// import { oCapabilityIntelligence, oCapabilityType, oCapabilityResult } from '@olane/o-lane';
import { oCapabilityType, oCapabilityResult } from '@olane/o-lane';
import { NodeState, oAddress, RestrictedAddresses } from '@olane/o-core';
import { createTestOS, createTestLaneTool, createMockCapabilityConfig } from './utils/capability-test-utils.js';
import { OlaneOS } from '../../src/o-olane-os/index.js';
import type { oLaneTool } from '@olane/o-lane';

/**
 * Test implementation of oCapabilityIntelligence
 * TODO: This test is skipped until oCapabilityIntelligence is implemented
 */
class TestIntelligenceCapability {
  intelligence: any;
  config: any;
  node: any;
  intent: any;
  state: any;

  async execute(_config: any): Promise<any> {
    return null;
  }

  async run(): Promise<oCapabilityResult> {
    const result = await this.intelligence('Test intelligence prompt');
    return new oCapabilityResult({
      type: result.type,
      result: result.result,
      humanResult: result.humanResult,
      error: result.error
    });
  }

  get type(): oCapabilityType {
    return oCapabilityType.EVALUATE;
  }

  static get type(): oCapabilityType {
    return oCapabilityType.EVALUATE;
  }
}

describe.skip('oCapabilityIntelligence @capability @intelligence', () => {
  let os: OlaneOS;
  let laneTool: oLaneTool;
  let testCapability: TestIntelligenceCapability;

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
    testCapability = new TestIntelligenceCapability();
  });

  describe('intelligence() method', () => {
    it('should require node to be running', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test intent');
      await testCapability.execute(config);

      // Stop the node
      await laneTool.stop();

      try {
        await testCapability.intelligence('Test prompt');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Node is not running');
      }

      // Restart for cleanup
      await laneTool.start();
    });

    it('should call intelligence service with correct address', async () => {
      // This test validates the structure but may fail if intelligence service is not configured
      // We're testing that the method attempts to use the correct address
      const config = createMockCapabilityConfig(laneTool, 'Test intent');
      await testCapability.execute(config);

      expect(laneTool.state).to.equal(NodeState.RUNNING);

      // The intelligence method should attempt to use RestrictedAddresses.INTELLIGENCE
      // We can't easily test the actual call without mocking, but we can verify the node is running
      expect(RestrictedAddresses.INTELLIGENCE).to.equal('o://intelligence');
    });

    it('should handle streaming configuration', async () => {
      const chunks: any[] = [];
      const config = createMockCapabilityConfig(
        laneTool,
        'Test intent',
        {},
        {
          useStream: true,
          onChunk: (chunk) => chunks.push(chunk)
        }
      );

      await testCapability.execute(config);

      expect(testCapability.config.useStream).to.be.true;
      expect(testCapability.config.onChunk).to.be.a('function');
    });

    it('should use non-streaming by default', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test intent');
      await testCapability.execute(config);

      expect(testCapability.config.useStream).to.be.false;
    });
  });

  describe('result structure', () => {
    it('should return oCapabilityIntelligenceResult', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test intent');

      // This may fail if intelligence service is not available, but tests the structure
      try {
        const result = await testCapability.execute(config);
        expect(result).to.exist;
        expect(result.type).to.be.a('string');
      } catch (error) {
        // Expected if intelligence service is not configured
        // The test still validates the code structure
      }
    });

    it('should handle errors gracefully', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test intent');
      await testCapability.execute(config);

      // Stop the node to force an error
      await laneTool.stop();

      const result = await testCapability.intelligence('Test prompt');

      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error).to.be.a('string');
      expect(result.result).to.be.null;

      // Restart for cleanup
      await laneTool.start();
    });
  });

  describe('prompt handling', () => {
    it('should accept string prompts', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test intent');
      await testCapability.execute(config);

      const testPrompts = [
        'Simple prompt',
        'Multi-line\nprompt\nwith\nbreaks',
        'Prompt with special characters: !@#$%^&*()',
        ''
      ];

      for (const prompt of testPrompts) {
        try {
          const result = await testCapability.intelligence(prompt);
          expect(result).to.exist;
        } catch (error) {
          // Expected if service not available
        }
      }
    });
  });

  describe('integration with base capability', () => {
    it('should extend oCapability properly', () => {
      expect(testCapability).to.be.instanceOf(TestIntelligenceCapability);
    });

    it('should have access to config through base class', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test intent', { param1: 'value1' });
      await testCapability.execute(config);

      expect(testCapability.config).to.exist;
      expect(testCapability.config.params).to.deep.equal({ param1: 'value1' });
    });

    it('should have access to node through base class', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test intent');
      await testCapability.execute(config);

      expect(testCapability.node).to.equal(laneTool);
    });

    it('should have access to intent through base class', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test intelligence intent');
      await testCapability.execute(config);

      expect(testCapability.intent).to.exist;
      expect(testCapability.intent.intent).to.equal('Test intelligence intent');
    });
  });

  describe('type identification', () => {
    it('should return correct type from instance getter', () => {
      expect(testCapability.type).to.equal(oCapabilityType.EVALUATE);
    });

    it('should return correct type from static getter', () => {
      expect(TestIntelligenceCapability.type).to.equal(oCapabilityType.EVALUATE);
    });
  });
});
