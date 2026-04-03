import { RequestParams, JSONRPCRequest } from "../json-rpc/index.js";
import { oProtocolMethods } from "../enums/index.js";
import { Stream } from "@olane/o-config";

export interface oRouterRequestInterface extends JSONRPCRequest {
  method: oProtocolMethods.ROUTE;
  params: RequestParams & {
    address: string;
    payload: {
      [key: string]: unknown;
    };
  };
  stream?: Stream;
}
