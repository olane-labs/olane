import {
  oAddressResolver,
  oAddress,
  TransportType,
  oRequest,
  oCustomTransport,
  RestrictedAddresses,
} from '@olane/o-core';
import { oRouterRequest, oTransport, RouteResponse } from '@olane/o-core';
import { v4 as uuidv4 } from 'uuid';
import { StorageResolveRequest } from './storage.resolve-request.js';
import { JSONRPC_VERSION, oProtocolMethods } from '@olane/o-protocol';

export class oStorageResolver extends oAddressResolver {
  constructor(protected readonly address: oAddress) {
    super(address);
  }

  get supportedTransports(): TransportType[] {
    return [TransportType.CUSTOM];
  }

  get customTransports(): oTransport[] {
    return [new oCustomTransport('/storage')];
  }

  async resolve(request: StorageResolveRequest): Promise<RouteResponse> {
    const { address, node, request: resolveRequest, targetAddress } = request;

    // are we routing to ourselves
    if (targetAddress.paths.indexOf(node.address.paths) === -1) {
      return {
        nextHopAddress: address,
        targetAddress: targetAddress,
        requestOverride: resolveRequest,
      };
    }

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

    this.logger.debug('Applying storage resolver to address: ', address);

    // restructure the request to include the key
    const req = new oRouterRequest({
      method: oProtocolMethods.ROUTE,
      params: {
        _connectionId: '',
        _requestMethod: oProtocolMethods.ROUTE,
        address: node.address.toString(),
        payload: {
          method: method,
          params: {
            key: key,
          },
        },
      },
      jsonrpc: JSONRPC_VERSION,
      id: uuidv4(),
    });

    return {
      nextHopAddress: node.address,
      targetAddress: node.address,
      requestOverride: req as oRouterRequest,
    };
  }
}
