import { oParameter } from "../parameter/index.js";
import { oDependency } from "../dependency/index.js";
import { oProtocolMethods } from "../enums/index.js";
import {
  JSONRPCRequest,
  JSONRPCResponse,
  RequestParams,
} from "../json-rpc/json-rpc.js";

export interface oHandshakeRequest extends JSONRPCRequest {
  method: oProtocolMethods.HANDSHAKE;
  params: RequestParams & {
    address: string;
  };
}

export interface oHandshakeResponse extends JSONRPCResponse {
  result: {
    _connectionId: string;
    _requestMethod: oProtocolMethods.HANDSHAKE;
    _last: boolean;
    _isStreaming: boolean;
    dependencies: oDependency[];
    parameters: oParameter[];
  };
}
