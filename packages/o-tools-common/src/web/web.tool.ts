import { oToolConfig, oVirtualTool } from '@olane/o-tool';
import { oAddress, oRequest } from '@olane/o-core';
import { ToolResult } from '@olane/o-tool';
import { WEB_INTERPRETER_PARAMS } from './parameters/web-interpreter.parameters.js';
import {
  WebInterpreterRequest,
  WebInterpreterResponse,
  WebPageAnalysis,
  WebInterpreterConfig,
} from './interfaces/web-interpreter.interface.js';

export class WebInterpreterTool extends oVirtualTool {
  private config: WebInterpreterConfig;

  constructor(config: oToolConfig & { webConfig?: WebInterpreterConfig }) {
    super({
      ...config,
      address: new oAddress('o://web-interpreter'),
      methods: WEB_INTERPRETER_PARAMS,
      description:
        'Resolve internet URL references and return AI-optimized content analysis',
    });

    this.config = {
      maxConcurrentRequests: 5,
      defaultTimeout: 30000,
      cacheEnabled: true,
      cacheTtl: 3600,
      allowedDomains: [],
      blockedDomains: ['localhost', '127.0.0.1'],
      ...config.webConfig,
    };
  }

  async _tool_interpret(request: oRequest): Promise<WebInterpreterResponse> {
    const { url, options } = request.params as unknown as WebInterpreterRequest;

    this.logger.debug('Interpreting webpage:', url);

    try {
      // Validate URL
      await this.validateUrl(url);

      // Fetch and analyze webpage
      const analysis = await this.analyzeWebpage(url, options);

      // Generate AI-optimized content
      const aiOptimized = await this.generateAiOptimizedContent(analysis);

      // Extract clean content
      const extracted = await this.extractContent(analysis);

      return {
        success: true,
        data: {
          analysis,
          aiOptimized,
          extracted,
        },
        analysis,
        aiOptimized,
        extracted,
      };
    } catch (error) {
      this.logger.error('Error interpreting webpage:', error);
      throw error;
    }
  }

  async _tool_extractText(request: oRequest): Promise<ToolResult> {
    const { url, options } = request.params as unknown as WebInterpreterRequest;

    this.logger.debug('Extracting text from webpage:', url);

    try {
      await this.validateUrl(url);
      const analysis = await this.analyzeWebpage(url, options);
      const extracted = await this.extractContent(analysis);

      return {
        success: true,
        data: extracted,
      };
    } catch (error) {
      this.logger.error('Error extracting text from webpage:', error);
      throw error;
    }
  }

  async _tool_analyze(request: oRequest): Promise<ToolResult> {
    const { url, options } = request.params as unknown as WebInterpreterRequest;

    this.logger.debug('Analyzing webpage:', url);

    try {
      await this.validateUrl(url);
      const analysis = await this.analyzeWebpage(url, options);

      return {
        success: true,
        data: analysis,
      };
    } catch (error) {
      this.logger.error('Error analyzing webpage:', error);
      throw error;
    }
  }

  private async validateUrl(url: string): Promise<void> {
    try {
      const parsedUrl = new URL(url);

      // Check blocked domains
      if (this.config.blockedDomains?.includes(parsedUrl.hostname)) {
        throw new Error(`Domain ${parsedUrl.hostname} is blocked`);
      }

      // Check allowed domains (if specified)
      if (this.config.allowedDomains && this.config.allowedDomains.length > 0) {
        if (!this.config.allowedDomains.includes(parsedUrl.hostname)) {
          throw new Error(
            `Domain ${parsedUrl.hostname} is not in allowed list`,
          );
        }
      }

      // Ensure https or http
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Only HTTP and HTTPS protocols are supported');
      }
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Invalid URL format');
      }
      throw error;
    }
  }

  private async analyzeWebpage(
    url: string,
    options?: WebInterpreterRequest['options'],
  ): Promise<WebPageAnalysis> {
    // TODO: Implement actual webpage fetching and analysis
    // This is a placeholder that will be implemented with proper tools

    this.logger.debug('Analyzing webpage structure and content...');

    return {
      url,
      title: 'Placeholder Title',
      content: 'Placeholder content - to be implemented',
      metadata: {
        description: 'Placeholder description',
        keywords: ['placeholder'],
        language: 'en',
        charset: 'utf-8',
      },
      structure: {
        headings: [],
        links: [],
        images: [],
      },
      performance: {
        contentLength: 0,
        responseStatus: 200,
      },
    };
  }

  private async generateAiOptimizedContent(
    analysis: WebPageAnalysis,
  ): Promise<WebInterpreterResponse['aiOptimized']> {
    // TODO: Implement AI content optimization
    // This will use AI services to generate summaries, key points, etc.

    this.logger.debug('Generating AI-optimized content...');

    return {
      summary: 'Placeholder summary - to be implemented with AI',
      keyPoints: ['Placeholder key point 1', 'Placeholder key point 2'],
      topics: ['placeholder', 'topic'],
      sentiment: 'neutral',
      readingTime: 1,
      contentType: 'other',
    };
  }

  private async extractContent(
    analysis: WebPageAnalysis,
  ): Promise<WebInterpreterResponse['extracted']> {
    // TODO: Implement content extraction and cleaning
    // This will use proper text extraction tools

    this.logger.debug('Extracting and cleaning content...');

    return {
      mainContent: analysis.content,
      cleanedText: analysis.content,
      codeBlocks: [],
    };
  }
}
