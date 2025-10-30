import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthError } from '../models/auth-error';

@Injectable({
  providedIn: 'root'
})
export class AuthErrorService {
  private errorSubject = new BehaviorSubject<AuthError | null>(null);
  public error$ = this.errorSubject.asObservable();

  constructor() {}

  handleError(error: any): AuthError {
    let authError: AuthError;

    // Handle Supabase specific errors
    if (error.error?.message || error.message) {
      authError = this.mapSupabaseError(error);
    } else {
      authError = {
        code: 'auth/unknown',
        message: 'An unknown error occurred'
      };
    }

    // Emit the error
    this.errorSubject.next(authError);
    return authError;
  }

  clearError(): void {
    this.errorSubject.next(null);
  }

  private mapSupabaseError(error: any): AuthError {
    const message = error.error?.message || error.message;
    const status = error.status || error.error?.status;

    // Map common Supabase error messages to our error codes
    switch (true) {
      case /invalid.+email/i.test(message):
        return {
          code: 'auth/invalid-email',
          message: 'Please enter a valid email address',
          status
        };

      case /invalid.+password/i.test(message):
        return {
          code: 'auth/wrong-password',
          message: 'Invalid password. Please try again',
          status
        };

      case /email.+exists/i.test(message):
        return {
          code: 'auth/email-already-in-use',
          message: 'An account with this email already exists',
          status
        };

      case /password.+weak/i.test(message):
        return {
          code: 'auth/weak-password',
          message: 'Password should be at least 8 characters long',
          status
        };

      case /user.+found/i.test(message):
        return {
          code: 'auth/user-not-found',
          message: 'No account found with this email',
          status
        };

      case /session.+expired/i.test(message):
        return {
          code: 'auth/session-expired',
          message: 'Your session has expired. Please sign in again',
          status
        };

      case /network/i.test(message):
        return {
          code: 'auth/network-error',
          message: 'Network error. Please check your connection',
          status
        };

      case /too.+many.+attempts/i.test(message):
        return {
          code: 'auth/too-many-requests',
          message: 'Too many attempts. Please try again later',
          status
        };

      case /unauthorized/i.test(message):
        return {
          code: 'auth/unauthorized',
          message: 'Unauthorized access. Please sign in again',
          status
        };

      default:
        return {
          code: 'auth/unknown',
          message: message || 'An unexpected error occurred',
          status,
          details: error
        };
    }
  }

  public getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists';
      case 'auth/weak-password':
        return 'Password should be at least 8 characters long';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/requires-recent-login':
        return 'Please sign in again to continue';
      case 'auth/session-expired':
        return 'Your session has expired. Please sign in again';
      case 'auth/network-error':
        return 'Network error. Please check your connection';
      case 'auth/invalid-credentials':
        return 'Invalid credentials. Please try again';
      case 'auth/invalid-token':
        return 'Invalid session. Please sign in again';
      case 'auth/token-expired':
        return 'Session expired. Please sign in again';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/unauthorized':
        return 'Unauthorized access. Please sign in again';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later';
      default:
        return 'An unexpected error occurred';
    }
  }
}