import React from 'react';
import { X, Wallet, ShieldCheck, ExternalLink, LogOut, Coins, Network, GripHorizontal } from 'lucide-react';
import { ethers } from 'ethers';
import { ETHERSCAN_BASE_URL, CONTRACT_ADDRESS, safeGetAddress, ROLE_HASHES } from '../constants';
import { Batch } from '../types';
import { useDraggable } from '../hooks/useDraggable';

interface WalletDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: string;
  roleTitle: string;
  userRole?: string;
  producerStakeBalance: string;
  contractBalanceEth?: string;
  batches?: Record<string, Batch>;
  onDisconnect: () => void;
  clickPos?: { x: number; y: number } | null;
}

export const WalletDetailsModal: React.FC<WalletDetailsModalProps> = ({
  isOpen,
  onClose,
  account,
  roleTitle,
  userRole = 'ALL',
  producerStakeBalance,
  contractBalanceEth = '0.00',
  batches,
  onDisconnect,
  clickPos,
}) => {
  const { isDragging, modalStyle, dragHeaderProps } = useDraggable(isOpen, clickPos, { width: 440, height: 450 });

  if (!isOpen) return null;

  const shortAddress = `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;

  // Tinh tong so tien ETH ma Dai ly / Cua hang dac san da thanh toan cho Co so san xuat
  let producerRetailerPaidEth = '0.000';
  if (batches && account) {
    try {
      const cleanAccount = safeGetAddress(account).toLowerCase();
      let totalWei = 0n;

      Object.values(batches).forEach((b) => {
        const isMyProducerBatch = b.producer && safeGetAddress(b.producer).toLowerCase() === cleanAccount;
        if (isMyProducerBatch && b.checkpoints) {
          b.checkpoints.forEach((cp) => {
            const isRetailerCp =
              cp.role === ROLE_HASHES.ROLE_RETAILER ||
              cp.role === 'RETAILER' ||
              cp.roleTitle?.toLowerCase().includes('đại lý') ||
              cp.stepName?.toLowerCase().includes('niêm yết') ||
              cp.action?.toLowerCase().includes('niêm yết') ||
              cp.action?.toLowerCase().includes('đã nhập kho');

            if (isRetailerCp) {
              const feeMatch =
                cp.action.match(/Phí On-Chain:\s*([0-9.]+)\s*ETH/i) ||
                cp.conditionNote?.match(/Phí MetaMask Sepolia:\s*([0-9.]+)\s*ETH/i) ||
                cp.action.match(/Giá Niêm Yết Bán Lẻ\s*\(([0-9.]+)\s*ETH\)/i) ||
                cp.action.match(/([0-9.]+)\s*ETH/i);

              if (feeMatch && feeMatch[1]) {
                const val = parseFloat(feeMatch[1]);
                if (!isNaN(val) && val > 0) {
                  totalWei += ethers.parseEther(val.toFixed(6));
                }
              } else if (b.listingPriceEth) {
                const val = parseFloat(b.listingPriceEth);
                if (!isNaN(val) && val > 0) {
                  totalWei += ethers.parseEther(val.toFixed(6));
                }
              }
            }
          });
        }
      });

      const formatted = ethers.formatEther(totalWei);
      if (parseFloat(formatted) > 0) {
        producerRetailerPaidEth = parseFloat(formatted).toFixed(4);
      }
    } catch (e) {
      console.warn('Loi tinh so tien dai ly thanh toan cho producer:', e);
    }
  }

  // Tinh tong so phi kiem dinh ma vi Quan tri vien DA GIAO DỊCH tra cho Kiem dinh vien (0.002 ETH/lo)
  // Neu vi Quan tri vien CHUA thuc hien giao dich tra phi thì so du mac dinh = 0.000 ETH
  let inspectorFeePaidEth = '0.000';
  if (batches) {
    let adminPaidTxCount = 0;
    Object.values(batches).forEach((b) => {
      // Chi dem khi lo hang DA KIEM DINH THANH CONG va CO GIAO DỊCH VÍ QUẢN TRỊ VIÊN TRẢ PHÍ
      const hasAdminPaidTx = Boolean(
        b.adminPaidInspectorFee ||
        (b.checkpoints && b.checkpoints.some(
          (c) =>
            (c.role === 'ROLE_ADMIN' || c.role === 'ADMIN' || c.roleTitle?.toLowerCase().includes('quản trị')) &&
            (c.action?.toLowerCase().includes('trả phí') ||
             c.action?.toLowerCase().includes('thanh toán phí') ||
             c.action?.toLowerCase().includes('phí thẩm định') ||
             c.stepName?.toLowerCase().includes('trả phí'))
        ))
      );

      if (b.isVerified && hasAdminPaidTx) {
        adminPaidTxCount += 1;
      }
    });
    const feeVal = adminPaidTxCount * 0.002;
    inspectorFeePaidEth = feeVal > 0 ? feeVal.toFixed(3) : '0.000';
  }

  // Tinh tong so phi van chuyen ma vi Quan tri vien DA GIAO DỊCH tra cho Don vi van chuyen (0.002 ETH/lan ghi chang van chuyen)
  // Neu vi Quan tri vien CHUA thuc hien giao dich tra phi thi so du mac dinh = 0.000 ETH
  let logisticsFeePaidEth = '0.000';
  if (batches) {
    let adminPaidLogisticsCount = 0;
    Object.values(batches).forEach((b) => {
      const hasLogisticsCp = b.checkpoints && b.checkpoints.some(
        (c) =>
          c.role === 'ROLE_LOGISTICS' ||
          c.role === 'LOGISTICS' ||
          c.role === '0x32c4b0b14798e1f57ec053359d33b879c5a1a0df3bc25e62f6b8df05373a0c4f' ||
          (c.stepName && (c.stepName.toLowerCase().includes('vận chuyển') || c.stepName.toLowerCase().includes('chặng 3') || c.stepName.toLowerCase().includes('kho')))
      );

      const hasAdminPaidLogisticsTx = Boolean(
        b.adminPaidLogisticsFee ||
        (b.checkpoints && b.checkpoints.some(
          (c) =>
            (c.role === 'ROLE_ADMIN' || c.role === 'ADMIN' || c.roleTitle?.toLowerCase().includes('quản trị')) &&
            (c.action?.toLowerCase().includes('vận chuyển') ||
             c.action?.toLowerCase().includes('phí vận chuyển') ||
             c.stepName?.toLowerCase().includes('trả phí vận chuyển'))
        ))
      );

      if (hasLogisticsCp && hasAdminPaidLogisticsTx) {
        adminPaidLogisticsCount += 1;
      }
    });

    const feeVal = adminPaidLogisticsCount * 0.002;
    logisticsFeePaidEth = feeVal > 0 ? feeVal.toFixed(3) : '0.000';
  }

  // Xac dinh nhan va so du ETH tich luy theo vai tro vi
  let roleLabel = 'On-Chain';
  let roleSubtext = 'Số dư ETH tích lũy tương tác Smart Contract';
  let roleBalance = producerStakeBalance !== '0.00' ? producerStakeBalance : contractBalanceEth;

  if (userRole === 'PRODUCER' || userRole === 'SUPPLY_CHAIN') {
    roleLabel = 'Cơ Sở Sản Xuất';
    roleSubtext = 'Tổng tiền ETH Đại lý & Cửa hàng đặc sản đã thanh toán On-Chain';
    roleBalance = producerRetailerPaidEth;
  } else if (userRole === 'INSPECTOR') {
    roleLabel = 'Kiểm Định Viên OCOP';
    roleSubtext = 'Chỉ tăng 0.002 ETH/lần khi ví Quản trị viên thực hiện giao dịch trả phí kiểm định (chưa trả phí = 0)';
    roleBalance = inspectorFeePaidEth;
  } else if (userRole === 'LOGISTICS') {
    roleLabel = 'Đơn Vị Vận Chuyển';
    roleSubtext = 'Chỉ tăng 0.002 ETH/lần khi ví Quản trị viên thực hiện giao dịch trả phí vận chuyển (chưa trả phí = 0)';
    roleBalance = logisticsFeePaidEth;
  } else if (userRole === 'RETAILER' || userRole === 'COMMERCE') {
    roleLabel = 'Đại Lý Thương Mại';
    roleSubtext = 'Tích lũy giao dịch niêm yết & nhập kho';
    roleBalance = contractBalanceEth;
  } else if (userRole === 'ADMIN') {
    roleLabel = 'Quản Trị Viên (Admin)';
    roleSubtext = 'Tổng phí tích lũy Treasury Smart Contract';
    roleBalance = contractBalanceEth;
  }

  let balanceBoxTitle = 'SỐ DƯ ETH TÍCH LŨY TRONG SMART CONTRACT';
  if (userRole === 'INSPECTOR') {
    balanceBoxTitle = 'SỐ DƯ ETH QUẢN TRỊ VIÊN TRẢ PHÍ THẨM ĐỊNH';
  } else if (userRole === 'LOGISTICS') {
    balanceBoxTitle = 'SỐ DƯ ETH QUẢN TRỊ VIÊN TRẢ PHÍ VẬN CHUYỂN';
  }

  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans ${
        clickPos ? 'overflow-visible' : 'flex items-center justify-center p-3 sm:p-4 overflow-y-auto'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={modalStyle}
        className="bg-white rounded-3xl border border-[#E6E1D7] max-w-md w-full max-h-[88vh] flex flex-col p-5 sm:p-6 shadow-2xl relative overflow-y-auto space-y-4"
      >
        {/* Header with Drag Handle */}
        <div
          {...dragHeaderProps}
          className="flex items-center justify-between pb-4 border-b border-[#EDE9E0] select-none touch-none"
          title="Nắm giữ và kéo để di chuyển popup"
        >
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-[#FAF9F5] border border-[#E6E1D7] text-[#8A9D92] hover:text-[#264939] transition-colors">
              <GripHorizontal className="w-4 h-4" />
            </div>
            <Wallet className="w-5 h-5 text-[#264939] pointer-events-none" />
            <h3 className="font-serif font-extrabold text-lg text-[#264939] pointer-events-none">
              Thông Số Ví Kết Nối
            </h3>
          </div>
          <button
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded-full bg-[#FAF9F5] border border-[#E6E1D7] text-gray-400 hover:text-gray-700 hover:bg-[#E0ECE4] transition-all"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Address Badge Box */}
        <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#E6E1D7] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#8A9D92] uppercase tracking-wider">
              TÀI KHOẢN VÍ ĐANG KẾT NỐI
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm font-extrabold text-[#264939] truncate">
              {shortAddress}
            </span>
            <a
              href={`${ETHERSCAN_BASE_URL}/address/${account}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#264939] font-bold hover:underline shrink-0"
            >
              <span>Etherscan</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="text-[11px] font-mono text-gray-500 break-all bg-white p-2 rounded-lg border border-[#EDE9E0]">
            {account}
          </div>
        </div>

        {/* Parameters Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E6E1D7] space-y-1">
            <div className="flex items-center gap-1.5 text-[#5E7166]">
              <Network className="w-3.5 h-3.5 text-[#264939]" />
              <span className="font-bold text-[11px]">MẠNG LƯỚI</span>
            </div>
            <p className="font-bold text-[#1A2820]">Sepolia Testnet</p>
            <p className="text-[10px] text-gray-500 font-mono">Chain ID: 11155111</p>
          </div>

          <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E6E1D7] space-y-1">
            <div className="flex items-center gap-1.5 text-[#5E7166]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C29B38]" />
              <span className="font-bold text-[11px]">VAI TRÒ VÍ</span>
            </div>
            <p className="font-bold text-[#264939] truncate">{roleTitle || 'Tất cả vai trò'}</p>
            <p className="text-[10px] text-emerald-700 font-medium">Đã xác thực</p>
          </div>

          {/* Accumulated ETH Balance in Smart Contract (Categorized by Role - Hidden for Retailer role) */}
          {!(userRole === 'RETAILER' || userRole === 'COMMERCE') && (
            <div className="col-span-2 bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200/90 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="text-[11px] sm:text-xs font-black text-[#264939] uppercase tracking-wider">
                    {balanceBoxTitle}
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-white text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs shrink-0">
                  {roleLabel}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1 border-t border-emerald-200/60">
                <div className="text-xs text-[#5E7166] font-medium">
                  {roleSubtext}
                </div>
                <div className="text-base font-mono font-black text-[#264939]">
                  {roleBalance} ETH
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action: Disconnect Button */}
        <div className="pt-2 border-t border-[#EDE9E0]">
          <button
            onClick={() => {
              onDisconnect();
              onClose();
            }}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-50 text-red-700 font-bold text-xs hover:bg-red-100 transition-all border border-red-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Ngắt Kết Nối Ví (Disconnect Wallet)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
