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
  InboundRequest = 'inbound-request',
  InboundResponse = 'inbound-response',
  StreamError = 'stream-error',
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

export interface InboundRequestData {
  request: any; // oRequest from @olane/o-core
  stream: any; // Stream from @libp2p/interface
  connection: any; // Connection from @libp2p/interface
}

export interface InboundResponseData {
  response: any; // oResponse from @olane/o-core
  streamId: string;
}

export interface StreamErrorData {
  streamId: string;
  error: Error;
  context: 'incoming' | 'outgoing' | 'general';
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
  [StreamManagerEvent.InboundRequest]: InboundRequestData;
  [StreamManagerEvent.InboundResponse]: InboundResponseData;
  [StreamManagerEvent.StreamError]: StreamErrorData;
};
