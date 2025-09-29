import {
  oAddress,
  oAddressResolver,
  oCore,
  oCustomTransport,
  oTransport,
  ResolveRequest,
  RouteResponse,
} from '@olane/o-core';
import { oToolBase } from '../../o-tool.base';

export class oMethodResolver extends oAddressResolver {
  constructor(protected readonly address: oAddress) {
    super(address);
  }

  get customTransports(): oTransport[] {
    return [new oCustomTransport('/method')];
  }

  async resolve(request: ResolveRequest): Promise<RouteResponse> {
    const { address, node, request: resolveRequest } = request;
    if (!node) {
      return {
        nextHopAddress: address,
        targetAddress: address,
        requestOverride: resolveRequest,
      };
    }
    const nextHopAddress = oAddress.next(node?.address, address);
    const method = nextHopAddress.protocol.split('/').pop();
    if (method) {
      const methodName = await (node as oToolBase).findMethod(method);
      if (methodName) {
        return {
          nextHopAddress: node.address,
          targetAddress: address,
          requestOverride: resolveRequest,
        };
      }
    }
    return {
      nextHopAddress: address,
      targetAddress: address,
      requestOverride: resolveRequest,
    };
  }
}
