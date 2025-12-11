import { oToolConfig, ToolResult } from '@olane/o-tool';
import { oAddress, oRequest } from '@olane/o-core';
import { EncryptionService } from './lib/encryption.js';
import { ENCRYPTION_PARAMS } from './methods/encryption.methods.js';
import { oLaneTool } from '@olane/o-lane';
import { oNodeToolConfig } from '@olane/o-node';

export class EncryptionTool extends oLaneTool {
  private encryptionService: EncryptionService;

  constructor(config: oNodeToolConfig & { vaultKey?: string }) {
    super({
      ...config,
      address: new oAddress('o://encryption'),
      methods: ENCRYPTION_PARAMS,
      description: 'Tool to encrypt and decrypt sensitive data',
    });
    this.encryptionService = new EncryptionService(config.vaultKey || process.env.VAULT_KEY);
  }

  async _tool_encrypt(request: oRequest): Promise<ToolResult> {
    const params = request.params;
    const { value } = params;
    const encryptedValue = await this.encryptionService.encryptToBase64(
      value as string,
    );
    return {
      value: encryptedValue,
    };
  }

  async _tool_decrypt(request: oRequest): Promise<ToolResult> {
    const params = request.params;
    const { value } = params;
    const decryptedValue = await this.encryptionService.decryptFromBase64(
      value as string,
    );
    return {
      value: decryptedValue,
    };
  }
}
