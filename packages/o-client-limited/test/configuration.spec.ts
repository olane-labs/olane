// import { describe, it, beforeEach } from 'mocha';
// import { expect } from 'aegir/chai';
// import sinon from 'sinon';
// import { oLimitedTool } from '../src/o-limited.tool.js';
// import { oLimitedConnectionManager } from '../src/connection/o-limited-connection-manager.js';
// import { oLimitedConnection } from '../src/connection/o-limited-connection.js';
// import { oNodeAddress } from '@olane/o-node';
// import {
//   createMockP2PConnection,
//   createMockStreamHandler,
//   MockStreamHandler,
// } from './helpers/index.js';

// describe('Configuration Propagation', () => {
//   const testProtocol = '/test/1.0.0';

//   describe('oLimitedConnection - reusePolicy Configuration', () => {
//     let connection: oLimitedConnection;
//     let mockStreamHandler: MockStreamHandler;

//     beforeEach(() => {
//       const mockP2PConnection = createMockP2PConnection('test-conn', 'open');
//       mockStreamHandler = createMockStreamHandler();

//       connection = new oLimitedConnection({
//         nextHopAddress: new oNodeAddress('o://next-hop'),
//         address: new oNodeAddress('o://test'),
//         p2pConnection: mockP2PConnection as any,
//         callerAddress: new oNodeAddress('o://test'),
//         runOnLimitedConnection: true,
//       });

//       (connection as any).streamHandler = mockStreamHandler;
//       (connection as any).nextHopAddress = { protocol: testProtocol };
//     });

//     it('should ALWAYS set reusePolicy to "reuse" in getOrCreateStream', async () => {
//       await connection.getOrCreateStream();

//       const config = mockStreamHandler.getLastGetOrCreateConfig();
//       expect(config?.reusePolicy).toBe('reuse');
//     });

//     it('should ALWAYS set reusePolicy to "reuse" in postTransmit', async () => {
//       const stream = await connection.getOrCreateStream();
//       await connection.postTransmit(stream);

//       const closeConfig = mockStreamHandler.getLastCloseConfig();
//       expect(closeConfig?.reusePolicy).toBe('reuse');
//     });

//     it('should set reusePolicy to "reuse" regardless of runOnLimitedConnection flag', async () => {
//       // Test with runOnLimitedConnection: false
//       const connectionDisabled = new oLimitedConnection({
//         nextHopAddress: new oNodeAddress('o://next-hop'),
//         address: new oNodeAddress('o://test'),
//         p2pConnection: createMockP2PConnection('test-conn-2', 'open') as any,
//         callerAddress: new oNodeAddress('o://test'),
//         runOnLimitedConnection: false, // Disabled
//       });

//       const handler = createMockStreamHandler();
//       (connectionDisabled as any).streamHandler = handler;
//       (connectionDisabled as any).nextHopAddress = { protocol: testProtocol };

//       await connectionDisabled.getOrCreateStream();

//       const config = handler.getLastGetOrCreateConfig();
//       expect(config?.reusePolicy).toBe('reuse');
//     });
//   });

//   describe('oLimitedConnectionManager - Configuration Flow', () => {
//     let manager: oLimitedConnectionManager;

//     beforeEach(() => {
//       manager = new oLimitedConnectionManager({
//         p2pNode: null as any, // Not needed for this test
//         defaultReadTimeoutMs: 5000,
//         defaultDrainTimeoutMs: 30000,
//         runOnLimitedConnection: true,
//       });
//     });

//     it('should create oLimitedConnection instances (not base oNodeConnection)', async () => {
//       // Mock the getOrCreateConnection method
//       (manager as any).getOrCreateConnection = jest.fn(async () => {
//         return createMockP2PConnection('test-conn', 'open') as any;
//       });

//       const connection = await manager.connect({
//         address: new oNodeAddress('o://test'),
//         nextHopAddress: new oNodeAddress('o://next-hop'),
//         callerAddress: new oNodeAddress('o://caller'),
//       });

//       expect(connection).toBeInstanceOf(oLimitedConnection);
//     });

//     it('should pass runOnLimitedConnection flag to connection', async () => {
//       (manager as any).getOrCreateConnection = jest.fn(async () => {
//         return createMockP2PConnection('test-conn', 'open') as any;
//       });

//       const connection = await manager.connect({
//         address: new oNodeAddress('o://test'),
//         nextHopAddress: new oNodeAddress('o://next-hop'),
//         callerAddress: new oNodeAddress('o://caller'),
//       });

//       // Access the private config to verify
//       expect((connection as any).config.runOnLimitedConnection).toBe(true);
//     });

