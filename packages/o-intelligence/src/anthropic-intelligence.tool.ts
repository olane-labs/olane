import { oAddress, oRequest } from '@olane/o-core';
import { oToolConfig, ToolResult } from '@olane/o-tool';
import { LLM_PARAMS } from './methods/llm.methods.js';
import { oLaneTool } from '@olane/o-lane';

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
  private defaultModel = 'claude-sonnet-4-20250514';
  private apiKey: string = process.env.ANTHROPIC_API_KEY || '';

  constructor(config: oToolConfig) {
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
   * Parameter definitions for completion
   */
  _params_completion() {
    return {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'The model to use for completion',
          default: this.defaultModel,
        },
        messages: {
          type: 'array',
          description: 'Array of messages in the conversation',
          items: {
            type: 'object',
            properties: {
              role: {
                type: 'string',
                enum: ['user', 'assistant'],
                description: 'The role of the message sender',
              },
              content: {
                oneOf: [
                  {
                    type: 'string',
                    description: 'Text content',
                  },
                  {
                    type: 'array',
                    description: 'Array of content blocks',
                    items: {
                      type: 'object',
                      properties: {
                        type: {
                          type: 'string',
                          enum: ['text', 'image'],
                        },
                        text: {
                          type: 'string',
                        },
                        source: {
                          type: 'object',
                          properties: {
                            type: {
                              type: 'string',
                              enum: ['base64'],
                            },
                            media_type: {
                              type: 'string',
                            },
                            data: {
                              type: 'string',
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
            required: ['role', 'content'],
          },
        },
        system: {
          type: 'string',
          description: 'System message to set the behavior of the assistant',
        },
        max_tokens: {
          type: 'number',
          description: 'Maximum number of tokens to generate',
          default: 1000,
        },
        temperature: {
          type: 'number',
          description: 'Controls randomness in the response',
          minimum: 0,
          maximum: 1,
        },
        top_p: {
          type: 'number',
          description: 'Controls diversity via nucleus sampling',
          minimum: 0,
          maximum: 1,
        },
        top_k: {
          type: 'number',
          description: 'Controls diversity via top-k sampling',
          minimum: 0,
        },
        stop_sequences: {
          type: 'array',
          description: 'Sequences that will stop generation',
          items: {
            type: 'string',
          },
        },
        metadata: {
          type: 'object',
          description: 'Optional metadata',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID for tracking',
            },
          },
        },
      },
      required: ['messages'],
    };
  }

  /**
   * Parameter definitions for generate
   */
  _params_generate() {
    return {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'The model to use for generation',
          default: this.defaultModel,
        },
        prompt: {
          type: 'string',
          description: 'The prompt to generate text from',
        },
        system: {
          type: 'string',
          description: 'System message to set the behavior of the assistant',
        },
        max_tokens: {
          type: 'number',
          description: 'Maximum number of tokens to generate',
          default: 1000,
        },
        temperature: {
          type: 'number',
          description: 'Controls randomness in the response',
          minimum: 0,
          maximum: 1,
        },
        top_p: {
          type: 'number',
          description: 'Controls diversity via nucleus sampling',
          minimum: 0,
          maximum: 1,
        },
        top_k: {
          type: 'number',
          description: 'Controls diversity via top-k sampling',
          minimum: 0,
        },
        stop_sequences: {
          type: 'array',
          description: 'Sequences that will stop generation',
          items: {
            type: 'string',
          },
        },
        metadata: {
          type: 'object',
          description: 'Optional metadata',
          properties: {
            user_id: {
              type: 'string',
              description: 'User ID for tracking',
            },
          },
        },
      },
      required: ['prompt'],
    };
  }

  /**
   * Parameter definitions for list_models
   */
  _params_list_models() {
    return {
      type: 'object',
      properties: {},
    };
  }

  /**
   * Parameter definitions for model_info
   */
  _params_model_info() {
    return {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'The model to get information about',
          default: this.defaultModel,
        },
      },
    };
  }

  /**
   * Parameter definitions for status
   */
  _params_status() {
    return {
      type: 'object',
      properties: {},
    };
  }
}
