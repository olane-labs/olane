import { oAddress } from '@olane/o-core';

export interface oNodeStreamConfig {
  remoteAddress: oAddress;
  abortSignal?: AbortSignal;
  limited?: boolean;
}
