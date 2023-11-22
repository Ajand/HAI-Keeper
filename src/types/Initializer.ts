export interface Arg {
  key: string;
  type: any;
  required?: boolean;
  default?: any;
  help?: string;
}

export interface KeyPass {
  key_file: string;
  pass_file: string;
}

export interface KeyValue {
  [key: string]: string | boolean | Array<string>;
}
