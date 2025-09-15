import { oQueryConfig } from './query.config.js';
import { oTaskConfig } from './task.config.js';

export interface oPlanResult {
  intents?: string[];
  queries?: oQueryConfig[];
  tasks?: oTaskConfig[];
  handshake?: oTaskConfig;
  result?: any;
  reasoning?: string;
  error?: any;
  type: 'result' | 'task' | 'search' | 'multiple_step' | 'error' | 'handshake';
}
