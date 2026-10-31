import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

import fs from 'fs';

// Bo nho va file luu tru du lieu dong bo giua Desktop, Mobile & Web Preview
const memorySyncStore = new Map<string, any>();
const SYNC_FILE_PATH = path.resolve(__dirname, './.sync_store.json');

// Ham doc du lieu dong bo tu File hoac Memory
function readSyncStoreFromFile(code: string) {
  if (memorySyncStore.has(code)) {
    return memorySyncStore.get(code);
  }
  try {
    if (fs.existsSync(SYNC_FILE_PATH)) {
      const content = fs.readFileSync(SYNC_FILE_PATH, 'utf-8');
      const json = JSON.parse(content);
      if (json && json[code]) {
        memorySyncStore.set(code, json[code]);
        return json[code];
      }
    }
  } catch (e) {}
  return null;
}

// Ham ghi du lieu dong bo sang File va Memory
function writeSyncStoreToFile(code: string, data: any) {
  memorySyncStore.set(code, data);
  try {
    let allData: Record<string, any> = {};
    if (fs.existsSync(SYNC_FILE_PATH)) {
      try {
        allData = JSON.parse(fs.readFileSync(SYNC_FILE_PATH, 'utf-8'));
      } catch (e) {}
    }
    allData[code] = data;
    fs.writeFileSync(SYNC_FILE_PATH, JSON.stringify(allData, null, 2), 'utf-8');
  } catch (e) {}
}

function syncServerPlugin(): Plugin {
  return {
    name: 'sync-server-plugin',
    configureServer(server) {
      server.middlewares.use('/api/sync', (req, res) => {
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const code = url.searchParams.get('code') || 'huelegend_global_sync';

        // Doc du lieu dong bo
        if (req.method === 'GET') {
          const data = readSyncStoreFromFile(code);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, data, timestamp: Date.now() }));
          return;
        }

        // Cap nhat va luu du lieu dong bo
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              const existing = readSyncStoreFromFile(code) || {};
              const mergedBatches = {
                ...(existing.batches || {}),
                ...(parsed.batches || {})
              };
              const mergedWallets = Array.from(
                new Set([
                  ...(existing.grantedWallets || []),
                  ...(parsed.grantedWallets || [])
                ].map((w) => JSON.stringify(w)))
              ).map((s) => JSON.parse(s));

              const fullPayload = {
                ...existing,
                ...parsed,
                batches: mergedBatches,
                grantedWallets: mergedWallets,
                updatedAt: Date.now()
              };

              writeSyncStoreToFile(code, fullPayload);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, timestamp: Date.now() }));
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
            }
          });
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      });
    },
  };
}

export default defineConfig({
  optimizeDeps: { entries: ['index.html'] },
  plugins: [react(), tailwindcss(), syncServerPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});


