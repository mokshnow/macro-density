import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import handler from './api/kalshi';

function kalshiApiPlugin(): Plugin {
  return {
    name: 'kalshi-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/kalshi')) {
          const urlObj = new URL(req.url, 'http://localhost:3000');
          const query: Record<string, string> = {};
          urlObj.searchParams.forEach((val, key) => {
            query[key] = val;
          });

          const requestAdapter = {
            method: req.method,
            query,
            headers: req.headers,
          };

          const responseAdapter = {
            statusCode: 200,
            headers: {} as Record<string, string>,
            setHeader(key: string, value: string) {
              this.headers[key] = value;
              res.setHeader(key, value);
            },
            status(code: number) {
              this.statusCode = code;
              res.statusCode = code;
              return this;
            },
            json(data: any) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = this.statusCode;
              res.end(JSON.stringify(data));
            },
            end() {
              res.end();
            },
          };

          try {
            await handler(requestAdapter, responseAdapter);
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }));
          }
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), kalshiApiPlugin()],
  server: {
    port: 3000,
    open: false,
  },
});
