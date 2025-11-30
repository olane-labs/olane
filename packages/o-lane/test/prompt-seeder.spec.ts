// import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
// import { PromptStorageProvider } from '../src/storage/prompt-storage-provider.tool.js';
// import { PromptSeeder } from '../src/storage/prompt-seeder.js';
// import { PromptLoader } from '../src/storage/prompt-loader.js';
// import {
//   PROMPT_KEYS,
//   PROMPT_IDS,
//   StoredPromptTemplate,
// } from '../src/storage/prompt-schema.js';
// import { AGENT_PROMPT } from '../src/prompts/agent.prompt.js';
// import { CONFIGURE_INSTRUCTIONS } from '../src/prompts/configure.prompt.js';

// describe('Prompt Seeding and Loading', () => {
//   let storage: PromptStorageProvider;
//   let seeder: PromptSeeder;
//   let loader: PromptLoader;

//   beforeAll(async () => {
//     storage = new PromptStorageProvider({});
//     await storage.start();

//     seeder = new PromptSeeder(storage);
//     loader = new PromptLoader(storage);
//   });

//   afterAll(async () => {
//     await storage.stop();
//   });

//   describe('PromptSeeder', () => {
//     it('should check if prompts are not seeded initially', async () => {
//       const isSeeded = await seeder.isSeeded();
//       expect(isSeeded).toBe(false);
//     });

//     it('should seed all prompts successfully', async () => {
//       await seeder.seedAll();

//       // Verify all prompts are stored
//       const baseTemplateResponse = await storage.use(storage.address, {
//         method: 'has',
//         params: {
//           promptId: PROMPT_IDS.AGENT,
//           key: PROMPT_KEYS.BASE_TEMPLATE,
//         },
//       });
//       expect(baseTemplateResponse.success).toBe(true);
//       expect(baseTemplateResponse.result?.data?.exists).toBe(true);

//       const cycleResponse = await storage.use(storage.address, {
//         method: 'has',
//         params: {
//           promptId: PROMPT_IDS.AGENT,
//           key: PROMPT_KEYS.CYCLE_INSTRUCTIONS,
//         },
//       });
//       expect(cycleResponse.success).toBe(true);
//       expect(cycleResponse.result?.data?.exists).toBe(true);

//       const outputResponse = await storage.use(storage.address, {
//         method: 'has',
//         params: {
//           promptId: PROMPT_IDS.AGENT,
//           key: PROMPT_KEYS.OUTPUT_INSTRUCTIONS,
//         },
//       });
//       expect(outputResponse.success).toBe(true);
//       expect(outputResponse.result?.data?.exists).toBe(true);

//       const configureResponse = await storage.use(storage.address, {
//         method: 'has',
//         params: {
//           promptId: PROMPT_IDS.AGENT,
//           key: PROMPT_KEYS.CONFIGURE_INSTRUCTIONS,
//         },
//       });
//       expect(configureResponse.success).toBe(true);
//       expect(configureResponse.result?.data?.exists).toBe(true);
//     });

//     it('should confirm prompts are seeded after seeding', async () => {
//       const isSeeded = await seeder.isSeeded();
//       expect(isSeeded).toBe(true);
//     });

//     it('should store prompts with correct metadata', async () => {
//       const response = await storage.use(storage.address, {
//         method: 'get',
//         params: {
//           promptId: PROMPT_IDS.AGENT,
//           key: PROMPT_KEYS.BASE_TEMPLATE,
//         },
//       });

//       expect(response.success).toBe(true);
//       const template = response.result?.data?.value as StoredPromptTemplate;
//       expect(template).toBeDefined();
//       expect(template.content).toBeDefined();
//       expect(template.metadata).toBeDefined();
//       expect(template.metadata.version).toBe('1.0.0');
//       expect(template.metadata.source).toBe('custom.prompt.ts');
//     });

//     it('should store base template with placeholders', async () => {
//       const response = await storage.use(storage.address, {
//         method: 'get',
//         params: {
//           promptId: PROMPT_IDS.AGENT,
//           key: PROMPT_KEYS.BASE_TEMPLATE,
//         },
//       });

//       const template = response.result?.data?.value as StoredPromptTemplate;
//       expect(template.content).toContain('{{intent}}');
//       expect(template.content).toContain('{{context}}');
//       expect(template.content).toContain('{{agentHistory}}');
//       expect(template.content).toContain('{{cycleInstructions}}');
//       expect(template.content).toContain('{{outputInstructions}}');
//       expect(template.content).toContain('{{extraInstructions}}');
//     });

//     it('should store cycle instructions with step details', async () => {
//       const response = await storage.use(storage.address, {
//         method: 'get',
//         params: {
//           promptId: PROMPT_IDS.AGENT,
//           key: PROMPT_KEYS.CYCLE_INSTRUCTIONS,
//         },
//       });

//       const template = response.result?.data?.value as StoredPromptTemplate;
//       expect(template.content).toContain('Step 1 - Evaluate the intent');
//       expect(template.content).toContain('Step 2 - Search for tools and context');
//       expect(template.content).toContain('Step 3 - Filter Search Results');
//       expect(template.content).toContain('Step 4 - Configure the target tool address use');
//       expect(template.content).toContain('Step 5 - Use target tool address');
//       expect(template.content).toContain('Step 6 - Review the tool use results');
//     });

//     it('should store output instructions with return types', async () => {
//       const response = await storage.use(storage.address, {
//         method: 'get',
//         params: {
//           promptId: PROMPT_IDS.AGENT,
//           key: PROMPT_KEYS.OUTPUT_INSTRUCTIONS,
//         },
//       });

