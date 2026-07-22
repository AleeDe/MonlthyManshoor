import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { config as loadEnv } from 'dotenv';

// Local-only middleware that mimics the Vercel /api/admin function so the
// admin page works with plain `npm run dev` (no Vercel CLI needed).
// In production, api/admin.ts runs as a real Vercel serverless function.
function localAdminApi(): Plugin {
  return {
    name: 'local-admin-api',
    configureServer(server) {
      loadEnv(); // reads .env into process.env
      server.middlewares.use('/api/admin', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json');
          const { ADMIN_PASSWORD, SANITY_WRITE_TOKEN } = process.env;
          if (!ADMIN_PASSWORD || !SANITY_WRITE_TOKEN) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Missing ADMIN_PASSWORD / SANITY_WRITE_TOKEN in .env' }));
            return;
          }
          let password = '';
          try {
            password = JSON.parse(body || '{}').password;
          } catch {
            /* fall through to wrong password */
          }
          if (password === ADMIN_PASSWORD) {
            res.end(JSON.stringify({ token: SANITY_WRITE_TOKEN }));
          } else {
            res.statusCode = 401;
            res.end(JSON.stringify({ error: 'Wrong password' }));
          }
        });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), localAdminApi()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  worker: {
    format: 'es', // gs background-worker uses dynamic import()
  },
});
