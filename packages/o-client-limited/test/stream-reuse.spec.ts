// import { describe, it, beforeEach } from 'mocha';
// import { expect } from 'aegir/chai';
// import { oLimitedConnection } from '../src/connection/o-limited-connection.js';
// import { oNodeAddress } from '@olane/o-node';
// import {
//   createMockP2PConnection,
//   createMockStream,
//   createMockStreamHandler,
//   MockStream,
//   MockP2PConnection,
//   MockStreamHandler,
// } from './helpers/index.js';

// describe('oLimitedConnection - Stream Reuse Core Behavior', () => {
//   let connection: oLimitedConnection;
//   let mockP2PConnection: MockP2PConnection;
//   let mockStreamHandler: MockStreamHandler;
//   const testProtocol = '/test/1.0.0';
//   const testAddress = new oNodeAddress('o://test');
//   const nextHopAddress = new oNodeAddress('o://next-hop');

//   beforeEach(() => {
//     // Create fresh mocks for each test
//     mockP2PConnection = createMockP2PConnection('test-conn', 'open');
//     mockStreamHandler = createMockStreamHandler();

//     // Create connection instance
//     connection = new oLimitedConnection({
//       nextHopAddress,
//       address: testAddress,
//       p2pConnection: mockP2PConnection as any,
//       callerAddress: testAddress,
//       runOnLimitedConnection: true,
//     });

//     // Inject mock stream handler
//     (connection as any).streamHandler = mockStreamHandler;
//     (connection as any).nextHopAddress = { protocol: testProtocol };
//   });

//   describe('Stream Reuse - Core Feature', () => {
//     it('should reuse existing open stream for multiple requests', async () => {
//       // Create a stream and add it to the connection
//       const existingStream = createMockStream('stream-1', testProtocol, {
//         status: 'open',
//         writeStatus: 'writable',
//         remoteReadStatus: 'readable',
//       });
//       mockP2PConnection.addStream(existingStream);

//       // First call should return the existing stream
//       const stream1 = await connection.getOrCreateStream();
//       expect(stream1).toBe(existingStream);
//       expect(mockStreamHandler.getOrCreateStreamCalls.length).toBe(1);

//       // Verify reusePolicy was set to 'reuse'
//       const config1 = mockStreamHandler.getLastGetOrCreateConfig();
//       expect(config1?.reusePolicy).toBe('reuse');

//       // Second call should return the same stream (reused)
//       const stream2 = await connection.getOrCreateStream();
//       expect(stream2).toBe(existingStream);
//       expect(stream2).toBe(stream1);
//       expect(mockStreamHandler.getOrCreateStreamCalls.length).toBe(2);

//       // Verify reusePolicy was still 'reuse'
//       const config2 = mockStreamHandler.getLastGetOrCreateConfig();
//       expect(config2?.reusePolicy).toBe('reuse');
//     });

//     it('should NOT close stream after transmission (postTransmit)', async () => {
//       const stream = createMockStream('stream-1', testProtocol);
//       mockP2PConnection.addStream(stream);

//       // Get the stream
//       await connection.getOrCreateStream();

//       // Simulate transmission complete - call postTransmit
//       await connection.postTransmit(stream as any);

//       // Verify stream was NOT aborted or closed
//       expect((stream as any).abortCallCount).toBe(0);
//       expect(stream.closeCallCount).toBe(0);
//       expect(stream.status).toBe('open');

//       // Verify close was called with reusePolicy: 'reuse'
//       expect(mockStreamHandler.closeCalls.length).toBe(1);
//       const closeConfig = mockStreamHandler.getLastCloseConfig();
//       expect(closeConfig?.reusePolicy).toBe('reuse');
//     });

//     it('should keep stream open status after postTransmit', async () => {
//       const stream = createMockStream('stream-1', testProtocol, {
//         status: 'open',
//         writeStatus: 'writable',
//         remoteReadStatus: 'readable',
//       });
//       mockP2PConnection.addStream(stream);

//       // Call postTransmit
//       await connection.postTransmit(stream as any);

//       // Stream should remain in usable state
//       expect(stream.status).toBe('open');
//       expect(stream.writeStatus).toBe('writable');
//       expect(stream.remoteReadStatus).toBe('readable');
//     });
//   });

//   describe('Stream Selection Criteria', () => {
//     it('should only reuse streams with status=open', async () => {
//       // Add a closed stream
//       const closedStream = createMockStream('stream-closed', testProtocol, {
//         status: 'closed',
//         writeStatus: 'closed',
//       });
//       mockP2PConnection.addStream(closedStream);

//       // Add an open stream
//       const openStream = createMockStream('stream-open', testProtocol, {
//         status: 'open',
//         writeStatus: 'writable',
//         remoteReadStatus: 'readable',
//       });
//       mockP2PConnection.addStream(openStream);

//       // Should select the open stream, not the closed one
//       const stream = await connection.getOrCreateStream();
//       expect(stream).toBe(openStream);
//       expect(stream).not.toBe(closedStream);
//     });

//     it('should only reuse streams with writeStatus=writable', async () => {
//       // Add a non-writable stream
//       const nonWritableStream = createMockStream(
//         'stream-readonly',
//         testProtocol,
//         {
//           status: 'open',
//           writeStatus: 'closed',
//           remoteReadStatus: 'readable',
//         },
//       );
//       mockP2PConnection.addStream(nonWritableStream);

//       // Should create a new stream instead of reusing non-writable
//       const stream = await connection.getOrCreateStream();
//       expect(stream).not.toBe(nonWritableStream);
//       expect(stream.writeStatus).toBe('writable');
//     });

