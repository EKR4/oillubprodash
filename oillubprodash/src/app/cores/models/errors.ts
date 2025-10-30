// Base error class for all application errors
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class TimeoutError extends AppError {
  constructor(operation: string) {
    super(
      `Operation timed out: ${operation}`,
      'TIMEOUT_ERROR',
      408,
      true
    );
  }
}

export class SignupError extends AppError {
  constructor(
    message: string,
    code: string = 'SIGNUP_ERROR',
    statusCode: number = 400,
    retryable: boolean = false
  ) {
    super(message, code, statusCode, retryable);
  }
}

export class AuthError extends AppError {
  constructor(
    message: string,
    code: string = 'AUTH_ERROR',
    statusCode: number = 401
  ) {
    super(message, code, statusCode, false);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly errors: Record<string, string> = {}
  ) {
    super(message, 'VALIDATION_ERROR', 400, false);
    this.field = field;
  }
}

export class NetworkError extends AppError {
  constructor(
    message: string,
    code: string = 'NETWORK_ERROR',
    statusCode: number = 503
  ) {
    super(message, code, statusCode, true);
  }
}

export class RateLimitError extends AppError {
  constructor(
    message: string = 'Too many requests',
    public readonly retryAfter?: number
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, false);
    this.retryAfter = retryAfter;
  }
}