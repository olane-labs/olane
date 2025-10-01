import {
  oAddress,
  oCustomTransport,
  oTransport,
  ResolveRequest,
  RouteResponse,
} from '@olane/o-core';
import { oIntelligenceResolver } from './o-intelligence.resolver';
import { HostModelProvider } from '../enums/host-model-provider.enum';
import { oNodeTransport } from '@olane/o-node/dist/src/router/o-node.transport';

export class oIntelligenceOlaneResolver extends oIntelligenceResolver {
  constructor(protected readonly address: oAddress) {
    super(address);
  }

  get customTransports(): oTransport[] {
    return [new oCustomTransport('/intelligence/olane')];
  }

  async resolve(resolveRequest: ResolveRequest): Promise<RouteResponse> {
    const { address, node, request, targetAddress } = resolveRequest;
    if (!request) {
      return {
        nextHopAddress: address,
        targetAddress: targetAddress,
        requestOverride: request,
      };
    }
    const {
      provider: hostingProvider,
      options,
      modelProvider,
    } = await this.getHostingProvider(node);

    // forward to olane
    if (hostingProvider === HostModelProvider.OLANE) {
      const nextAddress = new oAddress(options.address + '/' + modelProvider, [
        new oNodeTransport(
          process.env.OLANE_ADDRESS || '/dns4/leader.olane.com/tcp/4000/tls/ws',
        ),
      ]);
      return {
        nextHopAddress: nextAddress,
        targetAddress: targetAddress,
        requestOverride: request,
      };
    }
    return {
      nextHopAddress: address,
      targetAddress: targetAddress,
      requestOverride: request,
    };
  }
}
