import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Required for Angular SSR


// Only if you need to run the server directly (development)
if (import.meta.url === process.argv[1]) {
  const app = express();
  const port = process.env['PORT'] || 4000;
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');

  // Serve static files
  app.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y'
  }));

 

  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}