import {
  oAddress,
  oAddressResolver,
  oCore,
  oCustomTransport,
  oHierarchyManager,
  oTransport,
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

  async resolve(address: oAddress, node: oCore): Promise<RouteResponse> {
    const nextHopAddress = oAddress.next(node.address, address);
    const method = nextHopAddress.protocol.split('/').pop();
    if (method) {
      const methodName = await (node as oToolBase).findMethod(method);
      if (methodName) {
        return {
          nextHopAddress: node.address,
          targetAddress: address,
        };
      }
    }
    return {
      nextHopAddress: address,
      targetAddress: address,
    };
  }
}
