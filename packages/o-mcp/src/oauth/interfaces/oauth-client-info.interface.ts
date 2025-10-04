export interface OAuthClientInfo {
  client_id: string;
  client_secret?: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  scope?: string;
  redirect_uris?: string[];
  grant_types?: string[];
  response_types?: string[];
}
