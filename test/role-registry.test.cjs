const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { ethers } = require('ethers');

const root = path.resolve(__dirname, '..');
const sourceFile = path.join(root, 'src/lib/roleRegistry.ts');
const address = '0xd689c22E4Fa4B8C80F374EF0F19D4Be6A5210f4C';
const owner = '0x2e4216e1BCA81d308b25adaD6ef5Ea92E2e42F8c';
const secondAdmin = '0x82d022a704706B2f144863D619D7418F8a0f19A7';
const roleHashes = Object.fromEntries(['ADMIN', 'PRODUCER', 'RETAILER', 'LOGISTICS', 'INSPECTOR'].map(role =>
  [`ROLE_${role}`, ethers.id(`ROLE_${role}`)]));
const compiled = ts.transpileModule(fs.readFileSync(sourceFile, 'utf8'), {
  fileName: sourceFile,
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
const moduleObj = new Module(sourceFile, module);
moduleObj.filename = sourceFile;
moduleObj.require = (name) => {
  if (name === 'ethers') return { ethers };
  if (name.includes('deployments/sepolia-latest.json')) return { address, txHash: '0x' + '3'.repeat(64) };
  if (name.includes('../constants')) return { CONTRACT_ADDRESS: address, OWNER_WALLET: owner, ROLE_HASHES: roleHashes };
  throw new Error('Unexpected import: ' + name);
};
moduleObj._compile(compiled, sourceFile);
const { reduceRoleEvents, loadRoleRegistry } = moduleObj.exports;

const assigned = ethers.id('RoleAssigned(address,bytes32)');
const revoked = ethers.id('RoleRevoked(address,bytes32)');
const event = (topic, wallet, role, blockNumber, index = 0) => ({
  topics: [topic, ethers.zeroPadValue(wallet, 32), role], blockNumber, index, transactionIndex: 0,
});

test('ROLE_ADMIN da cap duoc khoi phuc tu event sau moi lan tai lai trang', () => {
  const logs = [event(assigned, secondAdmin, roleHashes.ROLE_ADMIN, 101)];
  const before = reduceRoleEvents(logs);
  const afterReload = reduceRoleEvents(logs);
  assert.deepEqual(afterReload, before);
  assert.equal(afterReload.length, 1);
  assert.equal(afterReload[0].address.toLowerCase(), secondAdmin.toLowerCase());
  assert.equal(afterReload[0].role, 'ROLE_ADMIN');
});

test('Thu hoi ROLE_ADMIN on-chain lam vai tro bien mat sau dong bo', () => {
  const logs = [
    event(assigned, secondAdmin, roleHashes.ROLE_ADMIN, 101),
    event(revoked, secondAdmin, roleHashes.ROLE_ADMIN, 102),
  ];
  assert.deepEqual(reduceRoleEvents(logs), []);
});

test('Gian lan: event role khong ho tro khong duoc bien thanh Admin', () => {
  const logs = [
    event(assigned, secondAdmin, ethers.id('ROLE_SUPER_ADMIN_FAKE'), 101),
    event('0x' + 'a'.repeat(64), secondAdmin, roleHashes.ROLE_ADMIN, 102),
  ];
  assert.deepEqual(reduceRoleEvents(logs), []);
});

test('Lich su phan quyen duoc lay tu khoi deploy va dung dia chi hop dong', async () => {
  const filters = [];
  const provider = {
    async getTransactionReceipt() { return { blockNumber: 100, contractAddress: address }; },
    async getBlockNumber() { return 105; },
    async getLogs(filter) {
      filters.push(filter);
      return [event(assigned, secondAdmin, roleHashes.ROLE_ADMIN, 102)];
    },
  };
  const result = await loadRoleRegistry(provider);
  assert.equal(filters.length, 1);
  assert.equal(filters[0].fromBlock, 100);
  assert.equal(filters[0].toBlock, 105);
  assert.equal(filters[0].address, address);
  assert.equal(result.wallets[0].role, 'ROLE_ADMIN');
  assert.equal(result.supportsMultiAdmin, false);
});

test('Gian lan: khong doc event tu manifest tro sang hop dong khac', async () => {
  const provider = {
    async getTransactionReceipt() { return { blockNumber: 100, contractAddress: owner }; },
  };
  await assert.rejects(loadRoleRegistry(provider), /Không xác minh được giao dịch triển khai/);
});
