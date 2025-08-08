import { oHostNodeTool, oToolConfig } from '@olane/o-tool';
import { oAddress } from '@olane/o-core';
import { OAuthConfig } from './interfaces/oAuth.config';
import { OAuthTokens } from './interfaces/oAuth-tokens.interface';
import { OAuthUserInfo } from './interfaces/oAuth-user-info.interface';
import { oauthMethods } from './methods/auth.methods';

export class OAuthTool extends oHostNodeTool {
  private oauthConfigs: Map<string, OAuthConfig> = new Map();
  private tokenStore: Map<string, OAuthTokens> = new Map();

  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://oauth'),
      description:
        'Generic OAuth client tool for custom OAuth provider services',
      methods: oauthMethods,
    });
  }

  // Tool methods
  async _tool_configure(request: any): Promise<any> {
    const { serviceName, ...config } = request.params;

    if (!serviceName) {
      throw new Error('Service name is required');
    }

    const oauthConfig: OAuthConfig = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      authorizationUrl: config.authorizationUrl,
      tokenUrl: config.tokenUrl,
      userInfoUrl: config.userInfoUrl,
      scope: config.scope || 'openid profile email',
      responseType: config.responseType || 'code',
      grantType: config.grantType || 'authorization_code',
      tokenValidationUrl: config.tokenValidationUrl,
      tokenRevocationUrl: config.tokenRevocationUrl,
    };

    this.oauthConfigs.set(serviceName, oauthConfig);

    this.logger.info(`OAuth configuration saved for service: ${serviceName}`);

    return {
      success: true,
      serviceName,
      message: `OAuth configuration saved for service: ${serviceName}`,
      endpoints: {
        authorization: config.authorizationUrl,
        token: config.tokenUrl,
        userInfo: config.userInfoUrl,
        tokenValidation: config.tokenValidationUrl,
        tokenRevocation: config.tokenRevocationUrl,
      },
    };
  }

  async _tool_getAuthorizationUrl(request: any): Promise<any> {
    const { serviceName, state, scope, additionalParams } = request.params;

    const config = this.oauthConfigs.get(serviceName);
    if (!config) {
      throw new Error(
        `OAuth configuration not found for service: ${serviceName}`,
      );
    }

    const url = new URL(config.authorizationUrl);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', config.redirectUri);
    url.searchParams.set('response_type', config.responseType || 'code');
    url.searchParams.set('scope', scope || config.scope);

    if (state) {
      url.searchParams.set('state', state);
    }

    // Add PKCE support for authorization code flow
    if (config.responseType === 'code') {
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);

      url.searchParams.set('code_challenge', codeChallenge);
      url.searchParams.set('code_challenge_method', 'S256');

      // Store code verifier for later use
      this.tokenStore.set(`${serviceName}_code_verifier`, {
        code_verifier: codeVerifier,
        access_token: '',
        token_type: '',
      });
    }

    // Add any additional parameters
    if (additionalParams && typeof additionalParams === 'object') {
      Object.entries(additionalParams).forEach(([key, value]) => {
        if (typeof value === 'string') {
          url.searchParams.set(key, value);
        }
      });
    }

    return {
      authorizationUrl: url.toString(),
      serviceName,
      state,
      scope: scope || config.scope,
    };
  }

  async _tool_exchangeCode(request: any): Promise<any> {
    const { serviceName, code, state } = request.params;

    const config = this.oauthConfigs.get(serviceName);
    if (!config) {
      throw new Error(
        `OAuth configuration not found for service: ${serviceName}`,
      );
    }

    const tokenData: any = {
      grant_type: config.grantType,
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      code,
    };

    if (config.clientSecret) {
      tokenData.client_secret = config.clientSecret;
    }

    // Add PKCE code verifier if available
    const storedVerifier = this.tokenStore.get(`${serviceName}_code_verifier`);
    if (storedVerifier?.code_verifier) {
      tokenData.code_verifier = storedVerifier.code_verifier;
      this.tokenStore.delete(`${serviceName}_code_verifier`);
    }

    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Token exchange failed: ${response.status} ${errorText}`,
        );
      }

      const tokens: OAuthTokens = await response.json();

      // Store tokens
      this.tokenStore.set(`${serviceName}_tokens`, tokens);

      this.logger.info(`Token exchange successful for service: ${serviceName}`);

      return {
        success: true,
        serviceName,
        tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_type: tokens.token_type,
          expires_in: tokens.expires_in,
          scope: tokens.scope,
        },
      };
    } catch (error) {
      this.logger.error(
        `Token exchange failed for service ${serviceName}:`,
        error,
      );
      throw error;
    }
  }

  async _tool_refreshToken(request: any): Promise<any> {
    const { serviceName, refreshToken } = request.params;

    const config = this.oauthConfigs.get(serviceName);
    if (!config) {
      throw new Error(
        `OAuth configuration not found for service: ${serviceName}`,
      );
    }

    const tokenData: any = {
      grant_type: 'refresh_token',
      client_id: config.clientId,
      refresh_token: refreshToken,
    };

    if (config.clientSecret) {
      tokenData.client_secret = config.clientSecret;
    }

    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Token refresh failed: ${response.status} ${errorText}`,
        );
      }

      const tokens: OAuthTokens = await response.json();

      // Update stored tokens
      const existingTokens = this.tokenStore.get(`${serviceName}_tokens`);
      if (existingTokens) {
        existingTokens.access_token = tokens.access_token;
        existingTokens.expires_in = tokens.expires_in;
        if (tokens.refresh_token) {
          existingTokens.refresh_token = tokens.refresh_token;
        }
        this.tokenStore.set(`${serviceName}_tokens`, existingTokens);
      }

      this.logger.info(`Token refresh successful for service: ${serviceName}`);

      return {
        success: true,
        serviceName,
        tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_type: tokens.token_type,
          expires_in: tokens.expires_in,
          scope: tokens.scope,
        },
      };
    } catch (error) {
      this.logger.error(
        `Token refresh failed for service ${serviceName}:`,
        error,
      );
      throw error;
    }
  }

  async _tool_getUserInfo(request: any): Promise<any> {
    const { serviceName, accessToken, userInfoUrl } = request.params;

    const config = this.oauthConfigs.get(serviceName);
    if (!config) {
      throw new Error(
        `OAuth configuration not found for service: ${serviceName}`,
      );
    }

    const url = userInfoUrl || config.userInfoUrl;
    if (!url) {
      throw new Error(
        `No user info URL configured for service: ${serviceName}`,
      );
    }

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `User info request failed: ${response.status} ${errorText}`,
        );
      }

      const userInfo: OAuthUserInfo = await response.json();

      return {
        success: true,
        serviceName,
        userInfo,
      };
    } catch (error) {
      this.logger.error(
        `User info request failed for service ${serviceName}:`,
        error,
      );
      throw error;
    }
  }

  async _tool_validateToken(request: any): Promise<any> {
    const { serviceName, accessToken, tokenValidationUrl } = request.params;

    const config = this.oauthConfigs.get(serviceName);
    if (!config) {
      throw new Error(
        `OAuth configuration not found for service: ${serviceName}`,
      );
    }

    const url = tokenValidationUrl || config.tokenValidationUrl;
    if (!url) {
      throw new Error(
        `No token validation URL configured for service: ${serviceName}`,
      );
    }

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      const isValid = response.ok;

      return {
        success: true,
        serviceName,
        isValid,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      this.logger.error(
        `Token validation failed for service ${serviceName}:`,
        error,
      );
      return {
        success: true,
        serviceName,
        isValid: false,
        error: error.message,
      };
    }
  }

  async _tool_revokeToken(request: any): Promise<any> {
    const {
      serviceName,
      token,
      tokenType = 'access_token',
      tokenRevocationUrl,
    } = request.params;

    const config = this.oauthConfigs.get(serviceName);
    if (!config) {
      throw new Error(
        `OAuth configuration not found for service: ${serviceName}`,
      );
    }

    const url = tokenRevocationUrl || config.tokenRevocationUrl;
    if (!url) {
      throw new Error(
        `No token revocation URL configured for service: ${serviceName}`,
      );
    }

    const revocationData: any = {
      token,
      client_id: config.clientId,
    };

    if (config.clientSecret) {
      revocationData.client_secret = config.clientSecret;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(revocationData),
      });

      const isRevoked = response.ok;

      // Remove tokens from storage if revoked
      if (isRevoked) {
        const storedTokens = this.tokenStore.get(`${serviceName}_tokens`);
        if (storedTokens) {
          if (
            tokenType === 'access_token' &&
            storedTokens.access_token === token
          ) {
            this.tokenStore.delete(`${serviceName}_tokens`);
          } else if (
            tokenType === 'refresh_token' &&
            storedTokens.refresh_token === token
          ) {
            delete storedTokens.refresh_token;
            this.tokenStore.set(`${serviceName}_tokens`, storedTokens);
          }
        }
      }

      return {
        success: true,
        serviceName,
        isRevoked,
        tokenType,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      this.logger.error(
        `Token revocation failed for service ${serviceName}:`,
        error,
      );
      return {
        success: true,
        serviceName,
        isRevoked: false,
        tokenType,
        error: error.message,
      };
    }
  }

  async _tool_listServices(request: any): Promise<any> {
    const services = Array.from(this.oauthConfigs.keys());

    return {
      success: true,
      services,
      count: services.length,
    };
  }

  async _tool_getStoredTokens(request: any): Promise<any> {
    const { serviceName } = request.params;

    if (serviceName) {
      const tokens = this.tokenStore.get(`${serviceName}_tokens`);
      return {
        success: true,
        serviceName,
        hasTokens: !!tokens,
        tokens: tokens
          ? {
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              token_type: tokens.token_type,
              expires_in: tokens.expires_in,
              scope: tokens.scope,
            }
          : null,
      };
    } else {
      const allTokens: Record<string, any> = {};
      for (const [key, value] of this.tokenStore.entries()) {
        if (key.endsWith('_tokens')) {
          const serviceName = key.replace('_tokens', '');
          allTokens[serviceName] = {
            access_token: value.access_token,
            refresh_token: value.refresh_token,
            token_type: value.token_type,
            expires_in: value.expires_in,
            scope: value.scope,
          };
        }
      }

      return {
        success: true,
        tokens: allTokens,
      };
    }
  }

  async _tool_clearTokens(request: any): Promise<any> {
    const { serviceName } = request.params;

    if (serviceName) {
      this.tokenStore.delete(`${serviceName}_tokens`);
      this.tokenStore.delete(`${serviceName}_code_verifier`);

      return {
        success: true,
        serviceName,
        message: `Tokens cleared for service: ${serviceName}`,
      };
    } else {
      // Clear all tokens
      for (const key of this.tokenStore.keys()) {
        if (key.endsWith('_tokens') || key.endsWith('_code_verifier')) {
          this.tokenStore.delete(key);
        }
      }

      return {
        success: true,
        message: 'All tokens cleared',
      };
    }
  }

  // Helper methods
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(new Uint8Array(digest));
  }

  private base64URLEncode(buffer: Uint8Array): string {
    return btoa(String.fromCharCode(...buffer))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}
