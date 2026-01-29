import {
  JSONRPC_VERSION,
  RequestId,
  oResponse as Response,
  Result,
} from '@olane/o-protocol';

export class oResponse implements Response {
  jsonrpc: typeof JSONRPC_VERSION;
  id: RequestId;
  result: Result;

  constructor(config: Result & { id: RequestId }) {
    this.jsonrpc = JSONRPC_VERSION;
    this.id = config.id;
    this.result = config;
  }

  toJSON(): any {
    return {
      jsonrpc: this.jsonrpc,
      id: this.id,
      result: this.result,
    };
  }

  toString(): string {
    return JSON.stringify(this.toJSON());
  }

  static fromJSON(json: any): oResponse {
    return new oResponse({
      ...json.result,
      id: json.id, // Preserve request ID for proper request/response correlation
      _connectionId: json.result?._connectionId,
      _requestMethod: json.result?._requestMethod,
    });
  }
}
