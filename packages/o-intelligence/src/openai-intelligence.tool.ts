import { oAddress, oRequest } from '@olane/o-core';
import { ToolResult } from '@olane/o-tool';
import { LLM_PARAMS } from './methods/llm.methods.js';
import { oLaneTool } from '@olane/o-lane';
import { oNodeToolConfig, oStreamRequest, StreamUtils } from '@olane/o-node';
import { Stream } from '@olane/o-config';

interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

interface OpenAIChatRequest {
  model: string;
  messages: OpenAIChatMessage[];
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
  functions?: Array<{
    name: string;
    description?: string;
    parameters: Record<string, any>;
  }>;
  function_call?: 'none' | 'auto' | { name: string };
}

interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAICompletionRequest {
  model: string;
  prompt: string | string[];
  suffix?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  logprobs?: number;
  echo?: boolean;
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  best_of?: number;
  logit_bias?: Record<string, number>;
  user?: string;
}

interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    text: string;
    index: number;
    logprobs: any;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  permission: Array<{
    id: string;
    object: string;
    created: number;
    allow_create_engine: boolean;
    allow_sampling: boolean;
    allow_logprobs: boolean;
    allow_search_indices: boolean;
    allow_view: boolean;
    allow_fine_tuning: boolean;
    organization: string;
    group: string | null;
    is_blocking: boolean;
  }>;
  root: string;
  parent: string | null;
}

interface OpenAIListModelsResponse {
  object: string;
  data: OpenAIModel[];
}

interface OpenAIEmbeddingRequest {
  input: string | string[];
  model: string;
  encoding_format?: 'float' | 'base64';
  dimensions?: number;
  user?: string;
}

interface OpenAIEmbeddingData {
  object: 'embedding';
  embedding: number[];
  index: number;
}

