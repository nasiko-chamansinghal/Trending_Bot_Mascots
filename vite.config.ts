import { createReadStream, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

function embedLibraries(): Plugin {
  return {
    name: 'embed-libraries',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = /^\/(mood-mates|emotion-ball)\.js(\?.*)?$/.exec(req.url ?? '')?.[1];
        if (!name) return next();
        const file = resolve(import.meta.dirname, 'dist-lib', `${name}.iife.js`);
        if (!existsSync(file)) {
          res.statusCode = 404;
          res.end('Run "pnpm build:lib" once to serve the embed libraries in development.');
          return;
        }
        res.setHeader('Content-Type', 'text/javascript');
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), embedLibraries()],
  resolve: { alias: { '@': resolve(import.meta.dirname, 'src') } },
});
