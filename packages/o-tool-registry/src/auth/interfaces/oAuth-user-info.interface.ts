export interface OAuthUserInfo {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  [key: string]: any;
}
