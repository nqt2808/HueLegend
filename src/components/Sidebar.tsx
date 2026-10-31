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
  Award,
  Sparkles,
  ExternalLink,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { TabId } from '../lib/access';
import { CONTRACT_ADDRESS, ETHERSCAN_BASE_URL, OWNER_WALLET } from '../constants';

interface SidebarProps {
  activeTab: string;
  allowedTabs: readonly TabId[];
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, allowedTabs, onTabChange }) => {
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
      sublabel: 'Mua hÃ ng báº±ng Sepolia ETH',
      icon: Store,
    },
    {
      id: 'create-batch',
      label: '1. Táº¡o LÃ´ HÃ ng',
      sublabel: 'BÆ°á»›c 1: Khai bÃ¡o lÃ´ & tráº£ phÃ­ tháº©m Ä‘á»‹nh',
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
      sublabel: 'BÆ°á»›c 4: Nháº­p kho & niÃªm yáº¿t bÃ¡n láº»',
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

  return (
    <aside className="hidden md:flex w-80 bg-[#FAF9F5]/92 backdrop-blur-md border-r border-[#E6E1D7]/80 flex-col justify-between p-5 h-screen sticky top-0 shrink-0 overflow-y-auto font-sans shadow-xs">
      {/* Background Subtle Watermark */}
      <img
        src="/assets/lotus_transparent.png"
        alt=""
        aria-hidden="true"
        className="absolute -bottom-10 -left-10 w-56 h-56 opacity-10 pointer-events-none select-none object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />

      <div className="space-y-6">
        {/* Brand Header - Prominently Enlarged Logo Image */}
        <div className="pb-4 border-b border-[#E6E1D7] flex items-center justify-center">
          <img
            src="/assets/aistudio/logo-1_df0d933f.png"
            alt="HueLegend Logo - Tinh Hoa Hue"
            className="w-full h-auto max-h-28 sm:max-h-32 object-contain hover:scale-[1.03] transition-transform duration-200 cursor-pointer drop-shadow-xs"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/aistudio/logo_98ef48b3.png';
            }}
          />
        </div>

        {/* Navigation Section */}
        <div>
          <div className="text-xs font-black text-[#6B8073] uppercase tracking-widest px-2 mb-2.5">
            CHá»¨C NÄ‚NG Há»† THá»NG
          </div>

          <nav aria-label="Äiá»u hÆ°á»›ng chÃ­nh" className="flex flex-col gap-2">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  data-nav-id={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-start gap-3.5 p-3 rounded-2xl transition-all text-left group relative ${
                    isActive
                      ? 'bg-[#E0ECE4] text-[#1c372b] font-bold border border-[#CCD8CF] shadow-xs'
                      : 'text-[#2C3E35] hover:bg-[#EFF3EF] hover:text-[#264939]'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mt-0.5 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-[#264939]' : 'text-[#4A5E52]'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-extrabold leading-tight">{item.label}</div>
                    <div className="text-xs text-[#708579] font-medium truncate mt-0.5">
                      {item.sublabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Info Widget: OCOP Standard */}
        <div className="bg-gradient-to-br from-[#E0ECE4]/90 to-[#F2F6F3] p-4 rounded-2xl border border-[#CCD8CF] space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-extrabold text-[#264939]">
            <Sparkles className="w-4 h-4 text-[#C29B38] shrink-0" />
            <span className="font-serif text-sm">TiÃªu Chuáº©n OCOP Huáº¿</span>
          </div>

          <p className="text-xs text-[#3B4D43] font-medium leading-relaxed">
            Sá»‘ hÃ³a minh báº¡ch 100% tá»«ng cháº·ng chÄƒn nuÃ´i, cháº¿ biáº¿n vÃ  lÆ°u kho trÃªn Sepolia Testnet.
          </p>

          <div className="pt-2 border-t border-[#CCD8CF]/60 flex items-center justify-between text-xs text-[#5E7166]">
            <div className="flex items-center gap-1 font-bold">
              <MapPin className="w-3.5 h-3.5 text-[#C29B38]" />
              <span>Thá»«a ThiÃªn Huáº¿</span>
            </div>
            <span className="font-extrabold text-[#264939]">Sepolia 100%</span>
          </div>
        </div>

        {/* Admin / Owner Wallet Card */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#E6E1D7] space-y-1.5 shadow-2xs">
          <div className="text-xs font-extrabold text-[#6B8073] uppercase tracking-wider flex items-center justify-between">
            <span>VÍ ADMIN / OWNER</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>

          <a
            href={`${ETHERSCAN_BASE_URL}/address/${OWNER_WALLET}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono font-extrabold text-[#264939] hover:underline flex items-center justify-between"
          >
            <span className="truncate">
              {OWNER_WALLET.slice(0, 10)}...{OWNER_WALLET.slice(-4)}
            </span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-1 text-[#C29B38]" />
          </a>
        </div>
      </div>

      {/* Footer Branding Card */}
      <div className="pt-3 border-t border-[#E6E1D7] mt-5 shrink-0">
        <div className="bg-[#264939] text-white p-3.5 rounded-2xl shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs font-extrabold text-[#C29B38] uppercase tracking-wider">
            <span>ECO2432 HueLegend</span>
            <span className="bg-white/15 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-emerald-200">v1.0.0</span>
          </div>
          <p className="text-xs text-emerald-100 font-bold leading-snug">
            Truy xuáº¥t Nguá»“n gá»‘c Äáº·c sáº£n Cá»‘ ÄÃ´
          </p>
        </div>
      </div>
    </aside>
  );
};


