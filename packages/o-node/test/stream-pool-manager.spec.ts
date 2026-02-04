// import { expect } from 'chai';
// import { StreamPoolManager } from '../src/connection/stream-pool-manager.js';
// import { NetworkBuilder, NetworkTopologies } from './helpers/network-builder.js';
// import { createConnectionSpy } from './helpers/connection-spy.js';
// import { StreamPoolEvent } from '../src/connection/stream-pool-manager.events.js';
// import { oNodeConnectionStream } from '../src/connection/o-node-connection-stream.js';
// import type { TestTool } from './helpers/network-builder.js';
// import type { Connection } from '@olane/o-config';

// /**
//  * Integration tests for StreamPoolManager using real libp2p nodes and connections
//  */
// describe('StreamPoolManager Integration Tests', () => {
//   let builder: NetworkBuilder;
//   let leader: TestTool;
//   let child: TestTool;
//   let p2pConnection: Connection;
//   let poolManager: StreamPoolManager | undefined;

//   /**
//    * Helper to create a real libp2p connection between two nodes
//    */
//   async function getP2pConnection(): Promise<Connection> {
//     // Make a call to establish connection
//     await leader.use(child.address, {
//       method: 'echo',
//       params: { message: 'establish connection' }
//     });

//     // Get the connection
//     const connections = leader.p2pNode.getConnections();
//     const connection = connections.find(
//       conn => conn.remotePeer.toString() === child.peerId.toString()
//     );

//     if (!connection) {
//       throw new Error('Failed to establish connection between nodes');
//     }

//     return connection;
//   }

//   /**
//    * Helper to create a StreamPoolManager with real connection
//    */
//   async function createStreamPoolManager(config?: Partial<any>): Promise<StreamPoolManager> {
//     const manager = new StreamPoolManager({
//       poolSize: config?.poolSize || 10,
//       readerStreamIndex: config?.readerStreamIndex ?? 0,
//       streamHandler: {
//         handleIncomingStream: config?.streamHandler?.handleIncomingStream || (async (stream: any) => {
//           // Default handler: just keep stream alive
//           return new Promise(() => {}); // Never resolves (keeps reader active)
//         })
//       },
//       p2pConnection,
//       requestHandler: config?.requestHandler,
//       createStream: async () => {
//         // Create a real libp2p stream
//         const stream = await p2pConnection.newStream('/o-protocol/1.0.0');

//         return new oNodeConnectionStream({
//           p2pStream: stream,
//           streamType: 'request-response',
//           readTimeoutMs: 30000,
//           drainTimeoutMs: 5000,
//         });
//       },
//       ...config,
//     });

//     return manager;
//   }

//   beforeEach(async () => {
//     // Create real node network
//     builder = await NetworkTopologies.twoNode();
//     leader = builder.getNode('o://leader')!;
//     child = builder.getNode('o://child')!;

//     // Establish real p2p connection
//     p2pConnection = await getP2pConnection();
//   });

//   afterEach(async () => {
//     if (poolManager) {
//       await poolManager.close();
//       poolManager = undefined;
//     }
//     await builder.cleanup();
//   });

//   describe('Initialization', () => {
//     it('should initialize pool with default size of 10 streams', async () => {
//       poolManager = await createStreamPoolManager();
//       await poolManager.initialize();

//       const stats = poolManager.getStats();
//       expect(stats.totalStreams).to.equal(10);
//     });

//     it('should initialize pool with custom size', async () => {
//       poolManager = await createStreamPoolManager({ poolSize: 5 });
//       await poolManager.initialize();

//       const stats = poolManager.getStats();
//       expect(stats.totalStreams).to.equal(5);
//     });

//     it('should throw error when pool size is less than 2', async () => {
//       expect(() => {
//         poolManager = new StreamPoolManager({
//           poolSize: 1,
//           readerStreamIndex: 0,
//           streamHandler: {} as any,
//           p2pConnection,
//           createStream: async () => ({} as any),
//         });
//       }).to.throw('Pool size must be at least 2');
//     });

//     it('should start dedicated reader automatically', async () => {
//       let readerStarted = false;

