export class oPlanContext {
  private context: string[] = [];
  constructor(context: any) {
    this.context = context;
  }

  add(value: string) {
    this.context.push(value);
  }

  addAll(contexts: string[]) {
    try {
      for (const context of contexts) {
        this.context.push(context);
      }
    } catch (e) {
      console.error('Error adding contexts: ', e);
    }
  }

  clear() {
    this.context = [];
  }

  toJSON() {
    return this.context;
  }

  toString() {
    return '\n\n' + this.context.join('\n') + '\n\n';
  }
}
