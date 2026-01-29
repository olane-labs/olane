export interface ConnectionSendParams {
  address: string;
  payload: {
    [key: string]: any;
  };
  id?: string;
  isStream?: boolean;
}
