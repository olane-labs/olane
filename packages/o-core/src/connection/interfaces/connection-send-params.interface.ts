export interface ConnectionSendParams {
  address: string;
  payload: {
    [key: string]: unknown;
  };
  id?: string;
  stream?: boolean;
}