interface OpenAIEmbeddingResponse {
  object: 'list';
  data: OpenAIEmbeddingData[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIIntelligenceTool extends oLaneTool {
  private baseUrl: string = 'https://api.openai.com/v1';
  private defaultModel: string = 'gpt-5';
  private organization?: string;
  private apiKey: string = process.env.OPENAI_API_KEY || '';

  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oAddress('o://openai'),
      description: "Open AI's suite of intelligence models.",
      methods: LLM_PARAMS,
      dependencies: [],
    });
  }

  /**
   * Chat completion with OpenAI
   */
  async _tool_completion(request: oStreamRequest): Promise<ToolResult> {
    const params = request.params as any;
    const { stream = false } = params;

    if (stream) {
      return StreamUtils.processGenerator(
        request,
        this._streamCompletion(request),
        request.stream,
      );
    }

    try {
      const {
        model = this.defaultModel,
        messages,
        apiKey = this.apiKey,
        ...options
      } = params;

      if (!apiKey) {
        return {
          success: false,
          error: 'OpenAI API key is required',
        };
      }

      if (!messages || !Array.isArray(messages)) {
        return {
          success: false,
          error: '"messages" array is required',
        };
      }

      const chatRequest: OpenAIChatRequest = {
        model: model as string,
        messages: messages as OpenAIChatMessage[],
        stream: false,
        // ...options,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      };

      if (this.organization) {
        headers['OpenAI-Organization'] = this.organization;
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(chatRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `OpenAI API error: ${response.status} - ${errorText}`,
        };
      }

      const result: OpenAIChatResponse =
        (await response.json()) as OpenAIChatResponse;

      return {
        success: true,
        message: result.choices[0]?.message?.content || '',
        model: result.model,
        usage: result.usage,
        finish_reason: result.choices[0]?.finish_reason,
        function_call: result.choices[0]?.message?.function_call,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to complete chat: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Stream chat completion with OpenAI
   */
  private async *_streamCompletion(
    request: oRequest,
  ): AsyncGenerator<ToolResult> {
    try {
      const params = request.params as any;
      const {
        model = this.defaultModel,
        messages,
        apiKey = this.apiKey,
        ...options
      } = params;

      if (!apiKey) {
        yield {
          success: false,
          error: 'OpenAI API key is required',
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

      const chatRequest: OpenAIChatRequest = {
        model: model as string,
        messages: messages as OpenAIChatMessage[],
        stream: true,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      };

      if (this.organization) {
        headers['OpenAI-Organization'] = this.organization;
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(chatRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        yield {
          success: false,
          error: `OpenAI API error: ${response.status} - ${errorText}`,
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
            const choice = parsed.choices?.[0];

            if (choice?.delta?.content) {
              yield {
                delta: choice.delta.content,
                model: parsed.model,
              };
            }

            if (choice?.finish_reason) {
              yield {
                finish_reason: choice.finish_reason,
                model: parsed.model,
              };
            }

            if (parsed.usage) {
              yield {
                usage: parsed.usage,
                model: parsed.model,
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
   * Generate text with OpenAI
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
        apiKey = this.apiKey,
        ...options
      } = params;

      if (!apiKey) {
        return {
          success: false,
          error: 'OpenAI API key is required',
        };
      }

      if (!prompt) {
        return {
          success: false,
          error: 'Prompt is required',
        };
      }

      const completionRequest: OpenAICompletionRequest = {
        model: model as string,
        prompt: prompt as string,
        stream: false,
        ...options,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      };

      // if (this.organization) {
      //   headers['OpenAI-Organization'] = this.organization;
      // }

      const response = await fetch(`${this.baseUrl}/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(completionRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `OpenAI API error: ${response.status} - ${errorText}`,
        };
      }

      const result: OpenAICompletionResponse =
        (await response.json()) as OpenAICompletionResponse;

      return {
        success: true,
        response: result.choices[0]?.text || '',
        model: result.model,
        usage: result.usage,
        finish_reason: result.choices[0]?.finish_reason,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to generate text: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Stream text generation with OpenAI
   */
  private async *_streamGenerate(
    request: oRequest,
  ): AsyncGenerator<ToolResult> {
    try {
      const params = request.params as any;
      const {
        model = this.defaultModel,
        prompt,
        apiKey = this.apiKey,
        ...options
      } = params;

      if (!apiKey) {
        yield {
          success: false,
          error: 'OpenAI API key is required',
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

      const completionRequest: OpenAICompletionRequest = {
        model: model as string,
        prompt: prompt as string,
        stream: true,
        ...options,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      };

      const response = await fetch(`${this.baseUrl}/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(completionRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        yield {
          success: false,
          error: `OpenAI API error: ${response.status} - ${errorText}`,
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
            const choice = parsed.choices?.[0];

            if (choice?.text) {
              yield {
                delta: choice.text,
                model: parsed.model,
              };
            }

            if (choice?.finish_reason) {
              yield {
                finish_reason: choice.finish_reason,
                model: parsed.model,
              };
            }

            if (parsed.usage) {
              yield {
                usage: parsed.usage,
                model: parsed.model,
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
          error: 'OpenAI API key is required',
        };
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
      };

      if (this.organization) {
        headers['OpenAI-Organization'] = this.organization;
      }

      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `OpenAI API error: ${response.status} - ${errorText}`,
        };
      }

      const result: OpenAIListModelsResponse =
        (await response.json()) as OpenAIListModelsResponse;

      return {
        success: true,
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
          error: 'OpenAI API key is required',
        };
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
      };

      if (this.organization) {
        headers['OpenAI-Organization'] = this.organization;
      }

      const response = await fetch(`${this.baseUrl}/models/${model}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `OpenAI API error: ${response.status} - ${errorText}`,
        };
      }

      const result = (await response.json()) as any;

      return {
        success: true,
        model_info: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to get model info: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Check OpenAI API status
   */
  async _tool_status(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const { apiKey = this.apiKey } = params;

      if (!apiKey) {
        return {
          success: false,
          status: 'no_api_key',
          error: 'OpenAI API key is required',
        };
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
      };

      if (this.organization) {
        headers['OpenAI-Organization'] = this.organization;
      }

      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers,
      });

      return {
        success: response.ok,
        status: response.ok ? 'online' : 'offline',
        status_code: response.status,
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'offline',
        error: `Connection failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Generate embeddings for multiple documents
   */
  async _tool_embed_documents(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const {
        input,
        model = 'text-embedding-3-small',
        apiKey = this.apiKey,
        dimensions,
        ...options
      } = params;

      if (!apiKey) {
        return {
          success: false,
          error: 'OpenAI API key is required',
        };
      }

      if (!input || !Array.isArray(input)) {
        return {
          success: false,
          error: 'input must be an array of strings',
        };
      }

      const embeddingRequest: OpenAIEmbeddingRequest = {
        input,
        model: model as string,
        encoding_format: 'float',
      };

      if (dimensions) {
        embeddingRequest.dimensions = dimensions;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      };

      if (this.organization) {
        headers['OpenAI-Organization'] = this.organization;
      }

      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(embeddingRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `OpenAI API error: ${response.status} - ${errorText}`,
        };
      }

      const result: OpenAIEmbeddingResponse =
        (await response.json()) as OpenAIEmbeddingResponse;

      // Extract embeddings in order
      const embeddings = result.data
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);

      return {
        success: true,
        embeddings,
        model: result.model,
        usage: result.usage,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to generate embeddings: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Generate embedding for a single query
   */
  async _tool_embed_query(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const {
        input,
        model = 'text-embedding-3-small',
        apiKey = this.apiKey,
        dimensions,
        ...options
      } = params;

      if (!apiKey) {
        return {
          success: false,
          error: 'OpenAI API key is required',
        };
      }

      if (!input || typeof input !== 'string') {
        return {
          success: false,
          error: 'input must be a string',
        };
      }

      const embeddingRequest: OpenAIEmbeddingRequest = {
        input,
        model: model as string,
        encoding_format: 'float',
      };

      if (dimensions) {
        embeddingRequest.dimensions = dimensions;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      };

      if (this.organization) {
        headers['OpenAI-Organization'] = this.organization;
      }

      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(embeddingRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `OpenAI API error: ${response.status} - ${errorText}`,
        };
      }

      const result: OpenAIEmbeddingResponse =
        (await response.json()) as OpenAIEmbeddingResponse;

      // Return the first (and only) embedding
      const embedding = result.data[0]?.embedding;

      if (!embedding) {
        return {
          success: false,
          error: 'No embedding returned from API',
        };
      }

      return {
        success: true,
        embedding,
        model: result.model,
        usage: result.usage,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to generate embedding: ${(error as Error).message}`,
      };
    }
  }
}
