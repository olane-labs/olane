import {
  oAddress,
  oAddressResolver,
  oCore,
  oCustomTransport,
  oHierarchyManager,
  oTransport,
} from '@olane/o-core';
import { oToolBase } from '../../o-tool.base';

export class oMethodResolver extends oAddressResolver {
  constructor(protected readonly address: oAddress) {
    super(address);
  }

  get customTransports(): oTransport[] {
    return [new oCustomTransport('/method')];
  }

  async resolve(address: oAddress, node: oCore): Promise<oAddress> {
    const nextHopAddress = oAddress.next(node.address, address);
    const method = nextHopAddress.protocol.split('/').pop();
    if (method) {
      const methodName = (node as oToolBase).findMethod(method);
      if (methodName) {
        return node.address;
      }
    }
    return address;
  }
}
