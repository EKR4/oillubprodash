export interface AuthError {
  code: string;
  message: string;
  status?: number;
  details?: any;
}

export type AuthErrorCode = 
  | 'auth/invalid-email'
  | 'auth/wrong-password'
  | 'auth/email-already-in-use'
  | 'auth/weak-password'
  | 'auth/user-not-found'
  | 'auth/requires-recent-login'
  | 'auth/session-expired'
  | 'auth/network-error'
  | 'auth/invalid-credentials'
  | 'auth/invalid-token'
  | 'auth/token-expired'
  | 'auth/user-disabled'
  | 'auth/unauthorized'
  | 'auth/too-many-requests'
  | string;