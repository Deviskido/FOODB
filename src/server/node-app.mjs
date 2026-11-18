import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
const files = new Map([['/', ['../mvp/index.html', 'text/html; charset=utf-8']], ['/mvp.js', ['../mvp/app.js', 'text/javascript; charset=utf-8']], ['/mvp.css', ['../mvp/styles.css', 'text/css; charset=utf-8']]]);
export function createNodeMvp(options) {
  const app = createApp(options);
  return {
    close: app.close,
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/v1/')) return app.fetch(request);
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return new Response('Loopback access only', {
        status: 403
      });
      const asset = files.get(url.pathname);
      if (!asset || request.method !== 'GET') return new Response('Not found', {
        status: 404
      });
      return new Response(readFileSync(fileURLToPath(new URL(asset[0], import.meta.url))), {
        headers: {
          'Content-Type': asset[1],
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
        }
      });
    }
  };
}
