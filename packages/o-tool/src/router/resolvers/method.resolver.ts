import {
  oAddress,
  oAddressResolver,
  oCore,
  oCustomTransport,
  oRouterRequest,
  oTransport,
  ResolveRequest,
  RouteResponse,
} from '@olane/o-core';
import { oToolBase } from '../../o-tool.base';
import { JSONRPC_VERSION, oProtocolMethods } from '@olane/o-protocol';
import { v4 as uuidv4 } from 'uuid';

export class oMethodResolver extends oAddressResolver {
  constructor(protected readonly address: oAddress) {
    super(address);
  }

  get customTransports(): oTransport[] {
    return [new oCustomTransport('/method')];
  }

  async resolve(request: ResolveRequest): Promise<RouteResponse> {
    const { address, node, request: resolveRequest, targetAddress } = request;
    const nextHopAddress = oAddress.next(node?.address, address);
    const method = nextHopAddress.protocol.split('/').pop();
    this.logger.debug('Resolving method: ', method);
    if (method) {
      const methodName = await (node as oToolBase).findMethod(method);
      this.logger.debug('Method name: ', methodName);
      if (methodName) {
        this.logger.debug('Routing to method: ', methodName);
        const req = new oRouterRequest({
          method: oProtocolMethods.ROUTE,
          params: {
            _connectionId: '',
            _requestMethod: oProtocolMethods.ROUTE,
            address: node.address.toString(),
            payload: {
              method: methodName,
              params: {},
            },
          },
          jsonrpc: JSONRPC_VERSION,
          id: uuidv4(),
        });
        return {
          nextHopAddress: node.address,
          targetAddress: node.address,
          requestOverride: req,
        };
      }
    }
    return {
      nextHopAddress: address,
      targetAddress: targetAddress,
      requestOverride: resolveRequest,
    };
  }
}