//     it('should pass requestHandler to connection when provided', async () => {
//       (manager as any).getOrCreateConnection = jest.fn(async () => {
//         return createMockP2PConnection('test-conn', 'open') as any;
//       });

//       const mockRequestHandler = jest.fn() as any;

//       const connection = await manager.connect({
//         address: new oNodeAddress('o://test'),
//         nextHopAddress: new oNodeAddress('o://next-hop'),
//         callerAddress: new oNodeAddress('o://caller'),
//         requestHandler: mockRequestHandler,
//       });

//       // Verify requestHandler was passed through
//       expect((connection as any).config.requestHandler).toBe(
//         mockRequestHandler,
//       );
//     });

//     it('should handle runOnLimitedConnection: false', async () => {
//       const managerDisabled = new oLimitedConnectionManager({
//         p2pNode: null as any,
//         runOnLimitedConnection: false,
//       });

//       (managerDisabled as any).getOrCreateConnection = jest.fn(async () => {
//         return createMockP2PConnection('test-conn', 'open') as any;
//       });

//       const connection = await managerDisabled.connect({
//         address: new oNodeAddress('o://test'),
//         nextHopAddress: new oNodeAddress('o://next-hop'),
//         callerAddress: new oNodeAddress('o://caller'),
//       });

//       expect((connection as any).config.runOnLimitedConnection).toBe(false);
//     });
//   });

//   describe('oLimitedTool - RequestHandler Injection', () => {
//     it('should inject requestHandler in connect() method', async () => {
//       const tool = new oLimitedTool({
//         address: new oNodeAddress('o://test-tool'),
//         leader: null,
//         parent: null,
//       });

//       // Mock the super.connect to capture the config
//       let capturedConfig: any;
//       (tool as any).super_connect = (tool as any).connect;
//       const originalConnect = Object.getPrototypeOf(
//         Object.getPrototypeOf(tool),
//       ).connect;

//       Object.getPrototypeOf(Object.getPrototypeOf(tool)).connect = jest.fn(
//         async function (config: any) {
//           capturedConfig = config;
//           return null as any; // Don't actually connect
//         },
//       );

//       try {
//         await tool.connect({
//           nextHopAddress: new oNodeAddress('o://next-hop'),
//           address: new oNodeAddress('o://test'),
//           callerAddress: new oNodeAddress('o://caller'),
//         } as any);

//         // Verify requestHandler was injected
//         expect(capturedConfig.requestHandler).toBeDefined();
//         expect(typeof capturedConfig.requestHandler).toBe('function');
//       } finally {
//         // Restore original
//         Object.getPrototypeOf(Object.getPrototypeOf(tool)).connect =
//           originalConnect;
//       }
//     });

//     it('should bind requestHandler to tool.execute method', async () => {
//       const tool = new oLimitedTool({
//         address: new oNodeAddress('o://test-tool'),
//         leader: null,
//         parent: null,
//       });

//       let capturedConfig: any;
//       const originalConnect = Object.getPrototypeOf(
//         Object.getPrototypeOf(tool),
//       ).connect;

//       Object.getPrototypeOf(Object.getPrototypeOf(tool)).connect = jest.fn(
//         async function (config: any) {
//           capturedConfig = config;
//           return null as any;
//         },
//       );

//       try {
//         await tool.connect({
//           nextHopAddress: new oNodeAddress('o://next-hop'),
//           address: new oNodeAddress('o://test'),
//           callerAddress: new oNodeAddress('o://caller'),
//         } as any);

//         // Verify the requestHandler is bound to execute
//         // We can't directly test it's the same function, but we can verify it's a bound function
//         expect(capturedConfig.requestHandler.name).toBe('bound execute');
//       } finally {
//         Object.getPrototypeOf(Object.getPrototypeOf(tool)).connect =
//           originalConnect;
//       }
//     });

//     it('should preserve other config properties when injecting requestHandler', async () => {
//       const tool = new oLimitedTool({
//         address: new oNodeAddress('o://test-tool'),
//         leader: null,
//         parent: null,
//       });

//       let capturedConfig: any;
//       const originalConnect = Object.getPrototypeOf(
//         Object.getPrototypeOf(tool),
//       ).connect;

//       Object.getPrototypeOf(Object.getPrototypeOf(tool)).connect = jest.fn(
//         async function (config: any) {
//           capturedConfig = config;
//           return null as any;
//         },
//       );

//       try {
//         const testAddress = new oNodeAddress('o://test');
//         const nextHopAddress = new oNodeAddress('o://next-hop');
//         const callerAddress = new oNodeAddress('o://caller');

//         await tool.connect({
//           nextHopAddress,
//           address: testAddress,
//           callerAddress,
//         } as any);

