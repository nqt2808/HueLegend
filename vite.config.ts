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

function localDeployPlugin(): Plugin {
  return {
    name: 'huelegend-local-deploy-plugin',
    configureServer(server) {
      server.middlewares.use('/api/deploy/contract-address', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const remote = req.socket.remoteAddress || '';
        const host = String(req.headers.host || '');
        const localRequest =
          remote === '127.0.0.1' ||
          remote === '::1' ||
          remote === '::ffff:127.0.0.1';

        if (!localRequest || (!host.startsWith('localhost:') && !host.startsWith('127.0.0.1:'))) {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Chi cho phep cap nhat contract tu localhost.' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const address = String(parsed.address || '').trim();
            const txHash = String(parsed.txHash || '').trim();

            if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
              throw new Error('Dia chi contract khong hop le.');
            }
            if (txHash && !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
              throw new Error('Tx hash khong hop le.');
            }

            const constantsPath = path.resolve(__dirname, './src/constants.ts');
            const current = fs.readFileSync(constantsPath, 'utf8');
            const pattern = /safeGetAddress\("0x[a-fA-F0-9]{40}"\)/;
            if (!pattern.test(current)) {
              throw new Error('Khong tim thay CONTRACT_ADDRESS de cap nhat.');
            }

            const updated = current.replace(pattern, `safeGetAddress("${address}")`);
            fs.writeFileSync(constantsPath, updated, 'utf8');

            const deploymentDir = path.resolve(__dirname, './deployments');
            fs.mkdirSync(deploymentDir, { recursive: true });
            fs.writeFileSync(
              path.join(deploymentDir, 'sepolia-latest.json'),
              JSON.stringify({
                contractName: 'ProjectCore',
                network: 'Sepolia',
                chainId: 11155111,
                address,
                txHash,
                updatedAt: new Date().toISOString(),
              }, null, 2) + '\n',
              'utf8',
            );

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, address, txHash }));
          } catch (err: any) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err?.message || 'Khong cap nhat duoc contract address.' }));
          }
        });
      });
    },
  };
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
  plugins: [react(), tailwindcss(), localDeployPlugin(), syncServerPlugin()],
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


