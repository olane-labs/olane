export class RegexUtils {
  static extractResultFromAI(message: string): any {
    // handle 4 levels of nested JSON
    const match = message.match(/\{.+\}/s);

    const json = match ? match[0] : null;
    if (!json) {
      throw new Error('AI failed to return a valid JSON object');
    }

    // process the result and react
    const planResult = JSON.parse(json);
    return planResult;
  }
}
