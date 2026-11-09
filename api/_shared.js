import { readFileSync } from 'node:fs';
import { ethers } from 'ethers';

// API chi doc du lieu blockchain, khong quan ly private key hay ky giao dich.
const READ_ABI = [
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
  'event CheckpointAdded(string indexed batchCode,address indexed recorder,bytes32 indexed role,string action,string location,uint256 timestamp)',
];

export class BadRequestError extends Error {}

function contractAddress() {
  const override = process.env.HUELEGEND_CONTRACT_ADDRESS;
  if (override) {
    if (!ethers.isAddress(override)) throw new Error('Dia chi hop dong cau hinh khong hop le.');
    return ethers.getAddress(override);
  }
  const manifest = JSON.parse(readFileSync(new URL('../deployments/sepolia-latest.json', import.meta.url), 'utf8'));
  if (manifest.chainId !== 11155111 || !ethers.isAddress(manifest.address)) {
    throw new Error('Deployment Sepolia khong hop le.');
  }
  return ethers.getAddress(manifest.address);
}

export function json(value, status = 200, cache = 'no-store') {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cache,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function getOnly(handler) {
  return async request => {
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
    try {
      const url = new URL(request.url);
      return await handler(url);
    } catch (error) {
      if (error instanceof BadRequestError) return json({ error: error.message }, 400);
      // Khong tiet lo RPC URL, token, hay cau hinh may chu trong loi tra ve.
      console.error('HueLegend read API:', error instanceof Error ? error.message : 'Unknown error');
      return json({ error: 'Khong truy van duoc du lieu Sepolia.' }, 503);
    }
  };
}

export function integerParam(value, fallback, min, max) {
  if (value == null || value === '') return fallback;
  if (!/^\d+$/.test(value)) throw new BadRequestError('Tham so so nguyen khong hop le.');
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) {
    throw new BadRequestError(`Tham so phai nam trong khoang ${min}-${max}.`);
  }
  return number;
}

export function validCode(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(value)) {
    throw new BadRequestError('Ma lo hang khong hop le.');
  }
  return value;
}

export function validHash(value) {
  if (typeof value !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(value)) {
    throw new BadRequestError('Ma giao dich khong hop le.');
  }
  return value;
}

function field(value, key, index) {
  return value?.[key] ?? value?.[index];
}

export function mapBatch(batch) {
  return {
    batchCode: field(batch, 'batchCode', 0),
    productName: field(batch, 'productName', 1),
    origin: field(batch, 'origin', 2),
    createdAt: Number(field(batch, 'createdAt', 3)),
    producer: field(batch, 'producer', 4),
    isVerified: field(batch, 'isVerified', 5),
    exists: field(batch, 'exists', 6),
  };
}

export function mapPoint(point) {
  return {
    timestamp: Number(field(point, 'timestamp', 0)),
    recorder: field(point, 'recorder', 1),
    role: field(point, 'role', 2),
    location: field(point, 'location', 3),
    action: field(point, 'action', 4),
    metadataURI: field(point, 'metadataURI', 5),
  };
}

export async function inParallel(items, concurrency, task) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  }));
  return results;
}

export async function withChain(callback) {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com');
  try {
    const network = await provider.getNetwork();
    if (network.chainId !== 11155111n) throw new Error('RPC khong ket noi mang Sepolia.');
    const address = contractAddress();
    if (await provider.getCode(address) === '0x') throw new Error('Khong co smart contract tai dia chi cau hinh.');
    const contract = new ethers.Contract(address, READ_ABI, provider);
    return await callback({ provider, contract });
  } finally {
    provider.destroy();
  }
}

// Tuong thich ca Web Response va Vercel Node.js Serverless Function.
export async function serveGet(get, req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const response = await get(new Request(url, { method: req.method || 'GET' }));
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  res.end(Buffer.from(await response.arrayBuffer()));
}
