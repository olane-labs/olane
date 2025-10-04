import { OAuthClientInfo } from './interfaces/oauth-client-info.interface.js';
import { ClientMetadata } from './interfaces/client-metadata.interface.js';

/**
 * Implements RFC 7591 Dynamic Client Registration for OAuth 2.0
 *
 * This class handles automatic registration of OAuth clients with remote servers
 * that support dynamic client registration.
 */
export class McpDynamicRegistration {
  /**
   * Register a new OAuth client dynamically
   */
  async registerClient(
    registrationEndpoint: string,
    clientMetadata: ClientMetadata,
  ): Promise<OAuthClientInfo> {
    const response = await fetch(registrationEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(clientMetadata),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Dynamic client registration failed: ${response.status} ${errorText}`,
      );
    }

    const registrationResponse = await response.json();

    return {
      client_id: registrationResponse.client_id,
      client_secret: registrationResponse.client_secret,
      authorization_endpoint:
        registrationResponse.authorization_endpoint ||
        registrationResponse.authorization_url,
      token_endpoint:
        registrationResponse.token_endpoint || registrationResponse.token_url,
      registration_endpoint: registrationEndpoint,
      scope: clientMetadata.scope,
      redirect_uris: registrationResponse.redirect_uris,
      grant_types: registrationResponse.grant_types,
      response_types: registrationResponse.response_types,
    };
  }

  /**
   * Discover OAuth endpoints from a server URL
   * Tries to find .well-known/oauth-authorization-server or OpenID Connect discovery
   */
  async discoverEndpoints(serverUrl: string): Promise<{
    authorization_endpoint?: string;
    token_endpoint?: string;
    registration_endpoint?: string;
  }> {
    const wellKnownUrls = [
      `${serverUrl}/.well-known/oauth-authorization-server`,
      `${serverUrl}/.well-known/openid-configuration`,
    ];

    for (const wellKnownUrl of wellKnownUrls) {
      try {
        const response = await fetch(wellKnownUrl);
        if (response.ok) {
          const discovery = await response.json();
          return {
            authorization_endpoint: discovery.authorization_endpoint,
            token_endpoint: discovery.token_endpoint,
            registration_endpoint: discovery.registration_endpoint,
          };
        }
      } catch (error) {
        // Try next well-known URL
        continue;
      }
    }

    return {};
  }

  /**
   * Create client metadata for registration
   */
  createClientMetadata(
    clientName: string,
    redirectUri: string,
    scope?: string,
  ): ClientMetadata {
    return {
      client_name: clientName,
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_basic',
      application_type: 'native',
      scope: scope || 'openid profile email',
    };
  }

  /**
   * Get or register an OAuth client
   * Returns cached client info if available, otherwise performs registration
   */
  async getOrRegisterClient(
    serverUrl: string,
    clientName: string,
    redirectUri: string,
    existingClientInfo?: OAuthClientInfo | null,
    scope?: string,
  ): Promise<OAuthClientInfo> {
    // Return existing client info if valid
    if (existingClientInfo?.client_id) {
      return existingClientInfo;
    }

    // Discover endpoints
    const endpoints = await this.discoverEndpoints(serverUrl);

    if (!endpoints.registration_endpoint) {
      throw new Error(
        `No registration endpoint found for server: ${serverUrl}. ` +
          `Please provide static OAuth client credentials instead.`,
      );
    }

    if (!endpoints.authorization_endpoint || !endpoints.token_endpoint) {
      throw new Error(
        `Could not discover OAuth endpoints for server: ${serverUrl}`,
      );
    }

    // Create client metadata
    const clientMetadata = this.createClientMetadata(
      clientName,
      redirectUri,
      scope,
    );

    // Register the client
    const clientInfo = await this.registerClient(
      endpoints.registration_endpoint,
      clientMetadata,
    );

    // Add discovered endpoints
    clientInfo.authorization_endpoint = endpoints.authorization_endpoint;
    clientInfo.token_endpoint = endpoints.token_endpoint;

    return clientInfo;
  }
}
