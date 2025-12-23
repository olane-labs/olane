/**
 * Events emitted by StreamPoolManager
 */
export enum StreamPoolEvent {
  PoolInitialized = 'pool-initialized',
  PoolClosed = 'pool-closed',
  ReaderStarted = 'reader-started',
  ReaderFailed = 'reader-failed',
  ReaderRecovered = 'reader-recovered',
  RecoveryFailed = 'recovery-failed',
  StreamReplaced = 'stream-replaced',
  StreamFailed = 'stream-failed',
}

/**
 * Event data interfaces
 */
export interface PoolInitializedData {
  poolSize: number;
}

export interface ReaderStartedData {
  streamId: string;
}

export interface ReaderFailedData {
  error?: string;
  failureCount: number;
}

export interface ReaderRecoveredData {
  failureCount: number;
}

export interface RecoveryFailedData {
  error: string;
  failureCount: number;
}

export interface StreamReplacedData {
  index: number;
  streamType: string;
}

export interface StreamFailedData {
  index: number;
  streamId: string;
  error?: string;
  failureCount: number;
}

/**
 * Mapped type for type-safe event listeners
 */
export type StreamPoolEventData = {
  [StreamPoolEvent.PoolInitialized]: PoolInitializedData;
  [StreamPoolEvent.PoolClosed]: void;
  [StreamPoolEvent.ReaderStarted]: ReaderStartedData;
  [StreamPoolEvent.ReaderFailed]: ReaderFailedData;
  [StreamPoolEvent.ReaderRecovered]: ReaderRecoveredData;
  [StreamPoolEvent.RecoveryFailed]: RecoveryFailedData;
  [StreamPoolEvent.StreamReplaced]: StreamReplacedData;
  [StreamPoolEvent.StreamFailed]: StreamFailedData;
};
