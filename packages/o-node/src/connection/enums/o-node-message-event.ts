import { oRequest, oResponse } from '@olane/o-core';
import { oStreamRequest } from '../o-stream.request.js';

export enum oNodeMessageEvent {
  request = 'request',
  response = 'response',
}

/**
 * Mapped type for type-safe event listeners
 */
export type oNodeMessageEventData = {
  [oNodeMessageEvent.request]: oStreamRequest;
  [oNodeMessageEvent.response]: oResponse;
};
