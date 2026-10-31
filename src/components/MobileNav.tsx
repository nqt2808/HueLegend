import React from 'react';
import {
  LayoutDashboard,
  QrCode,
  PlusCircle,
  ShieldCheck,
  Truck,
  Store,
  Tag,
  Settings,
  Menu,
  X,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Sparkles
} from 'lucide-react';
import { TabId } from '../lib/access';
import { CONTRACT_ADDRESS, ETHERSCAN_BASE_URL } from '../constants';

interface MobileNavProps {
  activeTab: string;
  allowedTabs: readonly TabId[];
  onTabChange: (tab: string) => void;
  isOpenMobileMenu: boolean;
  onToggleMobileMenu: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  allowedTabs,
  onTabChange,
  isOpenMobileMenu,
  onToggleMobileMenu,
}) => {
  // Danh sach tat ca cac muc dieu huong trong he thong HueLegend
  const navItems = [
    {
      id: 'overview',
      label: 'Tá»•ng Quan Há»‡ Thá»‘ng',
      sublabel: 'Báº£ng Ä‘iá»u khiá»ƒn & thá»‘ng kÃª',
      icon: LayoutDashboard,
    },
    {
      id: 'lookup',
      label: 'Tra Cá»©u Tem QR',
      sublabel: 'XÃ¡c thá»±c & quÃ©t mÃ£ camera',
      icon: QrCode,
    },
    {
      id: 'store',
      label: 'Cá»­a HÃ ng Äáº·c Sáº£n',
      sublabel: 'Mua bÃ¡n sáº£n pháº©m OCOP',
      icon: Store,
    },
    {
      id: 'create-batch',
      label: '1. Táº¡o LÃ´ HÃ ng',
      sublabel: 'BÆ°á»›c 1: Khai bÃ¡o lÃ´ & Ä‘Ã³ng phÃ­',
      icon: PlusCircle,
    },
    {
      id: 'inspector',
      label: '2. Kiá»ƒm Äá»‹nh OCOP',
      sublabel: 'BÆ°á»›c 2: Tháº©m Ä‘á»‹nh & cáº¥p chá»©ng nháº­n',
      icon: ShieldCheck,
    },
    {
      id: 'checkpoint',
      label: '3. Váº­n Chuyá»ƒn',
      sublabel: 'BÆ°á»›c 3: Nháº­t kÃ½ váº­n chuyá»ƒn & kho',
      icon: Truck,
    },
    {
      id: 'retailer',
      label: '4. Quáº£n LÃ½ NiÃªm Yáº¿t',
      sublabel: 'BÆ°á»›c 4: Nháº­p kho & niÃªm yáº¿t',
      icon: Tag,
    },
    {
      id: 'admin',
      label: 'Quáº£n Trá»‹ Há»‡ Thá»‘ng',
      sublabel: 'PhÃ¢n quyá»n RBAC & Ä‘á»•i phÃ­',
      icon: Settings,
    },
  ];

  const filteredNavItems = navItems.filter((item) => allowedTabs.includes(item.id as TabId));
  // Top 4 tab truy cap nhanh cho thanh bottom navigation mobile
  const quickTabs = filteredNavItems.slice(0, 4).map((item) => ({
    ...item,
    label: ({ overview: 'Tá»•ng Quan', store: 'Cá»­a HÃ ng', lookup: 'Tra Cá»©u', 'create-batch': 'Táº¡o LÃ´',
      inspector: 'Kiá»ƒm Äá»‹nh', checkpoint: 'Váº­n Chuyá»ƒn', retailer: 'NiÃªm Yáº¿t', admin: 'Quáº£n Trá»‹' } as Record<string, string>)[item.id],
  }));

  const handleSelectTab = (tabId: string) => {
    onTabChange(tabId);
    if (isOpenMobileMenu) {
      onToggleMobileMenu();
    }
  };

  return (
    <>
      {/* 1. Sticky Bottom Navigation Bar on Mobile Screens (md:hidden) */}
      <nav aria-label="Mobile Bottom Bar" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF9F5]/95 backdrop-blur-md border-t border-[#E6E1D7] px-2 py-1.5 shadow-2xl pb-safe flex items-center justify-around">
        {quickTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              data-nav-id={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-xl transition-all min-h-[44px] ${
                isActive
                  ? 'text-[#264939] font-extrabold bg-[#E0ECE4]'
                  : 'text-[#6B8073] hover:text-[#264939]'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-[#264939]' : ''}`} />
              <span className="text-[10px] mt-0.5 font-sans leading-none">{tab.label}</span>
            </button>
          );
        })}

        {/* Chi hien nut xem them khi con muc ngoai thanh nhanh. */}
        {filteredNavItems.length > quickTabs.length && <button
          onClick={onToggleMobileMenu}
          className={`flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-xl transition-all min-h-[44px] ${
            isOpenMobileMenu
              ? 'text-[#264939] font-extrabold bg-[#E0ECE4]'
              : 'text-[#6B8073] hover:text-[#264939]'
          }`}
          aria-label="Mo Menu Hamburger"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-sans leading-none">Menu</span>
        </button>}
      </nav>

      {/* 2. Slide-Over Off-Canvas Left Side Drawer (Slidebar Hamburger Menu) */}
      {isOpenMobileMenu && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-fade-in">
          {/* Backdrop Overlay - Click outside to close */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onToggleMobileMenu}
            aria-hidden="true"
          />

          {/* Slidebar Drawer Content - Full Left Off-Canvas */}
          <div className="relative z-10 bg-[#FAF9F5] w-80 max-w-[85vw] h-full border-r border-[#E6E1D7] p-5 shadow-2xl flex flex-col justify-between overflow-y-auto animate-slide-in-left">
            <div className="space-y-5">
              {/* Header Slidebar: Logo & Close Button */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E6E1D7]">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/assets/aistudio/logo-1_df0d933f.png"
                    alt="HueLegend Logo"
                    className="h-10 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/aistudio/logo_98ef48b3.png';
                    }}
                  />
                </div>
                <button
                  onClick={onToggleMobileMenu}
                  className="p-2 rounded-full bg-[#E0ECE4] text-[#264939] hover:bg-[#c9dcd0] min-h-[44px] min-w-[44px] flex items-center justify-center transition-all active:scale-95"
                  aria-label="Dong Menu Slidebar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Category List */}
              <div>
                <div className="text-[11px] font-black text-[#6B8073] uppercase tracking-widest px-1 mb-3">
                  DANH Má»¤C CHá»¨C NÄ‚NG Cá» ÄÃ”
                </div>

                <div className="space-y-2">
                  {filteredNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                  data-nav-id={item.id}
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all text-left min-h-[48px] ${
                          isActive
                            ? 'bg-[#E0ECE4] text-[#1c372b] font-extrabold border border-[#CCD8CF] shadow-xs'
                            : 'bg-white text-[#2C3E35] border border-[#E6E1D7] hover:bg-[#EFF3EF]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#264939]' : 'text-[#4A5E52]'}`} />
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold leading-tight">{item.label}</div>
                            <div className="text-xs text-[#708579] font-medium truncate mt-0.5">{item.sublabel}</div>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#264939]' : 'text-[#A0B0A6]'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* OCOP Standard Badge */}
              <div className="bg-gradient-to-br from-[#E0ECE4] to-[#F2F6F3] p-3.5 rounded-2xl border border-[#CCD8CF] space-y-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#264939]">
                  <Sparkles className="w-4 h-4 text-[#C29B38] shrink-0" />
                  <span className="font-serif">TiÃªu Chuáº©n OCOP Huáº¿</span>
                </div>
                <p className="text-[11px] text-[#3B4D43] font-medium leading-relaxed">
                  Minh báº¡ch 100% tá»«ng cháº·ng sáº£n xuáº¥t, kiá»ƒm Ä‘á»‹nh & váº­n chuyá»ƒn trÃªn Sepolia.
                </p>
                <div className="pt-1.5 border-t border-[#CCD8CF]/60 flex items-center justify-between text-[11px] text-[#5E7166]">
                  <div className="flex items-center gap-1 font-bold">
                    <MapPin className="w-3 h-3 text-[#C29B38]" />
                    <span>Thá»«a ThiÃªn Huáº¿</span>
                  </div>
                  <span className="font-extrabold text-[#264939]">Sepolia 100%</span>
                </div>
              </div>
            </div>

            {/* Footer Smart Contract & Ecosystem Info */}
            <div className="pt-4 border-t border-[#E6E1D7] mt-5 space-y-2 shrink-0">
              <div className="bg-[#264939] text-white p-3 rounded-2xl flex items-center justify-between text-xs shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-[#C29B38] shrink-0" />
                  <span className="font-bold truncate">Smart Contract</span>
                </div>
                <a
                  href={`${ETHERSCAN_BASE_URL}/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-bold text-[#C29B38] underline flex items-center gap-1 shrink-0 ml-1"
                >
                  <span>{CONTRACT_ADDRESS.slice(0, 6)}...</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="text-center text-[10px] text-[#708579] font-medium">
                ECO2432 HueLegend Â© 2026 Speciality Traceability
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


