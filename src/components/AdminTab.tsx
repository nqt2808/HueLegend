import React, { useState } from 'react';
import {
  Settings,
  UserPlus,
  UserMinus,
  Coins,
  RefreshCw,
  ShieldAlert,
  Wallet,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  Activity,
  ExternalLink,
  Users,
  Search
} from 'lucide-react';
import { ETHERSCAN_BASE_URL, CONTRACT_ADDRESS, safeGetAddress } from '../constants';

import { Batch, Checkpoint, GrantedWallet } from '../types';

export interface EventLog {
  id: string;
  type: string;
  batchCode: string;
  actor: string;
  role: string;
  fee: string;
  timestamp: string;
  txHash?: string;
}

interface AdminTabProps {
  batches?: Record<string, Batch>;
  grantedWallets?: GrantedWallet[];
  batchCreationFeeEth: string;
  contractBalanceEth?: string;
  producerStakeBalance?: string;
  userRole?: string;
  isSystemPaused?: boolean;
  isAdminRole: boolean;
  currentAccount: string | null;
  onConnectWallet: () => void;
  onSetBatchCreationFee: (newFeeEth: string) => Promise<void>;
  onAssignRole: (account: string, roleName: string) => Promise<void>;
  onRevokeRole: (account: string, roleName: string) => Promise<void>;
}

