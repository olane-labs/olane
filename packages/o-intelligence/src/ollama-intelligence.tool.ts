import { oAddress, oRequest } from '@olane/o-core';
import { oToolConfig, ToolResult } from '@olane/o-tool';
import { LLM_PARAMS } from './methods/llm.methods.js';
import { oLaneTool } from '@olane/o-lane';

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
    seed?: number;
    num_ctx?: number;
    num_gpu?: number;
    num_thread?: number;
    repeat_penalty?: number;
    repeat_last_n?: number;
    tfs_z?: number;
    mirostat?: number;
    mirostat_tau?: number;
    mirostat_eta?: number;
    penalize_newline?: boolean;
    presence_penalty?: number;
    frequency_penalty?: number;
  };
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

interface OllamaListResponse {
  models: OllamaModel[];
}

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
    seed?: number;
    num_ctx?: number;
    num_gpu?: number;
    num_thread?: number;
    repeat_penalty?: number;
    repeat_last_n?: number;
    tfs_z?: number;
    mirostat?: number;
    mirostat_tau?: number;
    mirostat_eta?: number;
    penalize_newline?: boolean;
    presence_penalty?: number;
    frequency_penalty?: number;
  };
  stream?: boolean;
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaIntelligenceTool extends oLaneTool {
  static defaultModel = 'llama3.2:latest';
  static defaultUrl = 'http://localhost:11434';

  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://ollama'),
      description: 'Intelligence tool using Ollama LLM suite of models',
      methods: LLM_PARAMS,
      dependencies: [],
    });
    // this.baseUrl = config.ollamaUrl || 'http://localhost:11434';
    // this.defaultModel = config.defaultModel || 'llama2';
  }

  /**
   * Chat completion with Ollama
   */
  async _tool_completion(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const {
        model = OllamaIntelligenceTool.defaultModel,
        messages,
        options = {},
      } = params;
      // let's validate the params and ask for ones that are missing

      if (!messages || !Array.isArray(messages)) {
        return {
          success: false,
          error: '"messages" array is required',
        };
      }

      const chatRequest: OllamaChatRequest = {
        model: model as string,
        messages: messages as OllamaChatMessage[],
        stream: false,
        options: options as any,
      };

      const response = await fetch(
        `${OllamaIntelligenceTool.defaultUrl}/api/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chatRequest),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Ollama API error: ${response.status} - ${errorText}`,
        };
      }

      const result: OllamaChatResponse =
        (await response.json()) as OllamaChatResponse;
      return {
        message: result.message.content,
        model: result.model,
        total_duration: result.total_duration,
        eval_count: result.eval_count,
        eval_duration: result.eval_duration,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to complete chat: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Generate text with Ollama
   */
  async _tool_generate(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const {
        model = OllamaIntelligenceTool.defaultModel,
        prompt,
        system,
        options = {},
      } = params;

      if (!prompt) {
        return {
          success: false,
          error: 'Prompt is required',
        };
      }

      const generateRequest: OllamaGenerateRequest = {
        model: model as string,
        prompt: prompt as string,
        system: system as string | undefined,
        stream: false,
        options: options as any,
      };

      const response = await fetch(
        `${OllamaIntelligenceTool.defaultUrl}/api/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(generateRequest),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Ollama API error: ${response.status} - ${errorText}`,
        };
      }

      const result: OllamaGenerateResponse =
        (await response.json()) as OllamaGenerateResponse;

      return {
        success: true,
        response: result.response,
        model: result.model,
        done: result.done,
        total_duration: result.total_duration,
        eval_count: result.eval_count,
        eval_duration: result.eval_duration,
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
      const response = await fetch(
        `${OllamaIntelligenceTool.defaultUrl}/api/tags`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Ollama API error: ${response.status} - ${errorText}`,
        };
      }

      const result: OllamaListResponse =
        (await response.json()) as OllamaListResponse;

      return {
        success: true,
        models: result.models,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to list models: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Pull a model from Ollama library
   */
  async _tool_pull_model(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const { model, insecure = false } = params;

      if (!model) {
        return {
          success: false,
          error: 'Model name is required',
        };
      }

      const response = await fetch(
        `${OllamaIntelligenceTool.defaultUrl}/api/pull`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: model as string,
            insecure: insecure as boolean,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Ollama API error: ${response.status} - ${errorText}`,
        };
      }

      // For pull operations, we need to handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        return {
          success: false,
          error: 'Failed to read response stream',
        };
      }

      let result = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        result += chunk;
      }

      return {
        success: true,
        message: `Model ${model} pulled successfully`,
        details: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to pull model: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Delete a model
   */
  async _tool_delete_model(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const { model } = params;

      if (!model) {
        return {
          success: false,
          error: 'Model name is required',
        };
      }

      const response = await fetch(
        `${OllamaIntelligenceTool.defaultUrl}/api/delete`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: model as string,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Ollama API error: ${response.status} - ${errorText}`,
        };
      }

      return {
        success: true,
        message: `Model ${model} deleted successfully`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to delete model: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Get model information
   */
  async _tool_model_info(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const { model = OllamaIntelligenceTool.defaultModel } = params;

      const response = await fetch(
        `${OllamaIntelligenceTool.defaultUrl}/api/show`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: model as string,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Ollama API error: ${response.status} - ${errorText}`,
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
   * Check Ollama server status
   */
  async _tool_status(request: oRequest): Promise<ToolResult> {
    try {
      const response = await fetch(
        `${OllamaIntelligenceTool.defaultUrl}/api/tags`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        success: response.ok,
        status: response.ok ? 'online' : 'offline',
        status_code: response.status,
      };
    } catch (error) {
      return {
        success: false,
        status: 'offline',
        error: `Connection failed: ${(error as Error).message}`,
      };
    }
  }
}
