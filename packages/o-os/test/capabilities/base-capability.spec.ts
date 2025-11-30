import { expect } from 'chai';
import { oCapability, oCapabilityType, oCapabilityResult, oCapabilityConfig } from '@olane/o-lane';
import { createTestOS, createTestLaneTool, createMockCapabilityConfig } from './utils/capability-test-utils.js';
import { OlaneOS } from '../../src/o-olane-os/index.js';
import type { oLaneTool } from '@olane/o-lane';

/**
 * Test implementation of oCapability for testing base functionality
 */
class TestCapability extends oCapability {
  public runCalled = false;
  public cancelCalled = false;
  public shouldThrowError = false;
  public customResult: any = { data: 'test result' };

  async run(): Promise<oCapabilityResult> {
    this.runCalled = true;

    if (this.shouldThrowError) {
      throw new Error('Test error from capability');
    }

    return new oCapabilityResult({
      type: oCapabilityType.TASK,
      result: this.customResult,
      humanResult: 'Test capability executed successfully'
    });
  }

  cancel(): void {
    this.cancelCalled = true;
  }

  get type(): oCapabilityType {
    return oCapabilityType.TASK;
  }

  static get type(): oCapabilityType {
    return oCapabilityType.TASK;
  }
}

describe('oCapability Base Class @capability @base', () => {
  let os: OlaneOS;
  let laneTool: oLaneTool;
  let testCapability: TestCapability;

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
    testCapability = new TestCapability();
  });

  describe('execute() method', () => {
    it('should execute the capability and call run()', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test intent');

      const result = await testCapability.execute(config);

      expect(testCapability.runCalled).to.be.true;
      expect(result).to.exist;
      expect(result.type).to.equal(oCapabilityType.TASK);
    });

    it('should store the config in the capability', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test intent');

      await testCapability.execute(config);

      expect(testCapability.config).to.equal(config);
    });

    it('should return the result from run()', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test intent');
      testCapability.customResult = { custom: 'data', value: 123 };

      const result = await testCapability.execute(config);

      expect(result.result).to.deep.equal({ custom: 'data', value: 123 });
      expect(result.humanResult).to.equal('Test capability executed successfully');
    });

    it('should propagate errors from run()', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test intent');
      testCapability.shouldThrowError = true;

      try {
        await testCapability.execute(config);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.equal('Test error from capability');
      }
    });
  });

  describe('getter methods', () => {
    it('should provide access to node via getter', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test intent');
      await testCapability.execute(config);

      expect(testCapability.node).to.equal(laneTool);
    });

    it('should provide access to intent via getter', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test intent with params', { param1: 'value1' });
      await testCapability.execute(config);

      expect(testCapability.intent).to.exist;
      expect(testCapability.intent.value).to.equal('Test intent with params');
      expect(testCapability.config.params).to.deep.equal({ param1: 'value1' });
    });

    it('should provide access to type via instance getter', () => {
      expect(testCapability.type).to.equal(oCapabilityType.TASK);
    });

    it('should provide access to type via static getter', () => {
      expect(TestCapability.type).to.equal(oCapabilityType.TASK);
    });
  });

  describe('cancel() method', () => {
    it('should call cancel on the capability', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test intent');
      await testCapability.execute(config);

      testCapability.cancel();

      expect(testCapability.cancelCalled).to.be.true;
    });

    it('should be callable before execution', () => {
      testCapability.cancel();
      expect(testCapability.cancelCalled).to.be.true;
    });
  });

  describe('config handling', () => {
    it('should handle config with streaming enabled', async () => {
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

    it('should handle config with replay flag', async () => {
      const config = createMockCapabilityConfig(
        laneTool,
        'Test intent',
        {},
        { isReplay: true }
      );

      await testCapability.execute(config);

      expect(testCapability.config.isReplay).to.be.true;
    });

    it('should handle config with history', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test intent');
      config.history = 'Previous execution context';

      await testCapability.execute(config);

      expect(testCapability.config.history).to.equal('Previous execution context');
    });

    it('should handle config with custom params', async () => {
      const customParams = {
        toolAddress: 'o://test-tool',
        method: 'testMethod',
        methodParams: { arg1: 'value1', arg2: 123 }
      };

      const config = createMockCapabilityConfig(laneTool, 'Test intent', customParams);

      await testCapability.execute(config);

      expect(testCapability.config.params).to.deep.equal(customParams);
    });
  });

  describe('lifecycle', () => {
    it('should be able to execute multiple times', async () => {
      const config1 = createMockCapabilityConfig(laneTool, 'First intent');
      const config2 = createMockCapabilityConfig(laneTool, 'Second intent');

      const result1 = await testCapability.execute(config1);
      testCapability.runCalled = false; // Reset flag

      const result2 = await testCapability.execute(config2);

      expect(result1).to.exist;
      expect(result2).to.exist;
      expect(testCapability.config).to.equal(config2);
    });

    it('should allow cancellation between executions', async () => {
      const config1 = createMockCapabilityConfig(laneTool, 'First intent');
      await testCapability.execute(config1);

      testCapability.cancel();
      expect(testCapability.cancelCalled).to.be.true;

      testCapability.cancelCalled = false;
      const config2 = createMockCapabilityConfig(laneTool, 'Second intent');
      await testCapability.execute(config2);

      expect(testCapability.runCalled).to.be.true;
    });
  });
});
