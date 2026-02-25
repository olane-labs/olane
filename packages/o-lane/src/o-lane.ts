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
import { oCapabilityEvaluate } from './capabilities-evaluate/o-capability.evaluate.js';
import { oCapabilityExecute } from './capabilities-execute/execute.capability.js';
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
  private evaluateCapability!: oCapabilityEvaluate;
  private executeCapability!: oCapabilityExecute;
  private capabilitiesByType?: Map<oCapabilityType, oCapability>;

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

    // Support config.capabilities override (backward compat)
    if (this.config.capabilities) {
      this.capabilitiesByType = new Map();
      for (const cap of this.config.capabilities) {
        this.capabilitiesByType.set(cap.type, cap);
      }
    }
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
    const pingResponse = await this.node.use(new oAddress('o://intelligence'), {
      method: 'ping',
      params: {},
    });
    if (process.env.VERBOSE === 'true') {
      this.logger.verbose('Preflight intelligence ping response', {
        success: pingResponse?.result?.success,
      });
    }
  }

  async execute(): Promise<oCapabilityResult | undefined> {
    this.logger.debug('Executing...');
    if (process.env.VERBOSE === 'true') {
      this.logger.verbose('Lane execute starting', {
        laneId: this.id,
        intent: this.intent?.value,
        maxCycles: this.MAX_CYCLES,
        sequenceLength: this.sequence?.length,
        parentLaneId: this.parentLaneId,
        useStream: this.config.useStream || false,
        persistToConfig: this.config.persistToConfig || false,
      });
    }
    try {
      await this.preflight().catch((error) => {
        this.logger.error('Error in preflight: ', error);

        this.result = new oCapabilityResult({
          type: oCapabilityType.STOP,
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

  private ensureCapabilities(): void {
    if (!this.evaluateCapability) {
      const args = { promptLoader: this.promptLoader, node: this.node };
      this.evaluateCapability = new oCapabilityEvaluate(args);
      this.executeCapability = new oCapabilityExecute(args);
    }
  }

  private getCapability(type: oCapabilityType): oCapability {
    // config.capabilities override takes priority (backward compat)
    if (this.capabilitiesByType) {
      const cap = this.capabilitiesByType.get(type);
      if (cap) return cap;
    }

    this.ensureCapabilities();
    if (type === oCapabilityType.EVALUATE) return this.evaluateCapability;
    if (type === oCapabilityType.EXECUTE) return this.executeCapability;

    throw new oError(
      oErrorCodes.INVALID_CAPABILITY,
      'Unknown capability: ' + type,
    );
  }

  private buildConfig(step: oCapabilityResult): oCapabilityConfig {
    const resultData = step.result || step.error;
    const config = new oCapabilityConfig({
      intent: this.intent,
      node: this.node,
      history: this.agentHistory,
      chatHistory: this.config.chatHistory,
      useStream: this.config.useStream || false,
      params: typeof resultData === 'object' ? resultData : {},
      laneConfig: { ...this.config, sequence: this.sequence },
      isReplay: step.config?.isReplay,
    });
    if (process.env.VERBOSE === 'true') {
      this.logger.verbose('Built capability config', {
        intent: this.intent?.value,
        historyLength: this.agentHistory?.length,
        paramsKeys:
          typeof resultData === 'object' && resultData
            ? Object.keys(resultData)
            : [],
        useStream: this.config.useStream || false,
        isReplay: step.config?.isReplay || false,
        sequenceLength: this.sequence?.length,
      });
    }
    return config;
  }

  async doCapability(
    currentStep: oCapabilityResult,
  ): Promise<oCapabilityResult> {
    try {
      const config = this.buildConfig(currentStep);
      const capability = this.getCapability(currentStep.type);
      this.logger.debug('Executing capability: ', currentStep.type);
      if (process.env.VERBOSE === 'true') {
        this.logger.verbose('doCapability input', {
          stepType: currentStep?.type,
          intent: this.intent?.value,
          hasError: !!currentStep?.error,
          isReplay: currentStep?.config?.isReplay || false,
          paramsKeys:
            currentStep?.result && typeof currentStep?.result === 'object'
              ? Object.keys(currentStep.result)
              : [],
        });
      }
      const result = await capability.execute(config);
      if (process.env.VERBOSE === 'true') {
        this.logger.verbose('doCapability result', {
          resultType: result?.type,
          hasError: !!result?.error,
          error: result?.error || undefined,
          shouldPersist: result?.shouldPersist || false,
          resultKeys:
            result.result && typeof result?.result === 'object'
              ? Object.keys(result.result)
              : [],
        });
      }
      return result;
    } catch (error) {
      this.logger.error('Error in doCapability: ', error);
      return new oCapabilityResult({
        type: oCapabilityType.EVALUATE,
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        config: new oCapabilityConfig({
          laneConfig: this.config,
          intent: this.intent,
          node: this.node,
          history: this.agentHistory,
          chatHistory: this.config.chatHistory,
        }),
      });
    }
  }

  async loop(): Promise<oCapabilityResult> {
    if (!this.node) {
      throw new Error('Node not set');
    }

    let iterations = 0;
    let currentStep = new oCapabilityResult({
      type: oCapabilityType.EVALUATE,
      result: null,
      config: new oCapabilityConfig({
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
      if (process.env.VERBOSE === 'true') {
        this.logger.verbose('Loop iteration starting', {
          iteration: iterations,
          stepType: currentStep?.type,
          sequenceLength: this.sequence?.length,
          maxCycles: this.MAX_CYCLES,
        });
      }

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
    if (process.env.VERBOSE === 'true') {
      this.logger.verbose('emitNonFinalChunk', {
        useStream: this.config.useStream || false,
        hasOnChunk: !!this.onChunk,
        resultType: result?.type,
        payloadKeys: payload?.data ? Object.keys(payload?.data) : [],
      });
    }
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
      this.logger.debug('Saving plan with CID: ', this.cid.toString());

      if (process.env.VERBOSE === 'true') {
        const serialized = JSON.stringify(this.storageManager.serialize());
        this.logger.verbose('Postflight lane stored', {
          cid: this.cid?.toString(),
          serializedSize: serialized?.length,
          persistToConfig: this.config.persistToConfig || false,
          sequenceLength: this.sequence?.length,
          resultType: response?.type,
        });
      }

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
    this.evaluateCapability?.cancel();
    this.executeCapability?.cancel();
    // Also cancel any custom capabilities
    if (this.capabilitiesByType) {
      for (const cap of this.capabilitiesByType.values()) {
        cap.cancel();
      }
    }
  }

  /**
   * Replay a stored lane from storage by CID
   * This method loads a lane's execution sequence and replays it to restore network state
   */
  async replay(cid: string): Promise<oCapabilityResult | undefined> {
    if (process.env.VERBOSE === 'true') {
      this.logger.verbose('Lane replay starting', {
        cid,
        laneId: this.id,
        intent: this.intent?.value,
      });
    }
    this.status = oLaneStatus.RUNNING;

    try {
      const result = await this.storageManager.replay(cid);
      this.result = result;
      this.status = oLaneStatus.COMPLETED;
      if (process.env.VERBOSE === 'true') {
        this.logger.verbose('Lane replay completed', {
          cid,
          status: this.status,
          resultType: result?.type,
          sequenceLength: this.sequence?.length,
        });
      }
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
