import 'dotenv/config';
import { expect } from 'chai';
import { PromptStorageProvider } from '../src/storage/prompt-storage-provider.tool.js';
import {
  TestEnvironment,
  SimpleNodeBuilder,
  assertRunning,
  assertStopped,
  assertSuccess,
  assertError,
} from '@olane-labs/o-test';
import { oNodeAddress } from '@olane/o-node';

describe('PromptStorageProvider', () => {
  const env = new TestEnvironment();
  let storage: PromptStorageProvider;

  beforeEach(async () => {
    storage = await new SimpleNodeBuilder(PromptStorageProvider)
      .withAddress(new oNodeAddress('o://prompt-storage-test'))
      .build(env);
  });

  afterEach(async () => {
    await env.cleanup();
  });

  describe('Lifecycle', () => {
    it('should initialize successfully', () => {
      expect(storage).to.exist;
      assertRunning(storage);
      expect(storage.address.toString()).to.equal('o://prompt-storage-test');
    });

    it('should stop successfully', async () => {
      await storage.stop();
      assertStopped(storage);
    });
  });

  describe('Basic CRUD Operations', () => {
    it('should store and retrieve data', async () => {
      const putResult = await storage.use(storage.address, {
        method: 'put',
        params: {
          promptId: 'test-prompt-1',
          key: 'user_name',
          value: 'Alice',
        },
      });

      assertSuccess(putResult);

      const response = await storage.use(storage.address, {
        method: 'get',
        params: {
          promptId: 'test-prompt-1',
          key: 'user_name',
        },
      });

      assertSuccess(response);
      expect(response.result.data.value).to.equal('Alice');
    });

    it('should return null for non-existent key', async () => {
      const result = await storage.use(storage.address, {
        method: 'get',
        params: {
          promptId: 'test-prompt-1',
          key: 'nonexistent',
        },
      });

      assertSuccess(result);
      expect(result.result.data.value).to.be.null;
    });

    it('should return null for non-existent prompt', async () => {
      const result = await storage.use(storage.address, {
        method: 'get',
        params: {
          promptId: 'nonexistent-prompt',
          key: 'some_key',
        },
      });

      assertSuccess(result);
      expect(result.result.data.value).to.be.null;
    });

    it('should delete data', async () => {
      // Store data first
      await storage.use(storage.address, {
        method: 'put',
        params: {
          promptId: 'test-prompt-1',
          key: 'temp_data',
          value: 'temporary',
        },
      });

      // Verify it exists
      const beforeDelete = await storage.use(storage.address, {
        method: 'get',
        params: {
          promptId: 'test-prompt-1',
          key: 'temp_data',
        },
      });
      assertSuccess(beforeDelete);
      expect(beforeDelete.result.data.value).to.equal('temporary');

      // Delete it
      const deleteResult = await storage.use(storage.address, {
        method: 'delete',
        params: {
          promptId: 'test-prompt-1',
          key: 'temp_data',
        },
      });
      assertSuccess(deleteResult);

      // Verify it's gone
      const afterDelete = await storage.use(storage.address, {
        method: 'get',
        params: {
          promptId: 'test-prompt-1',
          key: 'temp_data',
        },
      });
      assertSuccess(afterDelete);
      expect(afterDelete.result.data.value).to.be.null;
    });

    it('should check key existence with has', async () => {
      // Check non-existent key
      const beforePut = await storage.use(storage.address, {
        method: 'has',
        params: {
          promptId: 'test-prompt-1',
          key: 'test_key',
        },
      });
      assertSuccess(beforePut);
      expect(beforePut.result.data.success).to.be.false;

      // Store data
      await storage.use(storage.address, {
        method: 'put',
        params: {
          promptId: 'test-prompt-1',
          key: 'test_key',
          value: 'test_value',
        },
      });

      // Check existing key
      const afterPut = await storage.use(storage.address, {
        method: 'has',
        params: {
          promptId: 'test-prompt-1',
          key: 'test_key',
        },
      });
      assertSuccess(afterPut);
      expect(afterPut.result.data.success).to.be.true;
    });
  });

  describe('Prompt Isolation', () => {
    it('should isolate data between different prompts', async () => {
      // Store same key in different prompts
      await storage.use(storage.address, {
        method: 'put',
        params: {
          promptId: 'prompt-1',
          key: 'shared_key',
          value: 'value-1',
        },
      });

      await storage.use(storage.address, {
        method: 'put',
        params: {
          promptId: 'prompt-2',
          key: 'shared_key',
          value: 'value-2',
        },
      });

      // Verify each prompt has its own value
      const result1 = await storage.use(storage.address, {
        method: 'get',
        params: {
          promptId: 'prompt-1',
          key: 'shared_key',
        },
      });
      expect(result1.result.data.value).to.equal('value-1');

      const result2 = await storage.use(storage.address, {
        method: 'get',
        params: {
          promptId: 'prompt-2',
          key: 'shared_key',
        },
      });
      expect(result2.result.data.value).to.equal('value-2');
    });

    it('should not leak data between prompts on delete', async () => {
      // Store in both prompts
      await storage.use(storage.address, {
        method: 'put',
        params: { promptId: 'prompt-1', key: 'key', value: 'value-1' },
      });

      await storage.use(storage.address, {
        method: 'put',
        params: { promptId: 'prompt-2', key: 'key', value: 'value-2' },
      });

      // Delete from prompt-1
      await storage.use(storage.address, {
        method: 'delete',
        params: { promptId: 'prompt-1', key: 'key' },
      });

      // Verify prompt-1 is deleted
      const result1 = await storage.use(storage.address, {
        method: 'get',
        params: { promptId: 'prompt-1', key: 'key' },
      });
      expect(result1.result.data.value).to.be.null;

      // Verify prompt-2 is unaffected
      const result2 = await storage.use(storage.address, {
        method: 'get',
        params: { promptId: 'prompt-2', key: 'key' },
      });
      expect(result2.result.data.value).to.equal('value-2');
    });
  });

  describe('Prompt Management', () => {
    it('should list all prompts', async () => {
      // Store data in multiple prompts
      await storage.use(storage.address, {
        method: 'put',
        params: { promptId: 'prompt-1', key: 'key1', value: 'value1' },
      });

      await storage.use(storage.address, {
        method: 'put',
        params: { promptId: 'prompt-2', key: 'key2', value: 'value2' },
      });

      await storage.use(storage.address, {
        method: 'put',
        params: { promptId: 'prompt-3', key: 'key3', value: 'value3' },
      });

      // List prompts
      const result = await storage.use(storage.address, {
        method: 'list_prompts',
        params: {},
      });

      assertSuccess(result);
      expect(result.result.data.count).to.equal(3);
      expect(result.result.data.promptIds).to.have.members([
        'prompt-1',
        'prompt-2',
        'prompt-3',
      ]);
    });

    it('should clear a specific prompt', async () => {
      // Store multiple keys in a prompt
      await storage.use(storage.address, {
        method: 'put',
        params: { promptId: 'prompt-1', key: 'key1', value: 'value1' },
      });
      await storage.use(storage.address, {
        method: 'put',
        params: { promptId: 'prompt-1', key: 'key2', value: 'value2' },
      });
      await storage.use(storage.address, {
        method: 'put',
        params: { promptId: 'prompt-1', key: 'key3', value: 'value3' },
      });

      // Clear the prompt
      const clearResult = await storage.use(storage.address, {
        method: 'clear_prompt',
        params: { promptId: 'prompt-1' },
      });

      assertSuccess(clearResult);
      expect(clearResult.result.data.success).to.be.true;
      expect(clearResult.result.data.keysDeleted).to.equal(3);

      // Verify all keys are gone
      const getResult = await storage.use(storage.address, {
        method: 'get',
        params: { promptId: 'prompt-1', key: 'key1' },
      });
      assertSuccess(getResult);
      expect(getResult.result.data.value).to.be.null;
    });

    it('should get keys for a specific prompt', async () => {
      // Store multiple keys
      await storage.use(storage.address, {
        method: 'put',
        params: { promptId: 'prompt-1', key: 'name', value: 'Alice' },
      });
      await storage.use(storage.address, {
        method: 'put',
        params: { promptId: 'prompt-1', key: 'email', value: 'alice@example.com' },
      });
      await storage.use(storage.address, {
        method: 'put',
        params: { promptId: 'prompt-1', key: 'role', value: 'admin' },
      });

      // Get keys
      const result = await storage.use(storage.address, {
        method: 'get_prompt_keys',
        params: { promptId: 'prompt-1' },
      });

      assertSuccess(result);
      expect(result.result.data.count).to.equal(3);
      expect(result.result.data.keys).to.have.members(['name', 'email', 'role']);
    });

    it('should get stats for a specific prompt', async () => {
      // Store some data
      await storage.use(storage.address, {
        method: 'put',
        params: { promptId: 'prompt-1', key: 'key1', value: 'value1' },
      });
      await storage.use(storage.address, {
        method: 'put',
        params: { promptId: 'prompt-1', key: 'key2', value: 'value2' },
      });

      // Get stats
      const result = await storage.use(storage.address, {
        method: 'get_prompt_stats',
        params: { promptId: 'prompt-1' },
      });

      assertSuccess(result);
      expect(result.result.data.promptId).to.equal('prompt-1');
      expect(result.result.data.keyCount).to.equal(2);
      expect(result.result.data.exists).to.be.true;
      expect(result.result.data.lastAccessed).to.be.a('number');
      expect(result.result.data.createdAt).to.be.a('number');
    });

    it('should return empty stats for non-existent prompt', async () => {
      const result = await storage.use(storage.address, {
        method: 'get_prompt_stats',
        params: { promptId: 'nonexistent' },
      });

      assertSuccess(result);
      expect(result.result.data.exists).to.be.false;
      expect(result.result.data.keyCount).to.equal(0);
    });
  });

  describe('Validation', () => {
    it('should throw error for missing promptId in put', async () => {
      const response = await storage.use(storage.address, {
        method: 'put',
        params: { key: 'key', value: 'value' },
      });

      assertError(response, 'Missing required parameters');
    });

    it('should throw error for missing key in put', async () => {
      const result = await storage.use(storage.address, {
        method: 'put',
        params: { promptId: 'prompt-1', value: 'value' },
      });

      assertError(result, 'Missing required parameters');
    });

    it('should throw error for missing value in put', async () => {
      const result = await storage.use(storage.address, {
        method: 'put',
        params: { promptId: 'prompt-1', key: 'key' },
      });

      assertError(result, 'Missing required parameters');
    });

    it('should throw error for invalid promptId type', async () => {
      const result = await storage.use(storage.address, {
        method: 'get',
        params: { promptId: 123, key: 'key' },
      });

      assertError(result, 'promptId is required and must be a string');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty prompt list', async () => {
      const result = await storage.use(storage.address, {
        method: 'list_prompts',
        params: {},
      });

      assertSuccess(result);
      expect(result.result.data.count).to.equal(0);
      expect(result.result.data.promptIds).to.be.an('array').that.is.empty;
    });

    it('should handle clearing non-existent prompt', async () => {
      const result = await storage.use(storage.address, {
        method: 'clear_prompt',
        params: { promptId: 'nonexistent' },
      });

      assertSuccess(result);
      expect(result.result.data.keysDeleted).to.equal(0);
    });

    it('should handle deleting non-existent key', async () => {
      const result = await storage.use(storage.address, {
        method: 'delete',
        params: { promptId: 'prompt-1', key: 'nonexistent' },
      });

      assertSuccess(result);
    });

    it('should handle overwriting existing value', async () => {
      // Store initial value
      await storage.use(storage.address, {
        method: 'put',
        params: { promptId: 'prompt-1', key: 'key', value: 'value1' },
      });

      // Overwrite with new value
      await storage.use(storage.address, {
        method: 'put',
        params: { promptId: 'prompt-1', key: 'key', value: 'value2' },
      });

      // Verify new value
      const result = await storage.use(storage.address, {
        method: 'get',
        params: { promptId: 'prompt-1', key: 'key' },
      });

      assertSuccess(result);
      expect(result.result.data.value).to.equal('value2');
    });
  });

  describe('Max Prompts Limit', () => {
    it('should evict oldest prompt when max limit reached', async () => {
      // Create storage with limit
      await storage.stop();
      storage = await new SimpleNodeBuilder(PromptStorageProvider)
        .withAddress(new oNodeAddress('o://prompt-storage-test'))
        .withConfig({ maxPrompts: 3 })
        .build(env);

      // Add 3 prompts
      await storage.use(storage.address, {
        method: 'put',
        params: { promptId: 'prompt-1', key: 'key', value: 'value1' },
      });

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      await storage.use(storage.address, {
        method: 'put',
        params: { promptId: 'prompt-2', key: 'key', value: 'value2' },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await storage.use(storage.address, {
        method: 'put',
        params: { promptId: 'prompt-3', key: 'key', value: 'value3' },
      });

      // Verify all 3 exist
      const before = await storage.use(storage.address, {
        method: 'list_prompts',
        params: {},
      });
      assertSuccess(before);
      expect(before.result.data.count).to.equal(3);

      // Add 4th prompt (should evict prompt-1)
      await storage.use(storage.address, {
        method: 'put',
        params: { promptId: 'prompt-4', key: 'key', value: 'value4' },
      });

      // Verify only 3 prompts remain
      const after = await storage.use(storage.address, {
        method: 'list_prompts',
        params: {},
      });
      assertSuccess(after);
      expect(after.result.data.count).to.equal(3);

      // Verify prompt-1 was evicted
      const result1 = await storage.use(storage.address, {
        method: 'get',
        params: { promptId: 'prompt-1', key: 'key' },
      });
      assertSuccess(result1);
      expect(result1.result.data.value).to.be.null;

      // Verify prompt-4 exists
      const result4 = await storage.use(storage.address, {
        method: 'get',
        params: { promptId: 'prompt-4', key: 'key' },
      });
      assertSuccess(result4);
      expect(result4.result.data.value).to.equal('value4');
    });
  });
});
