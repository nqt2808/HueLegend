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
import { ETHERSCAN_BASE_URL, CONTRACT_ADDRESS, safeGetAddress, ROLE_HASHES, isDefaultAdminAddress, DEFAULT_ADMIN_ADDRESS } from '../constants';

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
  onConnectWallet: (e?: React.MouseEvent) => void;
  onSetBatchCreationFee: (newFeeEth: string) => Promise<void>;
  onAssignRole: (account: string, roleName: string) => Promise<void>;
  onRevokeRole: (account: string, roleName: string) => Promise<void>;
  onWithdrawFees?: () => Promise<void>;
  onTogglePauseSystem?: (shouldPause: boolean) => Promise<void>;
  onPayInspectorFees?: () => Promise<void>;
  onPayLogisticsFees?: () => Promise<void>;
  onPaySingleInspectorFee?: (batchCode: string, inspectorAddress: string) => Promise<void>;
  onPaySingleLogisticsFee?: (batchCode: string, logisticsAddress: string) => Promise<void>;
}

export const AdminTab: React.FC<AdminTabProps> = ({
  batches = {},
  grantedWallets = [],
  batchCreationFeeEth,
  contractBalanceEth = '0.00',
  producerStakeBalance = '0.00',
  userRole = 'ALL',
  isSystemPaused = false,
  isAdminRole,
  currentAccount,
  onConnectWallet,
  onSetBatchCreationFee,
  onAssignRole,
  onRevokeRole,
  onWithdrawFees,
  onTogglePauseSystem,
  onPayInspectorFees,
  onPayLogisticsFees,
  onPaySingleInspectorFee,
  onPaySingleLogisticsFee,
}) => {
  const [accountAddress, setAccountAddress] = useState('');
  const [roleSelect, setRoleSelect] = useState('ROLE_LOGISTICS');
  const [newFee, setNewFee] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchRoleQuery, setSearchRoleQuery] = useState('');

  // Cong cu dem so kiem dinh OCOP va so chang van chuyen
  const batchArray = Object.values(batches);

  // 1. Dem kiem dinh OCOP
  const totalVerifiedInspectorBatches = batchArray.filter((b) => b.isVerified);
  const unpaidInspectorBatches = batchArray.filter((b) => b.isVerified && !b.adminPaidInspectorFee);
  const paidInspectorBatchesCount = totalVerifiedInspectorBatches.length - unpaidInspectorBatches.length;
  const totalInspectorFeeEth = (unpaidInspectorBatches.length * 0.002).toFixed(4);

  // 2. Dem chang van chuyen
  const allLogisticsBatches = batchArray.filter((b) => {
    return b.checkpoints && b.checkpoints.some(
      (c) =>
        c.role === 'ROLE_LOGISTICS' ||
        c.role === 'LOGISTICS' ||
        c.role === '0x32c4b0b14798e1f57ec053359d33b879c5a1a0df3bc25e62f6b8df05373a0c4f' ||
        (c.stepName && (c.stepName.toLowerCase().includes('vận chuyển') || c.stepName.toLowerCase().includes('chặng 3') || c.stepName.toLowerCase().includes('kho')))
    );
  });
  const unpaidLogisticsBatches = allLogisticsBatches.filter((b) => !b.adminPaidLogisticsFee);
  const paidLogisticsBatchesCount = allLogisticsBatches.length - unpaidLogisticsBatches.length;
  const totalLogisticsFeeEth = (unpaidLogisticsBatches.length * 0.002).toFixed(4);

  const handlePayInspector = async () => {
    if (!onPayInspectorFees) return;
    setIsSubmitting(true);
    try {
      await onPayInspectorFees();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayLogistics = async () => {
    if (!onPayLogisticsFees) return;
    setIsSubmitting(true);
    try {
      await onPayLogisticsFees();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaySingleInspector = async (batchCode: string, inspectorAddress: string) => {
    if (!onPaySingleInspectorFee) return;
    setIsSubmitting(true);
    try {
      await onPaySingleInspectorFee(batchCode, inspectorAddress);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaySingleLogistics = async (batchCode: string, logisticsAddress: string) => {
    if (!onPaySingleLogisticsFee) return;
    setIsSubmitting(true);
    try {
      await onPaySingleLogisticsFee(batchCode, logisticsAddress);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

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
    if (isAdminRole || userRole === 'ADMIN') {
      allocatedRoleLabel = 'Quản Trị Viên (Admin)';
      allocatedSubtext = 'Tổng số dư ETH tích lũy Quỹ Treasury Smart Contract';
      allocatedBalanceDisplay = contractBalanceEth || '0.00';
    } else if (userRole === 'PRODUCER' || userRole === 'SUPPLY_CHAIN') {
      allocatedRoleLabel = 'Chủ Cơ Sở Sản Xuất';
      allocatedSubtext = 'Số dư ETH ký quỹ sản xuất & đảm bảo chất lượng OCOP';
      allocatedBalanceDisplay = producerStakeBalance && producerStakeBalance !== '0.00' ? producerStakeBalance : '0.000';
    } else if (userRole === 'INSPECTOR') {
      allocatedRoleLabel = 'Kiểm Định Viên OCOP';
      allocatedSubtext = 'Số dư ETH tích lũy phí thẩm định OCOP';
      allocatedBalanceDisplay = contractBalanceEth && contractBalanceEth !== '0.00' ? contractBalanceEth : '0.002';
    } else if (userRole === 'RETAILER' || userRole === 'COMMERCE') {
      allocatedRoleLabel = 'Đại Lý Phân Phối';
      allocatedSubtext = 'Số dư ETH tích lũy niêm yết thương mại';
      allocatedBalanceDisplay = contractBalanceEth || '0.00';
    } else {
      allocatedRoleLabel = 'Khách Hàng';
      allocatedSubtext = 'Số dư ETH tương tác Smart Contract';
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
            <span>Trung Tâm Quản Trị Hệ Thống HueLegend</span>
          </div>
          <h2 className="font-serif font-extrabold text-2xl text-amber-100">
            Trang Quản Trị Hệ Thống On-Chain
          </h2>
          <p className="text-xs text-emerald-100/90">
            Phân quyền RBAC, quản lý mức phí khai báo, rút tiền Quỹ Treasury và giám sát trạng thái an toàn Smart Contract.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-3 rounded-2xl border border-white/20 text-right backdrop-blur-xs">
            <span className="text-[10px] text-emerald-200 uppercase font-bold block">
              Trạng Thái Hệ Thống
            </span>
            <span className={`text-xs font-bold inline-flex items-center gap-1.5 mt-0.5 ${isSystemPaused ? 'text-amber-300' : 'text-emerald-300'}`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${isSystemPaused ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <span>{isSystemPaused ? 'TẠM DỪNG (Paused)' : 'HOẠT ĐỘNG (Active)'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Top Grid: Balanced 2 Equal Columns for Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: RBAC Granting & Granted Wallets List */}
        <div className="space-y-6">
          {/* Feature 1: Grant Role Panel */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6E1D7] shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDE9E0]">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#264939]" />
                <h3 className="font-serif font-extrabold text-lg text-[#264939]">
                  1. Gán Quyền Vai Trò (Grant Role)
                </h3>
              </div>
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
                    placeholder="Ví dụ: 0x2e4216e1BCA81d308b25adaD6ef5Ea92E2e42F8c"
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
                    <option value="ROLE_LOGISTICS">ROLE_LOGISTICS (Đơn Vị Vận Chuyển / Logistics)</option>
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
                  Danh Sách Ví Đã Cấp Quyền RBAC
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
            ) : filteredWallets.length === 0 ? (
              <div className="text-center py-8 px-4 bg-[#FAF9F5] rounded-2xl border border-dashed border-[#E6E1D7] space-y-2">
                <Users className="w-8 h-8 text-[#8A9D92] mx-auto opacity-60" />
                <p className="text-xs font-bold text-[#1A2820]">Chưa Có Ví Được Phân Quyền On-Chain</p>
                <p className="text-[11px] text-[#5E7166] max-w-sm mx-auto">
                  Sử dụng biểu mẫu "Gán Quyền Vai Trò" ở trên để cấp quyền cho địa chỉ ví Nhà sản xuất, Kiểm định viên OCOP hoặc Đại lý.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#FAF9F5] border-b border-[#E6E1D7] text-[#8A9D92] font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Địa Chỉ Ví</th>
                      <th className="py-2.5 px-3">Vai Trò / Người Cấp</th>
                      <th className="py-2.5 px-3">Thời Gian Gán</th>
                      <th className="py-2.5 px-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDE9E0]">
                    {filteredWallets.map((wallet) => {
                      const isTargetAdmin = wallet.role === 'ROLE_ADMIN' || wallet.role === 'ADMIN' || (wallet.roleTitle && wallet.roleTitle.toLowerCase().includes('quản trị'));
                      
                      // Kiem tra xem nguoi dang dang nhap co phai la Master Admin khong
                      const isMasterAdminConnecting = isDefaultAdminAddress(currentAccount);

                      // Quyen thu hoi: 
                      // 1. Neu toi la nguoi truc tiep cap quyen (wallet.granter match)
                      // 2. Neu ví do 'He thong' cap (null granter) VA toi la Master Admin
                      const isGrantedByMe = (wallet.granter && currentAccount && wallet.granter.toLowerCase() === currentAccount.toLowerCase()) ||
                                            (!wallet.granter && isMasterAdminConnecting);
                      
                      const canRevoke = !isTargetAdmin && isGrantedByMe;

                      return (
                        <tr key={`${wallet.address}-${wallet.role}`} className="hover:bg-[#FAF9F5]/80 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-[#1A2820]">
                            {wallet.address.slice(0, 8)}...{wallet.address.slice(-4)}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-[#264939] block text-xs">{wallet.roleTitle}</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[9px] font-mono text-gray-400">Granter:</span>
                              <span className="text-[9px] font-mono text-emerald-600 font-bold">
                                {wallet.granter ? `${wallet.granter.slice(0, 6)}...${wallet.granter.slice(-4)}` : 'Hệ thống'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-gray-500 text-[11px]">
                            {wallet.grantedAt}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleRevokeWallet(wallet.address, wallet.role)}
                              disabled={isSubmitting || !isAdminRole || !canRevoke}
                              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all inline-flex items-center gap-1 ${
                                canRevoke 
                                  ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200 cursor-pointer' 
                                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                              }`}
                              title={isTargetAdmin ? "Không thể thu hồi vai trò Quản Trị Viên" : !isGrantedByMe ? "Bạn chỉ có thể thu hồi ví do chính bạn cấp quyền" : "Thu hồi quyền vai trò RBAC này"}
                            >
                              <UserMinus className="w-3 h-3" />
                              <span>Thu Hồi</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Treasury Config & Emergency Controls */}
        <div className="space-y-6 font-sans">
          {/* Feature 2: Treasury Fee Config & Withdraw Panel */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6E1D7] shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDE9E0]">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#C29B38]" />
                <h3 className="font-serif font-extrabold text-base text-[#264939]">
                  2. Quản Lý Phí & Treasury Smart Contract
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
                {allocatedRoleLabel !== 'Khách Hàng' && (
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border shadow-2xs ${currentAccount ? 'bg-white text-[#264939] border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                    {allocatedRoleLabel}
                  </span>
                )}
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
                  className="px-4 py-2 bg-[#C29B38] text-[#FFFFFF] rounded-xl font-bold text-xs hover:bg-[#8C6D1F] transition-all shrink-0 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Cập Nhật Phí</span>
                </button>
              </div>
            </form>
          </div>

          {/* Feature 3: Emergency Control (Pause / Unpause) */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6E1D7] shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EDE9E0]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h3 className="font-serif font-extrabold text-base text-[#264939]">
                  3. An Toàn Hệ Thống (Emergency Circuit Breaker)
                </h3>
              </div>
            </div>

            <p className="text-xs text-[#5E7166] leading-relaxed">
              Tính năng Tạm dừng khẩn cấp (Emergency Circuit Breaker). Cho phép Admin dừng các thao tác ghi dữ liệu mới khi phát hiện sự cố bảo mật hoặc kiểm toán hệ thống.
            </p>

            <div className="pt-1 flex gap-3">
              <button
                onClick={() => onTogglePauseSystem && onTogglePauseSystem(true)}
                disabled={isSubmitting || !isAdminRole || isSystemPaused}
                className="flex-1 py-2.5 px-3 bg-amber-600 text-white rounded-xl font-bold text-xs hover:bg-amber-700 transition-all flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-40"
              >
                <PauseCircle className="w-4 h-4" />
                <span>Tạm Dừng (pause)</span>
              </button>

              <button
                onClick={() => onTogglePauseSystem && onTogglePauseSystem(false)}
                disabled={isSubmitting || !isAdminRole || !isSystemPaused}
                className="flex-1 py-2.5 px-3 bg-[#264939] text-white rounded-xl font-bold text-xs hover:bg-[#1c372b] transition-all flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-40"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Kích Hoạt (unpause)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width Bottom Section A: Dedicated Treasury Fee Payment Tables */}
      <div className="bg-white p-6 rounded-3xl border border-[#E6E1D7] shadow-2xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#EDE9E0]">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#C29B38]" />
            <h3 className="font-serif font-extrabold text-lg text-[#264939]">
              Quản Lý Danh Sách Chi Trả Phí Thẩm Định & Vận Chuyển
            </h3>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-[#FAF9F5] text-[#264939] border border-[#E6E1D7]">
            0.002 ETH / Giao Dịch
          </span>
        </div>

        {/* 2-Column Grid inside Full-Width Container for Inspector and Logistics Tables */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 font-sans">
          {/* Dedicated Table 1: Trả phí Kiểm định viên */}
          <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-[#E6E1D7] space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#264939] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#C29B38]" />
                <span>Danh Sách Phí Kiểm Định OCOP (0.002 ETH/lô)</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-500 font-bold">
                  Chờ trả: {unpaidInspectorBatches.length} lô ({totalInspectorFeeEth} ETH)
                </span>
                {unpaidInspectorBatches.length > 1 && (
                  <button
                    type="button"
                    onClick={handlePayInspector}
                    disabled={isSubmitting || !isAdminRole}
                    className="px-2.5 py-1 rounded-lg bg-[#264939] text-white text-[10px] font-bold hover:bg-[#1c372b] transition-all disabled:opacity-40"
                  >
                    Trả Phí Tất Cả ({totalInspectorFeeEth} ETH)
                  </button>
                )}
              </div>
            </div>

            {totalVerifiedInspectorBatches.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400 italic bg-white rounded-xl border border-dashed border-gray-200">
                Chưa có lô hàng nào được kiểm định OCOP thành công.
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-xl border border-[#EDE9E0]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#FAF9F5] border-b border-[#EDE9E0] text-[10px] font-bold text-[#8A9D92] uppercase">
                      <th className="p-2.5">Mã Lô / Đặc Sản</th>
                      <th className="p-2.5">Ví Kiểm Định Viên</th>
                      <th className="p-2.5">Mức Phí</th>
                      <th className="p-2.5">Trạng Thái</th>
                      <th className="p-2.5 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDE9E0]">
                    {totalVerifiedInspectorBatches.map((b) => {
                      const inspectorCp = b.checkpoints?.find(
                        (c) =>
                          c.role === 'ROLE_INSPECTOR' ||
                          c.role === ROLE_HASHES.ROLE_INSPECTOR ||
                          (c.stepName && (c.stepName.toLowerCase().includes('chặng 2') || c.stepName.toLowerCase().includes('ocop')))
                      );
                      const inspectorGrantedWallet = grantedWallets.find(
                        (w) => w.role === 'ROLE_INSPECTOR' || w.role === ROLE_HASHES.ROLE_INSPECTOR
                      );
                      const inspectorAddr = inspectorCp?.recorder || inspectorGrantedWallet?.address || DEFAULT_ADMIN_ADDRESS;
                      const isPaid = Boolean(b.adminPaidInspectorFee);

                      return (
                        <tr key={`insp-fee-${b.batchCode}`} className="hover:bg-[#FAF9F5]/80 transition-colors">
                          <td className="p-2.5 font-sans">
                            <span className="font-mono font-extrabold text-[#264939] block text-xs">{b.batchCode}</span>
                            <span className="text-[11px] text-gray-600 font-medium">{b.productName}</span>
                          </td>
                          <td className="p-2.5 font-mono text-[11px] font-bold text-[#1A2820]">
                            {inspectorAddr.slice(0, 6)}...{inspectorAddr.slice(-4)}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-[#264939]">
                            0.002 ETH
                          </td>
                          <td className="p-2.5">
                            {isPaid ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                                Đã Thanh Toán
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                                Chờ Thanh Toán
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-right">
                            {isPaid ? (
                              <button
                                type="button"
                                disabled
                                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 font-bold text-[11px] cursor-not-allowed border border-gray-200"
                              >
                                Đã Trả Phí
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handlePaySingleInspector(b.batchCode, inspectorAddr)}
                                disabled={isSubmitting || !isAdminRole}
                                className="px-3 py-1.5 rounded-lg bg-[#264939] text-white font-bold text-[11px] hover:bg-[#1c372b] transition-all shadow-2xs disabled:opacity-40"
                              >
                                Trả Phí (0.002 ETH)
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Dedicated Table 2: Trả phí Vận Chuyển */}
          <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-[#E6E1D7] space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#264939] flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-[#C29B38]" />
                <span>Danh Sách Phí Vận Chuyển (0.002 ETH/chặng)</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-500 font-bold">
                  Chờ trả: {unpaidLogisticsBatches.length} chặng ({totalLogisticsFeeEth} ETH)
                </span>
                {unpaidLogisticsBatches.length > 1 && (
                  <button
                    type="button"
                    onClick={handlePayLogistics}
                    disabled={isSubmitting || !isAdminRole}
                    className="px-2.5 py-1 rounded-lg bg-[#C29B38] text-white text-[10px] font-bold hover:bg-[#8C6D1F] transition-all disabled:opacity-40"
                  >
                    Trả Phí Tất Cả ({totalLogisticsFeeEth} ETH)
                  </button>
                )}
              </div>
            </div>

            {allLogisticsBatches.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400 italic bg-white rounded-xl border border-dashed border-gray-200">
                Chưa có chặng vận chuyển nào được ghi nhận.
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-xl border border-[#EDE9E0]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#FAF9F5] border-b border-[#EDE9E0] text-[10px] font-bold text-[#8A9D92] uppercase">
                      <th className="p-2.5">Mã Lô / Đặc Sản</th>
                      <th className="p-2.5">Ví Đơn Vị Vận Chuyển</th>
                      <th className="p-2.5">Mức Phí</th>
                      <th className="p-2.5">Trạng Thái</th>
                      <th className="p-2.5 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDE9E0]">
                    {allLogisticsBatches.map((b) => {
                      const logisticsCp = b.checkpoints?.find(
                        (c) =>
                          c.role === 'ROLE_LOGISTICS' ||
                          c.role === 'LOGISTICS' ||
                          c.role === '0x32c4b0b14798e1f57ec053359d33b879c5a1a0df3bc25e62f6b8df05373a0c4f' ||
                          (c.stepName && (c.stepName.toLowerCase().includes('vận chuyển') || c.stepName.toLowerCase().includes('chặng 3') || c.stepName.toLowerCase().includes('kho')))
                      );
                      const logisticsGrantedWallet = grantedWallets.find(
                        (w) => w.role === 'ROLE_LOGISTICS' || w.role === ROLE_HASHES.ROLE_LOGISTICS
                      );
                      const logisticsAddr = logisticsCp?.recorder || logisticsGrantedWallet?.address || '0x42965579aEbB215E58e379D5a8c2f1f3a5323C6b';
                      const isPaid = Boolean(b.adminPaidLogisticsFee);

                      return (
                        <tr key={`logistics-fee-${b.batchCode}`} className="hover:bg-[#FAF9F5]/80 transition-colors">
                          <td className="p-2.5 font-sans">
                            <span className="font-mono font-extrabold text-[#264939] block text-xs">{b.batchCode}</span>
                            <span className="text-[11px] text-gray-600 font-medium">{b.productName}</span>
                          </td>
                          <td className="p-2.5 font-mono text-[11px] font-bold text-[#1A2820]">
                            {logisticsAddr.slice(0, 6)}...{logisticsAddr.slice(-4)}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-[#264939]">
                            0.002 ETH
                          </td>
                          <td className="p-2.5">
                            {isPaid ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                                Đã Thanh Toán
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                                Chờ Thanh Toán
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-right">
                            {isPaid ? (
                              <button
                                type="button"
                                disabled
                                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 font-bold text-[11px] cursor-not-allowed border border-gray-200"
                              >
                                Đã Trả Phí
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handlePaySingleLogistics(b.batchCode, logisticsAddr)}
                                disabled={isSubmitting || !isAdminRole}
                                className="px-3 py-1.5 rounded-lg bg-[#C29B38] text-white font-bold text-[11px] hover:bg-[#8C6D1F] transition-all shadow-2xs disabled:opacity-40"
                              >
                                Trả Phí (0.002 ETH)
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-Width Bottom Section B: Event Logs Table with Sepolia Etherscan Links */}
      <div className="bg-white p-6 rounded-3xl border border-[#E6E1D7] shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EDE9E0]">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#264939]" />
            <h3 className="font-serif font-extrabold text-[#264939]">
              Nhật Ký Sự Kiện Giao Dịch On-Chain
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
  );
};
