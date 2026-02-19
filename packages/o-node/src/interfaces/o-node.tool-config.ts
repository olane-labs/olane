import { oNodeConfig } from './o-node.config.js';

export interface oNodeToolConfig extends Omit<oNodeConfig, 'address'> {}
