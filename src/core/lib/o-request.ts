import {
  JSONRPC_VERSION,
  JSONRPCRequest,
  Request,
  RequestId,
  RequestParams,
} from '@olane/o-protocol';
import { oCoreNode } from '../core.node.js';
import { oAddress } from '../o-address.js';
import { v4 as uuidv4 } from 'uuid';

export class oRequest implements JSONRPCRequest {
  jsonrpc: typeof JSONRPC_VERSION;
  method: string;
  params: RequestParams;
  id: RequestId;

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

  // static async translateToRawRequest(
  //   request: oRequest,
  //   node: oCoreNode,
  // ): Promise<oRequest> {
  //   const params = request.params;
  //   let didTranslate = false;
  //   for (const key in params) {
  //     let value: string = params[key] as string;
  //     if (this.hasOlaneAddress(value)) {
  //       didTranslate = true;
  //       // resolve the address
  //       const addresses = this.extractAddresses(value);
  //       for (const address of addresses) {
  //         console.log('Resolving address: ', address);
  //         const response = await node.use(new oAddress(address), {
  //           method: 'get',
  //           params: {},
  //         });
  //         value = value.replace(address, (response.result.data as any)?.value);
  //         params[key] = value;
  //       }
  //     }
  //   }
  //   if (didTranslate) {
  //     console.log('Translated request: ', params);
  //   }
  //   return new oRequest({
  //     method: request.method,
  //     id: request.id,
  //     params,
  //   });
  // }

  // static async translateResultForAgent(
  //   result: {
  //     [key: string]: any;
  //   },
  //   node: oCoreNode,
  // ): Promise<{ [key: string]: any }> {
  //   // for each value in the result, if it's larger than 10,000 characters, then put it in an address
  //   for (const key in result) {
  //     const value = result[key];
  //     if (value && typeof value === 'string' && value.length > 10_000) {
  //       const addressKey = uuidv4();
  //       console.log('Storing LARGE value in address: ', addressKey);
  //       await node.use(new oAddress('o://leader/storage/placeholder'), {
  //         method: 'put',
  //         params: {
  //           key: addressKey,
  //           value: value,
  //         },
  //       });
  //       console.log('Stored LARGE value in address: ', addressKey);
  //       result[key] = `o://leader/storage/placeholder/${addressKey}`;
  //     }
  //   }
  //   return result;
  // }

  static fromJSON(json: Request & { id: RequestId }): oRequest {
    return new oRequest(json);
  }
}
