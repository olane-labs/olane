import { oAddress, oRequest } from '@olane/o-core';
import { ToolResult } from '@olane/o-tool';
import { LLM_PARAMS } from './methods/llm.methods.js';
import { oLaneTool } from '@olane/o-lane';
import { oNodeConfig, oNodeToolConfig } from '@olane/o-node';
import {
  streamSSEChunks,
  extractAnthropicContent,
} from './utils/sse-parser.js';
import { StreamChunk } from './types/streaming.types.js';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content:
    | string
    | Array<{
        type: 'text' | 'image';
        text?: string;
        source?: {
          type: 'base64';
          media_type: string;
          data: string;
        };
      }>;
}

interface AnthropicChatRequest {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  system?: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
  stop_sequences?: string[];
  metadata?: {
    user_id?: string;
  };
}

interface AnthropicChatResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicMessageRequest {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  system?: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
  stop_sequences?: string[];
  metadata?: {
    user_id?: string;
  };
}

interface AnthropicMessageResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicModel {
  id: string;
  name: string;
  display_name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
}

interface AnthropicListModelsResponse {
  data: AnthropicModel[];
  object: string;
}

export class AnthropicIntelligenceTool extends oLaneTool {
  private defaultModel = 'claude-sonnet-4-5-20250929';
  private apiKey: string = process.env.ANTHROPIC_API_KEY || '';

  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oAddress('o://anthropic'),
      description: 'Intelligence tool using Anthropic LLM suite of models',
      // shared parameters for all tools
      methods: LLM_PARAMS,
      dependencies: [],
    });
  }

  /**
   * Chat completion with Anthropic
   */
  async _tool_completion(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const {
        model = this.defaultModel,
        messages,
        system,
        max_tokens = 1000,
        apiKey = this.apiKey,
      } = params;

      if (!apiKey) {
        return {
          success: false,
          error: 'Anthropic API key is required',
        };
      }

      if (!messages || !Array.isArray(messages)) {
        return {
          success: false,
          error: '"messages" array is required',
        };
      }

      const chatRequest: AnthropicChatRequest = {
        model: model as string,
        max_tokens: max_tokens as number,
        messages: messages as AnthropicMessage[],
        system: system as string,
        stream: false,
      };

      const response = await fetch(`https://api.anthropic.com/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(chatRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Anthropic API error: ${response.status} - ${errorText}`,
        };
      }

      const result: AnthropicChatResponse =
        (await response.json()) as AnthropicChatResponse;

      return {
        message: result.content[0]?.text || '',
        model: result.model,
        usage: result.usage,
        stop_reason: result.stop_reason,
        stop_sequence: result.stop_sequence,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to complete chat: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Generate text with Anthropic (using messages endpoint)
   */
  async _tool_generate(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const {
        model = this.defaultModel,
        prompt,
        system,
        max_tokens = 1000,
        apiKey = this.apiKey,
        ...options
      } = params;

      if (!apiKey) {
        return {
          success: false,
          error: 'Anthropic API key is required',
        };
      }

      if (!prompt) {
        return {
          success: false,
          error: 'Prompt is required',
        };
      }

      const messages: AnthropicMessage[] = [
        {
          role: 'user',
          content: prompt as string,
        },
      ];

      const generateRequest: AnthropicMessageRequest = {
        model: model as string,
        max_tokens: max_tokens as number,
        messages,
        system: system as string,
        stream: false,
        ...options,
      };

      const response = await fetch(`https://api.anthropic.com/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(generateRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Anthropic API error: ${response.status} - ${errorText}`,
        };
      }

      const result: AnthropicMessageResponse =
        (await response.json()) as AnthropicMessageResponse;

      return {
        success: true,
        response: result.content[0]?.text || '',
        model: result.model,
        usage: result.usage,
        stop_reason: result.stop_reason,
        stop_sequence: result.stop_sequence,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to generate text: ${(error as Error).message}`,
      };
    }
  }

  /**
   * List available models
   */
  async _tool_list_models(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const { apiKey = this.apiKey } = params;

      if (!apiKey) {
        return {
          success: false,
          error: 'Anthropic API key is required',
        };
      }

      const response = await fetch(`https://api.anthropic.com/v1/models`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Anthropic API error: ${response.status} - ${errorText}`,
        };
      }

      const result: AnthropicListModelsResponse =
        (await response.json()) as AnthropicListModelsResponse;

      return {
        success: true,
        response: result.data,
        models: result.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to list models: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Get model information
   */
  async _tool_model_info(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const { model = this.defaultModel, apiKey = this.apiKey } = params;

      if (!apiKey) {
        return {
          success: false,
          error: 'Anthropic API key is required',
        };
      }

      const response = await fetch(`https://api.anthropic.com/v1/models`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Anthropic API error: ${response.status} - ${errorText}`,
        };
      }

      const result: AnthropicListModelsResponse =
        (await response.json()) as AnthropicListModelsResponse;
      const modelInfo = result.data.find((m) => m.id === model);

      if (!modelInfo) {
        return {
          success: false,
          error: `Model ${model} not found`,
        };
      }

      return {
        success: true,
        response: modelInfo,
        model: modelInfo,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to get model info: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Check API status
   */
  async _tool_status(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const { apiKey = this.apiKey } = params;

      if (!apiKey) {
        return {
          success: false,
          error: 'Anthropic API key is required',
        };
      }

      const response = await fetch(`https://api.anthropic.com/v1/models`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Anthropic API is not accessible: ${response.status}`,
        };
      }

      return {
        success: true,
        response: 'Anthropic API is accessible',
        status: 'ok',
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to check status: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Streaming chat completion with Anthropic
   * Returns an AsyncGenerator that yields chunks as they arrive
   *
   * Usage:
   * ```typescript
   * for await (const chunk of client.useStreaming(address, {
   *   method: 'stream_completion',
   *   params: { messages: [...], apiKey: '...' }
   * })) {
   *   process.stdout.write(chunk.text);
   * }
   * ```
   */
  async *_tool_stream_completion(
    request: oRequest,
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const params = request.params as any;
    const {
      model = this.defaultModel,
      messages,
      system,
      max_tokens = 1000,
      apiKey = this.apiKey,
      temperature,
      top_p,
      top_k,
      stop_sequences,
    } = params;

    // Validation
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }

    if (!messages || !Array.isArray(messages)) {
      throw new Error('"messages" array is required');
    }

    // Build streaming request
    const chatRequest: AnthropicChatRequest = {
      model: model as string,
      max_tokens: max_tokens as number,
      messages: messages as AnthropicMessage[],
      system: system as string,
      stream: true, // Enable streaming
      temperature,
      top_p,
      top_k,
      stop_sequences,
    };

    // Make streaming request
    const response = await fetch(`https://api.anthropic.com/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(chatRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Track streaming state
    let fullText = '';
    let chunkCount = 0;
    let currentModel = model as string;
    let finishReason: string | undefined;
    let usage: any;

    try {
      // Stream and parse SSE chunks
      for await (const chunk of streamSSEChunks(response.body)) {
        chunkCount++;

        // Extract text content from Anthropic chunk
        const text = extractAnthropicContent(chunk);

        if (text) {
          fullText += text;

          // Yield chunk to client
          yield {
            text,
            delta: true,
            position: fullText.length - text.length,
            isComplete: false,
            model: currentModel,
          };
        }

        // Capture metadata from message_start event
        if (chunk.type === 'message_start' && chunk.message) {
          currentModel = chunk.message.model || currentModel;
          usage = chunk.message.usage;
        }

        // Capture stop reason from content_block_stop or message_delta
        if (chunk.type === 'message_delta' && chunk.delta?.stop_reason) {
          finishReason = chunk.delta.stop_reason;
        }

        // Capture final usage from message_delta
        if (chunk.type === 'message_delta' && chunk.usage) {
          usage = chunk.usage;
        }

        // Check for stream completion
        if (chunk.type === 'message_stop') {
          break;
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
          usage,
          totalChunks: chunkCount,
          fullText,
        },
      };
    } catch (error) {
      throw new Error(`Streaming failed: ${(error as Error).message}`);
    }
  }

  /**
   * Streaming text generation with Anthropic
   * Convenience method that accepts a prompt string instead of messages array
   */
  async *_tool_stream_generate(
    request: oRequest,
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const params = request.params as any;
    const { prompt, ...otherParams } = params;

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    // Convert prompt to messages format
    const messages: AnthropicMessage[] = [
      {
        role: 'user',
        content: prompt as string,
      },
    ];

    // Delegate to stream_completion
    yield* this._tool_stream_completion(
      new oRequest({
        ...request.toJSON(),
        params: {
          ...otherParams,
          messages,
        },
      }),
    );
  }
}
