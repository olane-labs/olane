/**
 * Utility class for building markdown formatted strings
 * Used for programmatic content generation (execution traces, etc.)
 * NOT used for AI-generated responses - AI handles its own formatting
 */
export class MarkdownBuilder {
  private parts: string[] = [];

  /**
   * Add a header
   */
  header(text: string, level: number = 1): this {
    const prefix = '#'.repeat(Math.max(1, Math.min(6, level)));
    this.parts.push(`${prefix} ${text}`);
    this.parts.push('');
    return this;
  }

  /**
   * Add a paragraph
   */
  paragraph(text: string): this {
    if (text) {
      this.parts.push(text);
      this.parts.push('');
    }
    return this;
  }

  /**
   * Add a bulleted list
   */
  list(items: string[], ordered: boolean = false): this {
    items.forEach((item, idx) => {
      const prefix = ordered ? `${idx + 1}. ` : '- ';
      this.parts.push(`${prefix}${item}`);
    });
    this.parts.push('');
    return this;
  }

  /**
   * Add a code block
   */
  code(content: string, language: string = ''): this {
    this.parts.push(`\`\`\`${language}`);
    this.parts.push(content);
    this.parts.push('```');
    this.parts.push('');
    return this;
  }

  /**
   * Add inline code
   */
  inline(text: string): string {
    return `\`${text}\``;
  }

  /**
   * Add bold text
   */
  bold(text: string): string {
    return `**${text}**`;
  }

  /**
   * Add italic text
   */
  italic(text: string): string {
    return `*${text}*`;
  }

  /**
   * Add a link
   */
  link(text: string, url: string): string {
    return `[${text}](${url})`;
  }

  /**
   * Add a collapsible details section
   */
  details(summary: string, content: string): this {
    this.parts.push('<details>');
    this.parts.push(`<summary>${summary}</summary>`);
    this.parts.push('');
    this.parts.push(content);
    this.parts.push('</details>');
    this.parts.push('');
    return this;
  }

  /**
   * Add a horizontal rule
   */
  hr(): this {
    this.parts.push('---');
    this.parts.push('');
    return this;
  }

  /**
   * Add raw text without additional spacing
   */
  raw(text: string): this {
    this.parts.push(text);
    return this;
  }

  /**
   * Add a line break
   */
  br(): this {
    this.parts.push('');
    return this;
  }

  /**
   * Build the final markdown string
   */
  build(): string {
    return this.parts.join('\n').trim();
  }

  /**
   * Create a new builder instance
   */
  static create(): MarkdownBuilder {
    return new MarkdownBuilder();
  }
}
