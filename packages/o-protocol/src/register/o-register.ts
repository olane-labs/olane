import { oProtocolMethods } from "../enums/index.js";
import { oRequest, RequestParams } from "../json-rpc/index.js";

export interface oRegistrationParams extends RequestParams {
  transports: string[];
  peerId: string;
  address: string;
  protocols: string[];
  ttl?: number;
  registeredAt?: number;
}

export interface oRegisterRequest extends oRequest {
  method: oProtocolMethods.REGISTER;
  params: oRegistrationParams;
}
