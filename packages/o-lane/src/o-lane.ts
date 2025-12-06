import {
  oAddress,
  oError,
  oErrorCodes,
  oObject,
  oResponse,
} from '@olane/o-core';
import { oLaneConfig } from './interfaces/o-lane.config.js';
import { CID } from 'multiformats';
import { v4 as uuidv4 } from 'uuid';
import { oIntent } from './intent/index.js';
import { oIntentEncoder } from './intent-encoder/index.js';
import { oLaneStatus } from './enum/o-lane.status-enum.js';
import {
  oCapability,
  oCapabilityResult,
  oCapabilityType,
} from './capabilities/index.js';
import { ALL_CAPABILITIES } from './capabilities-all/o-capability.all.js';
import { MarkdownBuilder } from './formatters/index.js';
import { PromptLoader } from './storage/prompt-loader.js';
import { oCapabilityConfig } from './capabilities/o-capability.config.js';
import { oLaneStorageManager } from './storage/o-lane.storage-manager.js';

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
  private promptLoader: PromptLoader;
  public storageManager: oLaneStorageManager;

  constructor(protected readonly config: oLaneConfig) {
    super('o-lane:' + `[${config.intent.value}]`);
    this.sequence = Object.assign([], this.config.sequence || []);
    this.parentLaneId = this.config.parentLaneId;
    this.intentEncoder = new oIntentEncoder();
    this.onChunk = this.config.onChunk;
    this.storageManager = new oLaneStorageManager(this);
    // set a max cycles if one is not provided
    if (!!process.env.MAX_CYCLES) {
      this.MAX_CYCLES = parseInt(process.env.MAX_CYCLES);
    }
    this.MAX_CYCLES = this.config.maxCycles || this.MAX_CYCLES;
    this.promptLoader = config.promptLoader;
  }

  get intent(): oIntent {
    return this.config.intent;
  }

  toCIDInput(): any {
    return this.storageManager.generateCIDInput();
  }

  toJSON() {
    return this.storageManager.serialize();
  }

  addSequence(result: oCapabilityResult) {
    this.sequence.push(result);
  }

  async toCID(): Promise<CID> {
    return this.storageManager.generateCID();
  }

  async store(): Promise<CID> {
    return this.storageManager.save();
  }

  get agentHistory() {
    const added: { [key: string]: boolean } = {};

    const filteredSequence = this.sequence?.filter((s) => {
      if (added[s.id]) {
        return false;
      }
      added[s.id] = true;
      return true;
    });

    return (
      filteredSequence
        ?.map((s, index) => {
          return `\n<cycle_${index}>\n${JSON.stringify(s)}\n</cycle_${index}>`;
        })
        .join('\n') || ''
    );
  }

  /**
   * Generate a human-readable execution trace of the lane
   * Shows the decision points and flow of execution
   */
  getExecutionTrace(): string {
    const mb = MarkdownBuilder.create();

    mb.header('Execution Trace', 2);
    mb.paragraph(`Intent: ${this.config.intent.value}`);
    mb.paragraph(`Cycles: ${this.sequence.length}`);
    mb.paragraph(`Status: ${this.status}`);

    if (this.sequence.length === 0) {
      mb.paragraph('No execution cycles recorded.');
      return mb.build();
    }

    mb.br();
    mb.header('Cycle Details', 3);

    this.sequence.forEach((step, index) => {
      const params = step.config?.params || {};
      const summary = params.summary || '';
      const reasoning = params.reasoning || '';

      mb.br();
      mb.raw(`${mb.bold(`Cycle ${index + 1}`)} [${step.type}]`);

      if (summary) {
        mb.raw(`\n└─ ${mb.italic('Summary:')} ${summary}`);
      }

      if (reasoning) {
        mb.raw(`\n└─ ${mb.italic('Reasoning:')} ${reasoning}`);
      }

      if (step.error) {
        mb.raw(`\n└─ ❌ ${mb.bold('Error:')} ${step.error}`);
      } else if (step.type === oCapabilityType.STOP) {
        mb.raw(`\n└─ ✓ ${mb.bold('Completed')}`);
      }
    });

    // Add final result summary
    if (this.result) {
      mb.br();
      mb.hr();
      mb.header('Final Result', 3);

      const resultParams = this.result.config?.params || {};
      const finalSummary = resultParams.summary || '';

      if (finalSummary) {
        mb.paragraph(finalSummary);
      }

      if (this.result.error) {
        mb.paragraph(`${mb.bold('Status:')} Failed`);
        mb.paragraph(`${mb.bold('Error:')} ${this.result.error}`);
      } else {
        mb.paragraph(`${mb.bold('Status:')} Success`);
      }
    }

    return mb.build();
  }

  async preflight(): Promise<void> {
    this.logger.debug('Preflight...');
    this.status = oLaneStatus.PREFLIGHT;
    this.logger.debug('Pinging intelligence tool...');
    // ping the intelligence tool to ensure it is available
    await this.node.use(new oAddress('o://intelligence'), {
      method: 'ping',
      params: {},
    });
  }

  async execute(): Promise<oCapabilityResult | undefined> {
    this.logger.debug('Executing...');
    try {
      await this.preflight().catch((error) => {
        this.logger.error('Error in preflight: ', error);

        this.result = new oCapabilityResult({
          type: oCapabilityType.ERROR,
          result: null,
          error: 'Intelligence services are not available. Try again later.',
        });
        throw new oError(
          oErrorCodes.INVALID_STATE,
          'Intelligence services are not available. Try again later.',
        );
      });
      this.status = oLaneStatus.RUNNING;
      this.result = await this.loop();
    } catch (error) {
      this.logger.error('Error in execute: ', error);
      this.status = oLaneStatus.FAILED;
    }
    this.logger.debug('Completed loop...');
    await this.postflight(this.result);
    this.status = oLaneStatus.COMPLETED;
    return this.result;
  }

  /**
   * Filter capabilities by type from ALL_CAPABILITIES
   * @param types Array of capability types to include
   * @returns Array of instantiated capabilities matching the specified types
   */
  private filterCapabilitiesByType(types: oCapabilityType[]): oCapability[] {
    return ALL_CAPABILITIES
      .map((CapabilityClass) => {
        const instance = new CapabilityClass({
          promptLoader: this.promptLoader,
          node: this.node
        });
        return instance;
      })
      .filter((capability) => types.includes(capability.type));
  }

  get capabilities() {
    // Priority order:
    // 1. If config.capabilities exists, use it (full backward compatibility)
    // 2. If config.enabledCapabilityTypes exists, filter ALL_CAPABILITIES
    // 3. Otherwise, use ALL_CAPABILITIES (default behavior)
    if (this.config.capabilities) {
      return this.config.capabilities;
    }

    if (this.config.enabledCapabilityTypes) {
      return this.filterCapabilitiesByType(this.config.enabledCapabilityTypes);
    }

    return ALL_CAPABILITIES.map((c) => new c({
      promptLoader: this.promptLoader,
      node: this.node
    }));
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
      intent: this.intent,
      node: this.node,
      chatHistory: this.config.chatHistory,
    };
  }

  async doCapability(
    currentStep: oCapabilityResult,
  ): Promise<oCapabilityResult> {
    try {
      const capabilityType = currentStep.type;
      for (const capability of this.capabilities) {
        if (capability.type === capabilityType && currentStep.config) {
          const capabilityConfig: oCapabilityConfig =
            this.resultToConfig(currentStep);
          this.logger.debug('Executing capability: ', capabilityType);
          const result = await capability.execute(oCapabilityConfig.fromJSON({
            ...capabilityConfig,
          }));
          return result;
        }
      }
    } catch (error) {
      this.logger.error('Error in doCapability: ', error);
      const errorResult = new oCapabilityResult({
        type: oCapabilityType.ERROR,
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return errorResult;
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
      config: oCapabilityConfig.fromJSON({
        laneConfig: this.config,
        intent: this.intent,
        node: this.node,
        history: this.agentHistory,
        chatHistory: this.config.chatHistory,
      }),
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

      await this.emitNonFinalChunk(result, {
        data: {
          ...result,
          config: undefined,
        },
      });

      if (result.type === oCapabilityType.STOP) {
        return result;
      }
      // update the current step
      currentStep = result;
    }
    throw new Error('Plan failed');
  }

  async emitNonFinalChunk(result: oCapabilityResult, payload: any) {
    if (this.config.useStream && this.onChunk) {
      await this.onChunk(
        new oResponse({
          ...payload,
          _last: false,
          _isStreaming: true,
          _connectionId: this.node.address.toString(),
          _requestMethod: 'unknown',
          id: this.config.requestId ?? uuidv4(), // Use request ID for proper correlation, fallback to UUID
        }),
      );
    }
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
        try {
          await this.storageManager.persistToConfig(this.cid, response);
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
    // tell all capabilities to cancel
    for (const capability of this.capabilities) {
      capability.cancel();
    }
  }

  /**
   * Replay a stored lane from storage by CID
   * This method loads a lane's execution sequence and replays it to restore network state
   */
  async replay(cid: string): Promise<oCapabilityResult | undefined> {
    this.status = oLaneStatus.RUNNING;

    try {
      const result = await this.storageManager.replay(cid);
      this.result = result;
      this.status = oLaneStatus.COMPLETED;
      return result;
    } catch (error) {
      this.logger.error('Error during lane replay: ', error);
      this.status = oLaneStatus.FAILED;
      throw error;
    }
  }

  get node() {
    return this.config.currentNode;
  }
}