//       poolManager = await createStreamPoolManager();
//       poolManager.on(StreamPoolEvent.ReaderStarted, () => {
//         readerStarted = true;
//       });

//       await poolManager.initialize();

//       // Wait a bit for reader to start
//       await new Promise(resolve => setTimeout(resolve, 100));
//       expect(readerStarted).to.be.true;
//     });

//     it('should emit pool-initialized event', async () => {
//       let eventData: any;

//       poolManager = await createStreamPoolManager();
//       poolManager.on(StreamPoolEvent.PoolInitialized, (data: any) => {
//         eventData = data;
//       });

//       await poolManager.initialize();

//       expect(eventData).to.exist;
//       expect(eventData.poolSize).to.equal(10);
//     });

//     it('should be idempotent (calling initialize twice is safe)', async () => {
//       poolManager = await createStreamPoolManager();

//       await poolManager.initialize();
//       const statsFirst = poolManager.getStats();

//       await poolManager.initialize();
//       const statsSecond = poolManager.getStats();

//       expect(statsFirst.totalStreams).to.equal(statsSecond.totalStreams);
//       expect(statsSecond.totalStreams).to.equal(10);
//     });

//     it('should assign correct stream types', async () => {
//       poolManager = await createStreamPoolManager({ poolSize: 3 });
//       await poolManager.initialize();

//       const stats = poolManager.getStats();
//       expect(stats.requestResponseStreams).to.equal(2); // All except stream[0]
//     });
//   });

//   describe('Round-Robin Stream Selection', () => {
//     beforeEach(async () => {
//       poolManager = await createStreamPoolManager({ poolSize: 5 });
//       await poolManager.initialize();
//     });

//     it('should return streams in round-robin order', async () => {
//       const stream1 = await poolManager!.getStream();
//       const stream2 = await poolManager!.getStream();
//       const stream3 = await poolManager!.getStream();
//       const stream4 = await poolManager!.getStream();

//       // Should cycle through streams[1-4]
//       expect(stream1.p2pStream.id).to.not.equal(stream2.p2pStream.id);
//       expect(stream2.p2pStream.id).to.not.equal(stream3.p2pStream.id);
//       expect(stream3.p2pStream.id).to.not.equal(stream4.p2pStream.id);
//     });

//     it('should wrap around after last stream', async () => {
//       // Pool size is 5, so we have streams 1-4 for request-response (4 streams total)
//       const firstRound: any[] = [];
//       for (let i = 0; i < 4; i++) {
//         firstRound.push(await poolManager!.getStream());
//       }

//       const nextStream = await poolManager!.getStream();

//       // Should wrap back to first request-response stream
//       expect(nextStream.p2pStream.id).to.equal(firstRound[0].p2pStream.id);
//     });

//     it('should throw error when getStream called before initialize', async () => {
//       const uninitializedManager = await createStreamPoolManager();

//       try {
//         await uninitializedManager.getStream();
//         expect.fail('Should have thrown error');
//       } catch (error: any) {
//         expect(error.message).to.include('not initialized');
//       } finally {
//         await uninitializedManager.close();
//       }
//     });
//   });

//   describe('Stream Validation and Replacement', () => {
//     it('should detect invalid stream and replace it', async () => {
//       poolManager = await createStreamPoolManager({ poolSize: 3 });
//       await poolManager.initialize();

//       // Get first stream and forcibly close it
//       const firstStream = await poolManager.getStream();
//       await firstStream.p2pStream.close();

//       // Wait for stream to be marked invalid
//       await new Promise(resolve => setTimeout(resolve, 100));

//       // Next getStream should detect and replace the invalid stream
//       const nextStream = await poolManager.getStream();
//       expect(nextStream.isValid).to.be.true;
//     });

//     it('should emit stream-replaced event when replacing stream', async () => {
//       let replacedEventFired = false;

//       poolManager = await createStreamPoolManager({ poolSize: 3 });
//       poolManager.on(StreamPoolEvent.StreamReplaced, () => {
//         replacedEventFired = true;
//       });

//       await poolManager.initialize();

//       // Close a request-response stream
//       const stream = await poolManager.getStream();
//       await stream.p2pStream.close();

