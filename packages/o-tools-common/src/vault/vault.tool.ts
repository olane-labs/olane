import { oToolConfig, oVirtualTool, ToolResult } from '@olane/o-tool';
import { oAddress, oRequest } from '@olane/o-core';
import { EncryptionService } from './lib/encryption.js';
import { VAULT_PARAMS } from './methods/vault.methods.js';

export class VaultTool extends oVirtualTool {
  private encryptionService: EncryptionService;
  private store: Map<string, string> = new Map();

  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://vault'),
      methods: VAULT_PARAMS,
      description: 'Tool to store and retrieve sensitive data from the network',
    });
    this.encryptionService = new EncryptionService();
  }

  async _tool_store(request: oRequest): Promise<ToolResult> {
    const params = request.params;
    const { key, value } = params;
    const b64key = btoa(key as string);
    const encryptedValue = await this.encryptionService.encryptToBase64(
      value as string,
    );
    this.store.set(b64key as string, encryptedValue);
    return {
      message: 'Successfully stored value for key: ' + b64key,
    };
  }

  async _tool_get(request: oRequest): Promise<ToolResult> {
    const params = request.params;
    const { key } = params;
    const b64key = btoa(key as string);
    const encryptedValue = this.store.get(b64key);
    const decryptedValue = await this.encryptionService.decryptFromBase64(
      encryptedValue as string,
    );
    return {
      value: decryptedValue,
    };
  }
}
