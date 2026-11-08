import { ethers } from 'ethers';
import deployment from '../../deployments/sepolia-latest.json';
import { CONTRACT_ADDRESS, ROLE_HASHES } from '../constants';
import { GrantedWallet } from '../types';

const ASSIGNED_TOPIC = ethers.id('RoleAssigned(address,bytes32)').toLowerCase();
const REVOKED_TOPIC = ethers.id('RoleRevoked(address,bytes32)').toLowerCase();
const ROLE_NAMES = new Map(Object.entries(ROLE_HASHES).map(([name, hash]) => [hash.toLowerCase(), name]));
const ROLE_TITLES: Record<string, string> = {
  ROLE_ADMIN: 'Quản trị viên',
  ROLE_PRODUCER: 'Cơ sở sản xuất',
  ROLE_INSPECTOR: 'Kiểm định viên OCOP',
  ROLE_LOGISTICS: 'Đơn vị vận chuyển',
  ROLE_RETAILER: 'Đại lý phân phối',
};

export interface RoleEventLog {
  topics: readonly string[];
  blockNumber: number;
  index: number;
  transactionIndex?: number;
}

export interface RoleRegistryResult {
  wallets: GrantedWallet[];
  supportsMultiAdmin: boolean;
}

// Khoi phuc quyen tu su kien cua dung dia chi hop dong, khong dung localStorage.
export function reduceRoleEvents(logs: readonly RoleEventLog[]): GrantedWallet[] {
  const active = new Map<string, GrantedWallet>();
  const ordered = [...logs].sort((a, b) => a.blockNumber - b.blockNumber ||
    (a.transactionIndex || 0) - (b.transactionIndex || 0) || a.index - b.index);

  for (const log of ordered) {
    if (log.topics.length < 3) continue;
    const eventTopic = log.topics[0].toLowerCase();
    if (eventTopic !== ASSIGNED_TOPIC && eventTopic !== REVOKED_TOPIC) continue;
    const roleName = ROLE_NAMES.get(log.topics[2].toLowerCase());
    if (!roleName) continue;
    const account = '0x' + log.topics[1].slice(-40);
    if (!ethers.isAddress(account)) continue;
    const address = ethers.getAddress(account);
    const key = `${address.toLowerCase()}:${roleName}`;

    if (eventTopic === REVOKED_TOPIC) {
      active.delete(key);
      continue;
    }
    active.set(key, {
      address,
      role: roleName,
      roleTitle: ROLE_TITLES[roleName],
      grantedAt: `Khối #${log.blockNumber.toLocaleString('vi-VN')}`,
      status: 'Active',
    });
  }

  return [...active.values()].sort((a, b) => a.role.localeCompare(b.role) || a.address.localeCompare(b.address));
}

export async function loadRoleRegistry(provider: ethers.Provider): Promise<RoleRegistryResult> {
  if (!ethers.isAddress(deployment.address) || deployment.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
    throw new Error('Địa chỉ hợp đồng không khớp với lịch sử triển khai. Hãy đồng bộ deployment manifest.');
  }
  const receipt = await provider.getTransactionReceipt(deployment.txHash);
  if (!receipt || !receipt.contractAddress || receipt.contractAddress.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
    throw new Error('Không xác minh được giao dịch triển khai hợp đồng để đọc lịch sử cấp quyền.');
  }

  const latest = await provider.getBlockNumber();
  const logs: ethers.Log[] = [];
  const range = 4000;
  const windows: Array<{ fromBlock: number; toBlock: number }> = [];
  for (let fromBlock = receipt.blockNumber; fromBlock <= latest; fromBlock += range) {
    windows.push({ fromBlock, toBlock: Math.min(fromBlock + range - 1, latest) });
  }

  // RPC cong khai gioi han so khoi moi lan eth_getLogs, nen chia nho va giu thu tu.
  for (let i = 0; i < windows.length; i += 3) {
    const page = await Promise.all(windows.slice(i, i + 3).map(window => provider.getLogs({
      address: CONTRACT_ADDRESS,
      topics: [[ASSIGNED_TOPIC, REVOKED_TOPIC]],
      ...window,
    })));
    for (const part of page) logs.push(...part);
  }

  const contract = new ethers.Contract(CONTRACT_ADDRESS, ['function isAdmin(address) view returns (bool)'], provider);
  let supportsMultiAdmin = false;
  try { supportsMultiAdmin = typeof (await contract.isAdmin(ethers.ZeroAddress)) === 'boolean'; }
  catch { /* Hop dong cu khong co ham isAdmin. */ }

  return { wallets: reduceRoleEvents(logs), supportsMultiAdmin };
}