//       // Wait for detection and replacement
//       await new Promise(resolve => setTimeout(resolve, 100));

//       // Trigger getStream to force validation
//       await poolManager.getStream();

//       expect(replacedEventFired).to.be.true;
//     });
//   });

//   describe('Dedicated Reader Recovery', () => {
//     it('should detect reader failure and trigger recovery', async () => {
//       let failureDetected = false;
//       const mockStreamHandler = {
//         handleIncomingStream: async () => {
//           failureDetected = true;
//           throw new Error('Reader stream failed');
//         },
//       };

//       poolManager = await createStreamPoolManager({
//         poolSize: 3,
//         streamHandler: mockStreamHandler,
//       });

//       poolManager.on(StreamPoolEvent.ReaderFailed, () => {
//         failureDetected = true;
//       });

//       await poolManager.initialize();

//       // Wait for reader failure event
//       await new Promise(resolve => setTimeout(resolve, 500));

//       const stats = poolManager.getStats();
//       expect(stats.failureCount).to.be.greaterThan(0);
//     });

//     it('should emit reader-recovered event on successful recovery', async () => {
//       let callCount = 0;
//       let recoveryEventFired = false;

//       const mockStreamHandler = {
//         handleIncomingStream: async () => {
//           callCount++;
//           if (callCount === 1) {
//             throw new Error('Initial failure');
//           }
//           // Second call succeeds (recovery)
//           return new Promise(() => {}); // Never resolves (keeps reader active)
//         },
//       };

//       poolManager = await createStreamPoolManager({
//         poolSize: 3,
//         streamHandler: mockStreamHandler,
//       });

//       poolManager.on(StreamPoolEvent.ReaderRecovered, () => {
//         recoveryEventFired = true;
//       });

//       await poolManager.initialize();

//       // Wait for recovery
//       await new Promise(resolve => setTimeout(resolve, 1000));

//       expect(recoveryEventFired).to.be.true;
//     });

//     it('should not attempt recovery during close', async () => {
//       let recoveryAttempted = false;
//       const mockStreamHandler = {
//         handleIncomingStream: async () => {
//           await new Promise((resolve) => setTimeout(resolve, 50));
//           throw new Error('Reader failed');
//         },
//       };

//       poolManager = await createStreamPoolManager({
//         poolSize: 3,
//         streamHandler: mockStreamHandler,
//       });

//       poolManager.on(StreamPoolEvent.ReaderRecovered, () => {
//         recoveryAttempted = true;
//       });

//       await poolManager.initialize();

//       // Close immediately
//       await poolManager.close();

//       // Wait a bit
//       await new Promise((resolve) => setTimeout(resolve, 200));

//       // Should not have attempted recovery
//       expect(recoveryAttempted).to.be.false;
//     });
//   });

//   describe('Statistics', () => {
//     it('should return accurate totalStreams count', async () => {
//       poolManager = await createStreamPoolManager({ poolSize: 7 });
//       await poolManager.initialize();

//       const stats = poolManager.getStats();
//       expect(stats.totalStreams).to.equal(7);
//     });

//     it('should return accurate healthyStreams count', async () => {
//       poolManager = await createStreamPoolManager({ poolSize: 5 });
//       await poolManager.initialize();

//       const stats = poolManager.getStats();
//       expect(stats.healthyStreams).to.be.greaterThan(0);
//     });

//     it('should report reader health status', async () => {
//       poolManager = await createStreamPoolManager({ poolSize: 3 });
//       await poolManager.initialize();

//       const stats = poolManager.getStats();
//       expect(stats.readerStreamHealth).to.be.oneOf([
//         'healthy',
//         'unhealthy',
//         'not-initialized',
//       ]);
//     });

//     it('should track request-response stream count', async () => {
//       poolManager = await createStreamPoolManager({ poolSize: 6 });
//       await poolManager.initialize();

//       const stats = poolManager.getStats();
//       expect(stats.requestResponseStreams).to.equal(5); // 6 total - 1 reader
//     });

//     it('should increment failureCount on reader failures', async () => {
//       let callCount = 0;
//       const mockStreamHandler = {
//         handleIncomingStream: async () => {
//           callCount++;
//           if (callCount <= 2) {
//             throw new Error('Failure');
//           }
//           return new Promise(() => {}); // Then succeed
//         },
//       };

