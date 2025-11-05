import { oParameter } from "../parameter";
import { oDependency } from "../dependency";
import { oProtocolMethods } from "../enums";
import {
  JSONRPCRequest,
  JSONRPCResponse,
  RequestParams,
} from "../json-rpc/json-rpc";

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
