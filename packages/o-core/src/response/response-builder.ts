import { oRequest } from '../connection/o-request.js';
import { oResponse } from '../connection/o-response.js';
import { oError } from '../error/o-error.js';
import { oErrorCodes } from '../error/enums/codes.error.js';

/**
 * Response context for building responses with proper metadata
 */
export interface ResponseContext {
  /** Whether this is a streaming response */
  isStream?: boolean;
  /** Whether this is the last chunk in a stream */
  isLast?: boolean;
  /** Whether the operation was successful */
  success?: boolean;
  /** Request ID for correlation */
  requestId?: string | number;
  /** Connection ID from the request */
  connectionId?: string | number;
  /** Request method for tracking */
  requestMethod?: string | number;
}

/**
 * Middleware function that can intercept and transform responses
 */
export type ResponseMiddleware = (
  response: oResponse,
  context: ResponseContext,
) => oResponse | Promise<oResponse>;

/**
 * Metrics tracker interface for extensible metrics tracking
 */
export interface MetricsTracker {
  trackSuccess(context: ResponseContext): void;
  trackError(context: ResponseContext, error: oError): void;
}

/**
 * Default metrics tracker that increments counters
 */
export class DefaultMetricsTracker implements MetricsTracker {
  private metrics: { successCount: number; errorCount: number };

  constructor(metrics: { successCount: number; errorCount: number }) {
    this.metrics = metrics;
  }

  trackSuccess(context: ResponseContext): void {
    this.metrics.successCount++;
  }

  trackError(context: ResponseContext, error: oError): void {
    this.metrics.errorCount++;
  }
}

/**
 * ResponseBuilder - Unified response generation for all Olane routing paths
 *
 * This class provides a single source of truth for creating responses across:
 * - Local execution (useSelf)
 * - Remote execution (use, useChild)
 * - Router forwarding (forward, executeSelfRouting)
 * - Streaming responses
 *
 * Features:
 * - Consistent error normalization
 * - Automatic metrics tracking
 * - Context-aware response building (streaming, success/error states)
 * - Extensible middleware system
 *
 * @example
 * ```typescript
 * const builder = new ResponseBuilder()
 *   .withMetrics(node.metrics)
 *   .use(loggingMiddleware);
 *
 * const response = await builder.build(request, result, error);
 * ```
 */
export class ResponseBuilder {
  private middlewares: ResponseMiddleware[] = [];
  private metricsTracker?: MetricsTracker;

  /**
   * Add a middleware function to intercept responses
   */
  use(middleware: ResponseMiddleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Configure metrics tracking
   * @param metrics The metrics object to track success/error counts
   */
  withMetrics(metrics: { successCount: number; errorCount: number }): this {
    this.metricsTracker = new DefaultMetricsTracker(metrics);
    return this;
  }

  /**
   * Configure custom metrics tracker
   * @param tracker Custom metrics tracker implementation
   */
  withCustomMetrics(tracker: MetricsTracker): this {
    this.metricsTracker = tracker;
    return this;
  }

  /**
   * Normalize any error into an oError instance
   * @param error The error to normalize
   * @returns An oError instance
   */
  normalizeError(error: any): oError {
    if (error instanceof oError) {
      return error;
    }
    return new oError(
      oErrorCodes.UNKNOWN,
      error?.message || String(error),
      error?.stack,
    );
  }

  /**
   * Build a complete response from a request and result
   * @param request The original request
   * @param result The result data (or error object)
   * @param error Optional error object
   * @param context Additional response context
   * @returns An oResponse instance
   */
  async build(
    request: oRequest,
    result: any,
    error?: any,
    context?: Partial<ResponseContext>,
  ): Promise<oResponse> {
    const isError = !!error;
    const success = !isError;

    // Build context
    const responseContext: ResponseContext = {
      isStream: context?.isStream ?? false,
      isLast: context?.isLast ?? true,
      success,
      requestId: request.id,
      connectionId: request.params?._connectionId as string | undefined,
      requestMethod: request.method as string | undefined,
      ...context,
    };

    // Create response
    let response = new oResponse({
      id: request.id,
      data: result,
      error: result?.error,
      success,
      _last: responseContext.isLast ?? true,
      _isStreaming: responseContext.isStream ?? false,
      _requestMethod: String(
        responseContext.requestMethod || request.method || '',
      ),
      _connectionId: String(responseContext.connectionId || ''),
    });

    // Apply middleware
    for (const middleware of this.middlewares) {
      response = await middleware(response, responseContext);
    }

    // Track metrics
    if (this.metricsTracker) {
      if (success) {
        this.metricsTracker.trackSuccess(responseContext);
      } else {
        this.metricsTracker.trackError(
          responseContext,
          this.normalizeError(error),
        );
      }
    }

    return response;
  }

  /**
   * Build a streaming chunk response
   * @param request The original request
   * @param chunkData The chunk data
   * @param context Additional response context
   * @returns An oResponse instance with _last: false
   */
  async buildChunk(
    request: oRequest,
    chunkData: any,
    context?: Partial<ResponseContext>,
  ): Promise<oResponse> {
    return this.build(request, chunkData, null, {
      ...context,
      isStream: true,
      isLast: false,
      success: true,
    });
  }

  /**
   * Build the final chunk in a stream
   * @param request The original request
   * @param context Additional response context
   * @returns An oResponse instance with _last: true
   */
  async buildFinalChunk(
    request: oRequest,
    context?: Partial<ResponseContext>,
  ): Promise<oResponse> {
    return this.build(
      request,
      { success: true, response: 'Stream completed' },
      null,
      {
        ...context,
        isStream: true,
        isLast: true,
        success: true,
      },
    );
  }

  /**
   * Build an error response
   * @param request The original request
   * @param error The error that occurred
   * @param context Additional response context
   * @returns An oResponse instance with error details
   */
  async buildError(
    request: oRequest,
    error: any,
    context?: Partial<ResponseContext>,
  ): Promise<oResponse> {
    const normalizedError = this.normalizeError(error);
    return this.build(
      request,
      { error: normalizedError.toJSON() },
      normalizedError,
      context,
    );
  }

  /**
   * Execute a function and automatically build a response based on the outcome
   * @param request The request being executed
   * @param executor The function to execute
   * @param context Additional response context
   * @returns An oResponse instance
   */
  async execute(
    request: oRequest,
    executor: () => Promise<any>,
    context?: Partial<ResponseContext>,
  ): Promise<oResponse> {
    try {
      const result = await executor();
      return await this.build(request, result, null, context);
    } catch (error: any) {
      return await this.buildError(request, error, context);
    }
  }

  /**
   * Create a new ResponseBuilder instance (for chaining)
   * @returns A new ResponseBuilder instance
   */
  static create(): ResponseBuilder {
    return new ResponseBuilder();
  }
}
