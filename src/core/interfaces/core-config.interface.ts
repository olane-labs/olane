import { Libp2pConfig } from '@olane/o-config';
import { oAddress } from '../o-address';
import { NodeType } from './node-type.enum';
import { oParameter, oDependency, oMethod } from '@olane/o-protocol';

export interface CoreConfig {
  address: oAddress;
  leader: oAddress | null;
  parent: oAddress | null;
  type?: NodeType;
  seed?: string;
  name?: string;
  network?: Libp2pConfig;
  metrics?: boolean;
  description?: string;
  dependencies?: oDependency[];
  methods?: { [key: string]: oMethod };
  cwd?: string;
  networkName?: string;
  promptAddress?: oAddress;
}
