import { ethers } from 'ethers';
import { isValidCid } from './ipfs-metadata-core.js';
import { normalizeQualityReport, qualitySignMessage } from './quality-core.js';

const CONTRACT_ADDRESS = process.env.HUELEGEND_CONTRACT_ADDRESS || '0xd689c22E4Fa4B8C80F374EF0F19D4Be6A5210f4C';
const RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const GATEWAY = (process.env.IPFS_GATEWAY_URL || 'https://dweb.link/ipfs').replace(/\/$/, '');

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function jsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let body = typeof req.body === 'string' ? req.body : '';
  if (!body) for await (const chunk of req) {
    body += chunk.toString();
    if (body.length > 8000) throw new Error('Payload qua lon.');
  }
  if (body.length > 8000) throw new Error('Payload qua lon.');
  return JSON.parse(body || '{}');
}

async function onPost(req, res, jwt) {
  const body = await jsonBody(req);
  const report = normalizeQualityReport(body.report);
  const issuedAt = Number(body.issuedAt);
  const nonce = String(body.nonce || '');
  const signature = String(body.signature || '');
  if (!Number.isSafeInteger(issuedAt) || Math.abs(Date.now() - issuedAt) > 120000 ||
      !/^[\da-f-]{36}$/i.test(nonce) || !/^0x[\da-f]{130}$/i.test(signature)) throw new Error('Chu ky khong hop le.');
  const verified = ethers.verifyMessage(qualitySignMessage(report, issuedAt, nonce, CONTRACT_ADDRESS), signature);
  if (verified.toLowerCase() !== report.reporter) return send(res, 403, { error: 'Chu ky khong thuoc vi gui phan anh.' });
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  try {
    const chain = await provider.getNetwork();
    if (chain.chainId !== 11155111n) throw new Error('RPC khong phai Sepolia.');
    const contract = new ethers.Contract(CONTRACT_ADDRESS,
      ['function getBatch(string) view returns (tuple(string batchCode,string productName,string origin,uint256 createdAt,address producer,bool isVerified,bool exists))'], provider);
    const batch = await contract.getBatch(report.batchCode);
    if (!batch.exists) return send(res, 404, { error: 'Ma lo khong ton tai tren Sepolia.' });
  } finally { provider.destroy(); }

  // Ghim ca chu ky de moi nguoi doc co the doi chieu vi gui.
  const payload = { ...report, issuedAt, nonce, signature };
  const form = new FormData();
  form.append('network', 'public');
  form.append('name', `huelegend-quality-${report.batchCode}-${nonce}.json`);
  form.append('keyvalues', JSON.stringify({ app: 'HueLegend', kind: 'quality-v1', batchCode: report.batchCode }));
  form.append('file', new Blob([JSON.stringify(payload)], { type: 'application/json' }), 'report.json');
  const uploaded = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST', headers: { Authorization: `Bearer ${jwt}` }, body: form, signal: AbortSignal.timeout(20000),
  });
  if (!uploaded.ok) return send(res, 502, { error: `Pinata tra ve HTTP ${uploaded.status}.` });
  const data = await uploaded.json();
  const cid = data?.data?.cid;
  if (!isValidCid(cid)) return send(res, 502, { error: 'Pinata khong tra CID hop le.' });
  return send(res, 201, { cid, uri: `ipfs://${cid}` });
}

async function onGet(req, res, jwt) {
  const url = new URL(req.url || '/', 'http://localhost');
  const code = url.searchParams.get('code') || '';
  if (!/^[\w-]{3,64}$/.test(code)) throw new Error('Ma lo khong hop le.');
  const pagination = url.searchParams.get('pageToken');
  if (pagination && (pagination.length > 300 || !/^[\w=-]+$/.test(pagination))) throw new Error('PageToken khong hop le.');
  const search = new URLSearchParams({ name: `huelegend-quality-${code}-`, limit: '50', order: 'DESC' });
  if (pagination) search.set('pageToken', pagination);
  const result = await fetch(`https://api.pinata.cloud/v3/files/public?${search}`, {
    headers: { Authorization: `Bearer ${jwt}` }, signal: AbortSignal.timeout(12000),
  });
  if (!result.ok) return send(res, 502, { error: 'Khong truy van duoc danh sach Pinata.' });
  const data = await result.json();
  const files = Array.isArray(data?.data?.files) ? data.data.files : [];
  const matching = files.filter(file => typeof file.name === 'string' && file.name.startsWith(`huelegend-quality-${code}-`) && isValidCid(file.cid));
  const reports = await Promise.all(matching.map(async file => {
    try {
      const response = await fetch(`${GATEWAY}/${file.cid}`, { signal: AbortSignal.timeout(7000) });
      if (!response.ok) return null;
      const value = await response.text();
      if (value.length > 8000) return null;
      const saved = JSON.parse(value);
      const report = normalizeQualityReport(saved);
      if (report.batchCode !== code) return null;
      const signer = ethers.verifyMessage(qualitySignMessage(report, saved.issuedAt, saved.nonce, CONTRACT_ADDRESS), saved.signature);
      if (signer.toLowerCase() !== report.reporter) return null;
      return { ...report, cid: file.cid, createdAt: file.created_at };
    } catch { return null; }
  }));
  return send(res, 200, { reports: reports.filter(Boolean), nextPageToken: data?.data?.next_page_token || null });
}

export default async function handler(req, res) {
  try {
    if (!['GET', 'POST'].includes(req.method)) return send(res, 405, { error: 'Method not allowed.' });
    const jwt = process.env.PINATA_JWT;
    if (!jwt) return send(res, 503, { error: 'Can cau hinh PINATA_JWT tren Vercel.' });
    if (req.method === 'POST') return await onPost(req, res, jwt);
    return await onGet(req, res, jwt);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Loi khong xac dinh.';
    return send(res, /khong hop le|qua lon|phai tu/.test(message) ? 400 : 502, { error: message });
  }
}
