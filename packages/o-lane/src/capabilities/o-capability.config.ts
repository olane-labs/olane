import { oCapabilityConfigInterface as inter } from './interfaces/o-capability.config-interface.js';
import { oIntent } from '../intent/o-intent.js';
import { oLaneConfig } from '../interfaces/o-lane.config.js';
import { oToolBase } from '@olane/o-tool';

export class oCapabilityConfig implements inter {
  node!: oToolBase;
  intent!: oIntent;
  laneConfig?: oLaneConfig;
  history?: string;
  chatHistory?: string;
  params?: any;
  isReplay?: boolean;
  useStream?: boolean;
  onChunk?: (chunk: any) => void;

  constructor(params: inter) {
    this.node = params.node;
    this.intent = params.intent;
    this.laneConfig = params.laneConfig;
    this.history = params.history;
    this.isReplay = params.isReplay;
    this.useStream = params.useStream;
    this.onChunk = params.onChunk;
  }

  toJSON() {
    return {
      intent: this.intent,
      address: this.node?.address?.value,
      isReplay: this.isReplay,
    }
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }

  static fromJSON(json: inter): oCapabilityConfig {
    return new oCapabilityConfig(json);
  }

}