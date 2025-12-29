import { oRequest, oResponse } from '@olane/o-core';

export enum oNodeMessageEvent {
  request = 'request',
  response = 'response',
}

/**
 * Mapped type for type-safe event listeners
 */
export type oNodeMessageEventData = {
  [oNodeMessageEvent.request]: oRequest;
  [oNodeMessageEvent.response]: oResponse;
};
