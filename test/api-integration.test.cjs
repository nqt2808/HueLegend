const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { ethers } = require('ethers');

const root = path.resolve(__dirname, '..');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function freePort() {
  const socket = net.createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  socket.close();
  await once(socket, 'close');
  return port;
}

async function startServer(args, environment = {}) {
  const port = await freePort();
  const child = spawn(process.execPath, args(port), {
    cwd: root,
    env: { ...process.env, ...environment, PORT: String(port), HOST: '127.0.0.1', PINATA_JWT: '' },
    stdio: 'pipe',
  });
  let errors = '';
  child.stderr.on('data', chunk => { errors += chunk.toString(); });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) break;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(800) });
      if (response.status === 200) {
        return { url, child, async stop() { if (child.exitCode === null) child.kill(); } };
      }
    } catch { /* Cho server khoi dong trong gioi han. */ }
    await delay(75);
  }
  if (child.exitCode === null) child.kill();
  throw new Error(`Server khong khoi dong: ${errors.slice(0, 400)}`);
}

test('Six read-only APIs import and expose both local GET and Vercel handlers', async () => {
  for (const name of ['health', 'batch', 'batches', 'rules', 'tx', 'evidence']) {
    const mod = await import(`../api/${name}.js`);
    assert.equal(typeof mod.GET, 'function', name);
    assert.equal(typeof mod.default, 'function', name);
    const response = await mod.GET(new Request(`https://localhost/api/${name}`, { method: 'POST' }));
    assert.equal(response.status, 405, name);
  }
});

test('Vercel Node handler returns the same validation errors as the local GET route', async () => {
  const { default: handler } = await import('../api/batch.js');
  const response = {
    statusCode: 200,
    writeHead(status, headers) { this.statusCode = status; this.headers = headers; },
    end(value) { this.body = Buffer.from(value).toString('utf8'); },
  };
  await handler({ method: 'GET', url: '/api/batch?code=../forged', headers: { host: 'localhost' } }, response);
  assert.equal(response.statusCode, 400);
  assert.match(response.headers['content-type'], /application\/json/);
  assert.match(response.body, /Ma lo hang/);
});

test('Fraud: read APIs reject malformed batch codes, hashes and pagination before contacting Sepolia', async () => {
  const cases = [
    ['batch', '?code=../admin'],
    ['batch', '?code='],
    ['batches', '?size=500'],
    ['batches', '?page=-1'],
    ['tx', '?hash=0x123'],
    ['evidence', '?code=HL-1&blocks=5000'],
  ];
  for (const [name, query] of cases) {
    const { GET } = await import(`../api/${name}.js`);
    const response = await GET(new Request(`http://localhost/api/${name}${query}`));
    assert.equal(response.status, 400, `${name}${query}`);
  }
});

test('Blockchain responses normalize BigInt and preserve checkpoint fields', async () => {
  const { mapBatch, mapPoint, inParallel } = await import('../api/_shared.js');
  const batch = mapBatch(['HL-01', 'Me xung', 'Hue', 1780000000n, '0x0000000000000000000000000000000000000001', false, true]);
  assert.equal(batch.createdAt, 1780000000);
  assert.equal(batch.productName, 'Me xung');
  const point = mapPoint([1780000010n, batch.producer, '0x' + 'a'.repeat(64), 'Hue', 'Dong goi', 'ipfs://example']);
  assert.equal(point.location, 'Hue');
  assert.equal(point.metadataURI, 'ipfs://example');
  const results = await inParallel([1, 2, 3], 2, async value => {
    await delay((4 - value) * 5);
    return value * 10;
  });
  assert.deepEqual(results, [10, 20, 30]);
});

