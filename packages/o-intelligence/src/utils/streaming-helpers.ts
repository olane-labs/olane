/**
 * Shared streaming helper functions for o-intelligence providers
 */

import { streamSSEChunks } from './sse-parser.js';
import { StreamChunk } from '../types/streaming.types.js';

/**
 * Generic SSE streaming handler for OpenAI-compatible APIs
 * Used by: OpenAI, Perplexity, Grok
 */
export async function* handleOpenAICompatibleStream(
  response: Response,
  model: string,
  contentExtractor: (chunk: any) => string
): AsyncGenerator<StreamChunk, void, unknown> {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  let fullText = '';
  let chunkCount = 0;
  let currentModel = model;
  let finishReason: string | undefined;

  try {
    for await (const chunk of streamSSEChunks(response.body)) {
      chunkCount++;

      // Extract model info from first chunk
      if (chunk.model) {
        currentModel = chunk.model;
      }

      // Extract text content
      const text = contentExtractor(chunk);

      if (text) {
        fullText += text;

        yield {
          text,
          delta: true,
          position: fullText.length - text.length,
          isComplete: false,
          model: currentModel,
        };
      }

      // Capture finish reason
      if (chunk.choices?.[0]?.finish_reason) {
        finishReason = chunk.choices[0].finish_reason;
      }
    }

    // Yield final chunk with metadata
    yield {
      text: '',
      delta: false,
      isComplete: true,
      position: fullText.length,
      model: currentModel,
      metadata: {
        finish_reason: finishReason,
        totalChunks: chunkCount,
        fullText,
      },
    };
  } catch (error) {
    throw new Error(`Streaming failed: ${(error as Error).message}`);
  }
}

/**
 * Generic newline-delimited JSON streaming handler
 * Used by: Ollama
 */
export async function* handleNewlineDelimitedJSONStream(
  response: Response,
  model: string,
  contentExtractor: (chunk: any) => string,
  doneChecker: (chunk: any) => boolean
): AsyncGenerator<StreamChunk, void, unknown> {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  let fullText = '';
  let chunkCount = 0;
  let currentModel = model;

  try {
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }

        try {
          const chunk = JSON.parse(line);
          chunkCount++;

          if (chunk.model) {
            currentModel = chunk.model;
          }

          const text = contentExtractor(chunk);

          if (text) {
            fullText += text;

            yield {
              text,
              delta: true,
              position: fullText.length - text.length,
              isComplete: false,
              model: currentModel,
            };
          }

          if (doneChecker(chunk)) {
            break;
          }
        } catch (error) {
          // Skip malformed JSON lines
          continue;
        }
      }
    }

    // Yield final chunk
    yield {
      text: '',
      delta: false,
      isComplete: true,
      position: fullText.length,
      model: currentModel,
      metadata: {
        totalChunks: chunkCount,
        fullText,
      },
    };
  } catch (error) {
    throw new Error(`Streaming failed: ${(error as Error).message}`);
  }
}
