const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('Legacy admin.html redirects to the guarded application, without granting a role', () => {
  const html = read('public/admin.html');
  assert.match(html, /charset="UTF-8"/);
  assert.match(html, /url=\.\/index\.html/);
  assert.doesNotMatch(html, /localStorage|grantRole|ROLE_ADMIN|wallet_requestPermissions/);
});

test('Legacy ABI export matches the compiled ProjectCore contract', () => {
  const artifact = JSON.parse(read('public/generated/project-core.json'));
  const legacyAbi = JSON.parse(read('public/ProjectCore_abi.json'));
  assert.deepEqual(legacyAbi, artifact.abi);
  const functions = new Set(legacyAbi.filter(item => item.type === 'function').map(item => item.name));
  for (const name of ['grantRole', 'revokeRole', 'isAdmin', 'hasRole', 'hasDirectRole', 'createBatch', 'addCheckpoint']) {
    assert.ok(functions.has(name), name);
  }
});

test('Server environment template never publishes an IPFS upload secret to the browser', () => {
  const example = read('.env.example');
  assert.match(example, /^PINATA_JWT=$/m);
  assert.doesNotMatch(example, /^VITE_.*(?:JWT|TOKEN|SECRET|KEY)=/m);
  assert.match(example, /^SEPOLIA_RPC_URL=/m);
});

test('Fraud: legacy Supabase records cannot become on-chain role authorization', () => {
  const hook = read('src/hooks/useWalletAccess.ts');
  const access = read('src/lib/access.ts');
  assert.match(hook, /contract\.hasRole\(account/);
  assert.match(hook, /contract\.isAdmin\(account/);
  assert.doesNotMatch(hook, /supabase|huelegend_connected_role|localStorage\.getItem/);
  assert.match(access, /isVerifiedSession\(session\)/);
});
