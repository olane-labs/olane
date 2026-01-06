import { oAddress, oRequest } from '@olane/o-core';
import { ToolResult } from '@olane/o-tool';
import { LLM_PARAMS } from './methods/llm.methods.js';
import { oLaneTool } from '@olane/o-lane';
import {
  oNodeConfig,
  oNodeToolConfig,
  oStreamRequest,
  StreamUtils,
} from '@olane/o-node';
import { readFile } from 'fs/promises';

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

interface GeminiInlineData {
  mime_type: string;
  data: string;
}

interface GeminiImageConfig {
  aspectRatio?:
    | '1:1'
    | '2:3'
    | '3:2'
    | '3:4'
    | '4:3'
    | '4:5'
    | '5:4'
    | '9:16'
    | '16:9'
    | '21:9';
  imageSize?: '1K' | '2K' | '4K';
}

interface GeminiImageGenerateRequest {
  contents: Array<{
    parts: Array<{
      text?: string;
      inline_data?: GeminiInlineData;
    }>;
  }>;
  generationConfig?: {
    responseModalities?: string[];
    imageConfig?: GeminiImageConfig;
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

export class GeminiIntelligenceTool extends oLaneTool {
  protected apiKey: string = process.env.GEMINI_API_KEY || '';
  protected baseUrl: string =
    'https://generativelanguage.googleapis.com/v1beta';
  protected defaultModel: string = 'gemini-3-pro-preview';

  constructor(config: oNodeToolConfig) {
    super({
      ...config,
      address: new oAddress('o://gemini'),
      description: 'Intelligence tool using Google Gemini suite of models',
      methods: LLM_PARAMS,
      dependencies: [],
    });
  }

  /**
   * Chat completion with Gemini
   */
  async _tool_completion(request: oStreamRequest): Promise<ToolResult> {
    const params = request.params as any;
    const { _isStreaming = false } = params;

    if (_isStreaming) {
      this.logger.debug('Streaming completion...');
      return StreamUtils.processGenerator(
        request,
        this._streamCompletion(request),
        request.stream,
      );
    }

    try {
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
        `${this.baseUrl}/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
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
        message: result.candidates[0].content.parts[0]?.text || '',
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
   * Stream chat completion with Gemini
   */
  private async *_streamCompletion(
    request: oRequest,
  ): AsyncGenerator<ToolResult> {
    try {
      const params = request.params as any;
      const { model = this.defaultModel, messages, ...options } = params;

      if (!this.apiKey) {
        yield {
          success: false,
          error: 'Gemini API key is required',
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
        `${this.baseUrl}/models/${model}:streamGenerateContent?alt=sse`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify(chatRequest),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        yield {
          success: false,
          error: `Gemini API error: ${response.status} - ${errorText}`,
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

            if (
              parsed.candidates?.[0]?.content?.parts?.[0]?.text !== undefined
            ) {
              yield {
                delta: parsed.candidates[0].content.parts[0].text,
                model: model as string,
              };
            }

            // Track usage and finish reason in final chunk
            if (parsed.usageMetadata) {
              yield {
                usage: parsed.usageMetadata,
              };
            }

            if (parsed.candidates?.[0]?.finishReason) {
              yield {
                finish_reason: parsed.candidates[0].finishReason,
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
   * Generate text with Gemini
   */
  async _tool_generate(request: oStreamRequest): Promise<ToolResult> {
    const params = request.params as any;
    const { _isStreaming = false } = params;

    if (_isStreaming) {
      this.logger.debug('Streaming generate...');
      return StreamUtils.processGenerator(
        request,
        this._streamGenerate(request),
        request.stream,
      );
    }

    try {
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
        `${this.baseUrl}/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
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
        message: result.candidates[0].content.parts[0]?.text || '',
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
   * Stream text generation with Gemini
   */
  private async *_streamGenerate(
    request: oRequest,
  ): AsyncGenerator<ToolResult> {
    try {
      const params = request.params as any;
      const { model = this.defaultModel, prompt, system, ...options } = params;

      if (!this.apiKey) {
        yield {
          success: false,
          error: 'Gemini API key is required',
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
        `${this.baseUrl}/models/${model}:streamGenerateContent?alt=sse`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify(generateRequest),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        yield {
          success: false,
          error: `Gemini API error: ${response.status} - ${errorText}`,
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

            if (
              parsed.candidates?.[0]?.content?.parts?.[0]?.text !== undefined
            ) {
              yield {
                delta: parsed.candidates[0].content.parts[0].text,
                model: model as string,
              };
            }

            // Track usage and finish reason in final chunk
            if (parsed.usageMetadata) {
              yield {
                usage: parsed.usageMetadata,
              };
            }

            if (parsed.candidates?.[0]?.finishReason) {
              yield {
                finish_reason: parsed.candidates[0].finishReason,
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
      if (!this.apiKey) {
        return {
          success: false,
          error: 'Gemini API key is required',
        };
      }

      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
      });

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

      const response = await fetch(`${this.baseUrl}/models/${model}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
      });

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

      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
      });

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

  /**
   * Generate image from text prompt using Gemini nano-banana models
   */
  async _tool_generate_image(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const {
        model = 'gemini-2.5-flash-image',
        prompt,
        aspectRatio = '1:1',
        imageSize = '2K',
        negativePrompt,
      } = params;

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

      // Build the full prompt with negative prompt if provided
      const fullPrompt = negativePrompt
        ? `${prompt}\n\nAvoid: ${negativePrompt}`
        : prompt;

      const imageRequest: GeminiImageGenerateRequest = {
        contents: [
          {
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: aspectRatio as GeminiImageConfig['aspectRatio'],
            imageSize: imageSize as GeminiImageConfig['imageSize'],
          },
        },
      };

      const response = await fetch(
        `${this.baseUrl}/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify(imageRequest),
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

      // Extract image and text from response parts
      const parts = result.candidates[0].content.parts;
      let imageData: string | undefined;
      let description: string | undefined;

      for (const part of parts) {
        if ((part as any).inline_data) {
          imageData = (part as any).inline_data.data;
        } else if ((part as any).text) {
          description = (part as any).text;
        }
      }

      if (!imageData) {
        return {
          success: false,
          error: 'No image data in response',
        };
      }

      return {
        success: true,
        imageData,
        description,
        model,
        aspectRatio,
        imageSize,
        usage: result.usageMetadata,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to generate image: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Edit or transform an existing image using Gemini nano-banana models
   */
  async _tool_edit_image(request: oRequest): Promise<ToolResult> {
    try {
      const params = request.params as any;
      const {
        model = 'gemini-2.5-flash-image',
        prompt,
        image,
        aspectRatio,
        imageSize = '2K',
      } = params;

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

      if (!image) {
        return {
          success: false,
          error: 'Image is required',
        };
      }

      // Process image input (base64 or file path)
      let imageBase64: string;
      let mimeType: string = 'image/jpeg';

      if (image.startsWith('data:')) {
        // Extract base64 from data URL
        const matches = image.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          imageBase64 = matches[2];
        } else {
          return {
            success: false,
            error: 'Invalid data URL format',
          };
        }
      } else if (image.startsWith('/') || image.includes(':\\')) {
        // File path - convert to base64
        const result = await this.encodeImageToBase64(image);
        imageBase64 = result.data;
        mimeType = result.mimeType;
      } else {
        // Assume it's raw base64
        imageBase64 = image;
        // Try to detect mime type from base64 header
        if (image.startsWith('/9j/')) {
          mimeType = 'image/jpeg';
        } else if (image.startsWith('iVBORw0KGgo')) {
          mimeType = 'image/png';
        }
      }

      const imageRequest: GeminiImageGenerateRequest = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: aspectRatio as GeminiImageConfig['aspectRatio'],
            imageSize: imageSize as GeminiImageConfig['imageSize'],
          },
        },
      };

      const response = await fetch(
        `${this.baseUrl}/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify(imageRequest),
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

      // Extract image and text from response parts
      const parts = result.candidates[0].content.parts;
      let outputImageData: string | undefined;
      let description: string | undefined;

      for (const part of parts) {
        if ((part as any).inline_data) {
          outputImageData = (part as any).inline_data.data;
        } else if ((part as any).text) {
          description = (part as any).text;
        }
      }

      if (!outputImageData) {
        return {
          success: false,
          error: 'No image data in response',
        };
      }

      return {
        success: true,
        imageData: outputImageData,
        description,
        model,
        aspectRatio,
        imageSize,
        usage: result.usageMetadata,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to edit image: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Helper method to encode image file to base64
   */
  private async encodeImageToBase64(
    filePath: string,
  ): Promise<{ data: string; mimeType: string }> {
    try {
      const buffer = await readFile(filePath);
      const base64 = buffer.toString('base64');

      // Detect MIME type from file extension
      let mimeType = 'image/jpeg';
      const lowerPath = filePath.toLowerCase();

      if (lowerPath.endsWith('.png')) {
        mimeType = 'image/png';
      } else if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      } else if (lowerPath.endsWith('.gif')) {
        mimeType = 'image/gif';
      } else if (lowerPath.endsWith('.webp')) {
        mimeType = 'image/webp';
      }

      return { data: base64, mimeType };
    } catch (error) {
      throw new Error(`Failed to read image file: ${(error as Error).message}`);
    }
  }
}