//       const template = response.result?.data?.value as StoredPromptTemplate;
//       expect(template.content).toContain('Complex Intent Results');
//       expect(template.content).toContain('Configure Response');
//       expect(template.content).toContain('Search Response');
//       expect(template.content).toContain('Stop Response');
//       expect(template.content).toContain('Error Response');
//       expect(template.content).toContain('Use Tool Response');
//     });

//     it('should clear all prompts', async () => {
//       await seeder.clearAll();

//       const isSeeded = await seeder.isSeeded();
//       expect(isSeeded).toBe(false);
//     });
//   });

//   describe('PromptLoader', () => {
//     beforeAll(async () => {
//       // Ensure prompts are seeded for loader tests
//       await seeder.seedAll();
//     });

//     it('should load configure instructions from storage', async () => {
//       const instructions = await loader.loadConfigureInstructions();
//       expect(instructions).toBeDefined();
//       expect(instructions).toContain('Configure Request Instructions');
//       expect(instructions).toContain('Step 1 - Validate the intent');
//     });

//     it('should generate agent prompt from storage', async () => {
//       const prompt = await loader.generateAgentPrompt(
//         'test intent',
//         'test context',
//         'test history',
//         'test extra',
//       );

//       expect(prompt).toBeDefined();
//       expect(prompt).toContain('test intent');
//       expect(prompt).toContain('test context');
//       expect(prompt).toContain('test history');
//       expect(prompt).toContain('test extra');
//       expect(prompt).toContain('Step 1 - Evaluate the intent');
//       expect(prompt).toContain('Stop Response');
//     });

//     it('should generate prompt identical to hardcoded version', async () => {
//       const intent = 'Get user information';
//       const context = 'User ID: 123';
//       const history = 'Previous cycle: searched for user';
//       const extra = 'Be concise';

//       const storagePrompt = await loader.generateAgentPrompt(
//         intent,
//         context,
//         history,
//         extra,
//       );

//       const hardcodedPrompt = AGENT_PROMPT(intent, context, history, extra);

//       expect(storagePrompt).toBe(hardcodedPrompt);
//     });

//     it('should cache loaded templates', async () => {
//       // Clear cache first
//       loader.clearCache();

//       // First load - should hit storage
//       const prompt1 = await loader.generateAgentPrompt(
//         'test',
//         'test',
//         'test',
//         'test',
//       );

//       // Second load - should use cache
//       const prompt2 = await loader.generateAgentPrompt(
//         'test',
//         'test',
//         'test',
//         'test',
//       );

//       expect(prompt1).toBe(prompt2);
//     });

//     it('should fallback to hardcoded prompts when storage unavailable', async () => {
//       const loaderWithoutStorage = new PromptLoader();

//       const prompt = await loaderWithoutStorage.generateAgentPrompt(
//         'test intent',
//         'test context',
//         'test history',
//         'test extra',
//       );

//       expect(prompt).toBeDefined();
//       expect(prompt).toContain('test intent');
//       expect(prompt).toContain('Step 1 - Evaluate the intent');
//     });

//     it('should fallback to hardcoded configure instructions when storage unavailable', async () => {
//       const loaderWithoutStorage = new PromptLoader();

//       const instructions = await loaderWithoutStorage.loadConfigureInstructions();

//       expect(instructions).toBe(CONFIGURE_INSTRUCTIONS);
//     });

//     it('should allow disabling storage usage', async () => {
//       loader.setUseStorage(false);

//       const prompt = await loader.generateAgentPrompt(
//         'test',
//         'test',
//         'test',
//         'test',
//       );

//       expect(prompt).toBeDefined();

//       // Re-enable for other tests
//       loader.setUseStorage(true);
//     });
//   });

//   describe('Integration', () => {
//     it('should handle complete seed-load-clear cycle', async () => {
//       // Clear first
//       await seeder.clearAll();
//       expect(await seeder.isSeeded()).toBe(false);

//       // Seed
//       await seeder.seedAll();
//       expect(await seeder.isSeeded()).toBe(true);

//       // Load and verify
//       loader.clearCache();
//       const prompt = await loader.generateAgentPrompt(
//         'test',
//         'test',
//         'test',
//         'test',
//       );
//       expect(prompt).toContain('test');

//       const instructions = await loader.loadConfigureInstructions();
//       expect(instructions).toContain('Configure Request Instructions');

//       // Clear again
//       await seeder.clearAll();
//       expect(await seeder.isSeeded()).toBe(false);
//     });

//     it('should list all seeded prompts', async () => {
//       await seeder.seedAll();

//       const response = await storage.use(storage.address, {
//         method: 'get_prompt_keys',
//         params: {
//           promptId: PROMPT_IDS.AGENT,
//         },
//       });

//       expect(response.success).toBe(true);
//       expect(response.result?.data?.keys).toContain(PROMPT_KEYS.BASE_TEMPLATE);
//       expect(response.result?.data?.keys).toContain(PROMPT_KEYS.CYCLE_INSTRUCTIONS);
//       expect(response.result?.data?.keys).toContain(PROMPT_KEYS.OUTPUT_INSTRUCTIONS);
//       expect(response.result?.data?.keys).toContain(
//         PROMPT_KEYS.CONFIGURE_INSTRUCTIONS,
//       );
//       expect(response.result?.data?.count).toBe(4);
//     });

//     it('should get stats for seeded prompts', async () => {
//       const response = await storage.use(storage.address, {
//         method: 'get_prompt_stats',
//         params: {
//           promptId: PROMPT_IDS.AGENT,
//         },
//       });

//       expect(response.success).toBe(true);
//       expect(response.result?.data?.exists).toBe(true);
//       expect(response.result?.data?.keyCount).toBe(4);
//       expect(response.result?.data?.promptId).toBe(PROMPT_IDS.AGENT);
//     });
//   });
// });
