import {
  oAddress,
  oCustomTransport,
  oError,
  oErrorCodes,
  oRequest,
  oRouterRequest,
  oTransport,
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
        this.logger.debug('Route to self, calling tool...');
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
  };
}
