import { APP_BASE_HREF } from '@angular/common';
import { renderApplication } from '@angular/platform-server';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { bootstrapApplication } from '@angular/platform-browser';
import { Provider, enableProdMode } from '@angular/core';
import 'dotenv/config';
import { environment } from './app/enviroments/environment';
import { config } from './app/app.config.server';
import * as fs from 'fs';
import { AppComponent } from './app/app.component';
import { serverRoutes } from './app/app.routes.server';
import { RenderMode, type ServerRoute } from '@angular/ssr';

if (environment.production) {
  enableProdMode();
}

// Add database URL only for server-side
(environment.supabase as any).database = {
  url: process.env['POSTGRES_CONNECTION_STRING'] || 
       'postgresql://postgres:[PASSWORD]@db.cgwxhmotkujqhwkkfrjf.supabase.co:5432/postgres'
};

// Create express server
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  // Set security headers
  server.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Set view engine and static files
  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Serve static files
  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y'
  }));

  // Check database connection at startup
  if (environment.supabase?.database?.url) {
    console.log('Database configuration loaded successfully');
  } else {
    console.warn('No database connection string found. Server-side database operations will fail.');
  }

  // Handle all routes for SSR
  server.get('*', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    // Skip SSR for static files
    if (req.url.includes('.')) return next();

    try {
      // Read the index file
      const document = await fs.promises.readFile(indexHtml, 'utf-8');
      
      // Render the app using the new Angular 20 SSR approach
      const html = await renderApplication(() => bootstrapApplication(AppComponent, config), {
        document,
        url: `${protocol}://${headers.host}${originalUrl}`,
        platformProviders: [
          { provide: APP_BASE_HREF, useValue: baseUrl }
        ]
      });

      // Set cache control based on route configuration
      const route = req.path === '/' ? '' : req.path;
      const serverRoute = serverRoutes.find((r: ServerRoute) => r.path === route);
      
      if (serverRoute) {
        // Apply custom headers from route configuration
        if (serverRoute.headers) {
          Object.entries(serverRoute.headers || {}).forEach(([key, value]: [string, string]) => {
            res.setHeader(key, value);
          });
        }

        // Set cache headers based on render mode
        switch (serverRoute.renderMode) {
          case RenderMode.Prerender:
            res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000');
            break;
          case RenderMode.Client:
            res.setHeader('Cache-Control', 'public, max-age=60');
            break;
          case RenderMode.Server:
            res.setHeader('Cache-Control', 'private, no-cache');
            break;
        }

        // Handle response status
        if ('status' in serverRoute && typeof serverRoute.status === 'number') {
          res.status(serverRoute.status);
        }
      } else {
        // Default cache control for unmatched routes
        res.setHeader('Cache-Control', 'private, no-cache');
      }

      res.send(html);
    } catch (error: unknown) {
      console.error('Error during rendering:', error instanceof Error ? error.message : error);
      res.status(500).send('Server Error');
    }
  });

  return server;
}

// Export the request handler for SSR
export const reqHandler = app();

// Create a sample .env file with required environment variables
if (!process.env['POSTGRES_CONNECTION_STRING'] && process.env['NODE_ENV'] !== 'production') {
  console.warn(`
    ⚠️ Database connection string not found in environment variables.
    Create a .env file in the project root with:

    SUPABASE_URL=https://cgwxhmotkujqhwkkfrjf.supabase.co
    SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    POSTGRES_CONNECTION_STRING=postgresql://postgres:[PASSWORD]@db.cgwxhmotkujqhwkkfrjf.supabase.co:5432/postgres
  `);
}

// Start server if running directly
if (import.meta.url === process.argv[1]) {
  const port = process.env['PORT'] || 4000;
  app().listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}