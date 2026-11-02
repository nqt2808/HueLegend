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
import { CONTRACT_ADDRESS, ETHERSCAN_BASE_URL } from '../constants';

interface SidebarProps {
  activeTab: string;
  userRole?: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, userRole = 'ALL', onTabChange }) => {
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
      sublabel: 'Mua hàng bằng Sepolia ETH',
      icon: Store,
    },
    {
      id: 'create-batch',
      label: '1. Tạo Lô Hàng',
      sublabel: 'Bước 1: Khai báo lô & trả phí thẩm định',
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
      sublabel: 'Bước 4: Nhập kho & niêm yết bán lẻ',
      icon: Tag,
    },
    {
      id: 'admin',
      label: 'Quản Trị Hệ Thống',
      sublabel: 'Phân quyền RBAC & đổi phí',
      icon: Settings,
    },
  ];

  // Loc danh sach menu theo vai tro (RBAC) khi da ket noi vi, hoac hien thi day du khi chua ket noi (ALL)
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
    // Khi chua ket noi vi (ALL) hoac khi Dang nhap bang vi Admin (ADMIN), hien thi DAY DU 8 CHUC NANG
    return true;
  });

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
            CHỨC NĂNG QUẢN TRỊ
          </div>

          <nav className="flex flex-col gap-2">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
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
            <span className="font-serif text-sm">Tiêu Chuẩn OCOP Huế</span>
          </div>

          <p className="text-xs text-[#3B4D43] font-medium leading-relaxed">
            Số hóa minh bạch 100% từng chặng chăn nuôi, chế biến và lưu kho trên Sepolia Testnet.
          </p>

          <div className="pt-2 border-t border-[#CCD8CF]/60 flex items-center justify-between text-xs text-[#5E7166]">
            <div className="flex items-center gap-1 font-bold">
              <MapPin className="w-3.5 h-3.5 text-[#C29B38]" />
              <span>Thừa Thiên Huế</span>
            </div>
            <span className="font-extrabold text-[#264939]">Sepolia 100%</span>
          </div>
        </div>

        {/* Smart Contract Card */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#E6E1D7] space-y-1.5 shadow-2xs">
          <div className="text-xs font-extrabold text-[#6B8073] uppercase tracking-wider flex items-center justify-between">
            <span>SMART CONTRACT</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <a
            href={`${ETHERSCAN_BASE_URL}/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono font-extrabold text-[#264939] hover:underline flex items-center justify-between"
          >
            <span className="truncate">{CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-4)}</span>
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
            Truy xuất Nguồn gốc Đặc sản Cố Đô
          </p>
        </div>
      </div>
    </aside>
  );
};
