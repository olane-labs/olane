import {
  oAddress,
  oError,
  oErrorCodes,
  oObject,
  RestrictedAddresses,
} from '@olane/o-core';
import { oLaneConfig } from './interfaces/o-lane.config.js';
import { CID } from 'multiformats';
import * as json from 'multiformats/codecs/json';
import { sha256 } from 'multiformats/hashes/sha2';
import { oLaneResult } from './interfaces/o-lane.result.js';
import { v4 as uuidv4 } from 'uuid';
import { oIntent } from './intent/index.js';
import { oIntentEncoder } from './intent-encoder/index.js';
import { oLaneStatus } from './enum/o-lane.status-enum.js';
import { oCapabilityResult, oCapabilityType } from './capabilities/index.js';
import { ALL_CAPABILITIES } from './capabilities-all/o-capability.all.js';

export class oLane extends oObject {
  public sequence: oLane[] = [];
  public cid: CID | undefined;
  public id: string = uuidv4();
  public parentLaneId: string | undefined;
  public intentEncoder: oIntentEncoder;
  public MAX_CYCLES: number = 20;
  public status: oLaneStatus = oLaneStatus.PENDING;

  public result: oLaneResult = {
    sequence: [],
  };

  constructor(protected readonly config: oLaneConfig) {
    super('o-lane:' + `[${config.intent}]`);
    this.sequence = Object.assign([], this.config.sequence || []);
    this.parentLaneId = this.config.parentLaneId;
    this.intentEncoder = new oIntentEncoder();

    // set a max cycles if one is not provided
    if (process.env.MAX_CYCLES) {
      this.MAX_CYCLES = parseInt(process.env.MAX_CYCLES);
    }
    this.MAX_CYCLES = this.config.maxCycles || this.MAX_CYCLES;
  }

  get intent(): oIntent {
    return this.config.intent;
  }

  toCIDInput(): any {
    return {
      intent: this.config.intent,
      address: this.config.caller?.toString(),
      context: this.config.context?.toString() || '',
    };
  }

  toJSON() {
    return {
      config: this.toCIDInput(),
      sequence: this.sequence.map(
        (s) => `${RestrictedAddresses.LANE}/${s.cid?.toString()}`,
      ),
      result: this.result,
    };
  }

  addLane(plan: oLane) {
    this.sequence.push(plan);
    if (this.config.streamTo) {
      this.node
        .use(this.config.streamTo, {
          method: 'receive_stream',
          params: {
            data: plan.result || '',
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

  async store() {
    this.logger.debug('Storing plan...');
    const cid = await this.toCID();

    const params = {
      key: cid.toString(),
      value: JSON.stringify(this.toJSON()),
    };
    this.logger.debug('Storing plan params: ', params);
    await this.node.use(oAddress.lane(), {
      method: 'put',
      params: params,
    });
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
        ?.map(
          (s, index) =>
            `[Cycle ${index + 1} Begin ${s.id}]\n
            Cycle Intent: ${s.config.intent}\n
            Cycle Result:\n
            ${JSON.stringify(
              {
                ...s.result,
              },
              null,
              2,
            )} \n[Cycle ${index + 1} End ${s.id}]`,
        )
        .join('\n') || ''
    );
  }
  async preflight(): Promise<void> {
    this.logger.debug('Preflight...');
    this.status = oLaneStatus.PREFLIGHT;
  }

  async execute(): Promise<oLaneResult> {
    this.logger.debug('Executing...');
    this.status = oLaneStatus.RUNNING;
    await this.preflight();
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

  async doCapability(
    currentStep: oCapabilityResult,
  ): Promise<oCapabilityResult> {
    const capabilityType = currentStep.type;
    for (const capability of this.capabilities) {
      if (capability.type === capabilityType && currentStep.config) {
        const result = await capability.execute(currentStep.config);
        return result;
      }
    }
    throw new oError(oErrorCodes.INVALID_CAPABILITY, 'Unknown capability');
  }

  async loop(): Promise<oLaneResult> {
    if (!this.node) {
      throw new Error('Node not set');
    }

    let iterations = 0;
    let currentStep: oCapabilityResult = {
      type: oCapabilityType.EVALUATE,
      result: null,
      config: {
        laneConfig: this.config,
        intent: this.intent,
        node: this.node,
      },
    };

    while (
      iterations++ < this.MAX_CYCLES &&
      this.status === oLaneStatus.RUNNING
    ) {
      // perform the latest capability
      const result = await this.doCapability(currentStep);
      if (result.type === oCapabilityType.STOP) {
        break;
      }
      currentStep = result;
    }
    throw new Error('Plan failed, reached max iterations');
  }

  async postflight(response: oLaneResult): Promise<oLaneResult> {
    this.logger.debug('Postflight...');
    this.status = oLaneStatus.POSTFLIGHT;
    try {
      await this.store();
      this.logger.debug('Saving plan...', response);
    } catch (error) {
      this.logger.error('Error in postflight: ', error);
    }
    return response;
  }

  cancel() {
    this.logger.debug('Cancelling lane...');
    this.status = oLaneStatus.CANCELLED;
  }

  get node() {
    return this.config.currentNode;
  }
}
