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
  isRoleRegistryLoading?: boolean;
  roleRegistryError?: string;
  supportsMultiAdmin?: boolean | null;
  onRefreshRoleRegistry?: () => Promise<void>;
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
  isRoleRegistryLoading = false,
  roleRegistryError = '',
  supportsMultiAdmin = null,
  onRefreshRoleRegistry,
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
        role: 'Cơ Sở Sản Xuất',
        fee: `${batchCreationFeeEth} ETH`,
        timestamp: b.createdAt ? new Date(b.createdAt * 1000).toLocaleString('vi-VN') : 'Theo thời gian tạo',
      });

      // 2. OCOP Verification event
      if (b.isVerified || b.inspectorNote) {
        logs.push({
          id: `evt-verify-${b.batchCode}`,
          type: 'BatchVerified',
          batchCode: b.batchCode,
          actor: 'Kiểm Định Viên OCOP',
          role: 'Kiểm Định Viên OCOP',
          fee: '0.00 ETH',
          timestamp: 'Đã Thẩm Định OCOP',
        });
      }

      // 3. Checkpoints events
      if (b.checkpoints && b.checkpoints.length > 0) {
        b.checkpoints.forEach((chk: Checkpoint, idx: number) => {
          logs.push({
            id: `evt-chk-${b.batchCode}-${idx}`,
            type: 'CheckpointAdded',
            batchCode: b.batchCode,
            actor: chk.location || 'Trạm Vận Hành',
            role: chk.roleTitle || 'Cung Ứng & Vận Hành',
            fee: '0.00 ETH',
            timestamp: chk.timestamp ? new Date(chk.timestamp * 1000).toLocaleString('vi-VN') : 'Mới cập nhật',
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
    if (roleName === 'ROLE_ADMIN' && !window.confirm('Thu hoi Admin se khoa quyen quan tri cua vi nay sau khi giao dich duoc xac nhan. Tiep tuc?')) return;
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
  let allocatedRoleLabel = 'Chưa Kết Nối Ví';
  let allocatedSubtext = 'Vui lòng đăng nhập ví để xem số dư tích lũy thật theo vai trò.';

  if (currentAccount) {
    if (userRole === 'PRODUCER' || userRole === 'SUPPLY_CHAIN') {
      allocatedRoleLabel = 'Chủ Cơ Sở Sản Xuất';
      allocatedSubtext = 'Số dư ETH ký quỹ sản xuất & đảm bảo chất lượng OCOP';
      allocatedBalanceDisplay = producerStakeBalance || '0.00';
    } else if (userRole === 'INSPECTOR') {
      allocatedRoleLabel = 'Kiểm Định Viên OCOP';
      allocatedSubtext = 'Số dư ETH tích lũy phí thẩm định OCOP';
      allocatedBalanceDisplay = contractBalanceEth || '0.00';
    } else if (userRole === 'RETAILER' || userRole === 'COMMERCE') {
      allocatedRoleLabel = 'Đại Lý Phân Phối';
      allocatedSubtext = 'Số dư ETH tích lũy niêm yết thương mại';
      allocatedBalanceDisplay = contractBalanceEth || '0.00';
    } else if (userRole === 'ADMIN') {
      allocatedRoleLabel = 'Quản Trị Viên (Admin)';
      allocatedSubtext = 'Tổng số dư ETH tích lũy Quỹ Treasury Smart Contract';
      allocatedBalanceDisplay = contractBalanceEth || '0.00';
    } else {
      allocatedRoleLabel = 'Khách Hàng';
      allocatedSubtext = 'Số dư ETH tương tác Smart Contract';
      allocatedBalanceDisplay = contractBalanceEth || '0.00';
    }
  }

  return (
    <div className="space-y-5 font-sans" data-testid="admin-console" data-ui-version="admin-utf8-v2">
      {/* Header Title Banner */}
      <div className="relative flex flex-wrap items-end justify-between gap-5 overflow-hidden rounded-[28px] bg-[#173F32] p-6 text-white shadow-[0_16px_42px_-28px_rgba(12,57,40,.8)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-28 h-72 w-72 rounded-full border-[52px] border-white/[0.045]" />
        <div className="relative max-w-[640px] space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E0C382]/20 bg-[#E0C382]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#E8D09C]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>HueLegend / Khu vực quản trị</span>
          </div>
          <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-[30px]">
            Quản trị hệ thống
          </h2>
          <p className="text-sm leading-6 text-white/75">
            Phân quyền truy cập, thiết lập phí tạo lô và theo dõi giao dịch của hợp đồng trên Sepolia.
          </p>
        </div>

        <div className="relative flex items-center gap-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3.5">
            <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-white/60">
              Trạng thái hệ thống
            </span>
            <span className={`mt-1 inline-flex items-center gap-1.5 text-xs font-bold ${isSystemPaused ? 'text-amber-200' : 'text-emerald-200'}`}>
              <span className={`h-2 w-2 rounded-full ${isSystemPaused ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <span>{isSystemPaused ? 'Tạm dừng' : 'Đang hoạt động'}</span>
            </span>
          </div>
        </div>
      </div>

      {supportsMultiAdmin === false && (
        <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3.5 text-sm leading-6 text-amber-950">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="font-extrabold">Hợp đồng Sepolia hiện tại chưa hỗ trợ nhiều Admin toàn quyền.</p>
              <p className="mt-1 text-xs leading-5">Ví có thể đã được gán <code>ROLE_ADMIN</code> trên blockchain, nhưng hợp đồng cũ vẫn yêu cầu Owner cho các thao tác quản trị. Tải lại trang không làm mất quyền đã ghi on-chain. Muốn hai ví cùng quản trị đầy đủ phải triển khai và chuyển sang hợp đồng hỗ trợ nhiều Admin.</p>
            </div>
          </div>
        </div>
      )}

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
                  Cấp quyền cho ví
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
                    Địa Chỉ Ví Ethereum Cần Phân Quyền *
                  </label>
                  <input
                    type="text"
                    required
                    value={accountAddress}
                    onChange={(e) => setAccountAddress(e.target.value)}
                    placeholder="Ví dụ: 0x35655079aEbB215E58e379D5a8c2f1f3a5323C6b"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D7] text-xs font-mono font-bold focus:outline-none focus:border-[#264939] bg-[#FAF9F5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A2820] mb-1">
                    Chọn Vai Trò RBAC *
                  </label>
                  <select
                    value={roleSelect}
                    onChange={(e) => setRoleSelect(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D7] text-xs font-bold focus:outline-none focus:border-[#264939]"
                  >
                    <option value="ROLE_PRODUCER">ROLE_PRODUCER (Chủ Cơ Sở Sản Xuất)</option>
                    <option value="ROLE_LOGISTICS">ROLE_LOGISTICS (Đơn Vị Vận Chuyển / Logistics)</option>
                    <option value="ROLE_RETAILER">ROLE_RETAILER (Đại Lý Phân Phối / Retailer)</option>
                    <option value="ROLE_INSPECTOR">ROLE_INSPECTOR (Kiểm Định Viên OCOP)</option>
                    <option value="ROLE_ADMIN">ROLE_ADMIN (Quản Trị Viên Hệ Thống)</option>
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
                  <span>Xác Nhận Gán Quyền On-Chain</span>
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
                  Ví đã được cấp quyền
                </h3>
              </div>

              <div className="relative w-48">
                <input
                  type="text"
                  value={searchRoleQuery}
                  onChange={(e) => setSearchRoleQuery(e.target.value)}
                  placeholder="Tìm theo ví / role..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#E6E1D7] text-[11px] focus:outline-none focus:border-[#264939]"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Chi hien thi danh sach vi khi da ket noi vi */}
            {!currentAccount ? (
              <div className="text-center py-8 px-4 bg-[#FAF9F5] rounded-2xl border border-dashed border-[#E6E1D7] space-y-3">
                <Wallet className="w-8 h-8 text-[#C29B38] mx-auto" />
                <p className="text-xs font-bold text-[#1A2820]">Yêu Cầu Kết Nối Ví Để Xem Danh Sách RBAC</p>
                <p className="text-[11px] text-[#5E7166] max-w-sm mx-auto">
                  Vui lòng kết nối ví MetaMask để xem và quản lý Danh Sách Ví Đã Cấp Quyền RBAC.
                </p>
                <button
                  onClick={onConnectWallet}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#264939] text-white font-bold text-xs rounded-xl hover:bg-[#1c372b] transition-all shadow-2xs mt-1"
                >
                  <Wallet className="w-3.5 h-3.5 text-[#C29B38]" />
                  <span>Kết Nối Ví Đăng Nhập</span>
                </button>
              </div>
            ) : isRoleRegistryLoading ? (
              <div role="status" className="rounded-xl border border-[#DCE6DD] bg-[#F7FAF7] px-5 py-8 text-center text-xs font-semibold text-[#51735C]">
                <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                Đang đọc lịch sử cấp quyền trực tiếp từ Sepolia...
              </div>
            ) : roleRegistryError ? (
              <div role="alert" className="space-y-3 rounded-xl border border-red-200 bg-red-50 px-5 py-6 text-center text-xs text-red-800">
                <p>{roleRegistryError}</p>
                {onRefreshRoleRegistry && <button type="button" onClick={() => void onRefreshRoleRegistry()} className="rounded-lg bg-white px-4 py-2 font-bold text-red-800 shadow-sm hover:bg-red-100">Thử đồng bộ lại</button>}
              </div>
            ) : filteredWallets.length === 0 ? (
              <div className="text-center py-8 px-4 bg-[#FAF9F5] rounded-2xl border border-dashed border-[#E6E1D7] space-y-2">
                <Users className="w-8 h-8 text-[#8A9D92] mx-auto opacity-60" />
                <p className="text-xs font-bold text-[#1A2820]">Chưa Có Ví Được Phân Quyền On-Chain</p>
                    <p className="text-[11px] text-[#5E7166] max-w-sm mx-auto">
                  Chưa tìm thấy ví đang có quyền theo lịch sử RoleAssigned/RoleRevoked trên hợp đồng Sepolia hiện tại.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#FAF9F5] border-b border-[#E6E1D7] text-[#8A9D92] font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Địa Chỉ Ví</th>
                      <th className="py-2.5 px-3">Tên Vai Trò / Đơn Vị</th>
                      <th className="py-2.5 px-3">Ghi Nhận On-Chain</th>
                      <th className="py-2.5 px-3 text-right">Thao Tác</th>
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
                            disabled={isSubmitting || !isAdminRole}
                            className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-[11px] font-bold transition-all disabled:opacity-40 inline-flex items-center gap-1"
                          >
                            <UserMinus className="w-3 h-3" />
                            <span>Thu Hồi</span>
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
                  Nhật ký hoạt động trên chuỗi
                </h3>
              </div>
              <a
                href={`${ETHERSCAN_BASE_URL}/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-[#264939] hover:underline flex items-center gap-1"
              >
                <span>Mở Etherscan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Chi hien thi nhat ky su kien khi da ket noi vi */}
            {!currentAccount ? (
              <div className="text-center py-8 px-4 bg-[#FAF9F5] rounded-2xl border border-dashed border-[#E6E1D7] space-y-3">
                <Wallet className="w-8 h-8 text-[#C29B38] mx-auto" />
                <p className="text-xs font-bold text-[#1A2820]">Yêu Cầu Kết Nối Ví Để Xem Nhật Ký Sự Kiện</p>
                <p className="text-[11px] text-[#5E7166] max-w-sm mx-auto">
                  Vui lòng kết nối ví MetaMask để xem Nhật Ký Sự Kiện Giao Dịch On-Chain từ Sepolia Testnet.
                </p>
                <button
                  onClick={onConnectWallet}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#264939] text-white font-bold text-xs rounded-xl hover:bg-[#1c372b] transition-all shadow-2xs mt-1"
                >
                  <Wallet className="w-3.5 h-3.5 text-[#C29B38]" />
                  <span>Kết Nối Ví MetaMask</span>
                </button>
              </div>
            ) : recentEventLogs.length === 0 ? (
              <div className="text-center py-8 px-4 bg-[#FAF9F5] rounded-2xl border border-dashed border-[#E6E1D7] space-y-2">
                <Activity className="w-8 h-8 text-[#8A9D92] mx-auto opacity-60" />
                <p className="text-xs font-bold text-[#1A2820]">Chưa Có Sự Kiện Giao Dịch On-Chain</p>
                <p className="text-[11px] text-[#5E7166] max-w-sm mx-auto">
                  Các sự kiện khởi tạo lô hàng, thẩm định OCOP và niêm yết từ Sepolia Testnet sẽ tự động hiển thị tại đây.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#FAF9F5] border-b border-[#E6E1D7] text-[#8A9D92] font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Mã Lô / Mục</th>
                      <th className="py-2.5 px-3">Sự Kiện</th>
                      <th className="py-2.5 px-3">Ví Thực Hiện</th>
                      <th className="py-2.5 px-3">Thời Gian</th>
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
                              <span>Chi Tiết</span>
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
                  Quản lý phí tạo lô
                </h3>
              </div>
              <Wallet className="w-4 h-4 text-[#264939]" />
            </div>

            {/* Treasury Balance Display Card */}
            <div className="bg-gradient-to-br from-[#FAF9F5] to-[#E0ECE4]/40 p-4 rounded-2xl border border-[#CCD8CF] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#8A9D92] uppercase tracking-wider block">
                  SỐ DƯ ETH TÍCH LŨY TRONG SMART CONTRACT
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
                  <span>Đăng Nhập Ví Để Xem Số Dư Thật</span>
                </button>
              )}
            </div>

            <form onSubmit={handleUpdateFee} className="space-y-3 pt-2 border-t border-[#EDE9E0]">
              <label className="block text-xs font-bold text-[#1A2820]">
                Cấu Hình Mức Phí Tạo Lô (Sepolia ETH)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.0001"
                  value={newFee}
                  onChange={(e) => setNewFee(e.target.value)}
                  placeholder={`Mức phí hiện tại: ${batchCreationFeeEth} ETH`}
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
                  Trạng thái hợp đồng
              </h3>
            </div>
            <p className="text-xs text-[#5E7166] leading-relaxed">
              ProjectCore đang triển khai không có hàm pause/unpause hoặc withdrawFees. Giao diện không gửi các giao dịch không tồn tại.
            </p>
            <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              ACTIVE • Sepolia ProjectCore
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
