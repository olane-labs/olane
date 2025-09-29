import { oAddress, oRequest } from '@olane/o-core';
import { oToolConfig, ToolResult } from '@olane/o-tool';
import { LLM_PARAMS } from './methods/llm.methods.js';
import { oLaneTool } from '@olane/o-lane';

interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GrokChatRequest {
  model: string;
  messages: GrokMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
}

interface GrokChatResponse {
  id: string;
  model: string;
  created: number;
  object: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface GrokModelInfo {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
}

interface GrokListModelsResponse {
  object: string;
  data: GrokModelInfo[];
}

export class GrokIntelligenceTool extends oLaneTool {
  private baseUrl: string = 'https://api.x.ai/v1';
  private defaultModel: string = 'grok-3-mini';
  private apiKey: string = process.env.GROK_API_KEY || '';

  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://grok'),
      description: 'Intelligence tool using xAI Grok suite of models',
      methods: LLM_PARAMS,
      dependencies: [],
    });
  }

  async _tool_completion(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const {
        model = this.defaultModel,
        messages,
        apiKey = this.apiKey,
        ...options
      } = params;

      const key = apiKey || process.env.GROK_API_KEY;
      if (!key) {
        return { success: false, error: 'Grok API key is required' };
      }
      if (!messages || !Array.isArray(messages)) {
        return { success: false, error: '"messages" array is required' };
      }

      const chatRequest: GrokChatRequest = {
        model: model as string,
        messages: messages as GrokMessage[],
        stream: false,
      };

      if (options.max_tokens !== undefined)
        chatRequest.max_tokens = options.max_tokens;
      if (options.temperature !== undefined)
        chatRequest.temperature = options.temperature;
      if (options.top_p !== undefined) chatRequest.top_p = options.top_p;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(chatRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Grok API error: ${response.status} - ${errorText}`,
        };
      }

      const result: GrokChatResponse =
        (await response.json()) as GrokChatResponse;

      return {
        success: true,
        message: result.choices?.[0]?.message?.content || '',
        model: result.model,
        usage: result.usage,
        finish_reason: result.choices?.[0]?.finish_reason,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to complete chat: ${(error as Error).message}`,
      };
    }
  }

  async _tool_generate(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const {
        model = this.defaultModel,
        prompt,
        system,
        apiKey = this.apiKey,
        ...options
      } = params;
      const key = apiKey || process.env.GROK_API_KEY;

      if (!key) {
        return { success: false, error: 'Grok API key is required' };
      }
      if (!prompt) {
        return { success: false, error: 'Prompt is required' };
      }

      const messages: GrokMessage[] = [];
      if (system) messages.push({ role: 'system', content: system as string });
      messages.push({ role: 'user', content: prompt as string });

      const chatRequest: GrokChatRequest = {
        model: model as string,
        messages,
        stream: false,
      };
      if (options.max_tokens !== undefined)
        chatRequest.max_tokens = options.max_tokens;
      if (options.temperature !== undefined)
        chatRequest.temperature = options.temperature;
      if (options.top_p !== undefined) chatRequest.top_p = options.top_p;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(chatRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Grok API error: ${response.status} - ${errorText}`,
        };
      }

      const result: GrokChatResponse =
        (await response.json()) as GrokChatResponse;

      return {
        success: true,
        response: result.choices?.[0]?.message?.content || '',
        model: result.model,
        usage: result.usage,
        finish_reason: result.choices?.[0]?.finish_reason,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to generate text: ${(error as Error).message}`,
      };
    }
  }

  async _tool_list_models(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const { apiKey = this.apiKey } = params;
      const key = apiKey || process.env.GROK_API_KEY;
      if (!key) {
        return { success: false, error: 'Grok API key is required' };
      }

      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${key}` },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Grok API error: ${response.status} - ${errorText}`,
        };
      }

      const result: GrokListModelsResponse =
        (await response.json()) as GrokListModelsResponse;
      return { success: true, models: result.data };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to list models: ${(error as Error).message}`,
      };
    }
  }

  async _tool_model_info(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const { model = this.defaultModel, apiKey = this.apiKey } = params;
      const key = apiKey || process.env.GROK_API_KEY;
      if (!key) {
        return { success: false, error: 'Grok API key is required' };
      }

      const response = await fetch(`${this.baseUrl}/models/${model}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${key}` },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Grok API error: ${response.status} - ${errorText}`,
        };
      }

      const result = (await response.json()) as any;
      return { success: true, model_info: result };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to get model info: ${(error as Error).message}`,
      };
    }
  }

  async _tool_status(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const { apiKey = this.apiKey } = params;
      const key = apiKey || process.env.GROK_API_KEY;
      if (!key) {
        return {
          success: false,
          status: 'no_api_key',
          error: 'Grok API key is required',
        };
      }

      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${key}` },
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
}
