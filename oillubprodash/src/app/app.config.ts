import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideRouter, withViewTransitions, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { authInterceptor } from './cores/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Router configuration with enhanced SSR features
    provideRouter(
      routes,
      withViewTransitions(),
      withComponentInputBinding()
    ),

    // HTTP client configuration
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor])
    ),

    // Client hydration and SSR optimizations
    provideClientHydration(),

    // Animations
    provideAnimations(),

    // Development tools
    ...(isDevMode() ? [
      // Add development-only providers here
    ] : [])
  ]
};