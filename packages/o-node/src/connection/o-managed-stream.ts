import type { Stream } from '@libp2p/interface';
import type { oAddress } from '@olane/o-core';

/**
 * oManagedStream wraps a libp2p Stream with caller/receiver address metadata
 * to enable proper stream reuse based on address pairs rather than protocol only.
 *
 * Key features:
 * - Bidirectional cache keys: A↔B === B↔A
 * - Automatic reusability checking
 * - Idle time tracking for cleanup
 */
export class oManagedStream {
  public readonly createdAt: number;
  private _lastUsedAt: number;

  constructor(
    public readonly stream: Stream,
    public readonly callerAddress: oAddress,
    public readonly receiverAddress: oAddress,
    public readonly direction: 'inbound' | 'outbound',
  ) {
    this.createdAt = Date.now();
    this._lastUsedAt = this.createdAt;
  }

  /**
   * Generates a bidirectional cache key from caller and receiver addresses.
   * The key is symmetric: A↔B === B↔A
   *
   * @returns Cache key string in format "address1↔address2" (sorted)
   */
  get cacheKey(): string {
    // Sort addresses to ensure bidirectionality
    const addresses = [
      this.callerAddress.value,
      this.receiverAddress.value,
    ].sort();

    return `${addresses[0]}↔${addresses[1]}`;
  }

  /**
   * Checks if the stream is in a reusable state:
   * - Stream status is 'open'
   * - Write status is 'writable'
   * - Remote read status is 'readable'
   *
   * @returns true if stream can be reused
   */
  get isReusable(): boolean {
    return (
      this.stream.status === 'open' &&
      this.stream.writeStatus === 'writable' &&
      this.stream.remoteReadStatus === 'readable'
    );
  }

  /**
   * Gets the last used timestamp
   */
  get lastUsedAt(): number {
    return this._lastUsedAt;
  }

  /**
   * Gets the age of the stream in milliseconds
   */
  get age(): number {
    return Date.now() - this.createdAt;
  }

  /**
   * Gets the idle time in milliseconds since last use
   */
  get idleTime(): number {
    return Date.now() - this._lastUsedAt;
  }

  /**
   * Updates the last used timestamp to now
   */
  updateLastUsed(): void {
    this._lastUsedAt = Date.now();
  }

  /**
   * Gets a string representation of the managed stream for debugging
   */
  toString(): string {
    return `oManagedStream(${this.cacheKey}, ${this.direction}, ${this.stream.status})`;
  }
}
