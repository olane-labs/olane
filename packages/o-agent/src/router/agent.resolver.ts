import {
  oAddressResolver,
  oAddress,
  TransportType,
  oCustomTransport,
  oTransport,
  RouteResponse,
  oRouterRequest,
} from '@olane/o-core';
import { v4 as uuidv4 } from 'uuid';
import { JSONRPC_VERSION, oProtocolMethods } from '@olane/o-protocol';
import { AgentResolveRequest } from './agent.resolve-request.js';

/**
 * Address resolver for `AgentNode`.
 *
 * Mirrors `@olane/o-storage`'s `oStorageResolver` pattern verbatim — the
 * agent has ONE canonical address (e.g. `o://brendon/claude-code/1234`)
 * and this resolver dispatches sub-paths under it to methods on the same
 * node. Sub-path conventions for Phase 1:
 *
 *   o://<addr>           → method=route_to_self, no params (delivers to AgentNode default handler)
 *   o://<addr>/inbox     → method=list_inbox
 *   o://<addr>/inbox/<id>→ method=read_message, params={ id: <id> }
 *   o://<addr>/send      → method=send       (caller-side outbound — used when a client speaks
 *                                              "as" this agent; not the receive path)
 *   o://<addr>/receive   → method=receive    (inbound deposit; used by the broker / other agents
 *                                              to drop a message into this agent's inbox)
 *   o://<addr>/drain     → method=drain_inbox
 *   o://<addr>/card      → method=get_card
 *   o://<addr>/status    → method=get_status
 *
 * Resolver registration is per-node, instance-based: `AgentNode` calls
 * `this.router.addResolver(new oAgentResolver(this.address), true)` during
 * its initialize hook. There is no central registry — each AgentNode owns
 * its own resolver. (See ADR 0001 Open Question 1 in olane-labs/o-cli for
 * the source-walk that confirmed this is the canonical pattern.)
 */
export class oAgentResolver extends oAddressResolver {
  /** Method names this resolver knows about — populated below. */
  private static readonly KNOWN_METHODS = new Set<string>([
    'list_inbox',
    'read_message',
    'send',
    'receive',
    'drain_inbox',
    'get_card',
    'get_status',
  ]);

  /** Sub-path → method mapping. Plural sub-paths (`inbox`) → list verb. */
  private static readonly SUB_PATH_TO_METHOD: Record<string, string> = {
    inbox: 'list_inbox',
    send: 'send',
    receive: 'receive',
    drain: 'drain_inbox',
    card: 'get_card',
    status: 'get_status',
  };

  constructor(protected readonly address: oAddress) {
    super(address);
  }

  get supportedTransports(): TransportType[] {
    return [TransportType.CUSTOM];
  }

  get customTransports(): oTransport[] {
    return [new oCustomTransport('/agent')];
  }

  async resolve(request: AgentResolveRequest): Promise<RouteResponse> {
    const { address, node, request: resolveRequest, targetAddress } = request;

    // If the target isn't us (or under us), pass the address along unchanged
    // so the next resolver in the chain (or the leader/network) handles it.
    if (targetAddress.paths.indexOf(node.address.paths) === -1) {
      return {
        nextHopAddress: address,
        targetAddress: targetAddress,
        requestOverride: resolveRequest,
      };
    }

    const { method, params } = this.parseSubPath(address, node);

    this.logger.debug(
      `Agent resolver: ${address.toString()} → ${method}(${JSON.stringify(params)})`,
    );

    const req = new oRouterRequest({
      method: oProtocolMethods.ROUTE,
      params: {
        _connectionId: '',
        _requestMethod: oProtocolMethods.ROUTE,
        address: node.address.toString(),
        payload: {
          method,
          params,
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

  /**
   * Parse a sub-path under the agent's canonical address into a method
   * name and parameter object. Exposed for unit tests.
   */
  parseSubPath(
    incoming: oAddress,
    node: { address: oAddress },
  ): { method: string; params: Record<string, unknown> } {
    // The agent's address is e.g. `o://brendon/claude-code/1234`.
    // Sub-paths land under it: `o://brendon/claude-code/1234/inbox/<msg-id>`.
    // Strip the canonical prefix and look at what remains.
    const incomingPath = incoming.toString();
    const canonical = node.address.toString();

    let suffix = '';
    if (incomingPath.startsWith(canonical)) {
      suffix = incomingPath.slice(canonical.length);
    } else {
      // Defensive — fall back to the full path. Shouldn't hit in practice
      // because the supportsAddress() check above filters it.
      suffix = incomingPath;
    }
    // Normalize: trim leading/trailing slashes, drop the empty case.
    const segments = suffix
      .split('/')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (segments.length === 0) {
      // Bare canonical address — caller wants to talk to the AgentNode
      // directly. Return a sentinel that the receiver treats as the
      // default entry point; in practice the request payload's method
      // (carried via params elsewhere) overrides this.
      return { method: 'route_to_self', params: {} };
    }

    const head = segments[0];
    const mappedMethod = oAgentResolver.SUB_PATH_TO_METHOD[head];

    if (!mappedMethod) {
      // Unknown segment — surface the segment as the method name. Lets
      // future sub-paths fall through naturally if a caller speaks an
      // ahead-of-spec verb.
      return {
        method: head,
        params: this.tailToParams(segments.slice(1)),
      };
    }

    // /inbox/<id>  → read_message with { id }
    if (head === 'inbox' && segments.length >= 2) {
      return {
        method: 'read_message',
        params: { id: segments[1] },
      };
    }

    return {
      method: mappedMethod,
      params: this.tailToParams(segments.slice(1)),
    };
  }

  /**
   * Reduce remaining path segments to a params object. One trailing
   * segment becomes `{ key: <segment> }`; multiple segments become
   * `{ path: <segments[]> }`. Mirrors the o-storage convention of
   * collapsing a single tail into a single-keyed param.
   */
  private tailToParams(tail: string[]): Record<string, unknown> {
    if (tail.length === 0) return {};
    if (tail.length === 1) return { key: tail[0] };
    return { path: tail };
  }
}