//         // Verify original properties preserved
//         expect(capturedConfig.nextHopAddress).toBe(nextHopAddress);
//         expect(capturedConfig.address).toBe(testAddress);
//         expect(capturedConfig.callerAddress).toBe(callerAddress);
//         // And requestHandler added
//         expect(capturedConfig.requestHandler).toBeDefined();
//       } finally {
//         Object.getPrototypeOf(Object.getPrototypeOf(tool)).connect =
//           originalConnect;
//       }
//     });
//   });

//   describe('oLimitedTool - Network Listeners Configuration', () => {
//     it('should default to empty listeners array', () => {
//       const tool = new oLimitedTool({
//         address: new oNodeAddress('o://test-tool'),
//         leader: null,
//         parent: null,
//       });

//       const config = (tool as any).config;
//       expect(config.network?.listeners).toEqual([]);
//     });

//     it('should preserve custom listeners if explicitly provided', () => {
//       const customListeners = ['/ip4/0.0.0.0/tcp/0'];

//       const tool = new oLimitedTool({
//         address: new oNodeAddress('o://test-tool'),
//         leader: null,
//         parent: null,
//         network: {
//           listeners: customListeners,
//         },
//       });

//       const config = (tool as any).config;
//       expect(config.network?.listeners).toEqual(customListeners);
//     });

//     it('should preserve other network config while setting listeners', () => {
//       const tool = new oLimitedTool({
//         address: new oNodeAddress('o://test-tool'),
//         leader: null,
//         parent: null,
//         network: {},
//       });

//       const config = (tool as any).config;
//       expect(config.network?.listeners).toEqual([]);
//     });
//   });

//   describe('oLimitedTool - ConnectionManager Initialization', () => {
//     it('should use oLimitedConnectionManager instead of base manager', async () => {
//       const tool = new oLimitedTool({
//         address: new oNodeAddress('o://test-tool'),
//         leader: null,
//         parent: null,
//         runOnLimitedConnection: true,
//       });

//       // Initialize the connection manager
//       await tool.initConnectionManager();

//       // Verify it's the correct type
//       expect((tool as any).connectionManager).toBeInstanceOf(
//         oLimitedConnectionManager,
//       );
//     });

//     it('should pass runOnLimitedConnection flag to manager', async () => {
//       const tool = new oLimitedTool({
//         address: new oNodeAddress('o://test-tool'),
//         leader: null,
//         parent: null,
//         runOnLimitedConnection: true,
//       });

//       await tool.initConnectionManager();

//       const manager = (tool as any).connectionManager;
//       expect((manager as any).config.runOnLimitedConnection).toBe(true);
//     });

//     it('should pass connection timeouts to manager', async () => {
//       const tool = new oLimitedTool({
//         address: new oNodeAddress('o://test-tool'),
//         leader: null,
//         parent: null,
//         connectionTimeouts: {
//           readTimeoutMs: 10000,
//           drainTimeoutMs: 60000,
//         },
//       });

//       await tool.initConnectionManager();

//       const manager = (tool as any).connectionManager;
//       expect((manager as any).config.defaultReadTimeoutMs).toBe(10000);
//       expect((manager as any).config.defaultDrainTimeoutMs).toBe(60000);
//     });
//   });

//   describe('Full Chain - Tool → Manager → Connection → StreamHandler', () => {
//     it('should propagate runOnLimitedConnection through entire chain', async () => {
//       // This is an integration-style test verifying the full config flow
//       const tool = new oLimitedTool({
//         address: new oNodeAddress('o://test-tool'),
//         leader: null,
//         parent: null,
//         runOnLimitedConnection: true,
//       });

//       await tool.initConnectionManager();

//       const manager = (tool as any).connectionManager as oLimitedConnectionManager;

//       // Mock getOrCreateConnection
//       (manager as any).getOrCreateConnection = jest.fn(async () => {
//         return createMockP2PConnection('test-conn', 'open') as any;
//       });

//       const connection = await manager.connect({
//         address: new oNodeAddress('o://test'),
//         nextHopAddress: new oNodeAddress('o://next-hop'),
//         callerAddress: new oNodeAddress('o://caller'),
//       });

//       // Verify flag propagated to connection
//       expect((connection as any).config.runOnLimitedConnection).toBe(true);

//       // Mock streamHandler and verify it receives the flag
//       const mockStreamHandler = createMockStreamHandler();
//       (connection as any).streamHandler = mockStreamHandler;
//       (connection as any).nextHopAddress = { protocol: testProtocol };

//       await connection.getOrCreateStream();

//       const streamConfig = mockStreamHandler.getLastGetOrCreateConfig();
//       expect(streamConfig?.runOnLimitedConnection).toBe(true);
//       expect(streamConfig?.reusePolicy).toBe('reuse');
//     });
//   });
// });
