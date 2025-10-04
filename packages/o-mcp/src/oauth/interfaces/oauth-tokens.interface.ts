export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  expires_at?: number; // timestamp when token expires
  scope?: string;
  code_verifier?: string; // For PKCE flow
}
