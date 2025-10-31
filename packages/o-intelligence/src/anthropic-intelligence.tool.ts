import { CoreUtils, oAddress, oRequest, oResponse } from '@olane/o-core';
import { ToolResult } from '@olane/o-tool';
import { LLM_PARAMS } from './methods/llm.methods.js';
import { oLaneTool } from '@olane/o-lane';
import {
  oNodeConfig,
  oNodeToolConfig,
  oStreamRequest,
  StreamUtils,
} from '@olane/o-node';
import { Stream } from '@olane/o-config';

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
  async _tool_completion(request: oStreamRequest): Promise<ToolResult> {
    const params = request.params as any;
    const { _isStream = false } = params;

    if (_isStream) {
      this.logger.debug('Streaming completion...');
      const gen = this._streamCompletion(request);
      return StreamUtils.processGenerator(request, gen, request.stream);
    }

    try {
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
   * Stream chat completion with Anthropic
   */
  private async *_streamCompletion(
    request: oRequest,
  ): AsyncGenerator<ToolResult> {
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
        yield {
          success: false,
          error: 'Anthropic API key is required',
        };
        return;
      }

      if (!messages || !Array.isArray(messages)) {
        yield {
          success: false,
          error: '"messages" array is required',
        };
        return;
      }

      const chatRequest: AnthropicChatRequest = {
        model: model as string,
        max_tokens: max_tokens as number,
        messages: messages as AnthropicMessage[],
        system: system as string,
        stream: true,
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
        yield {
          success: false,
          error: `Anthropic API error: ${response.status} - ${errorText}`,
        };
        return;
      }

      if (!response.body) {
        yield {
          success: false,
          error: 'Response body is null',
        };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

          const data = trimmedLine.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              yield {
                delta: parsed.delta.text,
                model: model as string,
              };
            } else if (parsed.type === 'message_start' && parsed.message) {
              yield {
                model: parsed.message.model,
                usage: parsed.message.usage,
              };
            } else if (parsed.type === 'message_delta' && parsed.delta) {
              yield {
                stop_reason: parsed.delta.stop_reason,
                usage: parsed.usage,
              };
            }
          } catch (parseError) {
            // Skip invalid JSON
            continue;
          }
        }
      }
    } catch (error: any) {
      yield {
        success: false,
        error: `Failed to stream chat: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Generate text with Anthropic (using messages endpoint)
   */
  async _tool_generate(request: oStreamRequest): Promise<ToolResult> {
    const params = request.params as any;
    const { stream = false } = params;

    if (stream) {
      return StreamUtils.processGenerator(
        request,
        this._streamGenerate(request),
        request.stream,
      );
    }

    try {
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
   * Stream text generation with Anthropic
   */
  private async *_streamGenerate(
    request: oRequest,
  ): AsyncGenerator<ToolResult> {
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
        yield {
          success: false,
          error: 'Anthropic API key is required',
        };
        return;
      }

      if (!prompt) {
        yield {
          success: false,
          error: 'Prompt is required',
        };
        return;
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
        stream: true,
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
        yield {
          success: false,
          error: `Anthropic API error: ${response.status} - ${errorText}`,
        };
        return;
      }

      if (!response.body) {
        yield {
          success: false,
          error: 'Response body is null',
        };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

          const data = trimmedLine.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              yield {
                delta: parsed.delta.text,
                model: model as string,
              };
            } else if (parsed.type === 'message_start' && parsed.message) {
              yield {
                model: parsed.message.model,
                usage: parsed.message.usage,
              };
            } else if (parsed.type === 'message_delta' && parsed.delta) {
              yield {
                stop_reason: parsed.delta.stop_reason,
                usage: parsed.usage,
              };
            }
          } catch (parseError) {
            // Skip invalid JSON
            continue;
          }
        }
      }
    } catch (error: any) {
      yield {
        success: false,
        error: `Failed to stream generate: ${(error as Error).message}`,
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
}
