import { ToolResult } from '@olane/o-tool';

export interface WebPageAnalysis {
  url: string;
  title?: string;
  content: string;
  metadata: {
    description?: string;
    keywords?: string[];
    author?: string;
    publishedDate?: string;
    modifiedDate?: string;
    language?: string;
    charset?: string;
  };
  structure: {
    headings: Array<{
      level: number;
      text: string;
    }>;
    links: Array<{
      text: string;
      url: string;
      isExternal: boolean;
    }>;
    images: Array<{
      src: string;
      alt?: string;
      title?: string;
    }>;
  };
  performance: {
    loadTime?: number;
    contentLength: number;
    responseStatus: number;
  };
}

export interface WebInterpreterRequest {
  url: string;
  options?: {
    includeImages?: boolean;
    includeLinks?: boolean;
    maxContentLength?: number;
    timeout?: number;
    userAgent?: string;
    extractMode?: 'full' | 'text-only' | 'structured';
  };
}

export interface WebInterpreterResponse extends ToolResult {
  analysis: WebPageAnalysis;
  aiOptimized: {
    summary: string;
    keyPoints: string[];
    topics: string[];
    sentiment?: 'positive' | 'negative' | 'neutral';
    readingTime: number; // in minutes
    contentType:
      | 'article'
      | 'blog'
      | 'news'
      | 'product'
      | 'documentation'
      | 'other';
  };
  extracted: {
    mainContent: string;
    cleanedText: string;
    codeBlocks?: Array<{
      language?: string;
      code: string;
    }>;
  };
}

export interface WebInterpreterConfig {
  maxConcurrentRequests?: number;
  defaultTimeout?: number;
  cacheEnabled?: boolean;
  cacheTtl?: number; // in seconds
  allowedDomains?: string[];
  blockedDomains?: string[];
}
