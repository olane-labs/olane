import {
  oAddress,
  oError,
  oErrorCodes,
  NodeState,
  oObject,
  RestrictedAddresses,
} from '@olane/o-core';
import { oLaneConfig } from './interfaces/o-lane.config.js';
import { CID } from 'multiformats';
import * as json from 'multiformats/codecs/json';
import { sha256 } from 'multiformats/hashes/sha2';
import { v4 as uuidv4 } from 'uuid';
import { oIntent } from './intent/index.js';
import { oIntentEncoder } from './intent-encoder/index.js';
import { oLaneStatus } from './enum/o-lane.status-enum.js';
import {
  oCapabilityConfig,
  oCapabilityResult,
  oCapabilityType,
} from './capabilities/index.js';
import { ALL_CAPABILITIES } from './capabilities-all/o-capability.all.js';

export class oLane extends oObject {
  public sequence: oCapabilityResult[] = [];
  public cid: CID | undefined;
  public id: string = uuidv4();
  public parentLaneId: string | undefined;
  public intentEncoder: oIntentEncoder;
  public MAX_CYCLES: number = 20;
  public status: oLaneStatus = oLaneStatus.PENDING;
  public result: oCapabilityResult | undefined;
  public onChunk?: (chunk: any) => void;

  constructor(protected readonly config: oLaneConfig) {
    super('o-lane:' + `[${config.intent.value}]`);
    this.sequence = Object.assign([], this.config.sequence || []);
    this.parentLaneId = this.config.parentLaneId;
    this.intentEncoder = new oIntentEncoder();
    this.onChunk = this.config.onChunk;
    // set a max cycles if one is not provided
    if (!!process.env.MAX_CYCLES) {
      this.MAX_CYCLES = parseInt(process.env.MAX_CYCLES);
    }
    this.MAX_CYCLES = this.config.maxCycles || this.MAX_CYCLES;
  }

  get intent(): oIntent {
    return this.config.intent;
  }

  toCIDInput(): any {
    return {
      intent: this.config.intent.toString(),
      address: this.config.caller?.toString(),
      context: this.config.context?.toString() || '',
    };
  }

  toJSON() {
    return {
      config: this.toCIDInput(),
      sequence: this.sequence,
      result: this.result,
    };
  }

  addSequence(result: oCapabilityResult) {
    this.sequence.push(result);
    if (this.config.streamTo) {
      this.node
        .use(this.config.streamTo, {
          method: 'receive_stream',
          params: {
            data: result.result || result.error || '',
          },
        })
        .catch((error: any) => {
          this.logger.error('Error sending agent stream: ', error);
        });
    }
  }

  async toCID(): Promise<CID> {
    if (this.cid) {
      return this.cid;
    }
    const bytes = json.encode(this.toCIDInput());
    const hash = await sha256.digest(bytes);
    const cid = CID.create(1, json.code, hash);
    return cid;
  }

  async store(): Promise<CID> {
    this.logger.debug('Storing plan...');
    const cid = await this.toCID();

    if (this.node.state !== NodeState.RUNNING) {
      throw new oError(
        oErrorCodes.INVALID_STATE,
        'Node is not in a valid state to store a lane',
      );
    }

    const params = {
      key: cid.toString(),
      value: JSON.stringify(this.toJSON()),
    };
    this.logger.debug('Storing plan params: ', params);
    await this.node.use(oAddress.lane(), {
      method: 'put',
      params: params,
    });
    return cid;
  }

  get agentHistory() {
    const added: { [key: string]: boolean } = {};
    return (
      this.sequence
        ?.filter((s) => {
          if (added[s.id]) {
            return false;
          }
          added[s.id] = true;
          return true;
        })
        ?.map((s, index) => {
          const result = s.result || s.error;
          return `[Cycle ${index + 1} Begin ${s.id}]\n
            Cycle Intent: ${s.config?.intent.toString()}\n
            Cycle Result:\n
            ${
              typeof result === 'string'
                ? result
                : JSON.stringify(
                    {
                      ...result,
                    },
                    null,
                    2,
                  )
            } \n[Cycle ${index + 1} End ${s.id}]`;
        })
        .join('\n') || ''
    );
  }
  async preflight(): Promise<void> {
    this.logger.debug('Preflight...');
    this.status = oLaneStatus.PREFLIGHT;
  }

  async execute(): Promise<oCapabilityResult | undefined> {
    this.logger.debug('Executing...');
    await this.preflight();
    this.status = oLaneStatus.RUNNING;
    try {
      this.result = await this.loop();
    } catch (error) {
      this.logger.error('Error in execute: ', error);
      this.status = oLaneStatus.FAILED;
    }
    await this.postflight(this.result);
    this.status = oLaneStatus.COMPLETED;
    return this.result;
  }

  get capabilities() {
    return this.config.capabilities || ALL_CAPABILITIES.map((c) => new c());
  }

  resultToConfig(result: any): oCapabilityConfig {
    const obj = result.result || result.error;
    return {
      ...result.config,
      history: this.agentHistory,
      params: typeof obj === 'object' ? obj : {},
      laneConfig: {
        ...this.config,
        sequence: this.sequence, // pass the full sequence to the next capability
      },
      useStream: this.config.useStream || false,
    };
  }

  async doCapability(
    currentStep: oCapabilityResult,
  ): Promise<oCapabilityResult> {
    const capabilityType = currentStep.type;
    for (const capability of this.capabilities) {
      if (capability.type === capabilityType && currentStep.config) {
        const capabilityConfig: oCapabilityConfig =
          this.resultToConfig(currentStep);
        this.logger.debug('Executing capability: ', capabilityType);
        const result = await capability.execute({
          ...capabilityConfig,
          onChunk: this.onChunk,
        } as oCapabilityConfig);
        return result;
      }
    }
    throw new oError(oErrorCodes.INVALID_CAPABILITY, 'Unknown capability');
  }