//     it('should only reuse streams with remoteReadStatus=readable', async () => {
//       // Add a stream where remote can't read
//       const nonReadableStream = createMockStream(
//         'stream-noread',
//         testProtocol,
//         {
//           status: 'open',
//           writeStatus: 'writable',
//           remoteReadStatus: 'closed',
//         },
//       );
//       mockP2PConnection.addStream(nonReadableStream);

//       // Should create a new stream instead
//       const stream = await connection.getOrCreateStream();
//       expect(stream).not.toBe(nonReadableStream);
//       expect(stream.remoteReadStatus).toBe('readable');
//     });

//     it('should only reuse streams matching the protocol', async () => {
//       // Add a stream with different protocol
//       const differentProtocolStream = createMockStream(
//         'stream-other',
//         '/other/1.0.0',
//         {
//           status: 'open',
//           writeStatus: 'writable',
//           remoteReadStatus: 'readable',
//         },
//       );
//       mockP2PConnection.addStream(differentProtocolStream);

//       // Should create a new stream with correct protocol
//       const stream = await connection.getOrCreateStream();
//       expect(stream).not.toBe(differentProtocolStream);
//       expect(stream.protocol).toBe(testProtocol);
//     });

//     it('should NOT reuse reset streams', async () => {
//       const resetStream = createMockStream('stream-reset', testProtocol, {
//         status: 'reset',
//       });
//       mockP2PConnection.addStream(resetStream);

//       // Should create a new stream, not reuse reset one
//       const stream = await connection.getOrCreateStream();
//       expect(stream).not.toBe(resetStream);
//       expect(stream.status).toBe('open');
//     });

//     it('should NOT reuse aborted streams', async () => {
//       const abortedStream = createMockStream('stream-aborted', testProtocol, {
//         status: 'aborted',
//       });
//       mockP2PConnection.addStream(abortedStream);

//       // Should create a new stream
//       const stream = await connection.getOrCreateStream();
//       expect(stream).not.toBe(abortedStream);
//       expect(stream.status).toBe('open');
//     });
//   });

//   describe('Stream Creation When No Reusable Stream Exists', () => {
//     it('should create new stream when no existing streams', async () => {
//       // No streams in connection
//       expect(mockP2PConnection.streams.length).toBe(0);

//       const stream = await connection.getOrCreateStream();

//       // Should have created a new stream
//       expect(stream).toBeDefined();
//       expect(stream.protocol).toBe(testProtocol);
//       expect(stream.status).toBe('open');
//       expect(mockP2PConnection.streams.length).toBe(1);
//     });

//     it('should create new stream when existing streams are unusable', async () => {
//       // Add only unusable streams
//       mockP2PConnection.addStream(
//         createMockStream('stream-1', testProtocol, { status: 'closed' }),
//       );
//       mockP2PConnection.addStream(
//         createMockStream('stream-2', testProtocol, {
//           status: 'open',
//           writeStatus: 'closed',
//         }),
//       );
//       mockP2PConnection.addStream(
//         createMockStream('stream-3', '/wrong/1.0.0', {
//           status: 'open',
//           writeStatus: 'writable',
//         }),
//       );

//       const initialCount = mockP2PConnection.streams.length;
//       const stream = await connection.getOrCreateStream();

//       // Should have created a new stream
//       expect(mockP2PConnection.streams.length).toBe(initialCount + 1);
//       expect(stream.protocol).toBe(testProtocol);
//       expect(stream.status).toBe('open');
//       expect(stream.writeStatus).toBe('writable');
//     });
//   });

//   describe('Configuration - runOnLimitedConnection Flag', () => {
//     it('should pass runOnLimitedConnection: true to stream handler', async () => {
//       await connection.getOrCreateStream();

//       const config = mockStreamHandler.getLastGetOrCreateConfig();
//       expect(config?.runOnLimitedConnection).toBe(true);
//     });

//     it('should pass runOnLimitedConnection: false when disabled', async () => {
//       // Create connection with flag disabled
//       const disabledConnection = new oLimitedConnection({
//         nextHopAddress,
//         address: testAddress,
//         p2pConnection: createMockP2PConnection('test-conn-2', 'open') as any,
//         callerAddress: testAddress,
//         runOnLimitedConnection: false,
//       });

//       (disabledConnection as any).streamHandler = mockStreamHandler;
//       (disabledConnection as any).nextHopAddress = { protocol: testProtocol };

//       await disabledConnection.getOrCreateStream();

//       const config = mockStreamHandler.getLastGetOrCreateConfig();
//       expect(config?.runOnLimitedConnection).toBe(false);
//     });
//   });

//   describe('Environment Variables', () => {
//     it('should read MAX_OUTBOUND_STREAMS from environment', async () => {
//       process.env.MAX_OUTBOUND_STREAMS = '500';

//       await connection.getOrCreateStream();

//       const config = mockStreamHandler.getLastGetOrCreateConfig();
//       expect(config?.maxOutboundStreams).toBe(500);

//       delete process.env.MAX_OUTBOUND_STREAMS;
//     });

//     it('should default to 1000 when MAX_OUTBOUND_STREAMS not set', async () => {
//       delete process.env.MAX_OUTBOUND_STREAMS;

//       await connection.getOrCreateStream();

//       const config = mockStreamHandler.getLastGetOrCreateConfig();
//       expect(config?.maxOutboundStreams).toBe(1000);
//     });

//     it('should handle invalid MAX_OUTBOUND_STREAMS gracefully', async () => {
//       process.env.MAX_OUTBOUND_STREAMS = 'invalid';

//       await connection.getOrCreateStream();

//       const config = mockStreamHandler.getLastGetOrCreateConfig();
//       // parseInt('invalid') returns NaN, but we still get a number
//       expect(typeof config?.maxOutboundStreams).toBe('number');

//       delete process.env.MAX_OUTBOUND_STREAMS;
//     });
//   });
// });
