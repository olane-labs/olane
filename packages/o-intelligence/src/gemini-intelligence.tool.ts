import { oAddress, oRequest, oVirtualNode } from '@olane/o-core';
import { oTool, oToolConfig, oVirtualTool, ToolResult } from '@olane/o-tool';
import { INTELLIGENCE_PARAMS } from './methods/intelligence.methods.js';

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{
    text: string;
  }>;
}

interface GeminiChatRequest {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

interface GeminiChatResponse {
  candidates: Array<{
    content: {
      role: string;
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
    index: number;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  };
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GeminiGenerateRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

interface GeminiGenerateResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
    index: number;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  };
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GeminiModel {
  name: string;
  version: string;
  displayName: string;
  description: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  supportedGenerationMethods: string[];
}

interface GeminiListModelsResponse {
  models: GeminiModel[];
}

export class GeminiIntelligenceTool extends oVirtualTool {
  private apiKey: string = process.env.GEMINI_API_KEY || '';
  private baseUrl!: string;
  private defaultModel!: string;

  constructor(config: oToolConfig) {
    super({
      ...config,
      address: new oAddress('o://gemini'),
      description: 'Intelligence tool using Google Gemini suite of models',
      methods: INTELLIGENCE_PARAMS,
      dependencies: [],
    });
  }

  /**
   * Chat completion with Gemini
   */
  async _tool_completion(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const { model = this.defaultModel, messages, ...options } = params;

      if (!this.apiKey) {
        return {
          success: false,
          error: 'Gemini API key is required',
        };
      }

      if (!messages || !Array.isArray(messages)) {
        return {
          success: false,
          error: '"messages" array is required',
        };
      }

      // Convert messages to Gemini format
      const contents: GeminiContent[] = messages.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const chatRequest: GeminiChatRequest = {
        contents,
        generationConfig: {
          temperature: options.temperature,
          topK: options.topK,
          topP: options.topP,
          maxOutputTokens: options.maxOutputTokens,
          stopSequences: options.stopSequences,
        },
        safetySettings: options.safetySettings,
      };

      const response = await fetch(
        `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
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
          error: `Gemini API error: ${response.status} - ${errorText}`,
        };
      }

      const result: GeminiChatResponse =
        (await response.json()) as GeminiChatResponse;

      if (!result.candidates || result.candidates.length === 0) {
        return {
          success: false,
          error: 'No response generated from Gemini',
        };
      }

      return {
        success: true,
        response: result.candidates[0].content.parts[0]?.text || '',
        model: model,
        usage: result.usageMetadata,
        finish_reason: result.candidates[0].finishReason,
        safety_ratings: result.candidates[0].safetyRatings,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to complete chat: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Generate text with Gemini
   */
  async _tool_generate(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const { model = this.defaultModel, prompt, system, ...options } = params;

      if (!this.apiKey) {
        return {
          success: false,
          error: 'Gemini API key is required',
        };
      }

      if (!prompt) {
        return {
          success: false,
          error: 'Prompt is required',
        };
      }

      // Combine system and user prompt
      const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;

      const generateRequest: GeminiGenerateRequest = {
        contents: [
          {
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: {
          temperature: options.temperature,
          topK: options.topK,
          topP: options.topP,
          maxOutputTokens: options.maxOutputTokens,
          stopSequences: options.stopSequences,
        },
        safetySettings: options.safetySettings,
      };

      const response = await fetch(
        `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
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
          error: `Gemini API error: ${response.status} - ${errorText}`,
        };
      }

      const result: GeminiGenerateResponse =
        (await response.json()) as GeminiGenerateResponse;

      if (!result.candidates || result.candidates.length === 0) {
        return {
          success: false,
          error: 'No response generated from Gemini',
        };
      }

      return {
        success: true,
        response: result.candidates[0].content.parts[0]?.text || '',
        model: model,
        usage: result.usageMetadata,
        finish_reason: result.candidates[0].finishReason,
        safety_ratings: result.candidates[0].safetyRatings,
      };
    } catch (error) {
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
      if (!this.apiKey) {
        return {
          success: false,
          error: 'Gemini API key is required',
        };
      }

      const response = await fetch(
        `${this.baseUrl}/models?key=${this.apiKey}`,
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
          error: `Gemini API error: ${response.status} - ${errorText}`,
        };
      }

      const result: GeminiListModelsResponse =
        (await response.json()) as GeminiListModelsResponse;

      return {
        success: true,
        models: result.models,
      };
    } catch (error) {
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
      const { model = this.defaultModel } = params;

      if (!this.apiKey) {
        return {
          success: false,
          error: 'Gemini API key is required',
        };
      }

      const response = await fetch(
        `${this.baseUrl}/models/${model}?key=${this.apiKey}`,
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
          error: `Gemini API error: ${response.status} - ${errorText}`,
        };
      }

      const result = (await response.json()) as any;

      return {
        success: true,
        model_info: result,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get model info: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Check Gemini API status
   */
  async _tool_status(request: oRequest): Promise<ToolResult> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          status: 'offline',
          error: 'Gemini API key is required',
        };
      }

      const response = await fetch(
        `${this.baseUrl}/models?key=${this.apiKey}`,
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
