import {
  oAddress,
  oCustomTransport,
  oError,
  oErrorCodes,
  oRequest,
  oRouterRequest,
  oTransport,
  oNotificationEvent,
} from '@olane/o-core';
import { oToolConfig } from './interfaces/tool.interface.js';
import { oToolBase } from './o-tool.base.js';
import { ToolResult } from './interfaces/tool-result.interface.js';
import { Stream } from '@olane/o-config';

/**
 * oTool is a mixin that extends the base class and implements the oTool interface
 * @param Base - The base class to extend
 * @returns A new class that extends the base class and implements the oTool interface
 */
export function oTool<T extends new (...args: any[]) => oToolBase>(Base: T): T {
  return class extends Base {
    constructor(...args: any[]) {
      super(...args);
      const config = args[0] as oToolConfig & { address: oAddress };
    }

    async _tool_stop(request: oRequest): Promise<any> {
      this.logger.debug('Stopping tool: ', request.params);
      this.stop();
      return {
        message: 'Tool stopped',
      };
    }

    async _tool_handshake(handshake: oRequest): Promise<any> {
      throw new oError(
        oErrorCodes.NOT_IMPLEMENTED,
        'Handshake not implemented',
      );
    }

    /**
     * Where all intents go to be resolved.
     * @param request
     * @returns
     */
    async _tool_intent(request: oRequest): Promise<any> {
      throw new oError(oErrorCodes.NOT_IMPLEMENTED, 'Intent not implemented');
    }

    async _tool_hello_world(request: oRequest): Promise<ToolResult> {
      return {
        message: 'Hello, world!',
      };
    }

    async _tool_index_network(request: oRequest): Promise<ToolResult> {
      this.logger.debug('Indexing network...');
      // collect all the information from the child nodes
      let result: ToolResult = {};
      try {
        result = await this.index();
        // index children
        const children = this.hierarchyManager.getChildren();
        for (const child of children) {
          await this.useChild(child, {
            method: 'index_network',
            params: {},
          });
        }
        this.logger.debug('Node + children indexed!');
      } catch (error) {
        this.logger.error('Failed to index node:', error);
        throw error;
      }

      return result;
    }

    async _tool_ping(request: oRequest): Promise<ToolResult> {
      return {
        message: 'Pong!',
      };
    }

    async _tool_get_metrics(request: oRequest): Promise<ToolResult> {
      return {
        address: this.address.toString(),
        successCount: this.metrics.successCount,
        errorCount: this.metrics.errorCount,
        activeRequests: this.requestManager.activeRequests.length,
        state: this.state,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        children: this.hierarchyManager.getChildren().map((c) => c.toString()),
      };
    }

    async _tool_route(
      request: oRouterRequest & { stream?: Stream },
    ): Promise<any> {
      if (
        request.params.address === this.address.toString() ||
        request.params.address === this.staticAddress.toString()
      ) {
        this.logger.verbose('Route to self, calling tool...');
        const { payload }: any = request.params;
        return this.callMyTool(
          new oRequest({
            method: payload.method,
            params: payload.params,
            id: request.id,
          }),
          request.stream,
        );
      }
      return this.router.route(request, this);
    }

    async _tool_child_register(request: oRequest): Promise<any> {
      throw new oError(
        oErrorCodes.NOT_IMPLEMENTED,
        'Child register not implemented',
      );
    }

    // TODO: implement this
    async _tool_cancel_request(request: oRequest): Promise<ToolResult> {
      const { requestId } = request.params;
      // delete this.requestManager.remove(requestId as string);
      return {
        message: 'Request cancelled',
      };
    }

    /**
     * Emit a notification event to all subscribers
     * Can be called remotely to trigger events on this node
     */
    async _tool_notify(request: oRequest): Promise<ToolResult> {
      const { eventType, eventData } = request.params;

      if (!eventType) {
        throw new oError(
          oErrorCodes.MISSING_PARAMETERS,
          'eventType is required',
        );
      }

      this.logger.debug(`Received remote notification: ${eventType}`);

      // Create a generic notification event from the data
      if (this.notificationManager) {
        // Create a custom event class
        class CustomNotificationEvent extends oNotificationEvent {
          constructor(type: string, source: oAddress, data: any) {
            super({
              type,
              source,
              metadata: data || {},
            });
          }
        }

        // Emit as a custom event with the provided data
        const sourceAddress = request.params.source
          ? new oAddress(request.params.source as string)
          : new oAddress('o://unknown');
        const event = new CustomNotificationEvent(
          eventType as string,
          sourceAddress,
          eventData,
        );

        this.notificationManager.emit(event);
      }

      return {
        success: true,
        message: `Notification ${eventType} emitted`,
      };
    }

    /**
     * Get connection health status (for nodes with heartbeat monitoring)
     */
    async _tool_get_connection_health(request: oRequest): Promise<ToolResult> {
      // Check if this node has a connectionHeartbeatManager
      const heartbeatManager = (this as any).connectionHeartbeatManager;

      if (!heartbeatManager) {
        return {
          enabled: false,
          message: 'Connection heartbeat not enabled on this node',
        };
      }

      const healthStatus = heartbeatManager.getHealthStatus();

      return {
        enabled: true,
        connections: healthStatus.map((h: any) => ({
          address: h.address.toString(),
          peerId: h.peerId,
          status: h.status,
          lastSuccessfulPing: new Date(h.lastSuccessfulPing).toISOString(),
          consecutiveFailures: h.consecutiveFailures,
          averageLatencyMs: Math.round(h.averageLatency),
        })),
      };
    }

    /**
     * Get leader health status and retry configuration
     */
    async _tool_get_leader_health(request: oRequest): Promise<ToolResult> {
      const heartbeatManager = (this as any).connectionHeartbeatManager;
      const leaderRequestWrapper = (this as any).leaderRequestWrapper;

      if (!heartbeatManager && !leaderRequestWrapper) {
        return {
          enabled: false,
          message: 'Leader monitoring not available on this node',
        };
      }

      const result: any = {
        heartbeat: { enabled: false },
        retry: { enabled: false },
      };

      // Get heartbeat health for leader
      if (heartbeatManager) {
        const config = heartbeatManager.getConfig();
        result.heartbeat.enabled = config.checkLeader;

        if (config.checkLeader) {
          const healthStatus = heartbeatManager.getHealthStatus();
          const leaderHealth = healthStatus.find((h: any) =>
            h.address.toString().includes('leader'),
          );

          if (leaderHealth) {
            result.heartbeat.status = leaderHealth.status;
            result.heartbeat.lastSuccessfulPing = new Date(
              leaderHealth.lastSuccessfulPing,
            ).toISOString();
            result.heartbeat.consecutiveFailures =
              leaderHealth.consecutiveFailures;
            result.heartbeat.averageLatencyMs = Math.round(
              leaderHealth.averageLatency,
            );
          } else {
            result.heartbeat.status = 'not_monitored';
          }
        }
      }

      // Get retry configuration
      if (leaderRequestWrapper) {
        const retryConfig = leaderRequestWrapper.getConfig();
        result.retry = {
          enabled: retryConfig.enabled,
          maxAttempts: retryConfig.maxAttempts,
          baseDelayMs: retryConfig.baseDelayMs,
          maxDelayMs: retryConfig.maxDelayMs,
          timeoutMs: retryConfig.timeoutMs,
        };
      }

      return result;
    }
  };
}
