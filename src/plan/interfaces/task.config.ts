export interface oTaskConfig {
  address: string;
  payload: {
    method: string;
    params: { [key: string]: any };
  };
}
