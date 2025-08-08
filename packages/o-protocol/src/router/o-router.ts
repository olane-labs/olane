import { RequestParams, JSONRPCRequest } from "../json-rpc";
import { oProtocolMethods } from "../enums";

export interface oRouterRequest extends JSONRPCRequest {
  method: oProtocolMethods.ROUTE;
  params: RequestParams & {
    address: string;
    payload: {
      [key: string]: unknown;
    };
  };
}
