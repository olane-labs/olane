import 'dotenv/config';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { PromptStorageProvider } from '../src/storage/prompt-storage-provider.tool.js';
import { PromptSeeder } from '../src/storage/prompt-seeder.js';
import { PromptLoader } from '../src/storage/prompt-loader.js';
import {
  PROMPT_KEYS,
  PROMPT_IDS,
  StoredPromptTemplate,
} from '../src/storage/prompt-schema.js';
import { AGENT_PROMPT } from '../src/prompts/agent.prompt.js';
import { CONFIGURE_INSTRUCTIONS } from '../src/prompts/configure.prompt.js';
import {
  TestEnvironment,
  assertSuccess,
  assertDefined,
} from '@olane/o-test';

describe('Prompt Seeding and Loading', () => {
  const env = new TestEnvironment();
  let storage: PromptStorageProvider;
  let seeder: PromptSeeder;
  let loader: PromptLoader;

  before(async () => {
    storage = await env.createNode(PromptStorageProvider, {});
    seeder = new PromptSeeder(storage);
    loader = new PromptLoader(storage);
  });

  after(async () => {
    await env.cleanup();
  });

  describe('PromptSeeder', () => {
    it('should check if prompts are not seeded initially', async () => {
      const isSeeded = await seeder.isSeeded();
      expect(isSeeded).to.equal(false);
    });

    it('should seed all prompts successfully', async () => {
      await seeder.seedAll();

      // Verify all prompts are stored
      const baseTemplateResponse = await storage.use(storage.address, {
        method: 'has',
        params: {
          promptId: PROMPT_IDS.AGENT,
          key: PROMPT_KEYS.BASE_TEMPLATE,
        },
      });
      assertSuccess(baseTemplateResponse);
      expect(baseTemplateResponse.result?.data?.exists).to.equal(true);

      const cycleResponse = await storage.use(storage.address, {
        method: 'has',
        params: {
          promptId: PROMPT_IDS.AGENT,
          key: PROMPT_KEYS.CYCLE_INSTRUCTIONS,
        },
      });
      assertSuccess(cycleResponse);
      expect(cycleResponse.result?.data?.exists).to.equal(true);

      const outputResponse = await storage.use(storage.address, {
        method: 'has',
        params: {
          promptId: PROMPT_IDS.AGENT,
          key: PROMPT_KEYS.OUTPUT_INSTRUCTIONS,
        },
      });
      assertSuccess(outputResponse);
      expect(outputResponse.result?.data?.exists).to.equal(true);

      const configureResponse = await storage.use(storage.address, {
        method: 'has',
        params: {
          promptId: PROMPT_IDS.AGENT,
          key: PROMPT_KEYS.CONFIGURE_INSTRUCTIONS,
        },
      });
      assertSuccess(configureResponse);
      expect(configureResponse.result?.data?.exists).to.equal(true);
    });

    it('should confirm prompts are seeded after seeding', async () => {
      const isSeeded = await seeder.isSeeded();
      expect(isSeeded).to.equal(true);
    });

    it('should store prompts with correct metadata', async () => {
      const response = await storage.use(storage.address, {
        method: 'get',
        params: {
          promptId: PROMPT_IDS.AGENT,
          key: PROMPT_KEYS.BASE_TEMPLATE,
        },
      });

      assertSuccess(response);
      const template = response.result?.data?.value as StoredPromptTemplate;
      assertDefined(template, 'template');
      expect(template.content).to.exist;
      expect(template.metadata).to.exist;
      expect(template.metadata.version).to.equal('1.0.0');
      expect(template.metadata.source).to.equal('custom.prompt.ts');
    });

    it('should store base template with placeholders', async () => {
      const response = await storage.use(storage.address, {
        method: 'get',
        params: {
          promptId: PROMPT_IDS.AGENT,
          key: PROMPT_KEYS.BASE_TEMPLATE,
        },
      });

      assertSuccess(response);
      const template = response.result?.data?.value as StoredPromptTemplate;
      assertDefined(template, 'template');
      expect(template.content).to.include('{{intent}}');
      expect(template.content).to.include('{{context}}');
      expect(template.content).to.include('{{agentHistory}}');
      expect(template.content).to.include('{{cycleInstructions}}');
      expect(template.content).to.include('{{outputInstructions}}');
      expect(template.content).to.include('{{extraInstructions}}');
    });

    it('should store cycle instructions with step details', async () => {
      const response = await storage.use(storage.address, {
        method: 'get',
        params: {
          promptId: PROMPT_IDS.AGENT,
          key: PROMPT_KEYS.CYCLE_INSTRUCTIONS,
        },
      });

      assertSuccess(response);
      const template = response.result?.data?.value as StoredPromptTemplate;
      assertDefined(template, 'template');
      expect(template.content).to.include('Step 1 - Evaluate the intent');
      expect(template.content).to.include('Step 2 - Search for tools and context');
      expect(template.content).to.include('Step 3 - Filter Search Results');
      expect(template.content).to.include('Step 4 - Configure the target tool address use');
      expect(template.content).to.include('Step 5 - Use target tool address');
      expect(template.content).to.include('Step 6 - Review the tool use results');
    });

    it('should store output instructions with return types', async () => {
      const response = await storage.use(storage.address, {
        method: 'get',
        params: {
          promptId: PROMPT_IDS.AGENT,
          key: PROMPT_KEYS.OUTPUT_INSTRUCTIONS,
        },
      });

      assertSuccess(response);
      const template = response.result?.data?.value as StoredPromptTemplate;
      assertDefined(template, 'template');
      expect(template.content).to.include('Complex Intent Results');
      expect(template.content).to.include('Configure Response');
      expect(template.content).to.include('Search Response');
      expect(template.content).to.include('Stop Response');
      expect(template.content).to.include('Error Response');
      expect(template.content).to.include('Use Tool Response');
    });

    it('should clear all prompts', async () => {
      await seeder.clearAll();

      const isSeeded = await seeder.isSeeded();
      expect(isSeeded).to.equal(false);
    });
  });

  describe('PromptLoader', () => {
    before(async () => {
      // Ensure prompts are seeded for loader tests
      await seeder.seedAll();
    });

    it('should load configure instructions from storage', async () => {
      const instructions = await loader.loadConfigureInstructions();
      expect(instructions).to.exist;
      expect(instructions).to.include('Configure Request Instructions');
      expect(instructions).to.include('Step 1 - Validate the intent');
    });

    it('should generate agent prompt from storage', async () => {
      const prompt = await loader.generateAgentPrompt(
        'test intent',
        'test context',
        'test history',
        'test extra',
      );

      expect(prompt).to.exist;
      expect(prompt).to.include('test intent');
      expect(prompt).to.include('test context');
      expect(prompt).to.include('test history');
      expect(prompt).to.include('test extra');
      expect(prompt).to.include('Step 1 - Evaluate the intent');
      expect(prompt).to.include('Stop Response');
    });

    it('should generate prompt identical to hardcoded version', async () => {
      const intent = 'Get user information';
      const context = 'User ID: 123';
      const history = 'Previous cycle: searched for user';
      const extra = 'Be concise';

      const storagePrompt = await loader.generateAgentPrompt(
        intent,
        context,
        history,
        extra,
      );

      const hardcodedPrompt = AGENT_PROMPT(intent, context, history, extra);

      expect(storagePrompt).to.equal(hardcodedPrompt);
    });

    it('should cache loaded templates', async () => {
      // Clear cache first
      loader.clearCache();

      // First load - should hit storage
      const prompt1 = await loader.generateAgentPrompt(
        'test',
        'test',
        'test',
        'test',
      );

      // Second load - should use cache
      const prompt2 = await loader.generateAgentPrompt(
        'test',
        'test',
        'test',
        'test',
      );

      expect(prompt1).to.equal(prompt2);
    });

    it('should fallback to hardcoded prompts when storage unavailable', async () => {
      const loaderWithoutStorage = new PromptLoader();

      const prompt = await loaderWithoutStorage.generateAgentPrompt(
        'test intent',
        'test context',
        'test history',
        'test extra',
      );

      expect(prompt).to.exist;
      expect(prompt).to.include('test intent');
      expect(prompt).to.include('Step 1 - Evaluate the intent');
    });

    it('should fallback to hardcoded configure instructions when storage unavailable', async () => {
      const loaderWithoutStorage = new PromptLoader();

      const instructions = await loaderWithoutStorage.loadConfigureInstructions();

      expect(instructions).to.equal(CONFIGURE_INSTRUCTIONS);
    });

    it('should allow disabling storage usage', async () => {
      loader.setUseStorage(false);

      const prompt = await loader.generateAgentPrompt(
        'test',
        'test',
        'test',
        'test',
      );

      expect(prompt).to.exist;

      // Re-enable for other tests
      loader.setUseStorage(true);
    });
  });

  describe('Integration', () => {
    it('should handle complete seed-load-clear cycle', async () => {
      // Clear first
      await seeder.clearAll();
      expect(await seeder.isSeeded()).to.equal(false);

      // Seed
      await seeder.seedAll();
      expect(await seeder.isSeeded()).to.equal(true);

      // Load and verify
      loader.clearCache();
      const prompt = await loader.generateAgentPrompt(
        'test',
        'test',
        'test',
        'test',
      );
      expect(prompt).to.include('test');

      const instructions = await loader.loadConfigureInstructions();
      expect(instructions).to.include('Configure Request Instructions');

      // Clear again
      await seeder.clearAll();
      expect(await seeder.isSeeded()).to.equal(false);
    });

    it('should list all seeded prompts', async () => {
      await seeder.seedAll();

      const response = await storage.use(storage.address, {
        method: 'get_prompt_keys',
        params: {
          promptId: PROMPT_IDS.AGENT,
        },
      });

      assertSuccess(response);
      expect(response.result?.data?.keys).to.include(PROMPT_KEYS.BASE_TEMPLATE);
      expect(response.result?.data?.keys).to.include(PROMPT_KEYS.CYCLE_INSTRUCTIONS);
      expect(response.result?.data?.keys).to.include(PROMPT_KEYS.OUTPUT_INSTRUCTIONS);
      expect(response.result?.data?.keys).to.include(
        PROMPT_KEYS.CONFIGURE_INSTRUCTIONS,
      );
      expect(response.result?.data?.count).to.equal(4);
    });

    it('should get stats for seeded prompts', async () => {
      const response = await storage.use(storage.address, {
        method: 'get_prompt_stats',
        params: {
          promptId: PROMPT_IDS.AGENT,
        },
      });

      assertSuccess(response);
      expect(response.result?.data?.exists).to.equal(true);
      expect(response.result?.data?.keyCount).to.equal(4);
      expect(response.result?.data?.promptId).to.equal(PROMPT_IDS.AGENT);
    });
  });
});