test('All six read APIs return valid JSON through a simulated Sepolia RPC', { timeout: 15000 }, async () => {
  const iface = new ethers.Interface([
    'function getTotalBatches() view returns (uint256)',
    'function getBatchCodeByIndex(uint256) view returns (string)',
    'function getBatch(string) view returns (tuple(string batchCode,string productName,string origin,uint256 createdAt,address producer,bool isVerified,bool exists))',
    'function getCheckpoints(string) view returns (tuple(uint256 timestamp,address recorder,bytes32 role,string location,string action,string metadataURI)[])',
    'function batchCreationFee() view returns (uint256)',
    'function MIN_STAKE_AMOUNT() view returns (uint256)',
    'function MAX_BATCH_FEE_LIMIT() view returns (uint256)',
    'function stakeLockDuration() view returns (uint256)',
    'function owner() view returns (address)',
    'function ecosystemFund() view returns (address)',
    'function MAX_CHECKPOINTS_PER_BATCH() view returns (uint256)',
  ]);
  const owner = '0x2e4216e1BCA81d308b25adaD6ef5Ea92E2e42F8c';
  const outputs = {
    getTotalBatches: [1n], getBatchCodeByIndex: ['HL-01'],
    getBatch: [['HL-01', 'Me xung', 'Hue', 1700000000n, owner, true, true]],
    getCheckpoints: [[[1700000001n, owner, ethers.id('ROLE_PRODUCER'), 'Hue', 'Tao lo', '']]],
    batchCreationFee: [1000000000000000n], MIN_STAKE_AMOUNT: [50000000000000000n],
    MAX_BATCH_FEE_LIMIT: [10000000000000000n], stakeLockDuration: [2592000n],
    owner: [owner], ecosystemFund: [owner], MAX_CHECKPOINTS_PER_BATCH: [50n],
  };
  const rpc = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const reply = call => {
      let result;
      if (call.method === 'eth_chainId') result = '0xaa36a7';
      else if (call.method === 'eth_getCode') result = '0x60006000';
      else if (call.method === 'eth_blockNumber') result = '0x10';
      else if (call.method === 'eth_getTransactionReceipt') result = null;
      else if (call.method === 'eth_getLogs') result = [];
      else if (call.method === 'eth_call') {
        const fragment = iface.getFunction(call.params[0].data.slice(0, 10));
        result = iface.encodeFunctionResult(fragment, outputs[fragment.name]);
      } else throw new Error(`Unexpected RPC method: ${call.method}`);
      return { jsonrpc: '2.0', id: call.id, result };
    };
    try {
      const calls = JSON.parse(body);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(Array.isArray(calls) ? calls.map(reply) : reply(calls)));
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(error) }));
    }
  });
  rpc.listen(0, '127.0.0.1');
  await once(rpc, 'listening');
  const original = process.env.SEPOLIA_RPC_URL;
  process.env.SEPOLIA_RPC_URL = `http://127.0.0.1:${rpc.address().port}`;
  try {
    const paths = [
      ['health', '', body => assert.equal(body.totalBatches, 1)],
      ['batches', '', body => assert.equal(body.items[0].batchCode, 'HL-01')],
      ['batch', '?code=HL-01', body => assert.equal(body.batch.checkpoints[0].location, 'Hue')],
      ['rules', '', body => assert.equal(body.rules.maxCheckpoints, 50)],
      ['tx', `?hash=0x${'a'.repeat(64)}`, body => assert.equal(body.pendingOrUnknown, true)],
      ['evidence', '?code=HL-01&blocks=4', body => assert.deepEqual(body.logs, [])],
    ];
    for (const [name, query, verify] of paths) {
      const { GET } = await import(`../api/${name}.js`);
      const response = await GET(new Request(`http://localhost/api/${name}${query}`));
      assert.equal(response.status, 200, `${name}: ${await response.clone().text()}`);
      verify(await response.json());
    }
  } finally {
    if (original === undefined) delete process.env.SEPOLIA_RPC_URL;
    else process.env.SEPOLIA_RPC_URL = original;
    rpc.close();
    await once(rpc, 'close');
  }
});

test('Production web serves static assets, validates read APIs and routes IPFS/quality handlers', { timeout: 15000 }, async t => {
  const server = await startServer(port => [path.join(root, 'scripts', 'serve.mjs')]);
  t.after(server.stop);
  const home = await fetch(server.url);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /HueLegend|root/);

  const invalidBatch = await fetch(`${server.url}/api/batch?code=../fake`);
  assert.equal(invalidBatch.status, 400);
  const invalidTx = await fetch(`${server.url}/api/tx?hash=fake`);
  assert.equal(invalidTx.status, 400);
  const invalidCID = await fetch(`${server.url}/api/ipfs-metadata`);
  assert.equal(invalidCID.status, 400);
  const noPinata = await fetch(`${server.url}/api/quality-reports`);
  assert.equal(noPinata.status, 503);
  const ipfsPost = await fetch(`${server.url}/api/ipfs-metadata`, { method: 'POST', body: '{}' });
  assert.equal(ipfsPost.status, 503);
  const unknownUpload = await fetch(`${server.url}/api/health`, { method: 'POST' });
  assert.equal(unknownUpload.status, 405);
});

test('Fraud: dev server rejects arbitrary sync writes and does not accept forged wallet roles', { timeout: 15000 }, async t => {
  const vite = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  const server = await startServer(port => [vite, '--host', '127.0.0.1', '--port', String(port), '--strictPort']);
  t.after(server.stop);
  const code = `qa-role-forgery-${Date.now()}`;
  const payload = { grantedWallets: [{ address: '0x0000000000000000000000000000000000000001', role: 'ADMIN' }] };
  const post = await fetch(`${server.url}/api/sync?code=${code}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
  });
  assert.equal(post.status, 410);
  const get = await fetch(`${server.url}/api/sync?code=${code}`);
  assert.equal(get.status, 410);
  assert.doesNotMatch(await get.text(), /grantedWallets/);
});
