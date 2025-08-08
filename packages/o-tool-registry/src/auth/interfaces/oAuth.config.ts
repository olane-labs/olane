export interface OAuthConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl?: string;
  scope?: string;
  responseType?: 'code' | 'token';
  grantType?: 'authorization_code' | 'client_credentials' | 'refresh_token';
  tokenValidationUrl?: string;
  tokenRevocationUrl?: string;
}
