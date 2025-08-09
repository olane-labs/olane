import { oQueryConfig } from './query.config';
import { oTaskConfig } from './task.config';

export interface oPlanResult {
  intents?: {
    intent: string;
  }[];
  queries?: oQueryConfig[];
  tasks?: oTaskConfig[];
  handshake?: oTaskConfig;
  result?: any;
  reasoning?: string;
  error?: any;
  type: 'result' | 'task' | 'search' | 'multiple_step' | 'error' | 'handshake';
}