//       poolManager = await createStreamPoolManager({
//         poolSize: 3,
//         streamHandler: mockStreamHandler,
//       });

//       await poolManager.initialize();

//       // Wait for failures
//       await new Promise(resolve => setTimeout(resolve, 1000));

//       const stats = poolManager.getStats();
//       expect(stats.failureCount).to.be.at.least(1);
//     });
//   });

//   describe('Event Emission', () => {
//     it('should emit all lifecycle events with correct data', async () => {
//       let poolInitialized = false;
//       let readerStarted = false;
//       let poolClosed = false;

//       poolManager = await createStreamPoolManager({ poolSize: 3 });

//       poolManager.on(StreamPoolEvent.PoolInitialized, () => {
//         poolInitialized = true;
//       });
//       poolManager.on(StreamPoolEvent.ReaderStarted, () => {
//         readerStarted = true;
//       });
//       poolManager.on(StreamPoolEvent.PoolClosed, () => {
//         poolClosed = true;
//       });

//       await poolManager.initialize();
//       await new Promise(resolve => setTimeout(resolve, 100));
//       await poolManager.close();

//       expect(poolInitialized).to.be.true;
//       expect(readerStarted).to.be.true;
//       expect(poolClosed).to.be.true;
//     });

//     it('should support multiple listeners for same event', async () => {
//       let listener1Called = false;
//       let listener2Called = false;

//       poolManager = await createStreamPoolManager({ poolSize: 3 });

//       poolManager.on(StreamPoolEvent.PoolInitialized, () => {
//         listener1Called = true;
//       });
//       poolManager.on(StreamPoolEvent.PoolInitialized, () => {
//         listener2Called = true;
//       });

//       await poolManager.initialize();

//       expect(listener1Called).to.be.true;
//       expect(listener2Called).to.be.true;
//     });

//     it('should allow removing event listeners', async () => {
//       let callCount = 0;
//       const listener = () => {
//         callCount++;
//       };

//       poolManager = await createStreamPoolManager({ poolSize: 3 });

//       poolManager.on(StreamPoolEvent.PoolInitialized, listener);
//       await poolManager.initialize();

//       expect(callCount).to.equal(1);

//       poolManager.off(StreamPoolEvent.PoolInitialized, listener);

//       // Verify off doesn't throw
//       expect(() =>
//         poolManager!.off(StreamPoolEvent.PoolInitialized, listener),
//       ).to.not.throw();
//     });
//   });

//   describe('Cleanup and Lifecycle', () => {
//     it('should close all streams on close()', async () => {
//       poolManager = await createStreamPoolManager({ poolSize: 5 });
//       await poolManager.initialize();

//       const statsBefore = poolManager.getStats();
//       expect(statsBefore.totalStreams).to.equal(5);

//       await poolManager.close();

//       const statsAfter = poolManager.getStats();
//       expect(statsAfter.totalStreams).to.equal(0);
//     });

//     it('should emit pool-closed event', async () => {
//       let closedEventFired = false;

//       poolManager = await createStreamPoolManager({ poolSize: 3 });
//       poolManager.on(StreamPoolEvent.PoolClosed, () => {
//         closedEventFired = true;
//       });

//       await poolManager.initialize();
//       await poolManager.close();

//       expect(closedEventFired).to.be.true;
//     });

//     it('should be safe to call close() multiple times', async () => {
//       poolManager = await createStreamPoolManager({ poolSize: 3 });
//       await poolManager.initialize();

//       await poolManager.close();
//       await poolManager.close(); // Should not throw

//       const stats = poolManager.getStats();
//       expect(stats.totalStreams).to.equal(0);
//     });

//     it('should prevent getStream() after close()', async () => {
//       poolManager = await createStreamPoolManager({ poolSize: 3 });
//       await poolManager.initialize();
//       await poolManager.close();

//       try {
//         await poolManager.getStream();
//         expect.fail('Should have thrown error');
//       } catch (error: any) {
//         expect(error.message).to.include('not initialized');
//       }
//     });
//   });
// });
