import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import handler from './api/kalshi';

function kalshiApiPlugin(): Plugin {
  return {
    name: 'kalshi-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        if (url.pathname === '/api/kalshi') {
          try {
            const queryParams: Record<string, string> = {};
            url.searchParams.forEach((value, key) => {
              queryParams[key] = value;
            });

            const customReq = {
              method: req.method,
              query: queryParams,
              headers: req.headers,
            };

            const customRes = {
              setHeader(key: string, val: string) {
                res.setHeader(key, val);
              },
              status(code: number) {
                res.statusCode = code;
                return {
                  json(data: any) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                  },
                  end() {
                    res.end();
                  },
                };
              },
            };

            await handler(customReq, customRes);
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

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), kalshiApiPlugin()],
  server: {
    port: 3000,
    open: false,
  },
});
