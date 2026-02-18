import type { oTokenProvider, oTokenResult } from './o-token-provider.js';

export interface OAuth2TokenResponse {
  access_token: string;
  expires_in?: number; // seconds
  refresh_token?: string;
  token_type?: string;
  [key: string]: any;
}

export interface RefreshTokenProviderConfig {
  tokenEndpoint: string;
  refreshToken: string;
  clientId?: string;
  clientSecret?: string;
  headers?: Record<string, string>;
  additionalParams?: Record<string, string>;
  parseResponse?: (body: any) => oTokenResult;
}

export class RefreshTokenProvider implements oTokenProvider {
  private tokenEndpoint: string;
  private refreshToken: string;
  private clientId?: string;
  private clientSecret?: string;
  private headers: Record<string, string>;
  private additionalParams: Record<string, string>;
  private parseResponse: (body: any) => oTokenResult;

  constructor(config: RefreshTokenProviderConfig) {
    this.tokenEndpoint = config.tokenEndpoint;
    this.refreshToken = config.refreshToken;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.headers = config.headers ?? {};
    this.additionalParams = config.additionalParams ?? {};
    this.parseResponse = config.parseResponse ?? RefreshTokenProvider.defaultParseResponse;
  }

  async acquireToken(): Promise<oTokenResult> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      ...this.additionalParams,
    });

    if (this.clientId) {
      body.set('client_id', this.clientId);
    }
    if (this.clientSecret) {
      body.set('client_secret', this.clientSecret);
    }

    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...this.headers,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `Token refresh failed: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`,
      );
    }

    const json = await response.json();
    const result = this.parseResponse(json);

    // Rotate stored refresh token if the provider returned a new one
    if (result.refreshToken) {
      this.refreshToken = result.refreshToken;
    }

    return result;
  }

  updateRefreshToken(token: string): void {
    this.refreshToken = token;
  }

  static defaultParseResponse(body: OAuth2TokenResponse): oTokenResult {
    if (!body.access_token) {
      throw new Error('Token response missing access_token');
    }

    const result: oTokenResult = {
      token: body.access_token,
    };

    if (body.expires_in != null) {
      result.expiresAt = Math.floor(Date.now() / 1000) + body.expires_in;
    }

    if (body.refresh_token) {
      result.refreshToken = body.refresh_token;
    }

    return result;
  }
}
