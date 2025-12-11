// import { oAddress, NodeType } from '@olane/o-core';
// import { oLaneTool, oIntent, oCapabilityConfig, oLaneConfig } from '@olane/o-lane';
// import { OlaneOS } from '../../../src/o-olane-os/index.js';
// import { tmpNode } from '../../utils/tmp.node.js';

// /**
//  * Create a test OS instance for capability testing
//  */
// export async function createTestOS(): Promise<OlaneOS> {
//   const os = new OlaneOS({
//     nodes: [
//       {
//         type: NodeType.LEADER,
//         address: new oAddress('o://test-leader'),
//         leader: null,
//         parent: null,
//         name: 'Test Leader',
//         description: 'Test leader node for capability testing'
//       }
//     ],
//     lanes: []
//   });

//   await os.start();
//   return os;
// }

// /**
//  * Create a test lane tool node
//  */
// export async function createTestLaneTool(_os: OlaneOS): Promise<oLaneTool> {
//   // Return tmpNode as a lane tool for testing
//   return tmpNode as unknown as oLaneTool;
// }

// /**
//  * Create a mock intent for testing
//  */
// export function createMockIntent(intent: string, params?: any): oIntent {
//   return new oIntent({ intent });
// }

// /**
//  * Create a mock capability config for testing
//  */
// export function createMockCapabilityConfig(
//   node: oLaneTool,
//   intent: string,
//   params?: any,
//   options?: {
//     useStream?: boolean;
//     onChunk?: (chunk: any) => void;
//     isReplay?: boolean;
//   }
// ): oCapabilityConfig {
//   return {
//     node,
//     intent: createMockIntent(intent, params),
//     laneConfig: {
//       maxCycles: 20,
//       useStream: options?.useStream || false
//     } as oLaneConfig,
//     history: '',
//     params: params || {},
//     isReplay: options?.isReplay || false,
//     useStream: options?.useStream || false,
//     onChunk: options?.onChunk
//   };
// }

// /**
//  * Create a mock tool for testing task capabilities
//  */
// export async function createMockTool(_os: OlaneOS, methods: Record<string, Function>) {
//   // Use tmpNode as base tool for testing
//   const tool = tmpNode;

//   // Add methods to the tool
//   Object.entries(methods).forEach(([methodName, methodFn]) => {
//     (tool as any)[methodName] = methodFn;
//   });

//   return tool;
// }

// /**
//  * Wait for a condition to be true
//  */
// export async function waitFor(
//   condition: () => boolean | Promise<boolean>,
//   timeout: number = 5000,
//   interval: number = 100
// ): Promise<void> {
//   const startTime = Date.now();

//   while (Date.now() - startTime < timeout) {
//     const result = await Promise.resolve(condition());
//     if (result) {
//       return;
//     }
//     await new Promise(resolve => setTimeout(resolve, interval));
//   }

//   throw new Error(`Condition not met within ${timeout}ms`);
// }

// /**
//  * Capture streaming chunks for testing
//  */
// export class ChunkCapture {
//   private chunks: any[] = [];

//   get allChunks(): any[] {
//     return [...this.chunks];
//   }

//   get chunkCount(): number {
//     return this.chunks.length;
//   }

//   get lastChunk(): any | undefined {
//     return this.chunks[this.chunks.length - 1];
//   }

//   onChunk = (chunk: any): void => {
//     this.chunks.push(chunk);
//   };

//   clear(): void {
//     this.chunks = [];
//   }

//   waitForChunks(count: number, timeout: number = 5000): Promise<void> {
//     return waitFor(() => this.chunks.length >= count, timeout);
//   }
// }

// /**
//  * Common test fixtures
//  */
// export const TEST_FIXTURES = {
//   simpleIntent: 'Execute a simple test task',
//   searchIntent: 'Search for information about testing',
//   configureIntent: 'Configure the test tool',
//   evaluateIntent: 'Evaluate the test scenario',
//   multiStepIntent: 'Execute multiple test steps',

//   mockHistory: `Previous execution history:
// - Evaluated intent
// - Configured tool
// - Executed task`,

//   mockToolMethods: {
//     testMethod: async (param1: string, param2: number) => {
//       return `Executed with ${param1} and ${param2}`;
//     },

//     asyncMethod: async () => {
//       await new Promise(resolve => setTimeout(resolve, 100));
//       return 'Async result';
//     },

//     errorMethod: async () => {
//       throw new Error('Test error from method');
//     }
//   }
// };

// /**
//  * Assertion helpers
//  */
// export const assertCapabilityResult = {
//   isSuccess(result: any): void {
//     if (result.error) {
//       throw new Error(`Expected success but got error: ${result.error}`);
//     }
//   },

//   hasType(result: any, expectedType: string): void {
//     if (result.type !== expectedType) {
//       throw new Error(`Expected type ${expectedType} but got ${result.type}`);
//     }
//   },

//   hasResult(result: any): void {
//     if (!result.result && !result.humanResult) {
//       throw new Error('Expected result to have result or humanResult');
//     }
//   },

//   isError(result: any, expectedError?: string): void {
//     if (!result.error) {
//       throw new Error('Expected error but got success');
//     }
//     if (expectedError && !result.error.includes(expectedError)) {
//       throw new Error(`Expected error containing "${expectedError}" but got "${result.error}"`);
//     }
//   }
// };
