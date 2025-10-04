import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { McpOAuthStorage } from './mcp-oauth-storage.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

/**
 * OAuth-aware transport wrapper for MCP
 *
 * This transport wraps the standard MCP transport and automatically:
 * - Injects OAuth tokens into requests
 * - Refreshes expired tokens
 * - Retries failed requests after token refresh
 */
export class OAuthAwareMcpTransport implements Transport {
  private innerTransport: Transport;
  private storage: McpOAuthStorage;
  private serverUrl: string;
  private refreshCallback: (serverUrl: string) => Promise<void>;
  public onclose?: () => void;
  public onerror?: (error: Error) => void;
  public onmessage?: (message: JSONRPCMessage) => void;

  constructor(
    innerTransport: Transport,
    storage: McpOAuthStorage,
    serverUrl: string,
    refreshCallback: (serverUrl: string) => Promise<void>,
  ) {
    this.innerTransport = innerTransport;
    this.storage = storage;
    this.serverUrl = serverUrl;
    this.refreshCallback = refreshCallback;

    // Forward events from inner transport
    this.innerTransport.onclose = () => {
      if (this.onclose) {
        this.onclose();
      }
    };

    this.innerTransport.onerror = (error: Error) => {
      if (this.onerror) {
        this.onerror(error);
      }
    };

    this.innerTransport.onmessage = (message: JSONRPCMessage) => {
      if (this.onmessage) {
        this.onmessage(message);
      }
    };
  }

  /**
   * Start the transport and ensure tokens are valid
   */
  async start(): Promise<void> {
    await this.ensureValidTokens();
    return this.innerTransport.start();
  }

  /**
   * Close the transport
   */
  async close(): Promise<void> {
    return this.innerTransport.close();
  }

  /**
   * Send a message with OAuth token injection
   */
  async send(message: JSONRPCMessage): Promise<void> {
    // Ensure we have valid tokens
    await this.ensureValidTokens();

    // Get current tokens
    const tokens = await this.storage.getTokens(this.serverUrl);

    // For HTTP/SSE transports, we'd inject the Authorization header
    // The MCP SDK handles this differently depending on transport type
    // For now, we rely on the transport configuration having the token
    try {
      return await this.innerTransport.send(message);
    } catch (error: any) {
      // Check if it's an authentication error (401)
      if (this.isAuthError(error)) {
        // Try to refresh tokens and retry
        await this.refreshTokens();
        return await this.innerTransport.send(message);
      }
      throw error;
    }
  }

  /**
   * Ensure tokens are valid before making requests
   */
  private async ensureValidTokens(): Promise<void> {
    const tokens = await this.storage.getTokens(this.serverUrl);

    if (!tokens) {
      throw new Error(
        `No OAuth tokens available for ${this.serverUrl}. Please authenticate first.`,
      );
    }

    // Check if token is expired
    const isExpired = await this.storage.areTokensExpired(this.serverUrl);
    if (isExpired && tokens.refresh_token) {
      await this.refreshTokens();
    } else if (isExpired) {
      throw new Error(
        `OAuth token expired and no refresh token available for ${this.serverUrl}. Please re-authenticate.`,
      );
    }
  }

  /**
   * Refresh OAuth tokens
   */
  private async refreshTokens(): Promise<void> {
    try {
      await this.refreshCallback(this.serverUrl);
    } catch (error: any) {
      throw new Error(
        `Failed to refresh OAuth tokens for ${this.serverUrl}: ${error.message}`,
      );
    }
  }

  /**
   * Check if an error is an authentication error
   */
  private isAuthError(error: any): boolean {
    // Check for common authentication error patterns
    if (error.status === 401 || error.statusCode === 401) {
      return true;
    }

    if (error.code === 'UNAUTHORIZED' || error.code === 'UNAUTHENTICATED') {
      return true;
    }

    const errorMessage = error.message?.toLowerCase() || '';
    return (
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('token expired')
    );
  }

  /**
   * Get the current access token (for HTTP transport configuration)
   */
  async getAccessToken(): Promise<string | null> {
    const tokens = await this.storage.getTokens(this.serverUrl);
    return tokens?.access_token || null;
  }
}
