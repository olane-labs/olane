import { oResponse } from '../../connection/o-response.js';

export interface UseOptions {
  readTimeoutMs?: number;
  drainTimeoutMs?: number;
  isStream?: boolean;
  onChunk?: (chunk: oResponse) => void;
  noRouting?: boolean;
  abortSignal?: AbortSignal;
}
