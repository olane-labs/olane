/**
 * oLaneStorageManager
 *
 * Handles all storage operations for oLane instances including:
 * - CID generation and caching
 * - Serialization
 * - Persistence to storage
 * - Replay from storage
 * - Config persistence for startup
 */

import { oAddress, oError, oErrorCodes, NodeState } from '@olane/o-core';
import { CID } from 'multiformats';
import * as json from 'multiformats/codecs/json';
import { sha256 } from 'multiformats/hashes/sha2';
import {
  oCapabilityResult,
  oCapabilityType,
  oCapabilityConfig,
} from '../capabilities/index.js';

// Forward declaration to avoid circular dependency
type oLane = any;

export class oLaneStorageManager {
  private cid: CID | undefined;
  private lane: oLane;

  constructor(lane: oLane) {
    this.lane = lane;
  }

  /**
   * Generate the input object for CID creation
   * @returns Object containing intent, address, and context
   */
  generateCIDInput(): any {
    return {
      intent: this.lane.config.intent.toString(),
      address: this.lane.config.caller?.toString(),
      context: this.lane.config.context?.toString() || '',
    };
  }

  /**
   * Serialize the lane to JSON
   * @returns Serialized lane object
   */
  serialize(): any {
    return {
      config: this.generateCIDInput(),
      sequence: this.lane.sequence,
      result: this.lane.result,
    };
  }

  /**
   * Generate or retrieve cached CID for this lane
   * @returns Content Identifier (CID) for this lane
   */
  async generateCID(): Promise<CID> {
    if (this.cid) {
      return this.cid;
    }
    const bytes = json.encode(this.generateCIDInput());
    const hash = await sha256.digest(bytes);
    const cid = CID.create(1, json.code, hash);
    this.cid = cid;
    return cid;
  }

  /**
   * Store the lane to persistent storage
   * @returns CID of the stored lane
   * @throws Error if node is not in valid state
   */
  async save(): Promise<CID> {
    this.lane.logger.debug('Storing lane...');
    const cid = await this.generateCID();

    if (this.lane.node.state !== NodeState.RUNNING) {
      throw new oError(
        oErrorCodes.INVALID_STATE,
        'Node is not in a valid state to store a lane',
      );
    }

    const params = {
      key: cid.toString(),
      value: JSON.stringify(this.serialize()),
    };

    this.lane.logger.debug('Storing lane params: ', params);
    await this.lane.node.use(oAddress.lane(), {
      method: 'put',
      params: params,
    });

    return cid;
  }

  /**
   * Persist lane CID to config storage for startup replay
   * @param cid Content Identifier of the lane
   * @param response Capability result containing addresses to index
   */
  async persistToConfig(cid: CID, response?: oCapabilityResult): Promise<void> {
    this.lane.logger.debug(
      'Lane marked for persistence (auto-triggered by tool response or explicitly set), saving to config...',
    );

    try {
      // Get the OS instance name from the node's system name
      const systemName =
        (this.lane.node.config as any).systemName || 'default-os';

      await this.lane.node.use(new oAddress('o://os-config'), {
        method: 'add_lane_to_config',
        params: {
          osName: systemName,
          cid: cid.toString(),
        },
      });

      // Index any addresses returned in the response
      const data = response?.result;
      if (data?.addresses_to_index) {
        for (const address of data.addresses_to_index) {
          this.lane.logger.debug('Indexing address: ', address.toString());
          await this.lane.node
            .use(new oAddress(address), {
              method: 'index_network',
              params: {},
            })
            .catch((error: any) => {
              this.lane.logger.error('Error indexing address: ', error);
            });
        }
      }

      this.lane.logger.debug(
        'Lane CID added to startup config via o://os-config',
      );
    } catch (error) {
      this.lane.logger.error('Failed to add lane to startup config: ', error);
      throw error;
    }
  }

  /**
   * Replay a stored lane from storage by CID
   * This method loads a lane's execution sequence and replays it to restore network state
   * @param cid Content Identifier of the stored lane
   * @returns Final capability result from replay
   */
  async replay(cid: string): Promise<oCapabilityResult | undefined> {
    this.lane.logger.debug('Replaying lane from CID: ', cid);

    try {
      // Load the lane data from storage
      const laneData = await this.lane.node.use(oAddress.lane(), {
        method: 'get',
        params: { key: cid },
      });

      if (!laneData || !laneData.result) {
        throw new Error(`Lane not found in storage for CID: ${cid}`);
      }

      const data = laneData.result.data as any;
      const storedLane = JSON.parse(data.value);

      // Validate stored lane structure
      if (!storedLane.sequence || !Array.isArray(storedLane.sequence)) {
        throw new Error('Invalid lane data: missing or invalid sequence');
      }

      // Iterate through the stored sequence and replay capabilities
      for (const sequenceItem of storedLane.sequence) {
        const capabilityType = sequenceItem.type;

        // Determine if this capability should be replayed
        if (this.shouldReplayCapability(capabilityType)) {
          this.lane.logger.debug(`Replaying capability: ${capabilityType}`);

          // Create a capability result with replay flag
          const replayConfig: any = {
            ...sequenceItem.config,
            isReplay: true,
            node: this.lane.node,
            history: this.lane.agentHistory,
          };

          // For EXECUTE capabilities, add stored execution data to skip handshake and intelligence
          if (
            capabilityType === oCapabilityType.EXECUTE &&
            sequenceItem.result
          ) {
            // Ensure params object exists
            if (!replayConfig.params) {
              replayConfig.params = {};
            }
            replayConfig.params.storedExecution = {
              handshakeResult: sequenceItem?.result?.handshakeResult,
              taskConfig: sequenceItem?.result?.taskConfig,
            };
          }

          const replayStep = new oCapabilityResult({
            type: capabilityType,
            config: replayConfig,
            result: sequenceItem.result,
            error: sequenceItem.error,
          });

          // Execute the capability in replay mode
          const result = await this.lane.doCapability(replayStep);
          this.lane.addSequence(result);

          // If the capability is STOP, end replay
          if (result.type === oCapabilityType.STOP) {
            return result;
          }
        } else {
          this.lane.logger.debug(
            `Skipping capability (using cached result): ${capabilityType}`,
          );
          // Add the cached result to sequence without re-executing
          this.lane.addSequence(sequenceItem);
        }
      }

      this.lane.logger.debug('Lane replay completed successfully');
      return this.lane.result;
    } catch (error) {
      this.lane.logger.error('Error during lane replay: ', error);
      throw error;
    }
  }

  /**
   * Determine if a capability should be re-executed during replay
   * Execute and Configure capabilities are re-executed as they modify network state
   * Other capabilities use cached results
   * @param capabilityType The type of capability to check
   * @returns True if capability should be re-executed
   */
  shouldReplayCapability(capabilityType: oCapabilityType): boolean {
    const replayTypes = [
      oCapabilityType.EXECUTE,
      oCapabilityType.CONFIGURE,
      oCapabilityType.MULTIPLE_STEP,
    ];
    return replayTypes.includes(capabilityType);
  }

  /**
   * Get the cached CID if available
   * @returns Cached CID or undefined
   */
  getCachedCID(): CID | undefined {
    return this.cid;
  }

  /**
   * Clear the cached CID
   */
  clearCache(): void {
    this.cid = undefined;
  }
}
