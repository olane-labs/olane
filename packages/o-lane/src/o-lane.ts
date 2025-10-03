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

  constructor(protected readonly config: oLaneConfig) {
    super('o-lane:' + `[${config.intent.value}]`);
    this.sequence = Object.assign([], this.config.sequence || []);
    this.parentLaneId = this.config.parentLaneId;
    this.intentEncoder = new oIntentEncoder();

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
      intent: this.config.intent,
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

  async store() {
    this.logger.debug('Storing plan...');
    const cid = await this.toCID();

    const params = {
      key: cid.toString(),
      value: JSON.stringify(this.toJSON()),
    };
    this.logger.debug('Storing plan params: ', params);
    // await this.node.use(oAddress.lane(), {
    //   method: 'put',
    //   params: params,
    // });
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
            Cycle Intent: ${s.config?.intent}\n
            Cycle Result:\n
            ${
              typeof s.result === 'string'
                ? s.result
                : JSON.stringify(
                    {
                      ...s.result,
                    },
                    null,
                    2,
                  )
            } \n[Cycle ${index + 1} End ${s.id}]`,
        )
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
    return {
      ...result.config,
      history: this.agentHistory,
      params: typeof result.result === 'object' ? result.result : {},
    };
  }

  async doCapability(
    currentStep: oCapabilityResult,
  ): Promise<oCapabilityResult> {
    this.logger.debug('Doing capability: ', currentStep);
    const nextStep = currentStep.result;
    const capabilityType = currentStep.type;
    for (const capability of this.capabilities) {
      if (capability.type === capabilityType && currentStep.config) {
        const capabilityConfig: oCapabilityConfig =
          this.resultToConfig(currentStep);
        const result = await capability.execute({
          ...capabilityConfig,
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
      this.logger.debug('Processing next step: ', currentStep);
      const result = await this.doCapability(currentStep);
      this.logger.debug('Capability result: ', result);
      this.addSequence(result);
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
