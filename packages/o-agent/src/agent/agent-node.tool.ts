import { oNodeConfig } from '@olane/o-node';
import { oLaneTool } from '@olane/o-lane';
import { oAddress, oRequest } from '@olane/o-core';
import type { ToolResult } from '@olane/o-tool';
import { v4 as uuidv4 } from 'uuid';
import { AgentCard } from '../interfaces/agent-card.js';
import {
  InboxMessage,
  MessagePart,
  TaskState,
} from '../interfaces/inbox-message.js';
import { oAgentResolver } from '../router/agent.resolver.js';
import { AGENT_NODE_METHODS } from '../methods/agent-node.methods.js';

const HEARTBEAT_INTERVAL_MS = 30_000;
const REGISTRY_ADDRESS = 'o://agents';
const DEFAULT_INBOX_BOUND = 256;

export interface AgentNodeConfig extends oNodeConfig {
  /** Capability card advertised to the registry on registration. */
  card: AgentCard;
  /** Bound on the in-memory inbox. Phase-1 default 256. */
  inboxBound?: number;
  /**
   * If set, the AgentNode will register / heartbeat / deregister against
   * `o://agents`. Defaults to `true`. Set false in unit tests where no
   * registry exists.
   */
  autoRegister?: boolean;
}

/**
 * `AgentNode` — one running coding-agent session on the local Olane OS.
 *
 * Address scheme: a SINGLE-segment slug encoding user / kind / session,
 * typically `o://agent-<user>-<kind>-<session-id>`. olane convention:
 * node tools declare exactly ONE path segment in their constructor
 * address. Hierarchical routing happens via child-node registration or
 * in-node sub-path resolvers (see README "Address scheme") — never via
 * multi-segment constructor addresses. After the leader registers the
 * AgentNode under its hierarchy, the effective address is
 * `o://leader/<slug>`. Structured user/kind/sessionId fields are
 * preserved on `card.olane` for filtering and display.
 *
 * Sub-paths (`/inbox`, `/inbox/<id>`, `/send`, `/receive`, `/drain`,
 * `/card`, `/status`) dispatch to methods via the `oAgentResolver`
 * registered in `initialize()`. **The resolver fires inside this node's
 * own process only.** Cross-process callers should use the explicit
 * method-as-param form: `node.use(canonical, { method: 'receive',
 * params: ... })`. See README "Cross-process callers" section.
 *
 * Cross-process daemon usage (the most common pattern): pass
 * `network.listeners: ['/ip4/0.0.0.0/tcp/0']` so libp2p binds a port the
 * leader can dial back through during routing. In-process AgentNodes do
 * NOT need this — see README "Cross-process daemon usage".
 *
 * Inbox is in-memory in Phase 1 (bounded ring buffer). Persistent
 * overflow is deferred to Phase 2 per ADR.
 */
export class AgentNode extends oLaneTool {
  private inbox: InboxMessage[] = [];
  private inboxBound: number;
  private card: AgentCard;
  private autoRegister: boolean;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(config: AgentNodeConfig) {
    super({
      ...config,
      address: config.address || new oAddress(config.card.url),
      // ADR 0001 D3 mandates flat per-session addresses
      // (`o://<user>/<kind>/<session-id>`), which are "nested" in the
      // o-core sense. The default validator blocks them in
      // constructors. We opt out — the address comes from the agent
      // card (validated at the registry layer), not from a parent
      // node's hierarchy.
      _allowNestedAddress: true,
      description:
        config.card.description ||
        `Olane agent session: ${config.card.olane.kind}/${config.card.olane.sessionId}`,
      methods: AGENT_NODE_METHODS,
    });
    this.card = config.card;
    this.inboxBound = config.inboxBound ?? DEFAULT_INBOX_BOUND;
    this.autoRegister = config.autoRegister ?? true;
  }

  async initialize(): Promise<void> {
    await super.initialize();
    // Register our resolver with priority so it preempts the default
    // node/method resolvers — sub-paths under our canonical address must
    // route to us, not bubble out to the leader. Matches the
    // `oStorageResolver` registration site in @olane/o-storage.
    (this as any).router.addResolver(new oAgentResolver(this.address), true);
  }

  async start(): Promise<void> {
    await super.start();
    if (!this.autoRegister) return;

    try {
      await this.use(new oAddress(REGISTRY_ADDRESS), {
        method: 'register',
        params: {
          address: this.address.toString(),
          card: this.card,
          registeringPid: process.pid,
        },
      });
      this.logger.debug(`Registered with ${REGISTRY_ADDRESS}`);
    } catch (err) {
      // Registry might not be running (e.g. dev OS without the registry
      // mount yet). Log + continue — the node is still usable for
      // direct calls; discovery just doesn't see it.
      this.logger.warn(
        `Could not register with ${REGISTRY_ADDRESS} (continuing): ${err}`,
      );
    }

    this.heartbeatTimer = setInterval(() => {
      this.use(new oAddress(REGISTRY_ADDRESS), {
        method: 'heartbeat',
        params: { address: this.address.toString() },
      }).catch((err) =>
        this.logger.debug(`Heartbeat to ${REGISTRY_ADDRESS} failed: ${err}`),
      );
    }, HEARTBEAT_INTERVAL_MS);
    this.heartbeatTimer.unref?.();
  }

