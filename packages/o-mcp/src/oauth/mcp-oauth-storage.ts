import { oAddress } from '@olane/o-core';
import { OAuthTokens } from './interfaces/oauth-tokens.interface.js';
import { OAuthClientInfo } from './interfaces/oauth-client-info.interface.js';

interface OAuthStorageConfig {
  storageAddress: oAddress; // Address of storage provider (e.g., o://secure)
  useFunction: (address: oAddress, request: any) => Promise<any>;
}

/**
 * OAuth storage adapter that uses Olane OS o-storage for encrypted persistence
 *
 * This adapter provides a thin layer over o://secure storage for OAuth tokens
 * and client information, with automatic encryption handled by the storage layer.
 */
export class McpOAuthStorage {
  private storageAddress: oAddress;
  private use: (address: oAddress, request: any) => Promise<any>;

  constructor(config: OAuthStorageConfig) {
    this.storageAddress = config.storageAddress;
    this.use = config.useFunction;
  }

  /**
   * Save OAuth tokens for a server (encrypted via o://secure)
   */
  async saveTokens(serverUrl: string, tokens: OAuthTokens): Promise<void> {
    const key = this.getTokenKey(serverUrl);

    // Calculate expiry timestamp if not present
    if (tokens.expires_in && !tokens.expires_at) {
      tokens.expires_at = Date.now() + tokens.expires_in * 1000;
    }

    await this.use(this.storageAddress, {
      method: 'put',
      params: {
        key,
        value: JSON.stringify(tokens),
      },
    });
  }

  /**
   * Get OAuth tokens for a server (decrypted automatically)
   */
  async getTokens(serverUrl: string): Promise<OAuthTokens | null> {
    const key = this.getTokenKey(serverUrl);

    try {
      const response = await this.use(this.storageAddress, {
        method: 'get',
        params: { key },
      });

      // o-storage returns the value directly
      const value = response.result?.data?.value || response.result?.data;
      return value ? JSON.parse(value as string) : null;
    } catch (error) {
      // Key doesn't exist
      return null;
    }
  }

  /**
   * Save OAuth client info for a server (encrypted)
   */
  async saveClientInfo(
    serverUrl: string,
    clientInfo: OAuthClientInfo,
  ): Promise<void> {
    const key = this.getClientKey(serverUrl);

    await this.use(this.storageAddress, {
      method: 'put',
      params: {
        key,
        value: JSON.stringify(clientInfo),
      },
    });
  }

  /**
   * Get OAuth client info for a server (decrypted automatically)
   */
  async getClientInfo(serverUrl: string): Promise<OAuthClientInfo | null> {
    const key = this.getClientKey(serverUrl);

    try {
      const response = await this.use(this.storageAddress, {
        method: 'get',
        params: { key },
      });

      const value = response.result?.data?.value || response.result?.data;
      return value ? JSON.parse(value as string) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear all OAuth data for a server
   */
  async clearServer(serverUrl: string): Promise<void> {
    const tokenKey = this.getTokenKey(serverUrl);
    const clientKey = this.getClientKey(serverUrl);

    await Promise.all([
      this.use(this.storageAddress, {
        method: 'delete',
        params: { key: tokenKey },
      }).catch(() => {}),
      this.use(this.storageAddress, {
        method: 'delete',
        params: { key: clientKey },
      }).catch(() => {}),
    ]);
  }

  /**
   * Check if tokens exist for a server
   */
  async hasTokens(serverUrl: string): Promise<boolean> {
    const key = this.getTokenKey(serverUrl);

    try {
      const response = await this.use(this.storageAddress, {
        method: 'has',
        params: { key },
      });

      return response.result?.data?.data === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if tokens are expired
   */
  async areTokensExpired(serverUrl: string): Promise<boolean> {
    const tokens = await this.getTokens(serverUrl);
    if (!tokens) return true;

    if (tokens.expires_at) {
      // Add 5-minute buffer
      return Date.now() >= tokens.expires_at - 5 * 60 * 1000;
    }

    return false;
  }

  /**
   * Get the token key for storage
   */
  private getTokenKey(serverUrl: string): string {
    return `mcp_oauth_tokens:${this.hashServerUrl(serverUrl)}`;
  }

  /**
   * Get the client info key for storage
   */
  private getClientKey(serverUrl: string): string {
    return `mcp_oauth_client:${this.hashServerUrl(serverUrl)}`;
  }

  /**
   * Hash server URL for use as storage key
   */
  private hashServerUrl(url: string): string {
    // Simple deterministic hash
    return Buffer.from(url)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 32);
  }
}
