import { oNodeConfig } from './o-node.config';

export interface oNodeToolConfig extends Omit<oNodeConfig, 'address'> {}
