import { oProtocolMethods } from "../enums";
import { oRequest, RequestParams } from "../json-rpc";

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
