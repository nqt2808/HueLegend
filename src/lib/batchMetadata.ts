import { ethers } from 'ethers';
import { CONTRACT_ADDRESS } from '../constants';
import { isISODate, isValidCid, normalizeBatchMetadata } from '../../api/ipfs-metadata-core.js';

export interface BatchMetadataV1 {
  schemaVersion: 1;
  batchCode: string;
  productName: string;
  origin: string;
  productionDate: string;
  expiryDate: string | null;
  quantity: string;
}

export type ExpiryState = 'UNKNOWN' | 'NOT_APPLICABLE' | 'VALID' | 'EXPIRING' | 'EXPIRED';

export function vietnamToday(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (part: string) => parts.find((entry) => entry.type === part)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function parseBatchMetadata(input: unknown, expectedBatchCode?: string): BatchMetadataV1 {
  return normalizeBatchMetadata(input, expectedBatchCode);
}

export function extractIPFSCid(uri: unknown): string | null {
  if (typeof uri !== 'string' || !uri.startsWith('ipfs://')) return null;
  const cid = uri.slice('ipfs://'.length);
  return isValidCid(cid) ? cid : null;
}

export function metadataUploadMessage(metadata: BatchMetadataV1, issuedAt: number, nonce: string): string {
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

export async function readBatchMetadata(uri: unknown, batchCode: string): Promise<BatchMetadataV1 | null> {
  const cid = extractIPFSCid(uri);
  if (!cid) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`/api/ipfs-metadata?cid=${encodeURIComponent(cid)}`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('Khong doc duoc metadata tu IPFS.');
    return parseBatchMetadata(await response.json(), batchCode);
  } finally {
    clearTimeout(timeout);
  }
}

export function getExpiryState(expiryDate: string | null | undefined, verified: boolean, now = new Date()): ExpiryState {
  if (!verified) return 'UNKNOWN';
  if (expiryDate === null) return 'NOT_APPLICABLE';
  if (!isISODate(expiryDate)) return 'UNKNOWN';
  const expiryAt = new Date(`${expiryDate}T23:59:59.999+07:00`).getTime();
  const remaining = expiryAt - now.getTime();
  if (remaining < 0) return 'EXPIRED';
  return remaining <= 30 * 86400000 ? 'EXPIRING' : 'VALID';
}

export function displayMetadataDate(value: string | null | undefined, verified: boolean, isExpiry = false): string {
  if (!verified) return 'Chua xac minh';
  if (value === null && isExpiry) return 'Khong ap dung';
  if (!isISODate(value)) return 'Chua xac minh';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
