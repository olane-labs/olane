import { oAddress, oRequest } from '@olane/o-core';
import { oToolConfig, oVirtualTool, ToolResult } from '@olane/o-tool';
import { INTELLIGENCE_PARAMS } from './methods/intelligence.methods';

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityChatRequest {
  model: string;
  messages: PerplexityMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
  presence_penalty?: number;
  frequency_penalty?: number;
  search_domain?: string;
  return_citations?: boolean;
  return_images?: boolean;
  return_related_questions?: boolean;
}

interface PerplexityChatResponse {
  id: string;
  model: string;
  created: number;
  object: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface PerplexityModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface PerplexityModelsResponse {
  object: string;
  data: PerplexityModel[];
}

interface PerplexitySearchRequest {
  query: string;
  search_domain?: string;
  include_domains?: string[];
  exclude_domains?: string[];
  use_autoprompt?: boolean;
  type?: 'news' | 'web';
}

interface PerplexitySearchResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class PerplexityIntelligenceTool extends oVirtualTool {
  private defaultModel!: string;

  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://perplexity'),
      description: 'Intelligence tool using Perplexity LLM suite of models',
      methods: INTELLIGENCE_PARAMS,
      dependencies: [],
    });
  }

  /**
   * Chat completion with Perplexity
   */
  async _tool_completion(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const {
        model = this.defaultModel,
        messages,
        max_tokens,
        temperature,
        top_p,
        top_k,
        presence_penalty,
        frequency_penalty,
        apiKey,
        search_domain,
        return_citations,
        return_images,
        return_related_questions,
      } = params;

      if (!messages || !Array.isArray(messages)) {
        return {
          success: false,
          error: '"messages" array is required',
        };
      }

      if (!apiKey) {
        return {
          success: false,
          error: 'Perplexity API key is required',
        };
      }

      const chatRequest: PerplexityChatRequest = {
        model: model as string,
        messages: messages as PerplexityMessage[],
        stream: false,
      };

      // Add optional parameters if provided
      if (max_tokens !== undefined) chatRequest.max_tokens = max_tokens;
      if (temperature !== undefined) chatRequest.temperature = temperature;
      if (top_p !== undefined) chatRequest.top_p = top_p;
      if (top_k !== undefined) chatRequest.top_k = top_k;
      if (presence_penalty !== undefined)
        chatRequest.presence_penalty = presence_penalty;
      if (frequency_penalty !== undefined)
        chatRequest.frequency_penalty = frequency_penalty;
      if (search_domain !== undefined)
        chatRequest.search_domain = search_domain;
      if (return_citations !== undefined)
        chatRequest.return_citations = return_citations;
      if (return_images !== undefined)
        chatRequest.return_images = return_images;
      if (return_related_questions !== undefined)
        chatRequest.return_related_questions = return_related_questions;

      const response = await fetch(
        `https://api.perplexity.ai/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(chatRequest),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Perplexity API error: ${response.status} - ${errorText}`,
        };
      }

      const result: PerplexityChatResponse =
        (await response.json()) as PerplexityChatResponse;

      return {
        success: true,
        response: result.choices[0]?.message?.content || '',
        model: result.model,
        usage: result.usage,
        finish_reason: result.choices[0]?.finish_reason,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to complete chat: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Generate text with Perplexity (alias for completion)
   */
  async _tool_generate(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const {
        model = this.defaultModel,
        prompt,
        system,
        max_tokens,
        temperature,
        top_p,
        top_k,
        presence_penalty,
        frequency_penalty,
        search_domain,
        return_citations,
        return_images,
        return_related_questions,
        apiKey,
      } = params;

      if (!prompt) {
        return {
          success: false,
          error: 'Prompt is required',
        };
      }

      if (!apiKey) {
        return {
          success: false,
          error: 'Perplexity API key is required',
        };
      }

      // Convert prompt to messages format
      const messages: PerplexityMessage[] = [];
      if (system) {
        messages.push({ role: 'system', content: system });
      }
      messages.push({ role: 'user', content: prompt });

      const chatRequest: PerplexityChatRequest = {
        model: model as string,
        messages,
        stream: false,
      };

      // Add optional parameters if provided
      if (max_tokens !== undefined) chatRequest.max_tokens = max_tokens;
      if (temperature !== undefined) chatRequest.temperature = temperature;
      if (top_p !== undefined) chatRequest.top_p = top_p;
      if (top_k !== undefined) chatRequest.top_k = top_k;
      if (presence_penalty !== undefined)
        chatRequest.presence_penalty = presence_penalty;
      if (frequency_penalty !== undefined)
        chatRequest.frequency_penalty = frequency_penalty;
      if (search_domain !== undefined)
        chatRequest.search_domain = search_domain;
      if (return_citations !== undefined)
        chatRequest.return_citations = return_citations;
      if (return_images !== undefined)
        chatRequest.return_images = return_images;
      if (return_related_questions !== undefined)
        chatRequest.return_related_questions = return_related_questions;

      const response = await fetch(
        `https://api.perplexity.ai/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(chatRequest),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Perplexity API error: ${response.status} - ${errorText}`,
        };
      }

      const result: PerplexityChatResponse =
        (await response.json()) as PerplexityChatResponse;

      return {
        success: true,
        response: result.choices[0]?.message?.content || '',
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
   * List available models
   */
  async _tool_list_models(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const { apiKey } = params;
      if (!apiKey) {
        return {
          success: false,
          error: 'Perplexity API key is required',
        };
      }

      const response = await fetch(`https://api.perplexity.ai/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Perplexity API error: ${response.status} - ${errorText}`,
        };
      }

      const result: PerplexityModelsResponse =
        (await response.json()) as PerplexityModelsResponse;

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
   * Search with Perplexity
   */
  async _tool_search(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const {
        query,
        search_domain,
        include_domains,
        exclude_domains,
        use_autoprompt,
        type,
        apiKey,
      } = params;

      if (!query) {
        return {
          success: false,
          error: 'Query is required',
        };
      }

      if (!apiKey) {
        return {
          success: false,
          error: 'Perplexity API key is required',
        };
      }

      const searchRequest: PerplexitySearchRequest = {
        query: query as string,
      };

      // Add optional parameters if provided
      if (search_domain !== undefined)
        searchRequest.search_domain = search_domain;
      if (include_domains !== undefined)
        searchRequest.include_domains = include_domains;
      if (exclude_domains !== undefined)
        searchRequest.exclude_domains = exclude_domains;
      if (use_autoprompt !== undefined)
        searchRequest.use_autoprompt = use_autoprompt;
      if (type !== undefined) searchRequest.type = type;

      const response = await fetch(`https://api.perplexity.ai/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(searchRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Perplexity API error: ${response.status} - ${errorText}`,
        };
      }

      const result: PerplexitySearchResponse =
        (await response.json()) as PerplexitySearchResponse;

      return {
        success: true,
        response: result.choices[0]?.message?.content || '',
        model: result.model,
        usage: result.usage,
        finish_reason: result.choices[0]?.finish_reason,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to search: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Check Perplexity API status
   */
  async _tool_status(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const { apiKey } = params;
      if (!apiKey) {
        return {
          success: false,
          status: 'error',
          error: 'Perplexity API key is required',
        };
      }

      const response = await fetch(`https://api.perplexity.ai/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
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
