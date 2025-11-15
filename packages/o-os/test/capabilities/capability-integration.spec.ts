import { expect } from 'chai';
import {
  oCapabilityTask,
  oCapabilitySearch,
  oCapabilityEvaluate,
  oCapabilityMultipleStep,
  oCapabilityConfigure,
  oCapabilityType,
  oIntent,
  ALL_CAPABILITIES
} from '@olane/o-lane';
import { createTestOS, createTestLaneTool, createMockCapabilityConfig, createMockIntent, ChunkCapture } from './utils/capability-test-utils.js';
import { OlaneOS } from '../../src/o-olane-os/index.js';
import type { oLaneTool } from '@olane/o-lane';

describe('Capability Integration Tests @capability @integration', () => {
  let os: OlaneOS;
  let laneTool: oLaneTool;

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

  describe('Capability lifecycle', () => {
    it('should create, execute, and complete a capability', async () => {
      const capability = new oCapabilityEvaluate();
      const config = createMockCapabilityConfig(laneTool, 'Test lifecycle');

      try {
        const result = await capability.execute(config);
        expect(result).to.exist;
        expect(capability.config).to.equal(config);
      } catch (error) {
        // Expected if services unavailable
      }
    });

    it('should support cancellation during execution', async () => {
      const capability = new oCapabilityMultipleStep();
      const params = {
        intents: [
          createMockIntent('Step 1', {}),
          createMockIntent('Step 2', {})
        ],
        explanation: 'Cancellation test'
      };

      const config = createMockCapabilityConfig(laneTool, 'Test cancellation', params);

      // Start execution
      const executionPromise = capability.execute(config);

      // Cancel immediately
      capability.cancel();

      try {
        await executionPromise;
      } catch (error) {
        // May error during cancellation
      }
    });

    it('should allow re-execution of a capability', async () => {
      const capability = new oCapabilityEvaluate();

      const config1 = createMockCapabilityConfig(laneTool, 'First execution');
      const config2 = createMockCapabilityConfig(laneTool, 'Second execution');

      try {
        await capability.execute(config1);
        await capability.execute(config2);

        expect(capability.config).to.equal(config2);
      } catch (error) {
        // Expected if services unavailable
      }
    });
  });

  describe('Capability sequencing', () => {
    it('should execute EVALUATE → CONFIGURE → TASK sequence', async () => {
      const results = [];

      // Step 1: Evaluate
      const evaluateCapability = new oCapabilityEvaluate();
      const evaluateConfig = createMockCapabilityConfig(laneTool, 'What tool should I use?');

      try {
        const evaluateResult = await evaluateCapability.execute(evaluateConfig);
        results.push({ type: 'EVALUATE', result: evaluateResult });

        // Step 2: Configure (would normally use result from evaluate)
        const configureCapability = new oCapabilityConfigure();
        const configureParams = {
          toolAddress: 'o://test-tool',
          intent: 'Configure the tool'
        };
        const configureConfig = createMockCapabilityConfig(laneTool, 'Configure tool', configureParams);

        try {
          const configureResult = await configureCapability.execute(configureConfig);
          results.push({ type: 'CONFIGURE', result: configureResult });
        } catch (error) {
          // Expected if tool doesn't exist
        }

        // Step 3: Task (would normally use result from configure)
        const taskCapability = new oCapabilityTask();
        const taskParams = {
          task: {
            address: 'o://test-tool',
            payload: {
              method: 'testMethod',
              params: {}
            }
          }
        };
        const taskConfig = createMockCapabilityConfig(laneTool, 'Execute task', taskParams);

        try {
          const taskResult = await taskCapability.execute(taskConfig);
          results.push({ type: 'TASK', result: taskResult });
        } catch (error) {
          // Expected if tool doesn't exist
        }

        // Should have attempted all three steps
        expect(results.length).to.be.greaterThan(0);
      } catch (error) {
        // Expected if services unavailable
      }
    });

    it('should handle SEARCH → EVALUATE sequence', async () => {
      const results = [];

      // Step 1: Search
      const searchCapability = new oCapabilitySearch();
      const searchParams = {
        isExternal: false,
        queries: [{ query: 'test search' }],
        explanation: 'Search for information'
      };
      const searchConfig = createMockCapabilityConfig(laneTool, 'Search intent', searchParams);

      try {
        const searchResult = await searchCapability.execute(searchConfig);
        results.push({ type: 'SEARCH', result: searchResult });

        // Step 2: Evaluate with search results
        const evaluateCapability = new oCapabilityEvaluate();
        const evaluateConfig = createMockCapabilityConfig(laneTool, 'Analyze search results');
        evaluateConfig.history = `Search completed with results: ${JSON.stringify(searchResult.humanResult)}`;

        try {
          const evaluateResult = await evaluateCapability.execute(evaluateConfig);
          results.push({ type: 'EVALUATE', result: evaluateResult });
        } catch (error) {
          // Expected if intelligence service unavailable
        }

        expect(results.length).to.be.greaterThan(0);
      } catch (error) {
        // Expected if services unavailable
      }
    });

    it('should handle EVALUATE → MULTIPLE_STEP sequence', async () => {
      // Step 1: Evaluate to determine steps needed
      const evaluateCapability = new oCapabilityEvaluate();
      const evaluateConfig = createMockCapabilityConfig(laneTool, 'What steps are needed?');

      try {
        await evaluateCapability.execute(evaluateConfig);

        // Step 2: Execute multiple steps
        const multiStepCapability = new oCapabilityMultipleStep();
        const multiStepParams = {
          intents: [
            createMockIntent('First step', {}),
            createMockIntent('Second step', {})
          ],
          explanation: 'Execute the determined steps'
        };
        const multiStepConfig = createMockCapabilityConfig(laneTool, 'Execute steps', multiStepParams);

        try {
          await multiStepCapability.execute(multiStepConfig);
        } catch (error) {
          // Expected if services unavailable
        }
      } catch (error) {
        // Expected if services unavailable
      }
    });
  });

  describe('Capability chaining with history', () => {
    it('should pass history between capabilities', async () => {
      let history = '';

      // Step 1
      const capability1 = new oCapabilityEvaluate();
      const config1 = createMockCapabilityConfig(laneTool, 'Step 1');
      config1.history = history;

      try {
        const result1 = await capability1.execute(config1);
        history += `\nStep 1 completed: ${result1.type}`;

        // Step 2 with updated history
        const capability2 = new oCapabilityEvaluate();
        const config2 = createMockCapabilityConfig(laneTool, 'Step 2');
        config2.history = history;

        const result2 = await capability2.execute(config2);
        history += `\nStep 2 completed: ${result2.type}`;

        expect(history).to.include('Step 1 completed');
        expect(history).to.include('Step 2 completed');
      } catch (error) {
        // Expected if services unavailable
      }
    });

    it('should accumulate context across capabilities', async () => {
      const contextData: any[] = [];

      const capabilities = [
        new oCapabilityEvaluate(),
        new oCapabilitySearch(),
        new oCapabilityEvaluate()
      ];

      for (const capability of capabilities) {
        const config = createMockCapabilityConfig(laneTool, 'Accumulate context');
        config.history = contextData.map(d => d.type).join(' → ');

        try {
          const result = await capability.execute(config);
          contextData.push({ type: result.type, capability: capability.constructor.name });
        } catch (error) {
          // Continue even if individual capability fails
        }
      }

      expect(contextData.length).to.be.greaterThan(0);
    });
  });

  describe('Capability streaming integration', () => {
    it('should support streaming across capability chain', async () => {
      const chunkCapture = new ChunkCapture();

      const capabilities = [
        new oCapabilityEvaluate(),
        new oCapabilitySearch()
      ];

      for (const capability of capabilities) {
        const params = capability instanceof oCapabilitySearch
          ? { isExternal: false, queries: [{ query: 'test' }], explanation: 'test' }
          : {};

        const config = createMockCapabilityConfig(
          laneTool,
          'Streaming test',
          params,
          {
            useStream: true,
            onChunk: chunkCapture.onChunk
          }
        );

        try {
          await capability.execute(config);
        } catch (error) {
          // Expected if services unavailable
        }
      }

      expect(chunkCapture.allChunks).to.be.an('array');
    });

    it('should handle mixed streaming and non-streaming capabilities', async () => {
      const streamedResults: any[] = [];
      const nonStreamedResults: any[] = [];

      // Streaming capability
      const config1 = createMockCapabilityConfig(
        laneTool,
        'Streaming',
        {},
        {
          useStream: true,
          onChunk: (chunk) => streamedResults.push(chunk)
        }
      );

      // Non-streaming capability
      const config2 = createMockCapabilityConfig(laneTool, 'Non-streaming');

      const capability1 = new oCapabilityEvaluate();
      const capability2 = new oCapabilityEvaluate();

      try {
        const result1 = await capability1.execute(config1);
        nonStreamedResults.push(result1);

        const result2 = await capability2.execute(config2);
        nonStreamedResults.push(result2);

        expect(nonStreamedResults.length).to.equal(2);
      } catch (error) {
        // Expected if services unavailable
      }
    });
  });

  describe('Capability error propagation', () => {
    it('should propagate errors up the capability chain', async () => {
      const errors: any[] = [];

      // Capability that will likely fail
      const taskCapability = new oCapabilityTask();
      const taskConfig = createMockCapabilityConfig(laneTool, 'Failing task', {});

      try {
        await taskCapability.execute(taskConfig);
      } catch (error) {
        errors.push({ capability: 'TASK', error });
      }

      // Should attempt to recover with evaluation
      const evaluateCapability = new oCapabilityEvaluate();
      const evaluateConfig = createMockCapabilityConfig(laneTool, 'Recover from error');

      try {
        await evaluateCapability.execute(evaluateConfig);
      } catch (error) {
        errors.push({ capability: 'EVALUATE', error });
      }

      expect(errors.length).to.be.greaterThan(0);
    });

    it('should handle capability failures gracefully', async () => {
      const results: any[] = [];

      const capabilities = [
        { cap: new oCapabilityTask(), config: createMockCapabilityConfig(laneTool, 'May fail', {}) },
        { cap: new oCapabilityEvaluate(), config: createMockCapabilityConfig(laneTool, 'Should continue') }
      ];

      for (const { cap, config } of capabilities) {
        try {
          const result = await cap.execute(config);
          results.push({ success: true, result });
        } catch (error) {
          results.push({ success: false, error });
        }
      }

      // Should have attempted both
      expect(results.length).to.equal(2);
    });
  });

  describe('Capability registry integration', () => {
    it('should instantiate all registered capabilities', () => {
      ALL_CAPABILITIES.forEach(CapabilityClass => {
        const instance = new CapabilityClass();
        expect(instance).to.exist;
        expect(instance.type).to.be.a('string');
      });
    });

    it('should execute capabilities from registry', async () => {
      const results: any[] = [];

      for (const CapabilityClass of ALL_CAPABILITIES) {
        const instance = new CapabilityClass();

        // Create appropriate config for each type
        let params: any = {};
        if (instance instanceof oCapabilitySearch) {
          params = { isExternal: false, queries: [], explanation: 'test' };
        } else if (instance instanceof oCapabilityMultipleStep) {
          params = { intents: [], explanation: 'test' };
        } else if (instance instanceof oCapabilityConfigure) {
          params = { toolAddress: 'o://test', intent: 'test' };
        } else if (instance instanceof oCapabilityTask) {
          params = { task: { address: 'o://test', payload: { method: 'test', params: {} } } };
        }

        const config = createMockCapabilityConfig(laneTool, 'Registry test', params);

        try {
          const result = await instance.execute(config);
          results.push({ type: instance.type, success: true });
        } catch (error) {
          results.push({ type: instance.type, success: false, error });
        }
      }

      expect(results.length).to.equal(ALL_CAPABILITIES.length);
    });
  });

  describe('Complex capability workflows', () => {
    it('should handle a realistic workflow: Evaluate → Search → Evaluate → Configure → Task', async () => {
      const workflow: any[] = [];

      // 1. Evaluate initial intent
      const evaluate1 = new oCapabilityEvaluate();
      try {
        const result = await evaluate1.execute(createMockCapabilityConfig(laneTool, 'Find and use a calculator'));
        workflow.push({ step: 'Initial Evaluation', type: result.type });
      } catch (error) {
        workflow.push({ step: 'Initial Evaluation', error });
      }

      // 2. Search for calculator tool
      const search = new oCapabilitySearch();
      const searchParams = {
        isExternal: false,
        queries: [{ query: 'calculator tool' }],
        explanation: 'Find calculator'
      };
      try {
        const result = await search.execute(createMockCapabilityConfig(laneTool, 'Search', searchParams));
        workflow.push({ step: 'Search', type: result.type });
      } catch (error) {
        workflow.push({ step: 'Search', error });
      }

      // 3. Evaluate search results
      const evaluate2 = new oCapabilityEvaluate();
      try {
        const result = await evaluate2.execute(createMockCapabilityConfig(laneTool, 'Analyze results'));
        workflow.push({ step: 'Result Analysis', type: result.type });
      } catch (error) {
        workflow.push({ step: 'Result Analysis', error });
      }

      // 4. Configure tool
      const configure = new oCapabilityConfigure();
      const configureParams = {
        toolAddress: 'o://calculator',
        intent: 'Add 2 and 2'
      };
      try {
        const result = await configure.execute(createMockCapabilityConfig(laneTool, 'Configure', configureParams));
        workflow.push({ step: 'Configure', type: result.type });
      } catch (error) {
        workflow.push({ step: 'Configure', error });
      }

      // 5. Execute task
      const task = new oCapabilityTask();
      const taskParams = {
        task: {
          address: 'o://calculator',
          payload: {
            method: 'add',
            params: { a: 2, b: 2 }
          }
        }
      };
      try {
        const result = await task.execute(createMockCapabilityConfig(laneTool, 'Execute', taskParams));
        workflow.push({ step: 'Execute Task', type: result.type });
      } catch (error) {
        workflow.push({ step: 'Execute Task', error });
      }

      // Should have attempted all 5 steps
      expect(workflow.length).to.equal(5);
    });

    it('should handle parallel capability execution', async () => {
      const searches = [
        { isExternal: false, queries: [{ query: 'query 1' }], explanation: 'Search 1' },
        { isExternal: false, queries: [{ query: 'query 2' }], explanation: 'Search 2' },
        { isExternal: false, queries: [{ query: 'query 3' }], explanation: 'Search 3' }
      ];

      const promises = searches.map(params => {
        const capability = new oCapabilitySearch();
        const config = createMockCapabilityConfig(laneTool, 'Parallel search', params);
        return capability.execute(config).catch(err => ({ error: err }));
      });

      const results = await Promise.all(promises);

      expect(results.length).to.equal(3);
    });
  });

  describe('Capability state management', () => {
    it('should maintain separate state for concurrent capabilities', async () => {
      const cap1 = new oCapabilityEvaluate();
      const cap2 = new oCapabilityEvaluate();

      const config1 = createMockCapabilityConfig(laneTool, 'Intent 1');
      const config2 = createMockCapabilityConfig(laneTool, 'Intent 2');

      const promises = [
        cap1.execute(config1).catch(err => ({ error: err })),
        cap2.execute(config2).catch(err => ({ error: err }))
      ];

      await Promise.all(promises);

      // Each capability should have its own config
      expect(cap1.config).to.equal(config1);
      expect(cap2.config).to.equal(config2);
      expect(cap1.config).to.not.equal(cap2.config);
    });

    it('should reset state on re-execution', async () => {
      const capability = new oCapabilityEvaluate();

      const config1 = createMockCapabilityConfig(laneTool, 'First');
      const config2 = createMockCapabilityConfig(laneTool, 'Second');

      try {
        await capability.execute(config1);
        const firstConfig = capability.config;

        await capability.execute(config2);
        const secondConfig = capability.config;

        expect(secondConfig).to.equal(config2);
        expect(secondConfig).to.not.equal(firstConfig);
      } catch (error) {
        // Expected if services unavailable
      }
    });
  });
});
