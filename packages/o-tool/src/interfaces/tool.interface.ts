import { CoreConfig } from '@olane/o-core';

export interface oToolConfig extends Omit<CoreConfig, 'address'> {}