  async loop(): Promise<oCapabilityResult> {
    if (!this.node) {
      throw new Error('Node not set');
    }

    let iterations = 0;
    let currentStep = new oCapabilityResult({
      type: oCapabilityType.EVALUATE,
      result: null,
      config: {
        laneConfig: this.config,
        intent: this.intent,
        node: this.node,
        history: this.agentHistory,
      },
    });

    while (
      iterations++ < this.MAX_CYCLES &&
      this.status === oLaneStatus.RUNNING
    ) {
      // update the history
      if (currentStep.config) {
        currentStep.config.history = this.agentHistory;
      }
      // perform the latest capability
      const result = await this.doCapability(currentStep);
      this.addSequence(result);

      // Check if the capability result indicates persistence is needed
      if (result.shouldPersist && !this.config.persistToConfig) {
        this.logger.debug(
          'Capability result flagged for persistence - automatically setting persistToConfig',
        );
        this.config.persistToConfig = true;
      }

      if (result.type === oCapabilityType.STOP) {
        return result;
      }
      // update the current step
      currentStep = result;
    }
    throw new Error('Plan failed');
  }

  async postflight(
    response?: oCapabilityResult,
  ): Promise<oCapabilityResult | undefined> {
    this.logger.debug('Postflight...');
    this.status = oLaneStatus.POSTFLIGHT;
    try {
      this.cid = await this.store();
      this.logger.debug(
        'Saving plan with CID: ',
        this.cid.toString(),
        response,
      );

      // If this lane is marked for persistence to config, store it directly in os-config storage
      if (this.config.persistToConfig && this.cid) {
        this.logger.debug(
          'Lane marked for persistence (auto-triggered by tool response or explicitly set), saving to config...',
        );
        try {
          // Get the OS instance name from the node's system name
          const systemName =
            (this.node.config as any).systemName || 'default-os';
          await this.node.use(new oAddress('o://os-config'), {
            method: 'add_lane_to_config',
            params: {
              osName: systemName,
              cid: this.cid.toString(),
            },
          });
          const data = response?.result;
          if (data.addresses_to_index) {
            for (const address of data.addresses_to_index) {
              await this.node.use(new oAddress(address), {
                method: 'index_network',
                params: {},
              });
            }
          }
          this.logger.debug(
            'Lane CID added to startup config via o://os-config',
          );
        } catch (error) {
          this.logger.error('Failed to add lane to startup config: ', error);
        }
      }
    } catch (error) {
      this.logger.error('Error in postflight: ', error);
    }
    return response;
  }

  cancel() {
    this.logger.debug('Cancelling lane...');
    this.status = oLaneStatus.CANCELLED;
  }

  /**
   * Replay a stored lane from storage by CID
   * This method loads a lane's execution sequence and replays it to restore network state
   */
  async replay(cid: string): Promise<oCapabilityResult | undefined> {
    this.logger.debug('Replaying lane from CID: ', cid);
    this.status = oLaneStatus.RUNNING;

    try {
      // Load the lane data from storage
      const laneData = await this.node.use(oAddress.lane(), {
        method: 'get',
        params: { key: cid },
      });

      if (!laneData || !laneData.result) {
        throw new Error(`Lane not found in storage for CID: ${cid}`);
      }

      const data = laneData.result.data as any;
      const storedLane = JSON.parse(data.value);

      // Replay the sequence
      if (!storedLane.sequence || !Array.isArray(storedLane.sequence)) {
        throw new Error('Invalid lane data: missing or invalid sequence');
      }

      // Iterate through the stored sequence and replay capabilities
      for (const sequenceItem of storedLane.sequence) {
        const capabilityType = sequenceItem.type;

        // Determine if this capability should be replayed
        if (this.shouldReplayCapability(capabilityType)) {
          this.logger.debug(`Replaying capability: ${capabilityType}`);

          // Create a capability result with replay flag
          const replayStep = new oCapabilityResult({
            type: capabilityType,
            config: {
              ...sequenceItem.config,
              isReplay: true,
              node: this.node,
              history: this.agentHistory,
            },
            result: sequenceItem.result,
            error: sequenceItem.error,
          });

          // Execute the capability in replay mode
          const result = await this.doCapability(replayStep);
          this.addSequence(result);

          // If the capability is STOP, end replay
          if (result.type === oCapabilityType.STOP) {
            this.result = result;
            break;
          }
        } else {
          this.logger.debug(
            `Skipping capability (using cached result): ${capabilityType}`,
          );
          // Add the cached result to sequence without re-executing
          this.addSequence(sequenceItem);
        }
      }

      this.status = oLaneStatus.COMPLETED;
      this.logger.debug('Lane replay completed successfully');
      return this.result;
    } catch (error) {
      this.logger.error('Error during lane replay: ', error);
      this.status = oLaneStatus.FAILED;
      throw error;
    }
  }

  /**
   * Determine if a capability should be re-executed during replay
   * Task and Configure capabilities are re-executed as they modify network state
   * Other capabilities use cached results
   */
  private shouldReplayCapability(capabilityType: oCapabilityType): boolean {
    const replayTypes = [
      oCapabilityType.TASK,
      oCapabilityType.CONFIGURE,
      oCapabilityType.MULTIPLE_STEP,
    ];
    return replayTypes.includes(capabilityType);
  }

  get node() {
    return this.config.currentNode;
  }
}
