import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

import fs from 'fs';
import ipfsMetadataHandler from './api/ipfs-metadata.js';
import qualityReportsHandler from './api/quality-reports.js';

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
    name: 'huelegend-disable-insecure-sync',
    configureServer(server) {
      server.middlewares.use('/api/sync', (_req, res) => {
        // Khong cho phep ghi role hay lo hang ngoai blockchain tu endpoint cu.
        res.statusCode = 410;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ error: 'Endpoint dong bo cu da ngung. Du lieu quyen phai duoc xac minh tren Sepolia.' }));
      });
    },
  };
}

export default defineConfig({
  optimizeDeps: { entries: ['index.html'] },
  plugins: [react(), tailwindcss(), localDeployPlugin(), syncServerPlugin(), {
    name: 'huelegend-ipfs-metadata-dev',
    configureServer(server) {
      server.middlewares.use('/api/ipfs-metadata', (req, res, next) => {
        Promise.resolve(ipfsMetadataHandler(req, res)).catch(next);
      });
    },
  }, {
    name: 'huelegend-quality-reports-dev',
    configureServer(server) {
      server.middlewares.use('/api/quality-reports', (req, res, next) => {
        Promise.resolve(qualityReportsHandler(req, res)).catch(next);
      });
    },
  }],
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


