import { oParameter as oParameterType } from '@olane/o-protocol';

export class oParameter implements oParameterType {
  name: string;
  type: string;
  value: any;
  description?: string;
  required?: boolean;

  constructor(config: oParameterType) {
    this.name = config.name;
    this.type = config.type;
    this.value = config.value;
    this.description = config.description;
    this.required = config.required;
  }

  toJSON(): oParameterType {
    return {
      name: this.name,
      type: this.type,
      value: this.value,
      description: this.description,
      required: this.required,
    };
  }

  toString(): string {
    return JSON.stringify(this.toJSON());
  }
}
