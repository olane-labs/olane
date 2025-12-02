/**
 * Tests for TestEnvironment class
 *
 * Validates the TestEnvironment utilities and serves as
 * documentation/examples for usage patterns.
 */

import 'dotenv/config';
import { expect } from 'chai';
import { NodeState } from '@olane/o-core';
import { oNodeAddress, type oNode } from '@olane/o-node';
import {
  TestEnvironment,
  SimpleNodeBuilder,
  LeaderChildBuilder,
  waitFor,
  ChunkCapture,
  assertSuccess,
  assertError,
  assertRunning,
  assertStopped,
  assertHasData,
  createMockUser,
  MOCK_USERS,
} from '../src/index.js';

// Mock node class for testing
class MockNode implements Partial<oNode> {
  public state: NodeState = NodeState.STOPPED;
  public address: oNodeAddress;
  public config: any;

  constructor(config: any = {}) {
    this.config = config;
    this.address = config.address || new oNodeAddress('o://mock-node');
  }

  async start(): Promise<void> {
    this.state = NodeState.RUNNING;
  }

  async stop(): Promise<void> {
    this.state = NodeState.STOPPED;
  }
}

describe('TestEnvironment', () => {
  let env: TestEnvironment;

  beforeEach(() => {
    env = new TestEnvironment();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  describe('Lifecycle Management', () => {
    it('should track nodes for cleanup', async () => {
      const node = new MockNode();
      env.track(node as oNode);

      expect(env.getNodeCount()).to.equal(1);
      expect(env.getNodes()).to.have.lengthOf(1);
      expect(env.getNodes()[0]).to.equal(node);
    });

    it('should create and track simple node', async () => {
      const node = await env.createNode(MockNode as any, {}, false);

      expect(env.getNodeCount()).to.equal(1);
      expect(node.state).to.equal(NodeState.STOPPED);
    });

    it('should auto-start nodes by default', async () => {
      const node = await env.createNode(MockNode as any);

      expect(node.state).to.equal(NodeState.RUNNING);
    });

    it('should stop all nodes in cleanup', async () => {
      const node1 = await env.createNode(MockNode as any);
      const node2 = await env.createNode(MockNode as any);

      expect(node1.state).to.equal(NodeState.RUNNING);
      expect(node2.state).to.equal(NodeState.RUNNING);

      await env.cleanup();

      expect(node1.state).to.equal(NodeState.STOPPED);
      expect(node2.state).to.equal(NodeState.STOPPED);
      expect(env.allNodesStopped()).to.be.true;
    });

    it('should execute cleanup callbacks', async () => {
      let callbackExecuted = false;

      env.onCleanup(async () => {
        callbackExecuted = true;
      });

      await env.cleanup();

      expect(callbackExecuted).to.be.true;
    });

    it('should clear tracking after cleanup', async () => {
      const node = await env.createNode(MockNode as any);
      expect(env.getNodeCount()).to.equal(1);

      await env.cleanup();

      expect(env.getNodeCount()).to.equal(0);
    });
  });

  describe('Node Creation', () => {
    it('should pass config to node constructor', async () => {
      const testConfig = {
        apiKey: 'test-key',
        timeout: 5000,
      };

      const node = await env.createNode(MockNode as any, testConfig);

      expect((node.config as any).apiKey).to.equal('test-key');
      expect((node.config as any).timeout).to.equal(5000);
    });

    it('should set parent and leader to null for simple nodes', async () => {
      const node = await env.createNode(MockNode as any);

      expect((node.config as any).parent).to.be.null;
      expect((node.config as any).leader).to.be.null;
    });
  });

  describe('waitFor Utility', () => {
    it('should wait for condition to be true', async () => {
      let counter = 0;

      setTimeout(() => { counter = 5; }, 100);

      await env.waitFor(() => counter === 5, 1000);

      expect(counter).to.equal(5);
    });

    it('should timeout if condition not met', async () => {
      let error: Error | null = null;

      try {
        await env.waitFor(() => false, 100);
      } catch (e) {
        error = e as Error;
      }

      expect(error).to.exist;
      expect(error?.message).to.include('Timeout');
    });

    it('should check condition immediately', async () => {
      const startTime = Date.now();
      await env.waitFor(() => true, 5000);
      const duration = Date.now() - startTime;

      // Should return almost immediately
      expect(duration).to.be.lessThan(100);
    });
  });
});

describe('Test Builders', () => {
  let env: TestEnvironment;

  beforeEach(() => {
    env = new TestEnvironment();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  describe('SimpleNodeBuilder', () => {

    it('should respect autoStart flag', async () => {
      const node = await new SimpleNodeBuilder(MockNode as any)
        .withAutoStart(false)
        .build(env);

      expect(node.state).to.equal(NodeState.STOPPED);
    });

    it('should pass config through', async () => {
      const node = await new SimpleNodeBuilder(MockNode as any)
        .withConfig({ custom: 'value' })
        .build(env);

      expect((node.config as any).custom).to.equal('value');
    });
  });
});

describe('Utilities', () => {
  describe('waitFor', () => {
    it('should wait for condition', async () => {
      let value = false;
      setTimeout(() => { value = true; }, 50);

      await waitFor(() => value, 1000);

      expect(value).to.be.true;
    });

    it('should throw on timeout', async () => {
      let error: Error | null = null;

      try {
        await waitFor(() => false, 50);
      } catch (e) {
        error = e as Error;
      }

      expect(error).to.exist;
      expect(error?.message).to.include('Timeout');
    });
  });

  describe('ChunkCapture', () => {
    it('should capture chunks', () => {
      const capture = new ChunkCapture();

      capture.onChunk({ index: 0, data: 'chunk1' });
      capture.onChunk({ index: 1, data: 'chunk2' });
      capture.onChunk({ index: 2, data: 'chunk3' });

      expect(capture.chunkCount).to.equal(3);
      expect(capture.allChunks).to.have.lengthOf(3);
    });

    it('should track first and last chunks', () => {
      const capture = new ChunkCapture();

      capture.onChunk('first');
      capture.onChunk('middle');
      capture.onChunk('last');

      expect(capture.firstChunk).to.equal('first');
      expect(capture.lastChunk).to.equal('last');
    });

    it('should clear chunks', () => {
      const capture = new ChunkCapture();

      capture.onChunk('test1');
      capture.onChunk('test2');
      expect(capture.chunkCount).to.equal(2);

      capture.clear();

      expect(capture.chunkCount).to.equal(0);
      expect(capture.allChunks).to.have.lengthOf(0);
    });

    it('should wait for chunks', async () => {
      const capture = new ChunkCapture();

      setTimeout(() => {
        capture.onChunk('chunk1');
        capture.onChunk('chunk2');
        capture.onChunk('chunk3');
      }, 50);

      await capture.waitForChunks(3, 1000);

      expect(capture.chunkCount).to.equal(3);
    });

    it('should find chunks by predicate', () => {
      const capture = new ChunkCapture<{ type: string; value: number }>();

      capture.onChunk({ type: 'data', value: 1 });
      capture.onChunk({ type: 'error', value: 2 });
      capture.onChunk({ type: 'data', value: 3 });

      const dataChunks = capture.findChunks(chunk => chunk.type === 'data');

      expect(dataChunks).to.have.lengthOf(2);
      expect(dataChunks[0].value).to.equal(1);
      expect(dataChunks[1].value).to.equal(3);
    });

    it('should convert chunks to string', () => {
      const capture = new ChunkCapture<string>();

      capture.onChunk('Hello');
      capture.onChunk(' ');
      capture.onChunk('World');

      expect(capture.asString()).to.equal('Hello World');
    });
  });
});

describe('Assertions', () => {
  describe('assertSuccess', () => {
    it('should pass for successful response', () => {
      const response = {
        jsonrpc: '2.0' as const,
        id: 'test-1',
        result: {
          success: true,
          data: { test: 'value' },
          _connectionId: '',
          _requestMethod: '',
          _last: true,
          _isStreaming: false,
        },
      };

      expect(() => assertSuccess(response as any)).to.not.throw();
    });

    it('should throw for error response', () => {
      const response = {
        jsonrpc: '2.0' as const,
        id: 'test-2',
        result: {
          success: false,
          error: 'Test error',
          _connectionId: '',
          _requestMethod: '',
          _last: true,
          _isStreaming: false,
        },
      };

      expect(() => assertSuccess(response as any)).to.throw('Test error');
    });
  });

  describe('assertError', () => {
    it('should pass for error response', () => {
      const response = {
        jsonrpc: '2.0' as const,
        id: 'test-3',
        result: {
          success: false,
          error: 'Expected error',
          _connectionId: '',
          _requestMethod: '',
          _last: true,
          _isStreaming: false,
        },
      };

      expect(() => assertError(response as any)).to.not.throw();
    });

    it('should match error substring', () => {
      const response = {
        jsonrpc: '2.0' as const,
        id: 'test-4',
        result: {
          success: false,
          error: 'Parameter userId is required',
          _connectionId: '',
          _requestMethod: '',
          _last: true,
          _isStreaming: false,
        },
      };

      expect(() => assertError(response as any, 'required')).to.not.throw();
    });

    it('should throw if error does not match', () => {
      const response = {
        jsonrpc: '2.0' as const,
        id: 'test-5',
        result: {
          success: false,
          error: 'Different error',
          _connectionId: '',
          _requestMethod: '',
          _last: true,
          _isStreaming: false,
        },
      };

      expect(() => assertError(response as any, 'required')).to.throw();
    });
  });

  describe('assertRunning', () => {
    it('should pass for running node', () => {
      const node = new MockNode();
      node.state = NodeState.RUNNING;

      expect(() => assertRunning(node as oNode)).to.not.throw();
    });

    it('should throw for stopped node', () => {
      const node = new MockNode();
      node.state = NodeState.STOPPED;

      expect(() => assertRunning(node as oNode)).to.throw('RUNNING');
    });
  });

  describe('assertStopped', () => {
    it('should pass for stopped node', () => {
      const node = new MockNode();
      node.state = NodeState.STOPPED;

      expect(() => assertStopped(node as oNode)).to.not.throw();
    });

    it('should throw for running node', () => {
      const node = new MockNode();
      node.state = NodeState.RUNNING;

      expect(() => assertStopped(node as oNode)).to.throw('STOPPED');
    });
  });

  describe('assertHasData', () => {
    it('should pass when data exists', () => {
      const response = {
        jsonrpc: '2.0' as const,
        id: 'test-6',
        result: {
          success: true,
          data: { test: 'value' },
          _connectionId: '',
          _requestMethod: '',
          _last: true,
          _isStreaming: false,
        },
      };

      expect(() => assertHasData(response as any)).to.not.throw();
    });

    it('should throw when data missing', () => {
      const response = {
        jsonrpc: '2.0' as const,
        id: 'test-7',
        result: {
          success: true,
          _connectionId: '',
          _requestMethod: '',
          _last: true,
          _isStreaming: false,
        },
      };

      expect(() => assertHasData(response as any)).to.throw('result.data');
    });
  });
});

describe('Mock Factories', () => {
  describe('createMockUser', () => {
    it('should create user with default values', () => {
      const user = createMockUser();

      expect(user.userId).to.exist;
      expect(user.username).to.exist;
      expect(user.email).to.exist;
      expect(user.role).to.equal('user');
      expect(user.active).to.be.true;
    });

    it('should apply overrides', () => {
      const user = createMockUser({
        email: 'custom@test.com',
        role: 'admin',
      });

      expect(user.email).to.equal('custom@test.com');
      expect(user.role).to.equal('admin');
    });
  });
});

describe('Fixtures', () => {
  describe('MOCK_USERS', () => {
    it('should provide test users', () => {
      expect(MOCK_USERS.basic).to.exist;
      expect(MOCK_USERS.admin).to.exist;
      expect(MOCK_USERS.inactive).to.exist;

      expect(MOCK_USERS.basic.userId).to.exist;
      expect(MOCK_USERS.admin.role).to.equal('admin');
      expect(MOCK_USERS.inactive.active).to.be.false;
    });
  });
});
