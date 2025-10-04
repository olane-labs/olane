import { oAddress, oRequest } from '@olane/o-core';
import { oLaneTool } from '@olane/o-lane';
import { oNodeToolConfig } from '@olane/o-node';
import { ToolResult } from '@olane/o-tool';
import { McpOAuthStorage } from './mcp-oauth-storage.js';
import { McpOAuthCallbackServer } from './mcp-oauth-callback-server.js';
import { McpDynamicRegistration } from './mcp-dynamic-registration.js';
import { MCP_OAUTH_METHODS } from './methods/mcp-oauth.methods.js';
import { OAuthClientInfo, StaticOAuthClientInfo } from './interfaces/index.js';

/**
 * MCP OAuth Manager Tool
 *
 * Coordinates OAuth authentication flows for MCP servers:
 * - Dynamic client registration (RFC 7591)
 * - PKCE authorization flow
 * - Token storage and refresh
 * - Callback server management
 */
export class McpOAuthManager extends oLaneTool {
  private storage: McpOAuthStorage;
  private callbackServer: McpOAuthCallbackServer | null = null;
  private dynamicRegistration: McpDynamicRegistration;
  private oauthToolAddress: oAddress;

  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oAddress('o://mcp/oauth'),
      description: 'OAuth authentication manager for MCP servers',
      methods: MCP_OAUTH_METHODS,
    });

    // Initialize storage adapter with o://secure
    this.storage = new McpOAuthStorage({
      storageAddress: new oAddress('o://secure'),
      useFunction: this.use.bind(this),
    });

    this.dynamicRegistration = new McpDynamicRegistration();
    this.oauthToolAddress = new oAddress('o://oauth');
  }

  /**
   * Authenticate with an OAuth-protected MCP server
   */
  async _tool_authenticate_server(request: oRequest): Promise<ToolResult> {
    const {
      serverUrl,
      clientName,
      scope,
      staticClientInfo,
      useDynamicRegistration = true,
      callbackPort = 3334,
    } = request.params;

    try {
      this.logger.info(`Starting OAuth authentication for ${serverUrl}`);

      // 1. Check if we already have valid tokens
      const existingTokens = await this.storage.getTokens(serverUrl as string);
      if (
        existingTokens &&
        !(await this.storage.areTokensExpired(serverUrl as string))
      ) {
        this.logger.info(`Already authenticated with ${serverUrl}`);
        return {
          success: true,
          message: 'Already authenticated',
          hasTokens: true,
        };
      }

      // 2. Get or register OAuth client
      let clientInfo: OAuthClientInfo;

      if (staticClientInfo) {
        // Use provided static client credentials
        this.logger.info(`Using static OAuth client info for ${serverUrl}`);
        const staticInfo = staticClientInfo as StaticOAuthClientInfo;

        // Discover endpoints if not provided
        const endpoints = await this.dynamicRegistration.discoverEndpoints(
          serverUrl as string,
        );

        clientInfo = {
          client_id: staticInfo.client_id,
          client_secret: staticInfo.client_secret,
          authorization_endpoint:
            staticInfo.authorization_endpoint ||
            endpoints.authorization_endpoint ||
            '',
          token_endpoint:
            staticInfo.token_endpoint || endpoints.token_endpoint || '',
          scope: (staticInfo.scope ||
            (scope as string) ||
            'openid profile email') as string,
        };

        if (!clientInfo.authorization_endpoint || !clientInfo.token_endpoint) {
          throw new Error(
            `Could not determine OAuth endpoints for ${serverUrl}. Please provide authorization_endpoint and token_endpoint in staticClientInfo.`,
          );
        }
      } else if (useDynamicRegistration) {
        // Dynamic client registration
        this.logger.info(
          `Attempting dynamic client registration for ${serverUrl}`,
        );

        const existingClientInfo = await this.storage.getClientInfo(
          serverUrl as string,
        );

        // Start callback server to get redirect URI
        this.callbackServer = new McpOAuthCallbackServer(
          callbackPort as number,
        );
        await this.callbackServer.start();
        const redirectUri = this.callbackServer.getCallbackUrl();

        clientInfo = await this.dynamicRegistration.getOrRegisterClient(
          serverUrl as string,
          (clientName as string) || 'Olane MCP Client',
          redirectUri,
          existingClientInfo,
          scope as string,
        );

        // Save client info to encrypted storage
        await this.storage.saveClientInfo(serverUrl as string, clientInfo);
        this.logger.info(`Client registered successfully for ${serverUrl}`);
      } else {
        throw new Error(
          `No OAuth client credentials provided for ${serverUrl}. Please provide staticClientInfo or enable useDynamicRegistration.`,
        );
      }

      // 3. Start callback server if not already started
      if (!this.callbackServer) {
        this.callbackServer = new McpOAuthCallbackServer(
          callbackPort as number,
        );
        await this.callbackServer.start();
      }

      const redirectUri = this.callbackServer.getCallbackUrl();

      // 4. Configure OAuth via existing OAuthTool
      const serviceName = this.getServiceName(serverUrl as string);

      await this.use(this.oauthToolAddress, {
        method: 'configure',
        params: {
          serviceName,
          clientId: clientInfo.client_id,
          clientSecret: clientInfo.client_secret,
          redirectUri,
          authorizationUrl: clientInfo.authorization_endpoint,
          tokenUrl: clientInfo.token_endpoint,
          scope: clientInfo.scope || scope || 'openid profile email',
        },
      });

      // 5. Get authorization URL (with PKCE)
      const authUrlResponse = await this.use(this.oauthToolAddress, {
        method: 'getAuthorizationUrl',
        params: {
          serviceName,
          scope: clientInfo.scope || scope,
        },
      });

      const authUrl =
        (authUrlResponse.result?.data as any)?.authorizationUrl ||
        (authUrlResponse.result as any)?.authorizationUrl;

      this.logger.info(`Authorization URL: ${authUrl}`);

      // 6. Launch browser
      this.logger.info('Opening browser for user authorization...');
      await this.launchBrowser(authUrl as string);

      // 7. Wait for callback
      this.logger.info('Waiting for OAuth callback...');
      const { code, state } = await this.callbackServer.waitForCallback(300000); // 5 min timeout

      this.logger.info('OAuth callback received');

      // 8. Exchange code for tokens
      const tokenResponse = await this.use(this.oauthToolAddress, {
        method: 'exchangeCode',
        params: {
          serviceName,
          code,
          state,
        },
      });

      const tokens =
        (tokenResponse.result?.data as any)?.tokens ||
        (tokenResponse.result as any)?.tokens;

      // 9. Persist tokens to encrypted storage
      await this.storage.saveTokens(serverUrl as string, tokens);

      // 10. Stop callback server
      await this.callbackServer.stop();
      this.callbackServer = null;

      this.logger.info(`OAuth authentication successful for ${serverUrl}`);

      return {
        success: true,
        message: 'OAuth authentication successful',
        serverUrl,
        hasTokens: true,
      };
    } catch (error: any) {
      // Clean up callback server on error
      if (this.callbackServer) {
        await this.callbackServer.stop().catch(() => {});
        this.callbackServer = null;
      }

      this.logger.error(`OAuth authentication failed: ${error.message}`);
      throw new Error(`OAuth authentication failed: ${error.message}`);
    }
  }

  /**
   * Refresh OAuth tokens for an MCP server
   */
  async _tool_refresh_tokens(request: oRequest): Promise<ToolResult> {
    const { serverUrl } = request.params;

    try {
      this.logger.info(`Refreshing OAuth tokens for ${serverUrl}`);

      const tokens = await this.storage.getTokens(serverUrl as string);
      if (!tokens?.refresh_token) {
        throw new Error('No refresh token available');
      }

      const serviceName = this.getServiceName(serverUrl as string);

      const refreshResponse = await this.use(this.oauthToolAddress, {
        method: 'refreshToken',
        params: {
          serviceName,
          refreshToken: tokens.refresh_token,
        },
      });

      const newTokens =
        (refreshResponse.result?.data as any)?.tokens ||
        (refreshResponse.result as any)?.tokens;

      // Save new tokens to encrypted storage
      await this.storage.saveTokens(serverUrl as string, newTokens);

      this.logger.info(`Tokens refreshed successfully for ${serverUrl}`);

      return {
        success: true,
        message: 'Tokens refreshed successfully',
      };
    } catch (error: any) {
      this.logger.error(`Token refresh failed: ${error.message}`);
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Check OAuth token status for an MCP server
   */
  async _tool_check_tokens(request: oRequest): Promise<ToolResult> {
    const { serverUrl } = request.params;

    const tokens = await this.storage.getTokens(serverUrl as string);
    const isExpired = await this.storage.areTokensExpired(serverUrl as string);

    return {
      success: true,
      hasTokens: !!tokens,
      isExpired: tokens ? isExpired : null,
      expiresAt: tokens?.expires_at || null,
      hasRefreshToken: !!tokens?.refresh_token,
    };
  }

  /**
   * Clear OAuth tokens and client info for an MCP server
   */
  async _tool_clear_tokens(request: oRequest): Promise<ToolResult> {
    const { serverUrl } = request.params;

    await this.storage.clearServer(serverUrl as string);

    this.logger.info(`Cleared OAuth data for ${serverUrl}`);

    return {
      success: true,
      message: `Cleared OAuth data for ${serverUrl}`,
    };
  }

  /**
   * List all authenticated MCP servers
   */
  async _tool_list_authenticated_servers(
    request: oRequest,
  ): Promise<ToolResult> {
    // This would require maintaining an index of servers
    // For now, return empty list
    // TODO: Implement server list tracking in storage
    return {
      success: true,
      servers: [],
      message: 'Server list tracking not yet implemented',
    };
  }

  /**
   * Public method for refreshing tokens (used by transport)
   */
  async refreshTokens(serverUrl: string): Promise<void> {
    // await this._tool_refresh_tokens({
    //   jsonrpc: '2.0',
    //   method: 'refresh_tokens',
    //   id: Date.now().toString(),
    //   params: { serverUrl },
    //   state: {},
    //   peerId: this.peerId,
    //   source: this.address!,
    //   target: this.address!,
    // } as oRequest);
  }

  /**
   * Get service name for OAuth tool
   */
  private getServiceName(serverUrl: string): string {
    return `mcp_${this.hashServerUrl(serverUrl)}`;
  }

  /**
   * Hash server URL for service name
   */
  private hashServerUrl(url: string): string {
    return Buffer.from(url)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 16);
  }

  /**
   * Launch browser for OAuth authorization
   */
  private async launchBrowser(url: string): Promise<void> {
    try {
      const open = (await import('open')).default;
      await open(url);
    } catch (error: any) {
      this.logger.warn(
        `Could not automatically open browser: ${error.message}`,
      );
      this.logger.info(`Please open this URL in your browser: ${url}`);
    }
  }

  /**
   * Cleanup on shutdown
   */
  async stop(): Promise<void> {
    if (this.callbackServer) {
      await this.callbackServer.stop().catch(() => {});
      this.callbackServer = null;
    }
    await super.stop();
  }
}