export const AdminTab: React.FC<AdminTabProps> = ({
  batches = {},
  grantedWallets = [],
  batchCreationFeeEth,
  contractBalanceEth = '0.00',
  producerStakeBalance = '0.00',
  userRole = 'GUEST',
  isSystemPaused = false,
  isAdminRole,
  currentAccount,
  onConnectWallet,
  onSetBatchCreationFee,
  onAssignRole,
  onRevokeRole,
}) => {
  const [accountAddress, setAccountAddress] = useState('');
  const [roleSelect, setRoleSelect] = useState('ROLE_PRODUCER');
  const [newFee, setNewFee] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchRoleQuery, setSearchRoleQuery] = useState('');

  // Derive production event logs dynamically from live Sepolia batch data
  const recentEventLogs: EventLog[] = React.useMemo(() => {
    const logs: EventLog[] = [];
    const batchList = Object.values(batches);

    batchList.forEach((b: Batch) => {
      // 1. Batch creation event
      logs.push({
        id: `evt-create-${b.batchCode}`,
        type: 'BatchCreated',
        batchCode: b.batchCode,
        actor: b.producer || '0x...',
        role: 'CÆ¡ Sá»Ÿ Sáº£n Xuáº¥t',
        fee: `${batchCreationFeeEth} ETH`,
        timestamp: b.createdAt ? new Date(b.createdAt * 1000).toLocaleString('vi-VN') : 'Theo thá»i gian táº¡o',
      });

      // 2. OCOP Verification event
      if (b.isVerified || b.inspectorNote) {
        logs.push({
          id: `evt-verify-${b.batchCode}`,
          type: 'BatchVerified',
          batchCode: b.batchCode,
          actor: 'Kiá»ƒm Äá»‹nh ViÃªn OCOP',
          role: 'Kiá»ƒm Äá»‹nh ViÃªn OCOP',
          fee: '0.00 ETH',
          timestamp: 'ÄÃ£ Tháº©m Äá»‹nh OCOP',
        });
      }

      // 3. Checkpoints events
      if (b.checkpoints && b.checkpoints.length > 0) {
        b.checkpoints.forEach((chk: Checkpoint, idx: number) => {
          logs.push({
            id: `evt-chk-${b.batchCode}-${idx}`,
            type: 'CheckpointAdded',
            batchCode: b.batchCode,
            actor: chk.location || 'Tráº¡m Váº­n HÃ nh',
            role: chk.roleTitle || 'Cung á»¨ng & Váº­n HÃ nh',
            fee: '0.00 ETH',
            timestamp: chk.timestamp ? new Date(chk.timestamp * 1000).toLocaleString('vi-VN') : 'Má»›i cáº­p nháº­t',
            txHash: chk.txHash
          });
        });
      }
    });

    return logs;
  }, [batches, batchCreationFeeEth]);

  const handleAssign = async () => {
    if (!accountAddress.trim()) return;
    const normalizedAddr = safeGetAddress(accountAddress.trim());
    setIsSubmitting(true);
    try {
      await onAssignRole(normalizedAddr, roleSelect);
      setAccountAddress('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeWallet = async (targetAddress: string, roleName: string) => {
    const normalizedAddr = safeGetAddress(targetAddress.trim());
    setIsSubmitting(true);
    try {
      await onRevokeRole(normalizedAddr, roleName);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSetBatchCreationFee(newFee);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredWallets = grantedWallets.filter(
    (w) =>
      w.address.toLowerCase().includes(searchRoleQuery.toLowerCase()) ||
      w.roleTitle.toLowerCase().includes(searchRoleQuery.toLowerCase()) ||
      w.role.toLowerCase().includes(searchRoleQuery.toLowerCase())
  );

  // Tinh so du ETH tich luy phan theo vai tro va trang thai dang nhap
  let allocatedBalanceDisplay = '0.00';
  let allocatedRoleLabel = 'ChÆ°a Káº¿t Ná»‘i VÃ­';
  let allocatedSubtext = 'Vui lÃ²ng Ä‘Äƒng nháº­p vÃ­ Ä‘á»ƒ xem sá»‘ dÆ° tÃ­ch lÅ©y tháº­t theo vai trÃ².';

  if (currentAccount) {
    if (userRole === 'PRODUCER' || userRole === 'SUPPLY_CHAIN') {
      allocatedRoleLabel = 'Chá»§ CÆ¡ Sá»Ÿ Sáº£n Xuáº¥t';
      allocatedSubtext = 'Sá»‘ dÆ° ETH kÃ½ quá»¹ sáº£n xuáº¥t & Ä‘áº£m báº£o cháº¥t lÆ°á»£ng OCOP';
      allocatedBalanceDisplay = producerStakeBalance && producerStakeBalance !== '0.00' ? producerStakeBalance : '0.000';
    } else if (userRole === 'INSPECTOR') {
      allocatedRoleLabel = 'Kiá»ƒm Äá»‹nh ViÃªn OCOP';
      allocatedSubtext = 'Sá»‘ dÆ° ETH tÃ­ch lÅ©y phÃ­ tháº©m Ä‘á»‹nh OCOP';
      allocatedBalanceDisplay = contractBalanceEth && contractBalanceEth !== '0.00' ? contractBalanceEth : '0.002';
    } else if (userRole === 'RETAILER' || userRole === 'COMMERCE') {
      allocatedRoleLabel = 'Äáº¡i LÃ½ PhÃ¢n Phá»‘i';
      allocatedSubtext = 'Sá»‘ dÆ° ETH tÃ­ch lÅ©y niÃªm yáº¿t thÆ°Æ¡ng máº¡i';
      allocatedBalanceDisplay = contractBalanceEth || '0.00';
    } else if (userRole === 'ADMIN') {
      allocatedRoleLabel = 'Quáº£n Trá»‹ ViÃªn (Admin)';
      allocatedSubtext = 'Tá»•ng sá»‘ dÆ° ETH tÃ­ch lÅ©y Quá»¹ Treasury Smart Contract';
      allocatedBalanceDisplay = contractBalanceEth || '0.00';
    } else {
      allocatedRoleLabel = 'KhÃ¡ch HÃ ng';
      allocatedSubtext = 'Sá»‘ dÆ° ETH tÆ°Æ¡ng tÃ¡c Smart Contract';
      allocatedBalanceDisplay = contractBalanceEth || '0.00';
    }
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header Title Banner */}
      <div className="bg-gradient-to-r from-[#264939] via-[#1c372b] to-[#264939] text-white p-6 rounded-3xl shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold backdrop-blur-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C29B38]" />
            <span>Trung TÃ¢m Quáº£n Trá»‹ Há»‡ Thá»‘ng HueLegend</span>
          </div>
          <h2 className="font-serif font-extrabold text-2xl text-amber-100">
            Trang Quáº£n Trá»‹ Há»‡ Thá»‘ng On-Chain
          </h2>
          <p className="text-xs text-emerald-100/90">
            PhÃ¢n quyá»n RBAC, quáº£n lÃ½ má»©c phÃ­ khai bÃ¡o vÃ  giÃ¡m sÃ¡t dá»¯ liá»‡u Smart Contract trÃªn Sepolia.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-3 rounded-2xl border border-white/20 text-right backdrop-blur-xs">
            <span className="text-[10px] text-emerald-200 uppercase font-bold block">
              Tráº¡ng ThÃ¡i Há»‡ Thá»‘ng
            </span>
            <span className={`text-xs font-bold inline-flex items-center gap-1.5 mt-0.5 ${isSystemPaused ? 'text-amber-300' : 'text-emerald-300'}`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${isSystemPaused ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <span>HOáº T Äá»˜NG (Active)</span>
            </span>
          </div>
        </div>
      </div>

      {/* 5 Production Feature Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): RBAC Management & Granted Wallets Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Feature 1: Grant Role Panel */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6E1D7] shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDE9E0]">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#264939]" />
                <h3 className="font-serif font-extrabold text-lg text-[#264939]">
                  1. GÃ¡n Quyá»n Vai TrÃ² (Grant Role)
                </h3>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-[#E0ECE4] text-[#264939] border border-[#CCD8CF]">
                AccessControl
              </span>
            </div>

            <div className="space-y-4 font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1A2820] mb-1">
                    Äá»‹a Chá»‰ VÃ­ Ethereum Cáº§n PhÃ¢n Quyá»n *
                  </label>
                  <input
                    type="text"
                    required
                    value={accountAddress}
                    onChange={(e) => setAccountAddress(e.target.value)}
                    placeholder="VÃ­ dá»¥: 0x35655079aEbB215E58e379D5a8c2f1f3a5323C6b"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D7] text-xs font-mono font-bold focus:outline-none focus:border-[#264939] bg-[#FAF9F5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A2820] mb-1">
                    Chá»n Vai TrÃ² RBAC *
                  </label>
                  <select
                    value={roleSelect}
                    onChange={(e) => setRoleSelect(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D7] text-xs font-bold focus:outline-none focus:border-[#264939]"
                  >
                    <option value="ROLE_PRODUCER">ROLE_PRODUCER (Chá»§ CÆ¡ Sá»Ÿ Sáº£n Xuáº¥t)</option>
                    <option value="ROLE_LOGISTICS">ROLE_LOGISTICS (ÄÆ¡n Vá»‹ Váº­n Chuyá»ƒn / Logistics)</option>
                    <option value="ROLE_RETAILER">ROLE_RETAILER (Äáº¡i LÃ½ PhÃ¢n Phá»‘i / Retailer)</option>
                    <option value="ROLE_INSPECTOR">ROLE_INSPECTOR (Kiá»ƒm Äá»‹nh ViÃªn OCOP)</option>
                    <option value="ROLE_ADMIN">ROLE_ADMIN (Quáº£n Trá»‹ ViÃªn Há»‡ Thá»‘ng)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleAssign}
                  disabled={isSubmitting || !isAdminRole || !accountAddress}
                  className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-[#264939] text-white font-bold text-xs hover:bg-[#1c372b] transition-all shadow-2xs disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4 text-[#C29B38]" />
                  <span>XÃ¡c Nháº­n GÃ¡n Quyá»n On-Chain</span>
                </button>
              </div>
            </div>
          </div>

          {/* Feature 1 Continued: Granted Wallets Table with Revoke Button */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6E1D7] shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDE9E0]">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#264939]" />
                <h3 className="font-serif font-extrabold text-base text-[#264939]">
                  Danh SÃ¡ch VÃ­ ÄÃ£ Cáº¥p Quyá»n RBAC
                </h3>
              </div>

              <div className="relative w-48">
                <input
                  type="text"
                  value={searchRoleQuery}
                  onChange={(e) => setSearchRoleQuery(e.target.value)}
                  placeholder="TÃ¬m theo vÃ­ / role..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#E6E1D7] text-[11px] focus:outline-none focus:border-[#264939]"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Chi hien thi danh sach vi khi da ket noi vi */}
            {!currentAccount ? (
              <div className="text-center py-8 px-4 bg-[#FAF9F5] rounded-2xl border border-dashed border-[#E6E1D7] space-y-3">
                <Wallet className="w-8 h-8 text-[#C29B38] mx-auto" />
                <p className="text-xs font-bold text-[#1A2820]">YÃªu Cáº§u Káº¿t Ná»‘i VÃ­ Äá»ƒ Xem Danh SÃ¡ch RBAC</p>
                <p className="text-[11px] text-[#5E7166] max-w-sm mx-auto">
                  Vui lÃ²ng káº¿t ná»‘i vÃ­ MetaMask Ä‘á»ƒ xem vÃ  quáº£n lÃ½ Danh SÃ¡ch VÃ­ ÄÃ£ Cáº¥p Quyá»n RBAC.
                </p>
                <button
                  onClick={onConnectWallet}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#264939] text-white font-bold text-xs rounded-xl hover:bg-[#1c372b] transition-all shadow-2xs mt-1"
                >
                  <Wallet className="w-3.5 h-3.5 text-[#C29B38]" />
                  <span>Káº¿t Ná»‘i VÃ­ ÄÄƒng Nháº­p</span>
                </button>
              </div>
            ) : filteredWallets.length === 0 ? (
              <div className="text-center py-8 px-4 bg-[#FAF9F5] rounded-2xl border border-dashed border-[#E6E1D7] space-y-2">
                <Users className="w-8 h-8 text-[#8A9D92] mx-auto opacity-60" />
                <p className="text-xs font-bold text-[#1A2820]">ChÆ°a CÃ³ VÃ­ ÄÆ°á»£c PhÃ¢n Quyá»n On-Chain</p>
                <p className="text-[11px] text-[#5E7166] max-w-sm mx-auto">
                  Sá»­ dá»¥ng biá»ƒu máº«u "GÃ¡n Quyá»n Vai TrÃ²" á»Ÿ trÃªn Ä‘á»ƒ cáº¥p quyá»n cho Ä‘á»‹a chá»‰ vÃ­ NhÃ  sáº£n xuáº¥t, Kiá»ƒm Ä‘á»‹nh viÃªn OCOP hoáº·c Äáº¡i lÃ½.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#FAF9F5] border-b border-[#E6E1D7] text-[#8A9D92] font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Äá»‹a Chá»‰ VÃ­</th>
                      <th className="py-2.5 px-3">TÃªn Vai TrÃ² / ÄÆ¡n Vá»‹</th>
                      <th className="py-2.5 px-3">Thá»i Gian GÃ¡n</th>
                      <th className="py-2.5 px-3 text-right">Thao TÃ¡c</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDE9E0]">
                    {filteredWallets.map((wallet) => (
                      <tr key={`${wallet.address}-${wallet.role}`} className="hover:bg-[#FAF9F5]/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-[#1A2820]">
                          {wallet.address.slice(0, 8)}...{wallet.address.slice(-4)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-[#264939] block text-xs">{wallet.roleTitle}</span>
                          <span className="text-[10px] font-mono text-gray-500">{wallet.role}</span>
                        </td>
                        <td className="py-3 px-3 text-gray-500 text-[11px]">
                          {wallet.grantedAt}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleRevokeWallet(wallet.address, wallet.role)}
                            disabled={isSubmitting || !isAdminRole || wallet.role === 'ROLE_ADMIN'}
                            className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-[11px] font-bold transition-all disabled:opacity-40 inline-flex items-center gap-1"
                          >
                            <UserMinus className="w-3 h-3" />
                            <span>Thu Há»“i</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Feature 4: Event Logs Table with Sepolia Etherscan Links */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6E1D7] shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDE9E0]">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#264939]" />
                <h3 className="font-serif font-extrabold text-base text-[#264939]">
                  4. Nháº­t KÃ½ Sá»± Kiá»‡n Giao Dá»‹ch On-Chain
                </h3>
              </div>
              <a
                href={`${ETHERSCAN_BASE_URL}/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-[#264939] hover:underline flex items-center gap-1"
              >
                <span>Má»Ÿ Etherscan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Chi hien thi nhat ky su kien khi da ket noi vi */}
            {!currentAccount ? (
              <div className="text-center py-8 px-4 bg-[#FAF9F5] rounded-2xl border border-dashed border-[#E6E1D7] space-y-3">
                <Wallet className="w-8 h-8 text-[#C29B38] mx-auto" />
                <p className="text-xs font-bold text-[#1A2820]">YÃªu Cáº§u Káº¿t Ná»‘i VÃ­ Äá»ƒ Xem Nháº­t KÃ½ Sá»± Kiá»‡n</p>
                <p className="text-[11px] text-[#5E7166] max-w-sm mx-auto">
                  Vui lÃ²ng káº¿t ná»‘i vÃ­ MetaMask Ä‘á»ƒ xem Nháº­t KÃ½ Sá»± Kiá»‡n Giao Dá»‹ch On-Chain tá»« Sepolia Testnet.
                </p>
                <button
                  onClick={onConnectWallet}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#264939] text-white font-bold text-xs rounded-xl hover:bg-[#1c372b] transition-all shadow-2xs mt-1"
                >
                  <Wallet className="w-3.5 h-3.5 text-[#C29B38]" />
                  <span>Káº¿t Ná»‘i VÃ­ MetaMask</span>
                </button>
              </div>
            ) : recentEventLogs.length === 0 ? (
              <div className="text-center py-8 px-4 bg-[#FAF9F5] rounded-2xl border border-dashed border-[#E6E1D7] space-y-2">
                <Activity className="w-8 h-8 text-[#8A9D92] mx-auto opacity-60" />
                <p className="text-xs font-bold text-[#1A2820]">ChÆ°a CÃ³ Sá»± Kiá»‡n Giao Dá»‹ch On-Chain</p>
                <p className="text-[11px] text-[#5E7166] max-w-sm mx-auto">
                  CÃ¡c sá»± kiá»‡n khá»Ÿi táº¡o lÃ´ hÃ ng, tháº©m Ä‘á»‹nh OCOP vÃ  niÃªm yáº¿t tá»« Sepolia Testnet sáº½ tá»± Ä‘á»™ng hiá»ƒn thá»‹ táº¡i Ä‘Ã¢y.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#FAF9F5] border-b border-[#E6E1D7] text-[#8A9D92] font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">MÃ£ LÃ´ / Má»¥c</th>
                      <th className="py-2.5 px-3">Sá»± Kiá»‡n</th>
                      <th className="py-2.5 px-3">VÃ­ Thá»±c Hiá»‡n</th>
                      <th className="py-2.5 px-3">Thá»i Gian</th>
                      <th className="py-2.5 px-3 text-right">Etherscan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDE9E0]">
                    {recentEventLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#FAF9F5]/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-[#264939]">
                          {log.batchCode}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-mono text-[10px] font-bold border border-emerald-200">
                            {log.type}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-xs block text-[#1A2820]">
                            {log.actor.slice(0, 8)}...
                          </span>
                          <span className="text-[10px] text-gray-500">{log.role}</span>
                        </td>
                        <td className="py-3 px-3 text-gray-500 text-[11px]">
                          {log.timestamp}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {log.txHash ? (
                            <a
                              href={`${ETHERSCAN_BASE_URL}/tx/${log.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-[#FAF9F5] hover:bg-[#E0ECE4] text-[#264939] inline-flex items-center gap-1 transition-colors text-[11px] font-bold"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Chi Tiáº¿t</span>
                            </a>
                          ) : (
                            <span className="text-gray-400 font-mono text-[10px]">On-Chain</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Treasury & Emergency Control */}
        <div className="space-y-6 font-sans">
          {/* Feature 2: Treasury Fee Config & Withdraw Panel */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6E1D7] shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDE9E0]">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#C29B38]" />
                <h3 className="font-serif font-extrabold text-base text-[#264939]">
                  2. Quáº£n LÃ½ PhÃ­ & Treasury
                </h3>
              </div>
              <Wallet className="w-4 h-4 text-[#264939]" />
            </div>

            {/* Treasury Balance Display Card */}
            <div className="bg-gradient-to-br from-[#FAF9F5] to-[#E0ECE4]/40 p-4 rounded-2xl border border-[#CCD8CF] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#8A9D92] uppercase tracking-wider block">
                  Sá» DÆ¯ ETH TÃCH LÅ¨Y TRONG SMART CONTRACT
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border shadow-2xs ${currentAccount ? 'bg-white text-[#264939] border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                  {allocatedRoleLabel}
                </span>
              </div>

              <div className="text-2xl font-extrabold font-mono text-[#264939]">
                {allocatedBalanceDisplay} ETH
              </div>

              <p className="text-[11px] text-[#5E7166]">
                {allocatedSubtext}
              </p>

              {!currentAccount && (
                <button
                  onClick={onConnectWallet}
                  className="w-full mt-2 py-2.5 px-4 bg-[#C29B38] text-white rounded-xl font-bold text-xs hover:bg-[#8C6D1F] transition-all flex items-center justify-center gap-2 shadow-2xs"
                >
                  <Wallet className="w-4 h-4 text-white" />
                  <span>ÄÄƒng Nháº­p VÃ­ Äá»ƒ Xem Sá»‘ DÆ° Tháº­t</span>
                </button>
              )}
            </div>

            <form onSubmit={handleUpdateFee} className="space-y-3 pt-2 border-t border-[#EDE9E0]">
              <label className="block text-xs font-bold text-[#1A2820]">
                Cáº¥u HÃ¬nh Má»©c PhÃ­ Táº¡o LÃ´ (Sepolia ETH)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.0001"
                  value={newFee}
                  onChange={(e) => setNewFee(e.target.value)}
                  placeholder={`Má»©c phÃ­ hiá»‡n táº¡i: ${batchCreationFeeEth} ETH`}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E6E1D7] text-xs font-mono font-bold focus:outline-none focus:border-[#264939]"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !isAdminRole || !newFee}
                  className="px-4 py-2 bg-[#C29B38] text-[#FFFFFF] rounded-xl font-bold text-xs hover:bg-[#8C6D1F] transition-all shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>

          {/* ProjectCore hien tai khong trien khai Pausable / withdrawFees. */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6E1D7] shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#EDE9E0]">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <h3 className="font-serif font-extrabold text-base text-[#264939]">
                3. Tráº¡ng ThÃ¡i Há»£p Äá»“ng
              </h3>
            </div>
            <p className="text-xs text-[#5E7166] leading-relaxed">
              ProjectCore Ä‘ang triá»ƒn khai khÃ´ng cÃ³ hÃ m pause/unpause hoáº·c withdrawFees. Giao diá»‡n khÃ´ng gá»­i cÃ¡c giao dá»‹ch khÃ´ng tá»“n táº¡i.
            </p>
            <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              ACTIVE â€¢ Sepolia ProjectCore
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
