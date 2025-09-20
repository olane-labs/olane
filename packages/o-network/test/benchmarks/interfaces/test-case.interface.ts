export interface TestCase {
  name: string;
  description: string;
  input: string;
  output: {
    contains?: string;
    matches?: string;
  };
}
