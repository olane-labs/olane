/**
 * Stateful parser for extracting field values from streaming JSON
 * Emits only new content (deltas) as it arrives
 */
export class ResultStreamParser {
  private buffer = '';
  private isInResultValue = false;
  private resultStartIndex = -1;
  private lastEmittedLength = 0;
  private resultValue = '';
  private attributeName: string;

  /**
   * @param attributeName - The JSON attribute name to extract (defaults to "result")
   */
  constructor(attributeName: string = 'result') {
    this.attributeName = attributeName;
  }

  /**
   * Process a new chunk and return only the new content from the specified field
   * @param delta - The new chunk of JSON string data
   * @returns Only the new content within the field value, or null if not yet in field
   */
  processChunk(delta: string): string | null {
    this.buffer += delta;

    // If we haven't found the field yet, look for it
    if (!this.isInResultValue) {
      const escapedAttributeName = this.attributeName.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );
      const match = this.buffer.match(
        new RegExp(`"${escapedAttributeName}"\\s*:\\s*"`),
      );
      if (match) {
        this.isInResultValue = true;
        this.resultStartIndex = (match.index ?? 0) + match[0].length;
        this.lastEmittedLength = 0;
      } else {
        return null; // Haven't reached the target field yet
      }
    }

    // Extract content after the attribute: "
    if (this.isInResultValue && this.resultStartIndex >= 0) {
      const contentAfterResult = this.buffer.substring(this.resultStartIndex);

      // Find the end of the string value (unescaped quote)
      let endIndex = -1;
      let i = 0;
      while (i < contentAfterResult.length) {
        if (contentAfterResult[i] === '\\') {
          i += 2; // Skip escaped character
          continue;
        }
        if (contentAfterResult[i] === '"') {
          endIndex = i;
          break;
        }
        i++;
      }

      // Extract the result value (up to end quote or current position)
      const currentValue =
        endIndex >= 0
          ? contentAfterResult.substring(0, endIndex)
          : contentAfterResult;

      // Calculate and emit only the NEW content (delta)
      const newContent = currentValue.substring(this.lastEmittedLength);
      this.lastEmittedLength = currentValue.length;
      this.resultValue = currentValue;

      return newContent || null;
    }

    return null;
  }

  /**
   * Get the complete field value accumulated so far
   * @returns The full field value
   */
  getResultValue(): string {
    return this.resultValue;
  }

  /**
   * Check if the parser has found and is processing the target field
   * @returns true if currently inside the field value
   */
  isInResult(): boolean {
    return this.isInResultValue;
  }

  /**
   * Reset the parser state for reuse
   */
  reset(): void {
    this.buffer = '';
    this.isInResultValue = false;
    this.resultStartIndex = -1;
    this.lastEmittedLength = 0;
    this.resultValue = '';
  }
}
