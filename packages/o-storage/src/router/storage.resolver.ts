import {
  oAddressResolver,
  oAddress,
  TransportType,
  oRequest,
} from '@olane/o-core';
import type { RouteResponse } from '@olane/o-core';
import { oLaneTool } from '@olane/o-lane';
import { v4 as uuidv4 } from 'uuid';

export class oStorageResolver extends oAddressResolver {
  constructor(protected readonly address: oAddress) {
    super(address);
  }

  get supportedTransports(): TransportType[] {
    return [TransportType.CUSTOM];
  }

  get transports(): string[] {
    return ['/storage'];
  }

  async resolve(address: oAddress, node: oLaneTool): Promise<RouteResponse> {
    this.logger.debug('Resolving custom storage address: ', address);
    // extract the key from the address
    let key = null;
    let method: string = 'get';
    const parts = address.toString().split('/');
    const tools = await node.myTools();
    if (tools.includes(parts[parts.length - 1])) {
      method = parts.pop() || 'get'; // first pop the method
      key = parts.pop(); // then pop the key
    } else {
      key = parts.pop();
    }

    if (!key) {
      throw new Error('Invalid address');
    }

    // restructure the request to include the key
    const req = new oRequest({
      method: method,
      params: {
        _connectionId: '',
        _requestMethod: method,
        key,
        method: method,
      },
      id: uuidv4(),
    });

    return {
      nextHopAddress: this.address,
      targetAddress: address,
      requestOverride: req,
    };
  }
}
