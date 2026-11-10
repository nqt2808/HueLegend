import React from 'react';
import { X, ExternalLink, Download, Smartphone, ShieldAlert, RefreshCw } from 'lucide-react';
import { useDraggable } from '../hooks/useDraggable';

interface MobileMetaMaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  deepLinkUrl: string;
  currentAccount?: string | null;
  onSyncFromDesktop?: () => void;
}

export const MobileMetaMaskModal: React.FC<MobileMetaMaskModalProps> = ({
  isOpen,
  onClose,
  deepLinkUrl,
  currentAccount,
  onSyncFromDesktop,
}) => {
  const { position, isDragging, dragHeaderProps } = useDraggable(isOpen);

  if (!isOpen) return null;

  const handleOpenMetaMaskApp = () => {
    // Dam bao Deep Link chuan khong bi lặp giao thức https://
    const cleanDeepLink = deepLinkUrl.includes('metamask.app.link/dapp/')
      ? deepLinkUrl
      : `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}${window.location.search}`;
    window.location.href = cleanDeepLink;
  };

  const handleDownloadMetaMask = () => {
    // Mo trang download MetaMask chinh thuc
    window.open('https://metamask.io/download/', '_blank', 'noopener,noreferrer');
  };

  const handleSyncDesktop = () => {
    if (onSyncFromDesktop) {
      onSyncFromDesktop();
    }
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200 font-sans overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.05s ease-out',
        }}
        className="bg-white rounded-3xl border border-[#E6E1D7] max-w-md w-full p-5 sm:p-6 shadow-2xl relative overflow-hidden my-auto"
      >
        {/* Header drag bar */}
        <div
          {...dragHeaderProps}
          className="flex items-center justify-between pb-3.5 border-b border-[#EDE9E0] select-none touch-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#E0ECE4] text-[#264939]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-extrabold text-base text-[#264939]">
                Kết Nối Ví & Liên Kết Máy Tính
              </h3>
              <p className="text-[11px] text-[#5E7166]">Ứng dụng di động Web3 Sepolia</p>
            </div>
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

        {/* Content body */}
        <div className="py-4 space-y-4">
          <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#E6E1D7] flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#C29B38] shrink-0 mt-0.5" />
            <div className="text-xs text-[#2C3E35] leading-relaxed">
              Trình duyệt di động thông thường (Safari, Chrome) chưa tích hợp sẵn MetaMask Web3.
              Bạn có thể mở qua <strong>App MetaMask</strong> hoặc chọn <strong>Đồng bộ từ Máy Tính</strong> để liên kết ngay với ví đã mở ở máy tính.
            </div>
          </div>

          <div className="space-y-2.5">
            {/* Nut Dong bo truc tiep tu May Tinh */}
            <button
              onClick={handleSyncDesktop}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#E0ECE4] text-[#264939] font-extrabold text-xs hover:bg-[#c9dcd0] transition-all shadow-xs border border-[#CCD8CF] active:scale-98"
            >
              <RefreshCw className="w-4 h-4 text-[#264939] animate-spin-slow" />
              <span>Đồng Bộ Ví & Quyền Từ Máy Tính (Desktop Live Sync)</span>
            </button>

            <button
              onClick={handleOpenMetaMaskApp}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#264939] text-white font-extrabold text-sm hover:bg-[#1c372b] transition-all shadow-md active:scale-98"
            >
              <ExternalLink className="w-4 h-4 text-[#C29B38]" />
              <span>Mở Trực Tiếp Trên App MetaMask</span>
            </button>

            <button
              onClick={handleDownloadMetaMask}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white border border-[#C29B38] text-[#8C6D1F] font-bold text-xs hover:bg-[#FAF9F5] transition-all shadow-2xs active:scale-98"
            >
              <Download className="w-4 h-4 text-[#C29B38]" />
              <span>Chưa Cài App? Tải MetaMask App Ngay</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-[#EDE9E0] text-center text-[10px] font-sans text-[#8A9D92]">
          Hỗ trợ đồng bộ tự động 2 chiều giữa thiết bị Di Động và Máy Tính.
        </div>
      </div>
    </div>
  );
};

