import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { authInterceptor } from './cores/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Router configuration
    provideRouter(
      routes,
      withViewTransitions()
    ),

    // HTTP client configuration
    provideHttpClient(
      withFetch(),
      withInterceptors([
        authInterceptor
      ])
    ),

    // Client hydration for SSR
    provideClientHydration(),

    // Animations
    provideAnimations(),

    // Development tools
    ...(isDevMode() ? [
      // Add development-only providers here
    ] : [])
  ]
};