import {
  oAddress,
  NodeState,
  oNotificationManager,
  oRequest,
} from '@olane/o-core';
import { oNodeAddress } from '../router/o-node.address.js';
import { oNodeConfig } from './o-node.config.js';
import { oRegistrationManager } from '../managers/o-registration.manager.js';

/**
 * Interface for nodes that support reconnection management.
 * This interface defines the contract that oReconnectionManager needs
 * to perform reconnection operations without creating a circular dependency.
 */
export interface IReconnectableNode {
  /**
   * The node's configuration
   */
  config: oNodeConfig;

  /**
   * The node's current address
   */
  address: oNodeAddress;

  /**
   * The node's current state
   */
  state: NodeState;

  /**
   * The notification manager for subscribing to events
   */
  notificationManager: oNotificationManager;

  /**
   * The registration manager for tracking registration state
   */
  registrationManager: oRegistrationManager;

  /**
   * Register with the parent node
   */
  registerParent(): Promise<void>;

  /**
   * Register with the leader's global registry
   */
  registerLeader(): Promise<void>;

  /**
   * Register with the leader's global registry
   */
  register(): Promise<void>;

  useSelf(request?: any): Promise<any>;

  /**
   * Execute a method on another node
   */
  use(
    address: oAddress,
    data?: {
      method?: string;
      params?: { [key: string]: any };
      id?: string;
    },
  ): Promise<any>;
}
