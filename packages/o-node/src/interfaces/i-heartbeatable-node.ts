import { oNotificationManager } from '@olane/o-core';
import { Libp2p } from '@olane/o-config';
import { oNodeAddress } from '../router/o-node.address.js';

/**
 * Interface for nodes that support connection heartbeat monitoring.
 * This interface defines the contract that oConnectionHeartbeatManager needs
 * to access live hierarchy state without holding stale references.
 */
export interface IHeartbeatableNode {
  /**
   * The node's current address
   */
  address: oNodeAddress;

  /**
   * The notification manager for emitting heartbeat events
   */
  notificationManager: oNotificationManager;

  /**
   * The underlying libp2p node for ping operations
   */
  p2pNode: Libp2p;

  /**
   * The current parent address (with live transport updates)
   * @returns Parent address or null if no parent
   */
  parent: oNodeAddress | null;

  /**
   * Get the current list of leader addresses
   * @returns Array of leader addresses (empty if this node is the leader)
   */
  getLeaders(): oNodeAddress[];

  /**
   * Get the current list of parent addresses
   * @returns Array of parent addresses
   */
  getParents(): oNodeAddress[];

  /**
   * Get the current list of child addresses
   * @returns Array of child addresses
   */
  getChildren(): oNodeAddress[];

  /**
   * Remove a child from the hierarchy
   * @param childAddress The address of the child to remove
   */
  removeChild(childAddress: oNodeAddress): void;

  use(param1: any, param2: any): Promise<any>;
}
