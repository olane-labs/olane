export const LATEST_PROTOCOL_VERSION = "1.0.0";

export enum oProtocolMethods {
  HANDSHAKE = "handshake",
  REGISTER = "register",
  ROUTE = "route",
}
export interface oDependency {
  address: string;
  version: string;
  parameters: {
    [key: string]: unknown;
  };
}
export const JSONRPC_VERSION = "2.0";

export type ConnectionId = string;

/**
 * An opaque token used to represent a cursor for pagination.
 */
export type Cursor = string;

export interface RequestParams {
  _connectionId: ConnectionId;
  _requestMethod: string;
  [key: string]: unknown;
}

export interface Request {
  method: string;
  params: RequestParams;
}

export interface Notification {
  method: string;
  params?: {
    _meta?: { [key: string]: unknown };
    [key: string]: unknown;
  };
}

export interface Result {
  _connectionId: ConnectionId;
  _requestMethod: string;
  [key: string]: unknown;
}

/**
 * A uniquely identifying ID for a request in JSON-RPC.
 */
export type RequestId = string | number;

/**
 * A request that expects a response.
 */
export interface JSONRPCRequest extends Request {
  jsonrpc: typeof JSONRPC_VERSION;
  id: RequestId;
}

/**
 * A notification which does not expect a response.
 */
export interface JSONRPCNotification extends Notification {
  jsonrpc: typeof JSONRPC_VERSION;
}

/**
 * A successful (non-error) response to a request.
 */
export interface JSONRPCResponse {
  jsonrpc: typeof JSONRPC_VERSION;
  id: RequestId;
  result: Result;
}

// Standard JSON-RPC error codes
export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const INTERNAL_ERROR = -32603;

/**
 * A response to a request that indicates an error occurred.
 */
export interface JSONRPCError {
  jsonrpc: typeof JSONRPC_VERSION;
  id: RequestId;
  error: {
    /**
     * The error type that occurred.
     */
    code: number;
    /**
     * A short description of the error. The message SHOULD be limited to a concise single sentence.
     */
    message: string;
    /**
     * Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.).
     */
    data?: unknown;
  };
}

/* Empty result */
/**
 * A response that indicates success but carries no data.
 */
export type EmptyResult = Result;

export interface oRequest extends JSONRPCRequest {}
export interface oResponse extends JSONRPCResponse {}

export interface oAddress {
  transports: string[];
  protocol: string;
}

export interface oRouterRequest extends JSONRPCRequest {
  method: oProtocolMethods.ROUTE;
  params: RequestParams & {
    address: string;
    payload: {
      [key: string]: unknown;
    };
  };
}

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
    method: string;
    dependencies: oDependency[];
    parameters: any;
  };
}

export interface oRegistrationParams extends RequestParams {
  transports: string[];
  peerId: string;
  address: string;
  protocols: string[];
  ttl?: number;
}

export interface oRegisterRequest extends oRequest {
  method: oProtocolMethods.REGISTER;
  params: oRegistrationParams;
}
