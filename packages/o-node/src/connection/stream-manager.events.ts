/**
 * Events emitted by StreamManager
 */
export enum StreamManagerEvent {
  ManagerInitialized = 'manager-initialized',
  ManagerClosed = 'manager-closed',
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
export interface InitializedData {}

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
export type StreamManagerEventData = {
  [StreamManagerEvent.ManagerInitialized]: InitializedData;
  [StreamManagerEvent.ManagerClosed]: void;
  [StreamManagerEvent.ReaderStarted]: ReaderStartedData;
  [StreamManagerEvent.ReaderFailed]: ReaderFailedData;
  [StreamManagerEvent.ReaderRecovered]: ReaderRecoveredData;
  [StreamManagerEvent.RecoveryFailed]: RecoveryFailedData;
  [StreamManagerEvent.StreamReplaced]: StreamReplacedData;
  [StreamManagerEvent.StreamFailed]: StreamFailedData;
};
