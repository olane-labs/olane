/**
 * Tests for generic testing utilities
 *
 * NOTE: TestEnvironment and builder tests have been moved to @olane/o-node/test
 * since those utilities now reside in o-node/test/helpers to break circular dependencies.
 *
 * This file tests generic utilities that remain in o-test:
 * - waitFor, ChunkCapture
 * - Assertions (assertSuccess, assertError, etc.)
 * - Mock factories
 * - Fixtures
 */

import 'dotenv/config';
import { expect } from 'chai';
import { NodeState } from '@olane/o-core';
import {
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

// Mock node class for testing assertions
class MockNode {
  public state: NodeState = NodeState.STOPPED;
}

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

      expect(() => assertRunning(node as any)).to.not.throw();
    });

    it('should throw for stopped node', () => {
      const node = new MockNode();
      node.state = NodeState.STOPPED;

      expect(() => assertRunning(node as any)).to.throw('RUNNING');
    });
  });

  describe('assertStopped', () => {
    it('should pass for stopped node', () => {
      const node = new MockNode();
      node.state = NodeState.STOPPED;

      expect(() => assertStopped(node as any)).to.not.throw();
    });

    it('should throw for running node', () => {
      const node = new MockNode();
      node.state = NodeState.RUNNING;

      expect(() => assertStopped(node as any)).to.throw('STOPPED');
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
