/**
 * Server-Sent Events (SSE) Parser Utility
 *
 * Parses streaming responses from various LLM providers that use SSE format.
 * Most providers (Anthropic, OpenAI, Perplexity, Grok) follow a similar pattern:
 * - Lines starting with "data: " contain JSON payloads
 * - "data: [DONE]" signals stream completion
 * - Empty lines separate events
 */

/**
 * Represents a parsed SSE message
 */
export interface SSEMessage {
  event?: string;
  data?: string;
  id?: string;
  retry?: number;
}

/**
 * Parse a single SSE line
 */
function parseSSELine(line: string): { field: string; value: string } | null {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) {
    return null;
  }

  const field = line.substring(0, colonIndex);
  let value = line.substring(colonIndex + 1);

  // SSE spec: remove a single leading space if present
  if (value.startsWith(' ')) {
    value = value.substring(1);
  }

  return { field, value };
}

/**
 * Parse a buffer of SSE text into individual messages
 *
 * @param buffer - The text buffer containing SSE data
 * @returns Array of parsed SSE messages
 */
export function parseSSE(buffer: string): SSEMessage[] {
  const messages: SSEMessage[] = [];
  const lines = buffer.split(/\r\n|\r|\n/);

  let currentMessage: SSEMessage = {};

  for (const line of lines) {
    // Empty line indicates end of message
    if (line.trim() === '') {
      if (Object.keys(currentMessage).length > 0) {
        messages.push(currentMessage);
        currentMessage = {};
      }
      continue;
    }

    // Ignore comment lines (start with :)
    if (line.startsWith(':')) {
      continue;
    }

    const parsed = parseSSELine(line);
    if (!parsed) {
      continue;
    }

    const { field, value } = parsed;

    switch (field) {
      case 'event':
        currentMessage.event = value;
        break;
      case 'data':
        currentMessage.data = (currentMessage.data || '') + value;
        break;
      case 'id':
        currentMessage.id = value;
        break;
      case 'retry':
        currentMessage.retry = parseInt(value, 10);
        break;
    }
  }

  // Add final message if exists
  if (Object.keys(currentMessage).length > 0) {
    messages.push(currentMessage);
  }

  return messages;
}

/**
 * Check if SSE data indicates stream completion
 */
export function isStreamDone(data: string): boolean {
  return data.trim() === '[DONE]';
}

/**
 * AsyncGenerator that yields parsed chunks from a ReadableStream
 *
 * @param stream - The response stream from fetch
 * @yields Parsed JSON data from each SSE message
 */
export async function* streamSSEChunks(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<any, void, unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages in buffer
      const lines = buffer.split('\n');

      // Keep last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }

        // Parse SSE line
        if (line.startsWith('data: ')) {
          const data = line.substring(6); // Remove 'data: ' prefix

          // Check for stream completion
          if (isStreamDone(data)) {
            return;
          }

          try {
            // Parse JSON data
            const parsed = JSON.parse(data);
            yield parsed;
          } catch (error) {
            // If not JSON, yield raw data
            yield { text: data };
          }
        }
      }
    }

    // Process any remaining data in buffer
    if (buffer.trim()) {
      const lines = buffer.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          if (!isStreamDone(data)) {
            try {
              const parsed = JSON.parse(data);
              yield parsed;
            } catch (error) {
              yield { text: data };
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Extract text content from Anthropic streaming chunk
 */
export function extractAnthropicContent(chunk: any): string {
  if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
    return chunk.delta.text;
  }
  return '';
}

/**
 * Extract text content from OpenAI streaming chunk
 */
export function extractOpenAIContent(chunk: any): string {
  if (chunk.choices?.[0]?.delta?.content) {
    return chunk.choices[0].delta.content;
  }
  return '';
}

/**
 * Extract text content from Ollama streaming chunk
 */
export function extractOllamaContent(chunk: any): string {
  if (chunk.response) {
    return chunk.response;
  }
  if (chunk.message?.content) {
    return chunk.message.content;
  }
  return '';
}

/**
 * Extract text content from Perplexity streaming chunk
 */
export function extractPerplexityContent(chunk: any): string {
  if (chunk.choices?.[0]?.delta?.content) {
    return chunk.choices[0].delta.content;
  }
  return '';
}

/**
 * Extract text content from Grok streaming chunk
 */
export function extractGrokContent(chunk: any): string {
  if (chunk.choices?.[0]?.delta?.content) {
    return chunk.choices[0].delta.content;
  }
  return '';
}

/**
 * Extract text content from Gemini streaming chunk
 */
export function extractGeminiContent(chunk: any): string {
  if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
    return chunk.candidates[0].content.parts[0].text;
  }
  return '';
}

/**
 * Generic content extractor that tries multiple patterns
 */
export function extractContent(chunk: any, provider?: string): string {
  if (!chunk) {
    return '';
  }

  // Try provider-specific extraction first
  switch (provider) {
    case 'anthropic':
      return extractAnthropicContent(chunk);
    case 'openai':
      return extractOpenAIContent(chunk);
    case 'ollama':
      return extractOllamaContent(chunk);
    case 'perplexity':
      return extractPerplexityContent(chunk);
    case 'grok':
      return extractGrokContent(chunk);
    case 'gemini':
      return extractGeminiContent(chunk);
  }

  // Fallback: try common patterns
  const patterns = [
    // OpenAI/Perplexity/Grok pattern
    () => chunk.choices?.[0]?.delta?.content,
    // Anthropic pattern
    () => chunk.delta?.text,
    // Ollama pattern
    () => chunk.response,
    () => chunk.message?.content,
    // Gemini pattern
    () => chunk.candidates?.[0]?.content?.parts?.[0]?.text,
    // Direct text field
    () => chunk.text,
    () => chunk.content,
  ];

  for (const pattern of patterns) {
    try {
      const result = pattern();
      if (result !== undefined && result !== null) {
        return String(result);
      }
    } catch {
      continue;
    }
  }

  return '';
}
