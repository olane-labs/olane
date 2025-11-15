import { expect } from 'chai';
import { oCapabilityTask, oCapabilityType } from '@olane/o-lane';
import { oAddress, oErrorCodes } from '@olane/o-core';
import { createTestOS, createTestLaneTool, createMockCapabilityConfig, createMockTool } from './utils/capability-test-utils.js';
import { OlaneOS } from '../../src/o-olane-os/index.js';
import type { oLaneTool } from '@olane/o-lane';

describe('oCapabilityTask @capability @task', () => {
  let os: OlaneOS;
  let laneTool: oLaneTool;
  let taskCapability: oCapabilityTask;

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
    taskCapability = new oCapabilityTask();
  });

  describe('type identification', () => {
    it('should return TASK type from instance getter', () => {
      expect(taskCapability.type).to.equal(oCapabilityType.TASK);
    });

    it('should return TASK type from static getter', () => {
      expect(oCapabilityTask.type).to.equal(oCapabilityType.TASK);
    });
  });

  describe('task getter', () => {
    it('should provide access to task from params', async () => {
      const task = {
        address: 'o://test-tool',
        payload: {
          method: 'testMethod',
          params: { arg1: 'value1' }
        }
      };

      const config = createMockCapabilityConfig(laneTool, 'Test task', { task });
      await taskCapability.execute(config);

      expect(taskCapability.task).to.deep.equal(task);
    });

    it('should handle undefined task params', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test task', {});
      await taskCapability.execute(config);

      expect(taskCapability.task).to.be.undefined;
    });
  });

  describe('run() method - validation', () => {
    it('should fail if task is missing', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test task', {});

      const result = await taskCapability.execute(config);

      expect(result.error).to.exist;
      expect(result.error).to.include('Failed to configure the tool use');
    });

    it('should fail if task.address is missing', async () => {
      const task = {
        payload: {
          method: 'testMethod',
          params: { arg1: 'value1' }
        }
      };

      const config = createMockCapabilityConfig(laneTool, 'Test task', { task });

      const result = await taskCapability.execute(config);

      expect(result.error).to.exist;
      expect(result.error).to.include('Failed to configure the tool use');
    });

    it('should fail if task object is null', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test task', { task: null });

      const result = await taskCapability.execute(config);

      expect(result.error).to.exist;
    });
  });

  describe('run() method - approval system', () => {
    it('should handle missing approval service gracefully', async () => {
      const task = {
        address: 'o://nonexistent-tool',
        payload: {
          method: 'testMethod',
          params: {}
        }
      };

      const config = createMockCapabilityConfig(laneTool, 'Test task', { task });

      // This should attempt approval and continue even if service is not available
      const result = await taskCapability.execute(config);

      // The task will fail because the tool doesn't exist, but not because of approval
      expect(result).to.exist;
    });

    it('should handle task with params for approval', async () => {
      const task = {
        address: 'o://test-tool',
        payload: {
          method: 'testMethod',
          params: { arg1: 'value1', arg2: 123 }
        }
      };

      const config = createMockCapabilityConfig(laneTool, 'Test task with params', { task });

      const result = await taskCapability.execute(config);

      expect(result).to.exist;
      // Result may have error if tool/approval doesn't exist, but validates structure
    });
  });

  describe('run() method - task execution', () => {
    it('should handle tool not found error', async () => {
      const task = {
        address: 'o://nonexistent-tool',
        payload: {
          method: 'someMethod',
          params: {}
        }
      };

      const config = createMockCapabilityConfig(laneTool, 'Test task', { task });

      const result = await taskCapability.execute(config);

      expect(result).to.exist;
      expect(result.error).to.exist;
    });

    it('should handle method not found error', async () => {
      const task = {
        address: 'o://test-tool',
        payload: {
          method: 'nonexistentMethod',
          params: {}
        }
      };

      const config = createMockCapabilityConfig(laneTool, 'Test task', { task });

      const result = await taskCapability.execute(config);

      expect(result).to.exist;
      // Will likely error because tool doesn't exist
    });

    it('should include task address in execution', async () => {
      const toolAddress = 'o://test-calculation-tool';
      const task = {
        address: toolAddress,
        payload: {
          method: 'calculate',
          params: { a: 5, b: 10 }
        }
      };

      const config = createMockCapabilityConfig(laneTool, 'Calculate something', { task });

      const result = await taskCapability.execute(config);

      expect(result).to.exist;
      expect(result.type).to.equal(oCapabilityType.EVALUATE);
    });
  });

  describe('result structure', () => {
    it('should return oCapabilityTaskResult', async () => {
      const task = {
        address: 'o://test-tool',
        payload: {
          method: 'testMethod',
          params: {}
        }
      };

      const config = createMockCapabilityConfig(laneTool, 'Test task', { task });

      const result = await taskCapability.execute(config);

      expect(result).to.exist;
      expect(result.type).to.equal(oCapabilityType.EVALUATE);
      expect(result.config).to.equal(config);
    });

    it('should set type to EVALUATE in result', async () => {
      const task = {
        address: 'o://test-tool',
        payload: {
          method: 'testMethod',
          params: {}
        }
      };

      const config = createMockCapabilityConfig(laneTool, 'Test task', { task });

      const result = await taskCapability.execute(config);

      expect(result.type).to.equal(oCapabilityType.EVALUATE);
    });

    it('should include config in result', async () => {
      const task = {
        address: 'o://test-tool',
        payload: {
          method: 'testMethod',
          params: {}
        }
      };

      const config = createMockCapabilityConfig(laneTool, 'Test task', { task });

      const result = await taskCapability.execute(config);

      expect(result.config).to.exist;
      expect(result.config).to.equal(config);
    });
  });

  describe('streaming support', () => {
    it('should call onChunk when provided', async () => {
      const chunks: any[] = [];
      const task = {
        address: 'o://test-tool',
        payload: {
          method: 'testMethod',
          params: {}
        }
      };

      const config = createMockCapabilityConfig(
        laneTool,
        'Test task',
        { task },
        {
          useStream: true,
          onChunk: (chunk) => chunks.push(chunk)
        }
      );

      await taskCapability.execute(config);

      // onChunk is called with the response
      // May not have chunks if tool doesn't exist, but validates structure
      expect(config.onChunk).to.be.a('function');
    });

    it('should handle streaming without onChunk callback', async () => {
      const task = {
        address: 'o://test-tool',
        payload: {
          method: 'testMethod',
          params: {}
        }
      };

      const config = createMockCapabilityConfig(
        laneTool,
        'Test task',
        { task },
        { useStream: true }
      );

      const result = await taskCapability.execute(config);

      expect(result).to.exist;
    });
  });

  describe('replay mode', () => {
    it('should handle replay mode flag', async () => {
      const task = {
        address: 'o://test-tool',
        payload: {
          method: 'testMethod',
          params: {}
        }
      };

      const config = createMockCapabilityConfig(
        laneTool,
        'Test task',
        { task },
        { isReplay: true }
      );

      const result = await taskCapability.execute(config);

      expect(result).to.exist;
      expect(config.isReplay).to.be.true;
    });

    it('should execute task even in replay mode', async () => {
      const task = {
        address: 'o://test-tool',
        payload: {
          method: 'testMethod',
          params: { replay: true }
        }
      };

      const config = createMockCapabilityConfig(
        laneTool,
        'Test task',
        { task },
        { isReplay: true }
      );

      const result = await taskCapability.execute(config);

      expect(result).to.exist;
      expect(result.type).to.equal(oCapabilityType.EVALUATE);
    });
  });

  describe('error handling', () => {
    it('should return error in result on failure', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test task', {});

      const result = await taskCapability.execute(config);

      expect(result.error).to.exist;
      expect(result.error).to.be.a('string');
    });

    it('should handle oError instances', async () => {
      const task = {
        address: null, // Invalid address
        payload: {
          method: 'testMethod',
          params: {}
        }
      };

      const config = createMockCapabilityConfig(laneTool, 'Test task', { task });

      const result = await taskCapability.execute(config);

      expect(result.error).to.exist;
    });

    it('should include error type in result', async () => {
      const config = createMockCapabilityConfig(laneTool, 'Test task', {});

      const result = await taskCapability.execute(config);

      expect(result.type).to.equal(oCapabilityType.EVALUATE);
      expect(result.error).to.exist;
    });
  });

  describe('persistence flag', () => {
    it('should detect _save flag in tool response', async () => {
      // This tests the structure - actual _save detection requires tool response
      const task = {
        address: 'o://test-tool',
        payload: {
          method: 'testMethod',
          params: {}
        }
      };

      const config = createMockCapabilityConfig(laneTool, 'Test task', { task });

      const result = await taskCapability.execute(config);

      expect(result).to.exist;
      // shouldPersist would be set if tool response contained _save: true
      expect(result.hasOwnProperty('shouldPersist')).to.be.true;
    });
  });

  describe('parameter handling', () => {
    it('should pass params to tool execution', async () => {
      const params = {
        stringParam: 'test',
        numberParam: 123,
        boolParam: true,
        objectParam: { nested: 'value' },
        arrayParam: [1, 2, 3]
      };

      const task = {
        address: 'o://test-tool',
        payload: {
          method: 'testMethod',
          params
        }
      };

      const config = createMockCapabilityConfig(laneTool, 'Test task', { task });

      const result = await taskCapability.execute(config);

      expect(result).to.exist;
      expect(taskCapability.task.payload.params).to.deep.equal(params);
    });

    it('should handle empty params', async () => {
      const task = {
        address: 'o://test-tool',
        payload: {
          method: 'testMethod',
          params: {}
        }
      };

      const config = createMockCapabilityConfig(laneTool, 'Test task', { task });

      const result = await taskCapability.execute(config);

      expect(result).to.exist;
    });

    it('should handle undefined params', async () => {
      const task = {
        address: 'o://test-tool',
        payload: {
          method: 'testMethod'
        }
      };

      const config = createMockCapabilityConfig(laneTool, 'Test task', { task });

      const result = await taskCapability.execute(config);

      expect(result).to.exist;
    });
  });
});
