import { oNodeTool } from '@olane/o-node';
import type { oRequest } from '@olane/o-core';
import { oNodeAddress } from '@olane/o-node';
import { oLimitedConnectionManager } from '../../src/connection/o-limited-connection-manager.js';
import { StreamManagerEvent } from '@olane/o-node';
import { oLimitedTool } from '../../src/o-limited.tool.js';

/**
 * Test tool that uses limited connections
 * Tracks events and call counts for verification
 */
export class LimitedTestTool extends oLimitedTool {
  public callCount = 0;
  public streamManagerEvents: Array<{ type: string; data: any }> = [];
  private eventListenersSetup = false;

  async initialize(): Promise<void> {
    await super.initialize();
    // Use limited connection manager
    this.connectionManager = new oLimitedConnectionManager({
      p2pNode: this.p2pNode,
      runOnLimitedConnection: true,
    });
  }

  /**
   * Set up event listeners for stream manager events
   * Call this after first connection is established
   */
  setupEventListeners(connection: any): void {
    if (this.eventListenersSetup || !connection?.streamManager) {
      return;
    }

    this.eventListenersSetup = true;

    // Listen to all stream manager events
    connection.streamManager.on(
      StreamManagerEvent.ReaderStarted,
      (data: any) => {
        this.streamManagerEvents.push({
          type: 'reader-started',
          data,
        });
      },
    );

    connection.streamManager.on(
      StreamManagerEvent.ReaderFailed,
      (data: any) => {
        this.streamManagerEvents.push({
          type: 'reader-failed',
          data,
        });
      },
    );

    connection.streamManager.on(
      StreamManagerEvent.ReaderRecovered,
      (data: any) => {
        this.streamManagerEvents.push({
          type: 'reader-recovered',
          data,
        });
      },
    );

    connection.streamManager.on(
      StreamManagerEvent.StreamIdentified,
      (data: any) => {
        this.streamManagerEvents.push({
          type: 'stream-identified',
          data,
        });
      },
    );
  }

  /**
   * Simple echo method
   */
  async _tool_echo(request: oRequest): Promise<any> {
    this.callCount++;
    return {
      message: request.params.message,
      nodeAddress: this.address.toString(),
      callCount: this.callCount,
      timestamp: Date.now(),
    };
  }

  /**
   * Method that calls back to the requester
   * Used to test bidirectional communication
   */
  async _tool_reverse_echo(request: oRequest): Promise<any> {
    const callerAddress = request.params.callerAddress as oNodeAddress;

    const response = await this.use(callerAddress, {
      method: 'echo',
      params: { message: 'reverse-response' },
    });

    return {
      original: request.params.message,
      reversed: response.result,
    };
  }

  /**
   * Get all reader-related events
   */
  getReaderEvents(): Array<{ type: string; data: any }> {
    return this.streamManagerEvents.filter((e) => e.type.includes('reader'));
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
