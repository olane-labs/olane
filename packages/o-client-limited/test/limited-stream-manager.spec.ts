import { expect } from 'chai';
import { TestEnvironment } from '@olane/o-node/test/helpers';
import { oNodeAddress } from '@olane/o-node';
import { LimitedTestTool, ReceiverTestTool } from './helpers/index.js';

describe('Limited Stream Manager', () => {
  const env = new TestEnvironment();
  let caller: LimitedTestTool;
  let receiver: ReceiverTestTool;

  afterEach(async () => {
    await env.cleanup();
  });

  describe('Initialization', () => {
    it('should create dedicated reader stream on initialization', async () => {
      caller = await env.createNode<any>(LimitedTestTool, {
        address: new oNodeAddress('o://caller'),
      });

      receiver = await env.createNode<any>(ReceiverTestTool, {
        address: new oNodeAddress('o://receiver'),
      });

      const receiverAddr = new oNodeAddress(
        receiver.address.toString(),
        receiver.address.libp2pTransports,
      );

      // Make a connection to trigger initialization
      await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'test' },
      });

      // Set up event listeners after connection
      const callerConn = caller.getFirstConnection();
      const receiverConn = receiver.getFirstConnection();

      if (callerConn) {
        caller.setupEventListeners(callerConn);
      }

      if (receiverConn) {
        receiver.setupStreamListeners(receiverConn);
      }

      // Wait for events
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify reader stream was created
      const readerEvents = caller.getReaderEvents();
      expect(readerEvents.length).to.be.greaterThan(0);

      // Verify receiver identified the reader stream
      expect(receiver.identifiedStreams.length).to.be.greaterThan(0);
      expect(receiver.identifiedStreams[0].role).to.equal('reader');
    });

    it('should send stream-init message with role=reader', async () => {
      caller = await env.createNode<any>(LimitedTestTool, {
        address: new oNodeAddress('o://caller'),
      });

      receiver = await env.createNode<any>(ReceiverTestTool, {
        address: new oNodeAddress('o://receiver'),
      });

      const receiverAddr = new oNodeAddress(
        receiver.address.toString(),
        receiver.address.libp2pTransports,
      );

      await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'test' },
      });

      const receiverConn = receiver.getFirstConnection();
      if (receiverConn) {
        receiver.setupStreamListeners(receiverConn);
      }

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Receiver should have identified reader stream with correct role
      expect(receiver.identifiedStreams.length).to.be.greaterThan(0);
      const identified = receiver.identifiedStreams.find(
        (s) => s.role === 'reader',
      );
      expect(identified).to.exist;
    });

    it('should start background reader loop', async () => {
      caller = await env.createNode<any>(LimitedTestTool, {
        address: new oNodeAddress('o://caller'),
      });

      receiver = await env.createNode<any>(ReceiverTestTool, {
        address: new oNodeAddress('o://receiver'),
      });

      const receiverAddr = new oNodeAddress(
        receiver.address.toString(),
        receiver.address.libp2pTransports,
      );

      await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'test' },
      });

      const callerConn = caller.getFirstConnection();
      if (callerConn) {
        caller.setupEventListeners(callerConn);
      }

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Reader started event should be emitted
      const readerStarted = caller
        .getReaderEvents()
        .find((e) => e.type === 'reader-started');
      expect(readerStarted).to.exist;
    });

    it('should auto-initialize on first getOrCreateStream', async () => {
      caller = await env.createNode<any>(LimitedTestTool, {
        address: new oNodeAddress('o://caller'),
      });

      receiver = await env.createNode<any>(ReceiverTestTool, {
        address: new oNodeAddress('o://receiver'),
      });

      const receiverAddr = new oNodeAddress(
        receiver.address.toString(),
        receiver.address.libp2pTransports,
      );

      // First use should trigger auto-initialization
      const response = await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'first-request' },
      });

      expect(response.result.success).to.be.true;

      // Verify initialization happened
      const callerConn = caller.getFirstConnection();
      expect(callerConn).to.exist;
      expect(callerConn.streamManager).to.exist;
    });
  });

  describe('Stream Reuse', () => {
    it('should reuse outbound streams across multiple requests', async () => {
      caller = await env.createNode<any>(LimitedTestTool, {
        address: new oNodeAddress('o://caller'),
      });

      receiver = await env.createNode<any>(ReceiverTestTool, {
        address: new oNodeAddress('o://receiver'),
      });

      const receiverAddr = new oNodeAddress(
        receiver.address.toString(),
        receiver.address.libp2pTransports,
      );

      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        const response = await caller.use(receiverAddr, {
          method: 'echo',
          params: { message: `request-${i}` },
        });
        expect(response.result.success).to.be.true;
      }

      // All requests should have been processed
      expect(receiver.receivedRequests).to.have.lengthOf(5);

      // Connection should still be active
      const callerConn = caller.getFirstConnection();
      expect(callerConn).to.exist;
    });

    it('should NOT close streams after releaseStream', async () => {
      caller = await env.createNode<any>(LimitedTestTool, {
        address: new oNodeAddress('o://caller'),
      });

      receiver = await env.createNode<any>(ReceiverTestTool, {
        address: new oNodeAddress('o://receiver'),
      });

      const receiverAddr = new oNodeAddress(
        receiver.address.toString(),
        receiver.address.libp2pTransports,
      );

      // Make first request
      await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'first' },
      });

      const callerConn = caller.getFirstConnection();
      const streamsBefore = callerConn?.p2pConnection?.streams?.length || 0;

      // Make second request (should reuse stream)
      await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'second' },
      });

      const streamsAfter = callerConn?.p2pConnection?.streams?.length || 0;

      // Stream count should not decrease (streams kept open)
      expect(streamsAfter).to.be.greaterThanOrEqual(streamsBefore);
    });
  });

  describe('Cleanup', () => {
    it('should close reader stream on manager close', async () => {
      caller = await env.createNode<any>(LimitedTestTool, {
        address: new oNodeAddress('o://caller'),
      });

      receiver = await env.createNode<any>(ReceiverTestTool, {
        address: new oNodeAddress('o://receiver'),
      });

      const receiverAddr = new oNodeAddress(
        receiver.address.toString(),
        receiver.address.libp2pTransports,
      );

      await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'test' },
      });

      const callerConn = caller.getFirstConnection();
      expect(callerConn).to.exist;

      // Close the connection
      await callerConn.close();

      // Verify cleanup (stream manager should be closed)
      // We can't directly check private fields, but connection should be closed
      expect(callerConn.p2pConnection.status).to.equal('closed');
    });

    it('should close outbound stream on manager close', async () => {
      caller = await env.createNode<any>(LimitedTestTool, {
        address: new oNodeAddress('o://caller'),
      });

      receiver = await env.createNode<any>(ReceiverTestTool, {
        address: new oNodeAddress('o://receiver'),
      });

      const receiverAddr = new oNodeAddress(
        receiver.address.toString(),
        receiver.address.libp2pTransports,
      );

      // Create outbound stream
      await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'test' },
      });

      const callerConn = caller.getFirstConnection();

      // Stop caller (should close all connections and streams)
      await caller.stop();

      // Connection should be closed
      expect(callerConn.p2pConnection.status).to.equal('closed');
    });
  });

  describe('Events', () => {
    it('should emit ReaderStarted event', async () => {
      caller = await env.createNode<any>(LimitedTestTool, {
        address: new oNodeAddress('o://caller'),
      });

      receiver = await env.createNode<any>(ReceiverTestTool, {
        address: new oNodeAddress('o://receiver'),
      });

      const receiverAddr = new oNodeAddress(
        receiver.address.toString(),
        receiver.address.libp2pTransports,
      );

      await caller.use(receiverAddr, {
        method: 'echo',
        params: { message: 'test' },
      });

      const callerConn = caller.getFirstConnection();
      if (callerConn) {
        caller.setupEventListeners(callerConn);
      }

      await new Promise((resolve) => setTimeout(resolve, 200));

      const events = caller.streamManagerEvents;
      const readerStarted = events.find((e) => e.type === 'reader-started');
      expect(readerStarted).to.exist;
      expect(readerStarted?.data.streamId).to.be.a('string');
    });
  });
});