  async stop(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.autoRegister) {
      try {
        await this.use(new oAddress(REGISTRY_ADDRESS), {
          method: 'deregister',
          params: { address: this.address.toString() },
        });
      } catch (err) {
        this.logger.debug(
          `Deregister from ${REGISTRY_ADDRESS} failed (continuing stop): ${err}`,
        );
      }
    }
    await super.stop();
  }

  // ── Tool methods ────────────────────────────────────────────────────

  async _tool_get_card(_request: oRequest): Promise<ToolResult> {
    return { card: this.card };
  }

  async _tool_get_status(_request: oRequest): Promise<ToolResult> {
    return {
      address: this.address.toString(),
      inboxDepth: this.inbox.length,
      inboxBound: this.inboxBound,
      kind: this.card.olane.kind,
      sessionId: this.card.olane.sessionId,
      registeredAt: this.card.olane.registeredAt,
    };
  }

  async _tool_list_inbox(_request: oRequest): Promise<ToolResult> {
    return {
      count: this.inbox.length,
      messages: this.inbox.map((m) => ({
        id: m.id,
        from: m.from,
        sentAt: m.sentAt,
        taskState: m.task?.state,
        correlationId: m.correlationId,
      })),
    };
  }

  async _tool_read_message(request: oRequest): Promise<ToolResult> {
    const { id } = request.params as any as { id: string };
    if (!id) throw new Error('read_message: `id` is required');
    const message = this.inbox.find((m) => m.id === id);
    if (!message) {
      return { found: false, id };
    }
    return { found: true, message };
  }

  async _tool_send(request: oRequest): Promise<ToolResult> {
    const { to, parts, task_id, task_state, correlation_id } =
      request.params as any as {
        to: string;
        parts: MessagePart[];
        task_id?: string;
        task_state?: TaskState;
        correlation_id?: string;
      };

    if (!to || !Array.isArray(parts) || parts.length === 0) {
      throw new Error('send: `to` and non-empty `parts[]` are required');
    }

    const envelope: InboxMessage = {
      id: `msg_${uuidv4()}`,
      from: this.address.toString(),
      to,
      sentAt: new Date().toISOString(),
      parts,
      task: task_id ? { id: task_id, state: task_state ?? TaskState.SUBMITTED } : undefined,
      correlationId: correlation_id,
    };

    // Drop into the recipient's inbox via /receive on its canonical
    // address. The recipient's oAgentResolver dispatches /receive to
    // _tool_receive on its AgentNode.
    const result = await this.use(
      new oAddress(`${to}/receive`),
      {
        method: 'receive',
        params: { message: envelope },
      },
    );

    return {
      delivered: !!(result as any)?.result?.success,
      messageId: envelope.id,
      sentAt: envelope.sentAt,
    };
  }

  async _tool_receive(request: oRequest): Promise<ToolResult> {
    const { message } = request.params as any as { message: InboxMessage };
    if (!message?.id || !message?.from || !message?.to) {
      throw new Error(
        'receive: `message` envelope with id/from/to is required',
      );
    }

    // Bounded ring — drop the oldest message if we're over the bound.
    // Persistent overflow is Phase 2 per ADR.
    if (this.inbox.length >= this.inboxBound) {
      const dropped = this.inbox.shift();
      this.logger.warn(
        `Inbox full (bound=${this.inboxBound}); dropped oldest message ${dropped?.id}`,
      );
    }
    this.inbox.push(message);
    this.logger.debug(`Received message ${message.id} from ${message.from}`);
    return { ok: true, messageId: message.id, inboxDepth: this.inbox.length };
  }

  async _tool_drain_inbox(_request: oRequest): Promise<ToolResult> {
    const drained = this.inbox.slice();
    this.inbox = [];
    return {
      count: drained.length,
      messages: drained,
    };
  }

  // ── Test helpers (not exposed via tool methods) ─────────────────────

  /** Direct inbox push for unit tests — bypasses the receive method. */
  _testOnlyEnqueue(message: InboxMessage): void {
    this.inbox.push(message);
  }

  /** Direct inbox snapshot for unit tests. */
  _testOnlyInboxSnapshot(): InboxMessage[] {
    return this.inbox.slice();
  }
}
