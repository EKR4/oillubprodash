import { UserRole } from './user';
import { AppError } from './errors';
import { withTimeout } from '../utils/timeout';

// Response status enum
export enum SignupStatus {
  SUCCESS = 'success',
  PARTIAL_SUCCESS = 'partial_success',
  FAILED = 'failed',
  VALIDATION_ERROR = 'validation_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout'
}

// Configuration constants
export const SIGNUP_CONSTANTS = {
  RATE_LIMIT: {
    MAX_ATTEMPTS: 5,          // max signup attempts
    WINDOW_MS: 300000,        // 5 minutes
    BLOCK_DURATION_MS: 900000 // 15 minutes block after limit exceeded
  },
  TIMEOUTS: {
    INITIAL: 5000,     // 5 seconds for initial request
    PROFILE_UPDATE: 3000, // 3 seconds for profile updates
    ADDRESS_UPDATE: 3000  // 3 seconds for address updates
  },
  RETRY: {
    MAX_RETRIES: 3,    // max retries for profile updates
    BASE_DELAY: 500,   // base delay between retries (ms)
    MAX_DELAY: 5000    // maximum delay between retries (ms)
  },
  TRIGGERS: {
    WAIT_TIME: 1000    // Wait time for DB triggers (ms)
  },
  MAX_BATCH_SIZE: 10   // max concurrent requests
} as const;

// Base user data interface
export interface SignupUserData {
  email: string;
  password: string;
  fullName?: string;
  role?: UserRole;
  phone?: string;
  companyId?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

// Edge Function response interface
export interface SignupFunctionResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
  };
  message: string;
}

// Profile update interface
export interface ProfileUpdateData {
  phone?: string;
  company_id?: string | null;
  updated_at: string;
}

// User profile update interface
export interface UserProfileUpdateData {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  updated_at: string;
}

// Extended signup response
export interface SignupResult {
  data: any;
  status: SignupStatus;
  user: SignupFunctionResponse['user'] | null;
  session: any | null;
  profile?: {
    updated: boolean;
    error?: string;
  };
  address?: {
    updated: boolean;
    error?: string;
  };
  error?: string;
  retryCount?: number;
}

// Error classes
export class SignupBaseError extends AppError {
  constructor(
    message: string,
    code: string = 'SIGNUP_ERROR',
    statusCode: number = 400,
    retryable: boolean = false
  ) {
    super(message, code, statusCode, retryable);
    this.name = 'SignupError';
  }
}

export class SignupValidationError extends SignupBaseError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400, false);
    this.field = field;
  }
  field?: string;
}

export class ProfileUpdateError extends SignupBaseError {
  constructor(message: string, retryable: boolean = true) {
    super(message, 'PROFILE_UPDATE_ERROR', 500, retryable);
  }
}

export class EdgeFunctionError extends SignupBaseError {
  constructor(message: string, statusCode: number = 500, retryable: boolean = true) {
    super(message, 'EDGE_FUNCTION_ERROR', statusCode, retryable);
  }
}

export class NetworkError extends SignupBaseError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR', 503, true);
  }
}

export class TimeoutError extends SignupBaseError {
  constructor(operation: string) {
    super(`Operation timed out: ${operation}`, 'TIMEOUT_ERROR', 408, true);
  }
}

// Validation functions
export function validateSignupData(data: SignupUserData): void {
  // Email validation
  if (!data.email) {
    throw new SignupValidationError('Email is required', 'email');
  }
  if (!data.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    throw new SignupValidationError('Invalid email format', 'email');
  }

  // Password validation
  if (!data.password) {
    throw new SignupValidationError('Password is required', 'password');
  }
  if (data.password.length < 8) {
    throw new SignupValidationError('Password must be at least 8 characters', 'password');
  }
  if (!data.password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)) {
    throw new SignupValidationError(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'password'
    );
  }

  // Role validation
  if (data.role && !['admin', 'company', 'customer'].includes(data.role)) {
    throw new SignupValidationError('Invalid user role', 'role');
  }

  // Phone validation
  if (data.phone && !data.phone.match(/^\+?[\d\s-()]{8,}$/)) {
    throw new SignupValidationError('Invalid phone number format', 'phone');
  }

  // Company ID validation
  if (data.companyId && !data.companyId.match(/^[0-9a-fA-F-]{36}$/)) {
    throw new SignupValidationError('Invalid company ID format', 'companyId');
  }

  // Address validation
  const addressFields = [
    { value: data.street, name: 'street' },
    { value: data.city, name: 'city' },
    { value: data.state, name: 'state' },
    { value: data.postalCode, name: 'postalCode' },
    { value: data.country, name: 'country' }
  ];

  const providedFields = addressFields.filter(field => field.value);
  if (providedFields.length > 0 && providedFields.length < addressFields.length) {
    const missingFields = addressFields
      .filter(field => !field.value)
      .map(field => field.name)
      .join(', ');
    throw new SignupValidationError(
      `All address fields are required. Missing: ${missingFields}`,
      'address'
    );
  }
}

// Helper function to prepare profile update data
export function prepareProfileUpdate(data: SignupUserData): ProfileUpdateData {
  return {
    phone: data.phone,
    company_id: data.companyId || null,
    updated_at: new Date().toISOString()
  };
}

// Helper function to prepare user profile update data
export function prepareUserProfileUpdate(data: SignupUserData): UserProfileUpdateData | null {
  if (!data.street && !data.city && !data.state && !data.postalCode && !data.country) {
    return null;
  }

  return {
    street: data.street || '',
    city: data.city || '',
    state: data.state || '',
    postal_code: data.postalCode || '',
    country: data.country || '',
    updated_at: new Date().toISOString()
  };
}

// Helper for exponential backoff
export function backoff(attempt: number): number {
  const baseDelay = SIGNUP_CONSTANTS.RETRY.BASE_DELAY;
  const maxDelay = SIGNUP_CONSTANTS.RETRY.MAX_DELAY;
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  return delay + Math.random() * 100; // Add jitter
}