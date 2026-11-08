import { ethers } from 'ethers';
import { readFileSync } from 'node:fs';
import { isValidCid, normalizeBatchMetadata } from './ipfs-metadata-core.js';

function readDeployedContractAddress() {
  try {
    const deployment = JSON.parse(readFileSync(new URL('../deployments/sepolia-latest.json', import.meta.url), 'utf8'));
    if (deployment.chainId === 11155111 && ethers.isAddress(deployment.address)) return deployment.address;
  } catch { /* Khong co deployment manifest thi dung dia chi mac dinh. */ }
  return '0xd689c22E4Fa4B8C80F374EF0F19D4Be6A5210f4C';
}
const CONTRACT_ADDRESS = process.env.HUELEGEND_CONTRACT_ADDRESS || readDeployedContractAddress();
const RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const IPFS_GATEWAY = (process.env.IPFS_GATEWAY_URL || 'https://dweb.link/ipfs').replace(/\/$/, '');
const ROLE_PRODUCER = ethers.id('ROLE_PRODUCER');
const CORE_ABI = [
  'function owner() view returns (address)',
  'function hasRole(address account,bytes32 role) view returns (bool)',
];
const usedSignatures = new Map();

function respond(res, status, data, cache = 'no-store') {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.end(JSON.stringify(data));
}

function uploadMessage(metadata, issuedAt, nonce) {
  const hash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(metadata)));
  return [
    'HueLegend IPFS metadata upload',
    'ChainId: 11155111',
    `Contract: ${CONTRACT_ADDRESS.toLowerCase()}`,
    `Batch: ${metadata.batchCode}`,
    `Hash: ${hash}`,
    `IssuedAt: ${issuedAt}`,
    `Nonce: ${nonce}`,
  ].join('\n');
}

async function parseBody(req) {
  if (req.body != null) {
    if (typeof req.body === 'object') {
      if (JSON.stringify(req.body).length > 15000) throw new Error('Metadata qua lon.');
      return req.body;
    }
    return JSON.parse(String(req.body));
  }
  let text = '';
  for await (const chunk of req) {
    text += chunk.toString();
    if (text.length > 15000) throw new Error('Metadata qua lon.');
  }
  return JSON.parse(text || '{}');
}

async function readFromIPFS(req, res) {
  const url = new URL(req.url || '/', 'http://localhost');
  const cid = url.searchParams.get('cid') || '';
  if (!isValidCid(cid)) return respond(res, 400, { error: 'CID khong hop le.' });
  const result = await fetch(`${IPFS_GATEWAY}/${cid}`, {
    headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000),
  });
  if (!result.ok) return respond(res, 502, { error: 'Khong truy xuat duoc CID tu IPFS.' });
  const bytes = await result.arrayBuffer();
  if (bytes.byteLength > 16000) return respond(res, 413, { error: 'Metadata qua lon.' });
  const metadata = normalizeBatchMetadata(JSON.parse(new TextDecoder().decode(bytes)));
  return respond(res, 200, metadata, 'public, s-maxage=60');
}

async function uploadToIPFS(req, res) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) return respond(res, 503, { error: 'Server chua cau hinh PINATA_JWT.' });
  const request = await parseBody(req);
  const metadata = normalizeBatchMetadata(request.metadata);
  const issuedAt = Number(request.issuedAt);
  const nonce = String(request.nonce || '');
  const signature = String(request.signature || '');
  if (!Number.isSafeInteger(issuedAt) || Math.abs(Date.now() - issuedAt) > 120000 ||
      !/^[0-9a-f-]{36}$/i.test(nonce) || !/^0x[0-9a-f]{130}$/i.test(signature)) {
    return respond(res, 400, { error: 'Yeu cau ky xac nhan het han hoac khong hop le.' });
  }
  const message = uploadMessage(metadata, issuedAt, nonce);
  const signer = ethers.verifyMessage(message, signature);
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  try {
    const network = await provider.getNetwork();
    if (network.chainId !== 11155111n) throw new Error('RPC khong phai Sepolia.');
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CORE_ABI, provider);
    const [owner, hasRole] = await Promise.all([
      contract.owner(), contract.hasRole(signer, ROLE_PRODUCER),
    ]);
    if (owner.toLowerCase() !== signer.toLowerCase() && !hasRole) {
      return respond(res, 403, { error: 'Vi khong co quyen Producer tren Sepolia.' });
    }
  } finally {
    provider.destroy();
  }

  const now = Date.now();
  for (const [key, time] of usedSignatures) if (now - time > 120000) usedSignatures.delete(key);
  if (usedSignatures.has(signature)) return respond(res, 409, { error: 'Yeu cau nay da duoc su dung.' });
  usedSignatures.set(signature, now);

  const body = JSON.stringify(metadata);
  const form = new FormData();
  form.append('network', 'public');
  form.append('name', `${metadata.batchCode}.json`);
  form.append('file', new Blob([body], { type: 'application/json' }), `${metadata.batchCode}.json`);
  const result = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST', headers: { Authorization: `Bearer ${jwt}` }, body: form,
    signal: AbortSignal.timeout(20000),
  });
  if (!result.ok) return respond(res, 502, { error: `IPFS upload that bai (HTTP ${result.status}).` });
  const payload = await result.json();
  const cid = payload?.data?.cid;
  if (!isValidCid(cid)) {
    return respond(res, 502, { error: 'Pinata khong tra ve CID hop le.' });
  }
  return respond(res, 200, { cid, uri: `ipfs://${cid}` });
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return await readFromIPFS(req, res);
    if (req.method === 'POST') return await uploadToIPFS(req, res);
    return respond(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Loi xu ly metadata.';
    const userError = /khong hop le|khong hop le\.|qua dai|qua lon|thieu|Ngay|Han su dung|Phien ban/.test(message);
    return respond(res, userError ? 400 : 502, { error: userError ? message : 'Khong the xu ly metadata IPFS.' });
  }
}
