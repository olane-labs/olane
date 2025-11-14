/**
 * Structured error types for capability execution
 */

export enum CapabilityErrorType {
  // Tool/Resource errors
  NOT_FOUND = 'not_found',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',

  // Configuration errors
  INVALID_CONFIG = 'invalid_config',
  MISSING_PARAMETER = 'missing_parameter',
  INVALID_PARAMETER = 'invalid_parameter',

  // Execution errors
  TOOL_ERROR = 'tool_error',
  TIMEOUT = 'timeout',
  NETWORK_ERROR = 'network_error',

  // State errors
  INVALID_STATE = 'invalid_state',
  RESOURCE_EXHAUSTED = 'resource_exhausted',

  // Unknown
  UNKNOWN = 'unknown',
}

/**
 * Context information for capability errors
 */
export interface CapabilityErrorContext {
  /** The cycle number where the error occurred */
  cycle?: number;

  /** The capability type that failed */
  capabilityType?: string;

  /** The tool address that was being used */
  toolAddress?: string;

  /** The method that was being called */
  method?: string;

  /** Additional context data */
  data?: any;

  /** The user's original intent */
  intent?: string;
}

/**
 * Structured capability error with context and remediation suggestions
 */
export class CapabilityError extends Error {
  public readonly type: CapabilityErrorType;
  public readonly context: CapabilityErrorContext;
  public readonly originalError?: Error;

  constructor(
    type: CapabilityErrorType,
    message: string,
    context: CapabilityErrorContext = {},
    originalError?: Error
  ) {
    super(message);
    this.name = 'CapabilityError';
    this.type = type;
    this.context = context;
    this.originalError = originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CapabilityError);
    }
  }

  /**
   * Get a human-readable error message with context
   */
  toHumanReadable(): string {
    let message = `${this.getErrorTypeLabel()}: ${this.message}`;

    if (this.context.cycle !== undefined) {
      message += `\n\nOccurred in Cycle ${this.context.cycle}`;
    }

    if (this.context.capabilityType) {
      message += `\nCapability: ${this.context.capabilityType}`;
    }

    if (this.context.toolAddress) {
      message += `\nTool: ${this.context.toolAddress}`;
    }

    if (this.context.method) {
      message += `\nMethod: ${this.context.method}`;
    }

    const remediation = this.getRemediation();
    if (remediation) {
      message += `\n\nSuggestion: ${remediation}`;
    }

    return message;
  }

  /**
   * Get a friendly label for the error type
   */
  private getErrorTypeLabel(): string {
    const labels: { [key in CapabilityErrorType]: string } = {
      [CapabilityErrorType.NOT_FOUND]: 'Resource Not Found',
      [CapabilityErrorType.UNAUTHORIZED]: 'Unauthorized',
      [CapabilityErrorType.FORBIDDEN]: 'Forbidden',
      [CapabilityErrorType.INVALID_CONFIG]: 'Invalid Configuration',
      [CapabilityErrorType.MISSING_PARAMETER]: 'Missing Parameter',
      [CapabilityErrorType.INVALID_PARAMETER]: 'Invalid Parameter',
      [CapabilityErrorType.TOOL_ERROR]: 'Tool Execution Error',
      [CapabilityErrorType.TIMEOUT]: 'Timeout',
      [CapabilityErrorType.NETWORK_ERROR]: 'Network Error',
      [CapabilityErrorType.INVALID_STATE]: 'Invalid State',
      [CapabilityErrorType.RESOURCE_EXHAUSTED]: 'Resource Exhausted',
      [CapabilityErrorType.UNKNOWN]: 'Unknown Error',
    };

    return labels[this.type] || 'Error';
  }

  /**
   * Get remediation suggestion based on error type
   */
  private getRemediation(): string | null {
    const remediations: Partial<{ [key in CapabilityErrorType]: string }> = {
      [CapabilityErrorType.NOT_FOUND]:
        'Verify the tool address exists and is accessible. Use search to find available tools.',
      [CapabilityErrorType.UNAUTHORIZED]:
        'Check that you have the necessary permissions to access this resource.',
      [CapabilityErrorType.INVALID_CONFIG]:
        'Review the configuration parameters and ensure they match the required format.',
      [CapabilityErrorType.MISSING_PARAMETER]:
        'Provide all required parameters. Use the tool\'s handshake to see parameter requirements.',
      [CapabilityErrorType.INVALID_PARAMETER]:
        'Check that parameter values match the expected types and constraints.',
      [CapabilityErrorType.TOOL_ERROR]:
        'Review the tool\'s error message and adjust your request accordingly.',
      [CapabilityErrorType.TIMEOUT]:
        'The operation took too long. Try simplifying the request or increasing the timeout.',
      [CapabilityErrorType.NETWORK_ERROR]:
        'Check your network connection and try again.',
      [CapabilityErrorType.RESOURCE_EXHAUSTED]:
        'You may have hit a rate limit or resource quota. Try again later.',
    };

    return remediations[this.type] || null;
  }

  /**
   * Convert to JSON for serialization
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      context: this.context,
      humanReadable: this.toHumanReadable(),
      stack: this.stack,
    };
  }

  /**
   * Create a CapabilityError from a generic error
   */
  static from(
    error: Error | any,
    context: CapabilityErrorContext = {}
  ): CapabilityError {
    if (error instanceof CapabilityError) {
      return error;
    }

    // Try to infer error type from message
    let type = CapabilityErrorType.UNKNOWN;
    const message = error?.message || String(error);

    if (message.includes('not found') || message.includes('404')) {
      type = CapabilityErrorType.NOT_FOUND;
    } else if (message.includes('unauthorized') || message.includes('401')) {
      type = CapabilityErrorType.UNAUTHORIZED;
    } else if (message.includes('forbidden') || message.includes('403')) {
      type = CapabilityErrorType.FORBIDDEN;
    } else if (message.includes('timeout')) {
      type = CapabilityErrorType.TIMEOUT;
    } else if (message.includes('network') || message.includes('ECONNREFUSED')) {
      type = CapabilityErrorType.NETWORK_ERROR;
    } else if (message.includes('parameter') || message.includes('config')) {
      type = CapabilityErrorType.INVALID_CONFIG;
    }

    return new CapabilityError(
      type,
      message,
      context,
      error instanceof Error ? error : undefined
    );
  }
}
