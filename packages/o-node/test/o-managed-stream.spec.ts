import { expect } from 'chai';
import { oManagedStream } from '../src/connection/o-managed-stream.js';
import { oAddress } from '@olane/o-core';
import type { Stream } from '@libp2p/interface';

describe('oManagedStream', () => {
  let mockStream: Partial<Stream>;
  let callerAddress: oAddress;
  let receiverAddress: oAddress;

  beforeEach(() => {
    // Create mock stream
    mockStream = {
      id: 'test-stream-id',
      status: 'open',
      writeStatus: 'writable',
      remoteReadStatus: 'readable',
      direction: 'outbound',
      protocol: '/o/test',
      addEventListener: () => {},
    } as any;

    callerAddress = new oAddress('o://caller');
    receiverAddress = new oAddress('o://receiver');
  });

  describe('Construction', () => {
    it('should create managed stream with correct properties', () => {
      const managedStream = new oManagedStream(
        mockStream as Stream,
        callerAddress,
        receiverAddress,
        'outbound',
      );

      expect(managedStream.stream).to.equal(mockStream);
      expect(managedStream.callerAddress).to.equal(callerAddress);
      expect(managedStream.receiverAddress).to.equal(receiverAddress);
      expect(managedStream.direction).to.equal('outbound');
      expect(managedStream.createdAt).to.be.a('number');
      expect(managedStream.lastUsedAt).to.equal(managedStream.createdAt);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate bidirectional cache key (A→B === B→A)', () => {
      const streamAtoB = new oManagedStream(
        mockStream as Stream,
        callerAddress,
        receiverAddress,
        'outbound',
      );

      const streamBtoA = new oManagedStream(
        mockStream as Stream,
        receiverAddress,
        callerAddress,
        'inbound',
      );

      // Cache keys should be identical regardless of direction
      expect(streamAtoB.cacheKey).to.equal(streamBtoA.cacheKey);
    });

    it('should generate different keys for different address pairs', () => {
      const address1 = new oAddress('o://node-1');
      const address2 = new oAddress('o://node-2');
      const address3 = new oAddress('o://node-3');

      const stream1 = new oManagedStream(
        mockStream as Stream,
        address1,
        address2,
        'outbound',
      );

      const stream2 = new oManagedStream(
        mockStream as Stream,
        address1,
        address3,
        'outbound',
      );

      expect(stream1.cacheKey).to.not.equal(stream2.cacheKey);
    });

    it('should create stable, sorted cache keys', () => {
      const managedStream = new oManagedStream(
        mockStream as Stream,
        callerAddress,
        receiverAddress,
        'outbound',
      );

      const expectedKey = [callerAddress.value, receiverAddress.value]
        .sort()
        .join('↔');

      expect(managedStream.cacheKey).to.equal(expectedKey);
    });
  });

  describe('Reusability Check', () => {
    it('should be reusable when stream is open, writable, and readable', () => {
      mockStream.status = 'open';
      mockStream.writeStatus = 'writable';
      mockStream.remoteReadStatus = 'readable';

      const managedStream = new oManagedStream(
        mockStream as Stream,
        callerAddress,
        receiverAddress,
        'outbound',
      );

      expect(managedStream.isReusable).to.be.true;
    });

    it('should not be reusable when stream is closed', () => {
      mockStream.status = 'closed';
      mockStream.writeStatus = 'writable';
      mockStream.remoteReadStatus = 'readable';

      const managedStream = new oManagedStream(
        mockStream as Stream,
        callerAddress,
        receiverAddress,
        'outbound',
      );

      expect(managedStream.isReusable).to.be.false;
    });

    it('should not be reusable when stream is not writable', () => {
      mockStream.status = 'open';
      mockStream.writeStatus = 'closed';
      mockStream.remoteReadStatus = 'readable';

      const managedStream = new oManagedStream(
        mockStream as Stream,
        callerAddress,
        receiverAddress,
        'outbound',
      );

      expect(managedStream.isReusable).to.be.false;
    });

    it('should not be reusable when remote is not readable', () => {
      mockStream.status = 'open';
      mockStream.writeStatus = 'writable';
      mockStream.remoteReadStatus = 'closed';

      const managedStream = new oManagedStream(
        mockStream as Stream,
        callerAddress,
        receiverAddress,
        'outbound',
      );

      expect(managedStream.isReusable).to.be.false;
    });
  });

  describe('Timestamp Management', () => {
    it('should update lastUsedAt when updateLastUsed is called', async () => {
      const managedStream = new oManagedStream(
        mockStream as Stream,
        callerAddress,
        receiverAddress,
        'outbound',
      );

      const initialLastUsed = managedStream.lastUsedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      managedStream.updateLastUsed();

      expect(managedStream.lastUsedAt).to.be.greaterThan(initialLastUsed);
    });

    it('should calculate age correctly', async () => {
      const managedStream = new oManagedStream(
        mockStream as Stream,
        callerAddress,
        receiverAddress,
        'outbound',
      );

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(managedStream.age).to.be.greaterThan(0);
      expect(managedStream.age).to.be.lessThan(1000); // Should be less than 1 second
    });

    it('should calculate idle time correctly', async () => {
      const managedStream = new oManagedStream(
        mockStream as Stream,
        callerAddress,
        receiverAddress,
        'outbound',
      );

      // Wait a bit without using
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(managedStream.idleTime).to.be.greaterThan(0);

      // Update and check idle time resets
      managedStream.updateLastUsed();
      expect(managedStream.idleTime).to.be.lessThan(5);
    });
  });

  describe('String Representation', () => {
    it('should provide meaningful toString output', () => {
      const managedStream = new oManagedStream(
        mockStream as Stream,
        callerAddress,
        receiverAddress,
        'outbound',
      );

      const str = managedStream.toString();

      expect(str).to.include('oManagedStream');
      expect(str).to.include(managedStream.cacheKey);
      expect(str).to.include('outbound');
      expect(str).to.include('open');
    });
  });
});
