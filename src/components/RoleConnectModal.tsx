import React from 'react';
import { X, ShieldCheck, ArrowRight, GripHorizontal, Wallet, Sparkles } from 'lucide-react';
import { useDraggable } from '../hooks/useDraggable';

interface RoleConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoleAndConnect: (roleKey: string) => void;
  isBusy?: boolean;
  clickPos?: { x: number; y: number } | null;
}

export const RoleConnectModal: React.FC<RoleConnectModalProps> = ({
  isOpen,
  onClose,
  onSelectRoleAndConnect,
  clickPos,
  isBusy = false,
}) => {
  const { isDragging, modalStyle, dragHeaderProps } = useDraggable(isOpen, clickPos, { width: 560, height: 500 });

  if (!isOpen) return null;

  // Danh sach cac vai tro tham gia he thong
  const roleOptions = [
    {
      id: 'ADMIN',
      icon: 'ðŸ‘‘',
      title: 'Quáº£n Trá»‹ Há»‡ Thá»‘ng',
      description: 'Chá»§ sá»Ÿ há»¯u há»£p Ä‘á»“ng (Owner). XÃ¡c minh trá»±c tiáº¿p trÃªn Sepolia.',
      badge: 'OWNER',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300'
    },
    {
      id: 'SUPPLY_CHAIN',
      icon: 'ðŸ“¦',
      title: 'CÆ¡ Sá»Ÿ Sáº£n Xuáº¥t',
      description: 'Khai bÃ¡o nguá»“n gá»‘c & khá»Ÿi táº¡o lÃ´ hÃ ng Ä‘áº·c sáº£n OCOP',
      badge: 'ROLE_PRODUCER',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    },
    {
      id: 'INSPECTOR',
      icon: 'ðŸ›¡ï¸',
      title: 'Kiá»ƒm Äá»‹nh ViÃªn OCOP',
      description: 'Tháº©m Ä‘á»‹nh cháº¥t lÆ°á»£ng & cáº¥p chá»©ng nháº­n OCOP 3-5 Sao',
      badge: 'ROLE_INSPECTOR',
      badgeColor: 'bg-amber-100 text-[#8C6D1F] border-amber-300'
    },
    {
      id: 'LOGISTICS',
      icon: 'ðŸšš',
      title: 'ÄÆ¡n Vá»‹ Váº­n Chuyá»ƒn',
      description: 'Ghi nháº­n nháº­t kÃ½ váº­n chuyá»ƒn kho láº¡nh & bÃ n giao',
      badge: 'ROLE_LOGISTICS',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300'
    },
    {
      id: 'COMMERCE',
      icon: 'ðŸª',
      title: 'Äáº¡i LÃ½ BÃ¡n Láº»',
      description: 'Nháº­p kho showroom & niÃªm yáº¿t sáº£n pháº©m OCOP',
      badge: 'ROLE_RETAILER',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300'
    },
    {
      id: 'CUSTOMER',
      icon: 'ðŸ”',
      title: 'KhÃ¡ch HÃ ng / Du KhÃ¡ch',
      description: 'QuÃ©t tem QR tra cá»©u nguá»“n gá»‘c & mua hÃ ng báº±ng ETH',
      badge: 'CUSTOMER',
      badgeColor: 'bg-gray-100 text-gray-700 border-gray-300'
    }
  ];

  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 z-[9999] bg-black/65 backdrop-blur-sm animate-in fade-in duration-200 font-sans ${
        clickPos ? 'overflow-visible' : 'flex items-center justify-center p-3 sm:p-4 overflow-y-auto'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={modalStyle}
        className="bg-white rounded-3xl border border-[#E6E1D7] max-w-xl w-full flex flex-col p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-hidden"
      >
        {/* Modal Header VOI Drag handle giup keo tha linh hoat */}
        <div
          {...dragHeaderProps}
          className="flex items-center justify-between pb-3.5 shrink-0 border-b border-[#EDE9E0] select-none touch-none"
          title="Náº¯m giá»¯ thanh tiÃªu Ä‘á» Ä‘á»ƒ di chuyá»ƒn popup"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-[#FAF9F5] border border-[#E6E1D7] text-[#8A9D92] hover:text-[#264939] transition-colors">
              <GripHorizontal className="w-4 h-4" />
            </div>
            <img
              src="/assets/aistudio/logo-1_df0d933f.png"
              alt="HueLegend Logo"
              className="h-8 sm:h-9 w-auto max-w-[140px] sm:max-w-[170px] object-contain pointer-events-none"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/aistudio/logo_98ef48b3.png';
              }}
            />
            <span className="text-[#CCD8CF] font-light hidden sm:inline">|</span>
            <h3 className="font-serif font-extrabold text-base sm:text-lg text-[#264939] pointer-events-none whitespace-nowrap">
              Káº¿t Ná»‘i VÃ­ MetaMask
            </h3>
          </div>

          <button
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-2 rounded-full bg-[#FAF9F5] border border-[#E6E1D7] text-gray-400 hover:text-gray-700 hover:bg-[#E0ECE4] transition-all min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
            title="ÄÃ³ng popup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subtitle Banner */}
        <div className="pt-3 pb-1 shrink-0 flex items-center justify-between gap-2">
          <p className="text-xs font-sans text-[#5E7166] font-medium">
            Chá»n khu vá»±c lÃ m viá»‡c. Há»‡ thá»‘ng chá»‰ má»Ÿ chá»©c nÄƒng khi vÃ­ cÃ³ quyá»n trÃªn há»£p Ä‘á»“ng:
          </p>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-[#E0ECE4] px-2.5 py-0.5 rounded-full border border-[#CCD8CF] shrink-0">
            <Sparkles className="w-3 h-3 text-[#C29B38]" />
            <span>Sepolia Testnet</span>
          </span>
        </div>

        {/* Form Layout Grid 2 Cot Can Doi */}
        <div className="flex-1 overflow-y-auto my-3 pr-1 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {roleOptions.map((role) => (
              <button
                key={role.id}
                disabled={isBusy}
                data-role-option={role.id}
                onClick={() => onSelectRoleAndConnect(role.id)}
                className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E6E1D7] hover:border-[#264939] hover:bg-[#E0ECE4]/70 transition-all text-left group shadow-2xs relative overflow-hidden active:scale-[0.98] cursor-pointer"
              >
                <div className="text-2xl p-2 bg-white rounded-xl border border-[#E6E1D7] shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
                  {role.icon}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <h4 className="font-serif font-extrabold text-xs sm:text-sm text-[#1A2820] group-hover:text-[#264939] transition-colors">
                      {role.title}
                    </h4>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${role.badgeColor}`}>
                      {role.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5E7166] leading-relaxed">
                    {role.description}
                  </p>
                </div>

                <ArrowRight className="w-4 h-4 text-[#8A9D92] group-hover:text-[#264939] group-hover:translate-x-1 transition-all shrink-0 mt-2" />
              </button>
            ))}
          </div>
        </div>

        {/* Footer Info & Quick Connect Button */}
        <div className="pt-3 border-t border-[#EDE9E0] shrink-0 flex flex-wrap items-center justify-between gap-2 text-[11px] font-sans text-[#5E7166]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#C29B38] shrink-0" />
            <span className="leading-tight">Káº¿t ná»‘i vÃ­ vÃ  kiá»ƒm tra quyá»n; khÃ´ng yÃªu cáº§u kÃ½ Ä‘Äƒng nháº­p.</span>
          </div>

          <button
            onClick={() => onSelectRoleAndConnect('CUSTOMER')}
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#264939] text-white rounded-xl font-bold text-xs hover:bg-[#1c372b] transition-all shadow-2xs cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5 text-[#C29B38]" />
            <span>Káº¿t Ná»‘i KhÃ¡ch HÃ ng</span>
          </button>
        </div>
      </div>
    </div>
  );
};

