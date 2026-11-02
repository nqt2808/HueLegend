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
  Sparkles,
  RefreshCw,
  Wallet
} from 'lucide-react';
import { CONTRACT_ADDRESS, ETHERSCAN_BASE_URL } from '../constants';

interface MobileNavProps {
  activeTab: string;
  userRole?: string;
  onTabChange: (tab: string) => void;
  isOpenMobileMenu: boolean;
  onToggleMobileMenu: () => void;
  currentAccount?: string | null;
  onConnectWallet?: () => void;
  onSyncDesktop?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  userRole = 'ALL',
  onTabChange,
  isOpenMobileMenu,
  onToggleMobileMenu,
  currentAccount,
  onConnectWallet,
  onSyncDesktop
}) => {
  // 1. Danh sach tat ca 8 danh muc chuc nang chinh cua he thong dong bo 1:1 voi Desktop
  const navItems = [
    {
      id: 'overview',
      label: 'Tổng Quan Hệ Thống',
      sublabel: 'Bảng điều khiển & thống kê',
      icon: LayoutDashboard,
    },
    {
      id: 'lookup',
      label: 'Tra Cứu Tem QR',
      sublabel: 'Xác thực & quét mã camera',
      icon: QrCode,
    },
    {
      id: 'store',
      label: 'Cửa Hàng Đặc Sản',
      sublabel: 'Mua bán sản phẩm OCOP',
      icon: Store,
    },
    {
      id: 'create-batch',
      label: '1. Tạo Lô Hàng',
      sublabel: 'Bước 1: Khai báo lô & đóng phí',
      icon: PlusCircle,
    },
    {
      id: 'inspector',
      label: '2. Kiểm Định OCOP',
      sublabel: 'Bước 2: Thẩm định & cấp chứng nhận',
      icon: ShieldCheck,
    },
    {
      id: 'checkpoint',
      label: '3. Vận Chuyển',
      sublabel: 'Bước 3: Nhật ký vận chuyển & kho',
      icon: Truck,
    },
    {
      id: 'retailer',
      label: '4. Quản Lý Niêm Yết',
      sublabel: 'Bước 4: Nhập kho & niêm yết',
      icon: Tag,
    },
    {
      id: 'admin',
      label: 'Quản Trị Hệ Thống',
      sublabel: 'Phân quyền RBAC & đổi phí',
      icon: Settings,
    },
  ];

  // 2. Loc menu theo vai tro phan quyen RBAC cua tai khoan dang ket noi
  const filteredNavItems = navItems.filter((item) => {
    if (userRole === 'INSPECTOR') {
      // Kiem dinh vien OCOP: Tong Quan He Thong, Tra Cuu Tem QR, Cua hang dac san, Kiem Dinh OCOP
      return ['overview', 'lookup', 'store', 'inspector'].includes(item.id);
    }
    if (userRole === 'LOGISTICS') {
      // Don vi van chuyen: Tong Quan He Thong, Tra Cuu Tem QR, Cua hang dac san, Van Chuyen
      return ['overview', 'lookup', 'store', 'checkpoint'].includes(item.id);
    }
    if (userRole === 'RETAILER' || userRole === 'COMMERCE') {
      // Dai ly ban le: Tong Quan He Thong, Tra Cuu Tem QR, Cua hang dac san, Quan Ly Niem Yet
      return ['overview', 'lookup', 'store', 'retailer'].includes(item.id);
    }
    if (userRole === 'PRODUCER' || userRole === 'SUPPLY_CHAIN') {
      // Co so san xuat: Tong Quan He Thong, Tra Cuu Tem QR, Cua hang dac san, Tao Lo Hang
      return ['overview', 'lookup', 'store', 'create-batch'].includes(item.id);
    }
    if (userRole === 'CUSTOMER') {
      return ['overview', 'lookup', 'store'].includes(item.id);
    }
    // Mac dinh khi chua chon vai tro hoac ADMIN thi hien thi day du 8 chuc nang
    return true;
  });

  // 3. Top quick tabs cho thanh dieu huong bottom bar
  const allQuickTabs = [
    { id: 'overview', label: 'Tổng Quan', icon: LayoutDashboard },
    { id: 'lookup', label: 'Tra Cứu', icon: QrCode },
    { id: 'store', label: 'Cửa Hàng', icon: Store },
    { id: 'create-batch', label: 'Tạo Lô', icon: PlusCircle },
    { id: 'inspector', label: 'Kiểm Định', icon: ShieldCheck },
    { id: 'checkpoint', label: 'Vận Chuyển', icon: Truck },
    { id: 'retailer', label: 'Niêm Yết', icon: Tag },
    { id: 'admin', label: 'Quản Trị', icon: Settings },
  ];

  // Dong bo tab dang hoat dong tren Desktop vao thanh Bottom Bar Mobile
  const allowedQuickTabs = allQuickTabs.filter((tab) => filteredNavItems.some((item) => item.id === tab.id));
  const hasActiveTabInTop3 = allowedQuickTabs.slice(0, 3).some((t) => t.id === activeTab);
  let quickTabs = allowedQuickTabs.slice(0, 4);
  if (!hasActiveTabInTop3) {
    const activeObj = allowedQuickTabs.find((t) => t.id === activeTab);
    if (activeObj) {
      quickTabs = [...allowedQuickTabs.slice(0, 3), activeObj];
    }
  }

  const handleSelectTab = (tabId: string) => {
    onTabChange(tabId);
    if (isOpenMobileMenu) {
      onToggleMobileMenu();
    }
  };

  const shortAddress = currentAccount
    ? `${currentAccount.substring(0, 6)}...${currentAccount.substring(currentAccount.length - 4)}`
    : 'Chưa kết nối ví';

  return (
    <>
      {/* Thanh dieu huong Bottom Bar tren thiet bi di dong */}
      <nav aria-label="Mobile Bottom Bar" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF9F5]/95 backdrop-blur-md border-t border-[#E6E1D7] px-2 py-1.5 shadow-2xl pb-safe flex items-center justify-around">
        {quickTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
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

        {/* Nut mo Slidebar Menu Hamburger */}
        <button
          onClick={onToggleMobileMenu}
          className={`flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-xl transition-all min-h-[44px] ${
            isOpenMobileMenu
              ? 'text-[#264939] font-extrabold bg-[#E0ECE4]'
              : 'text-[#6B8073] hover:text-[#264939]'
          }`}
          aria-label="Mo Menu Hamburger"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-sans leading-none">Slidebar</span>
        </button>
      </nav>

      {/* Off-canvas Left Side Drawer Menu */}
      {isOpenMobileMenu && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-fade-in">
          {/* Lop phu nén background - Click de dong */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onToggleMobileMenu}
            aria-hidden="true"
          />

          {/* Noi dung Slidebar Menu */}
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

              {/* Tag thong tin va nut Dong Bo Ngay voi May Tinh */}
              <div className="bg-[#E0ECE4]/90 p-3 rounded-2xl border border-[#CCD8CF] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-extrabold text-[#264939] text-xs">LIÊN KẾT MÁY TÍNH</span>
                  </div>
                  {/* Nut Dong Bo Ngay chuẩn theo giao dien đai ly */}
                  <button
                    onClick={() => {
                      if (onSyncDesktop) onSyncDesktop();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D6E6DC] border border-[#B8D3C3] text-[#264939] font-bold text-xs hover:bg-[#c3dccf] transition-all active:scale-95 shadow-2xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#264939] animate-spin-slow" />
                    <span>Đồng Bộ Ngay</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#CCD8CF]/60 text-xs">
                  <span className="text-[#5E7166] font-medium">Địa chỉ ví:</span>
                  <span className="font-mono font-bold text-[#264939]">{shortAddress}</span>
                </div>

                {onConnectWallet && !currentAccount && (
                  <button
                    onClick={() => {
                      onToggleMobileMenu();
                      onConnectWallet();
                    }}
                    className="w-full mt-1 py-2 px-3 rounded-xl bg-[#264939] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs hover:bg-[#1c372b] transition-all"
                  >
                    <Wallet className="w-4 h-4 text-[#C29B38]" />
                    <span>Kết Nối Ví MetaMask</span>
                  </button>
                )}
              </div>

              {/* Danh muc chuc nang */}
              <div>
                <div className="text-[11px] font-black text-[#6B8073] uppercase tracking-widest px-1 mb-3">
                  DANH MỤC CHỨC NĂNG CỐ ĐÔ
                </div>

                <div className="space-y-2">
                  {filteredNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
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

              {/* Badge Tieu Chuan OCOP Hue */}
              <div className="bg-gradient-to-br from-[#E0ECE4] to-[#F2F6F3] p-3.5 rounded-2xl border border-[#CCD8CF] space-y-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#264939]">
                  <Sparkles className="w-4 h-4 text-[#C29B38] shrink-0" />
                  <span className="font-serif">Tiêu Chuẩn OCOP Huế</span>
                </div>
                <p className="text-[11px] text-[#3B4D43] font-medium leading-relaxed">
                  Minh bạch 100% từng chặng sản xuất, kiểm định & vận chuyển trên Sepolia.
                </p>
                <div className="pt-1.5 border-t border-[#CCD8CF]/60 flex items-center justify-between text-[11px] text-[#5E7166]">
                  <div className="flex items-center gap-1 font-bold">
                    <MapPin className="w-3 h-3 text-[#C29B38]" />
                    <span>Thừa Thiên Huế</span>
                  </div>
                  <span className="font-extrabold text-[#264939]">Sepolia 100%</span>
                </div>
              </div>
            </div>

            {/* Footer Smart Contract Info */}
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
                ECO2432 HueLegend © 2026 Speciality Traceability
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
