import { AGENT_ADRESS, NodeType, oAddress } from '@olane/o-core';
import { oToolConfig } from '@olane/o-tool';
import { oCommonNode } from '../common';
import { EncryptionUtil } from './lib/encryption.lib';

/**
 * The agent is a consumer on the network. It consumes services from other networks or from within the same network.
 * Agents can be human or AI.
 */
export class oAgentNode extends oCommonNode {
  protected encryption: EncryptionUtil;

  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress(AGENT_ADRESS),
      type: NodeType.AGENT,
    });
  }

  async initialize(): Promise<void> {
    await super.initialize();
    this.encryption = new EncryptionUtil(this.p2pNode.peerId);
  }
}
