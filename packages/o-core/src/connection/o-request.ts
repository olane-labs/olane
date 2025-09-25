import {
  JSONRPC_VERSION,
  JSONRPCRequest,
  Request,
  RequestId,
  RequestParams,
} from '@olane/o-protocol';
import { RequestState } from './interfaces/request-state.enum.js';

export class oRequest implements JSONRPCRequest {
  jsonrpc: typeof JSONRPC_VERSION;
  method: string;
  params: RequestParams;
  id: RequestId;
  state: RequestState = RequestState.PENDING;

  constructor(config: Request & { id: RequestId }) {
    this.jsonrpc = JSONRPC_VERSION;
    this.method = config.method;
    this.params = config.params;
    this.id = config.id;
  }

  get connectionId(): string {
    return this.params._connectionId;
  }

  toJSON(): JSONRPCRequest {
    return {
      jsonrpc: this.jsonrpc,
      method: this.method,
      params: this.params,
      id: this.id,
    };
  }

  setState(state: RequestState): void {
    this.state = state;
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }

  static hasOlaneAddress(value: string): boolean {
    return (
      !!value &&
      typeof value === 'string' &&
      !!value?.match(/o:\/\/.*(placeholder)+(?:\/[\w.-]+)+/g)
    );
  }

  static extractAddresses(value: string): string[] {
    const matches = value.matchAll(/o:\/\/.*(placeholder)+(?:\/[\w.-]+)+/g);
    return Array.from(matches, (match) => match[0]);
  }

  static fromJSON(json: Request & { id: RequestId }): oRequest {
    return new oRequest(json);
  }
}
