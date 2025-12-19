import { oAddress, NodeType } from '@olane/o-core';
import { PeerId } from '@olane/o-config';
import { oNodeAddress } from '../router/o-node.address.js';
import { oNodeConfig } from './o-node.config.js';
import { oNodeTransport } from '../router/o-node.transport.js';
import { oNodeHierarchyManager } from '../o-node.hierarchy-manager.js';

/**
 * Interface for nodes that support registration management.
 * This interface defines the contract that oRegistrationManager needs
 * to perform registration operations.
 */
export interface IRegistrableNode {
  /**
   * The node's configuration
   */
  config: oNodeConfig;

  /**
   * The node's current address
   */
  address: oNodeAddress;

  /**
   * The node's static address (without dynamic transports)
   */
  staticAddress: oNodeAddress;

  /**
   * The leader address (null for leader nodes)
   */
  leader: oNodeAddress | null;

  /**
   * The parent address (null for root nodes)
   */
  parent: oNodeAddress | null;

  /**
   * The node type (LEADER, CLIENT, etc.)
   */
  type: NodeType;

  /**
   * The node's peer ID
   */
  peerId: PeerId;

  /**
   * The node's current transports
   */
  transports: oNodeTransport[];

  /**
   * The node's protocols
   */
  protocols: string[];

  /**
   * Hierarchy manager for tracking parent/child/leader relationships
   */
  hierarchyManager: oNodeHierarchyManager;

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

  /**
   * Set keep-alive tag for a peer connection
   */
  setKeepAliveTag(address: oNodeAddress): Promise<void>;
}
