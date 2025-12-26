import { oNodeTool } from '@olane/o-node';
import type { oRequest } from '@olane/o-core';
import { oNodeAddress } from '@olane/o-node';
import { StreamManagerEvent } from '@olane/o-node';

/**
 * Standard receiver tool (uses base connection manager)
 * Tracks received requests and identified streams
 */
export class ReceiverTestTool extends oNodeTool {
  public receivedRequests: oRequest[] = [];
  public identifiedStreams: Array<{ streamId: string; role: string }> = [];
  private eventListenersSetup = false;

  constructor(config: any) {
    super(config);
  }

  /**
   * Set up event listeners for stream identification
   * Call this after tool is started
   */
  setupStreamListeners(connection: any): void {
    if (this.eventListenersSetup || !connection?.streamManager) {
      return;
    }

    this.eventListenersSetup = true;

    // Listen for stream identification events
    connection.streamManager.on(
      StreamManagerEvent.StreamIdentified,
      (data: any) => {
        this.identifiedStreams.push({
          streamId: data.streamId,
          role: data.role,
        });
      },
    );
  }

  /**
   * Simple echo method
   */
  async _tool_echo(request: oRequest): Promise<any> {
    this.receivedRequests.push(request);
    return {
      message: request.params.message,
      nodeAddress: this.address.toString(),
      requestCount: this.receivedRequests.length,
      timestamp: Date.now(),
    };
  }

  /**
   * Method that calls back to the caller
   * Tests receiver → caller communication
   */
  async _tool_call_caller(request: oRequest): Promise<any> {
    this.receivedRequests.push(request);

    const callerAddress = request.params.callerAddress as oNodeAddress;

    // Call back to the caller
    const response = await this.use(callerAddress, {
      method: 'echo',
      params: { message: 'from-receiver' },
    });

    return {
      callerResponse: response.result,
      timestamp: Date.now(),
    };
  }

  /**
   * Get the first connection (for accessing stream manager)
   */
  getFirstConnection(): any {
    const firstEntry = Array.from(
      (this.connectionManager as any)?.cachedConnections?.values() || [],
    );
    return firstEntry?.[0];
  }
}
