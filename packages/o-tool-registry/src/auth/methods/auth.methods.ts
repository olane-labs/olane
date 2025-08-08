import { oMethod } from '@olane/o-protocol';

export const oauthMethods: { [key: string]: oMethod } = {
  configure: {
    name: 'configure',
    description: 'Configure OAuth service settings',
    dependencies: [],
    parameters: [
      {
        name: 'serviceName',
        type: 'string',
        value: 'string',
        description:
          'Name of the OAuth service (e.g., myapp-auth, custom-provider)',
        required: true,
      },
      {
        name: 'clientId',
        type: 'string',
        value: 'string',
        description: 'OAuth client ID from your service',
        required: true,
      },
      {
        name: 'clientSecret',
        type: 'string',
        value: 'string',
        description: 'OAuth client secret (optional for public clients)',
        required: false,
      },
      {
        name: 'redirectUri',
        type: 'string',
        value: 'string',
        description: 'OAuth redirect URI registered with your service',
        required: true,
      },
      {
        name: 'authorizationUrl',
        type: 'string',
        value: 'string',
        description: 'OAuth authorization endpoint URL from your service',
        required: true,
      },
      {
        name: 'tokenUrl',
        type: 'string',
        value: 'string',
        description: 'OAuth token endpoint URL from your service',
        required: true,
      },
      {
        name: 'userInfoUrl',
        type: 'string',
        value: 'string',
        description: 'User info endpoint URL from your service',
        required: false,
      },
      {
        name: 'scope',
        type: 'string',
        value: 'string',
        description: 'OAuth scope (default: openid profile email)',
        required: false,
      },
      {
        name: 'responseType',
        type: 'string',
        value: 'string',
        description: 'OAuth response type (default: code)',
        required: false,
      },
      {
        name: 'grantType',
        type: 'string',
        value: 'string',
        description: 'OAuth grant type (default: authorization_code)',
        required: false,
      },
      {
        name: 'tokenValidationUrl',
        type: 'string',
        value: 'string',
        description: 'Token validation endpoint URL from your service',
        required: false,
      },
      {
        name: 'tokenRevocationUrl',
        type: 'string',
        value: 'string',
        description: 'Token revocation endpoint URL from your service',
        required: false,
      },
    ],
  },

  getAuthorizationUrl: {
    name: 'getAuthorizationUrl',
    description: 'Get OAuth authorization URL',
    dependencies: [],
    parameters: [
      {
        name: 'serviceName',
        type: 'string',
        value: 'string',
        description: 'Name of the OAuth service',
        required: true,
      },
      {
        name: 'state',
        type: 'string',
        value: 'string',
        description: 'OAuth state parameter for CSRF protection',
        required: false,
      },
      {
        name: 'scope',
        type: 'string',
        value: 'string',
        description: 'Override default scope',
        required: false,
      },
      {
        name: 'additionalParams',
        type: 'object',
        value: 'object',
        description:
          'Additional query parameters to include in authorization URL',
        required: false,
      },
    ],
  },

  exchangeCode: {
    name: 'exchangeCode',
    description: 'Exchange authorization code for access token',
    dependencies: [],
    parameters: [
      {
        name: 'serviceName',
        type: 'string',
        value: 'string',
        description: 'Name of the OAuth service',
        required: true,
      },
      {
        name: 'code',
        type: 'string',
        value: 'string',
        description: 'Authorization code from OAuth callback',
        required: true,
      },
      {
        name: 'state',
        type: 'string',
        value: 'string',
        description: 'OAuth state parameter',
        required: false,
      },
    ],
  },

  refreshToken: {
    name: 'refreshToken',
    description: 'Refresh access token using refresh token',
    dependencies: [],
    parameters: [
      {
        name: 'serviceName',
        type: 'string',
        value: 'string',
        description: 'Name of the OAuth service',
        required: true,
      },
      {
        name: 'refreshToken',
        type: 'string',
        value: 'string',
        description: 'Refresh token to exchange for new access token',
        required: true,
      },
    ],
  },

  getUserInfo: {
    name: 'getUserInfo',
    description: 'Get user information using access token',
    dependencies: [],
    parameters: [
      {
        name: 'serviceName',
        type: 'string',
        value: 'string',
        description: 'Name of the OAuth service',
        required: true,
      },
      {
        name: 'accessToken',
        type: 'string',
        value: 'string',
        description: 'Access token to use for user info request',
        required: true,
      },
      {
        name: 'userInfoUrl',
        type: 'string',
        value: 'string',
        description: 'Override default user info URL',
        required: false,
      },
    ],
  },

  validateToken: {
    name: 'validateToken',
    description: 'Validate access token',
    dependencies: [],
    parameters: [
      {
        name: 'serviceName',
        type: 'string',
        value: 'string',
        description: 'Name of the OAuth service',
        required: true,
      },
      {
        name: 'accessToken',
        type: 'string',
        value: 'string',
        description: 'Access token to validate',
        required: true,
      },
      {
        name: 'tokenValidationUrl',
        type: 'string',
        value: 'string',
        description: 'Override default token validation URL',
        required: false,
      },
    ],
  },

  revokeToken: {
    name: 'revokeToken',
    description: 'Revoke access or refresh token',
    dependencies: [],
    parameters: [
      {
        name: 'serviceName',
        type: 'string',
        value: 'string',
        description: 'Name of the OAuth service',
        required: true,
      },
      {
        name: 'token',
        type: 'string',
        value: 'string',
        description: 'Token to revoke (access or refresh token)',
        required: true,
      },
      {
        name: 'tokenType',
        type: 'string',
        value: 'string',
        description: 'Type of token to revoke (access_token or refresh_token)',
        required: false,
      },
      {
        name: 'tokenRevocationUrl',
        type: 'string',
        value: 'string',
        description: 'Override default token revocation URL',
        required: false,
      },
    ],
  },

  listServices: {
    name: 'listServices',
    description: 'List all configured OAuth services',
    dependencies: [],
    parameters: [],
  },

  getStoredTokens: {
    name: 'getStoredTokens',
    description: 'Get stored tokens for OAuth service',
    dependencies: [],
    parameters: [
      {
        name: 'serviceName',
        type: 'string',
        value: 'string',
        description: 'Name of the OAuth service (if not provided, returns all)',
        required: false,
      },
    ],
  },

  clearTokens: {
    name: 'clearTokens',
    description: 'Clear stored tokens for OAuth service',
    dependencies: [],
    parameters: [
      {
        name: 'serviceName',
        type: 'string',
        value: 'string',
        description: 'Name of the OAuth service (if not provided, clears all)',
        required: false,
      },
    ],
  },
};
