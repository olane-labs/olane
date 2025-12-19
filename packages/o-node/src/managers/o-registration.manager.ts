import {
  oObject,
  oAddress,
  NodeType,
  RestrictedAddresses,
} from '@olane/o-core';
import { IRegistrableNode } from '../interfaces/i-registrable-node.js';
import { oNodeAddress } from '../router/o-node.address.js';

export type RegistrationState =
  | 'not_registered'
  | 'registering'
  | 'registered'
  | 'failed';

export interface RegistrationStatus {
  parent: RegistrationState;
  leader: RegistrationState;
  parentError?: string;
  leaderError?: string;
}

/**
 * Registration Manager
 *
 * Manages the registration state for parent and leader connections.
 * Provides stateful tracking and prevents concurrent registration attempts.
 *
 * State Transitions:
 * - not_registered → registering (when starting registration)
 * - registering → registered (on success)
 * - registering → failed (on error)
 * - failed → registering (on retry)
 * - registered → not_registered (on explicit reset)
 */
export class oRegistrationManager extends oObject {
  private parentState: RegistrationState = 'not_registered';
  private leaderState: RegistrationState = 'not_registered';
  private parentError?: Error;
  private leaderError?: Error;

  constructor(private node: IRegistrableNode) {
    super();
  }

  /**
   * Check if parent registration can be attempted
   * Returns false if already registering or registered
   */
  canRegisterParent(): boolean {
    return (
      this.parentState !== 'registering' && this.parentState !== 'registered'
    );
  }

  /**
   * Check if leader registration can be attempted
   * Returns false if already registering or registered
   */
  canRegisterLeader(): boolean {
    return (
      this.leaderState !== 'registering' && this.leaderState !== 'registered'
    );
  }

  /**
   * Check if parent is currently registered
   */
  isParentRegistered(): boolean {
    return this.parentState === 'registered';
  }

  /**
   * Check if leader is currently registered
   */
  isLeaderRegistered(): boolean {
    return this.leaderState === 'registered';
  }

  /**
   * Check if both parent and leader are registered
   */
  isFullyRegistered(): boolean {
    // For leader nodes, only check leader state
    if (this.node.type === NodeType.LEADER) {
      return true;
    }

    // For nodes without parent, only check leader
    if (!this.node.config.parent) {
      return this.isLeaderRegistered();
    }

    // For regular nodes, check both
    return this.isParentRegistered() && this.isLeaderRegistered();
  }

  /**
   * Reset parent registration state to not_registered
   */
  resetParentState(): void {
    this.logger.debug('Resetting parent registration state');
    this.parentState = 'not_registered';
    this.parentError = undefined;
  }

  /**
   * Reset leader registration state to not_registered
   */
  resetLeaderState(): void {
    this.logger.debug('Resetting leader registration state');
    this.leaderState = 'not_registered';
    this.leaderError = undefined;
  }

  /**
   * Reset all registration states
   */
  resetAll(): void {
    this.resetParentState();
    this.resetLeaderState();
  }

  /**
   * Get current registration status
   */
  getStatus(): RegistrationStatus {
    return {
      parent: this.parentState,
      leader: this.leaderState,
      parentError: this.parentError?.message,
      leaderError: this.leaderError?.message,
    };
  }

  /**
   * Register with parent node
   * Manages state transitions and prevents concurrent attempts
   */
  async registerParent(): Promise<void> {
    if (this.node.type === NodeType.LEADER) {
      this.logger.debug('Skipping parent registration, node is leader');
      return;
    }

    if (!this.node.parent) {
      this.logger.warn('No parent configured, skipping registration');
      return;
    }

    // Check if we can register (not already registering or registered)
    if (!this.canRegisterParent()) {
      this.logger.debug(
        `Cannot register parent, current state: ${this.parentState}`,
      );
      return;
    }

    this.logger.info('Registering with parent...', {
      parent: this.node.parent.toString(),
      currentState: this.parentState,
    });

    // Transition to registering state
    this.parentState = 'registering';
    this.parentError = undefined;

    try {
      // Check if parent has transports
      if (!this.node.parent?.libp2pTransports?.length) {
        this.logger.debug(
          'Parent has no transports, waiting for reconnection & leader ack',
        );
        if (this.node.parent?.toString() === oAddress.leader().toString()) {
          this.node.parent.setTransports(
            this.node.leader?.libp2pTransports || [],
          );
        } else {
          this.logger.debug('Waiting for parent and reconnecting...');
          // Reset state since we're delegating to reconnection manager
          this.parentState = 'not_registered';
          if (this.node.reconnectionManager) {
            await this.node.reconnectionManager.waitForParentAndReconnect();
          } else {
            throw new Error('Parent has no transports and no reconnection manager available');
          }
          // If we get here, reconnection was successful and registration is complete
          return;
        }
      }

      // Register with parent via child_register call
      await this.node.use(new oNodeAddress(this.node.config.parent!.value), {
        method: 'child_register',
        params: {
          address: this.node.address.toString(),
          transports: this.node.transports.map((t) => t.toString()),
          peerId: this.node.peerId.toString(),
          _token: this.node.config.joinToken,
        },
      });

      // Set keep-alive tag for parent connection
      await this.node.setKeepAliveTag(this.node.parent as oNodeAddress);

      // Add parent to hierarchy manager
      this.node.hierarchyManager.addParent(this.node.parent);

      // Success - transition to registered state
      this.parentState = 'registered';
      this.logger.info('Successfully registered with parent', {
        parent: this.node.parent.toString(),
      });
    } catch (error) {
      // Failure - transition to failed state
      this.parentState = 'failed';
      this.parentError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to register with parent:', {
        parent: this.node.parent?.toString(),
        error: this.parentError.message,
      });
      throw error;
    }
  }

  /**
   * Register with leader's global registry
   * Manages state transitions and prevents concurrent attempts
   */
  async registerLeader(): Promise<void> {
    if (!this.node.leader) {
      this.logger.warn('No leader defined, skipping registration');
      return;
    }

    // Check if we can register (not already registering or registered)
    if (!this.canRegisterLeader()) {
      this.logger.debug(
        `Cannot register leader, current state: ${this.leaderState}`,
      );
      return;
    }

    this.logger.info('Registering with leader registry...', {
      leader: this.node.leader.toString(),
      currentState: this.leaderState,
    });

    // Transition to registering state
    this.leaderState = 'registering';
    this.leaderError = undefined;

    try {
      const address = oAddress.registry();

      const params = {
        method: 'commit',
        params: {
          peerId: this.node.peerId.toString(),
          address: this.node.address.toString(),
          protocols: this.node.protocols,
          transports: this.node.transports,
          staticAddress: this.node.staticAddress.toString(),
        },
      };

      await this.node.use(address, params);

      // Set keep-alive tag for leader connection
      await this.node.setKeepAliveTag(this.node.leader as oNodeAddress);

      // Success - transition to registered state
      this.leaderState = 'registered';
      this.logger.info('Successfully registered with leader registry');
    } catch (error) {
      // Failure - transition to failed state
      this.leaderState = 'failed';
      this.leaderError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to register with leader:', {
        leader: this.node.leader?.toString(),
        error: this.leaderError.message,
      });
      throw error;
    }
  }
}
