export interface oParameterStructure {
  objectProperties?: Record<string, oParameter>;
  arrayItems?: oParameter;
  enum?: any[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

export interface oParameter {
  name: string;
  type: string;
  value?: any;
  description?: string;
  required?: boolean;
  options?: any[];
  structure?: oParameterStructure;
  schema?: any;
  defaultValue?: any;
  exampleValues?: any[];
  validationRules?: string[];
}
