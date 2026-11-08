import React, { useState } from 'react';
import { Batch } from '../types';
import {
  Package,
  ShieldCheck,
  Store,
  Clock,
  Search,
  Filter,
  ArrowRight,
  QrCode,
  Sparkles,
  MapPin,
  Calendar,
  Building2,
  PlusCircle
} from 'lucide-react';

interface OverviewTabProps {
  batches: Record<string, Batch>;
  hasRoleDashboard?: boolean;
  producerStakeBalance?: string;
  canCreateBatch: boolean;
  canUseLookupMenu: boolean;
  onConnectWallet: () => void;
  isConnected: boolean;
  onNavigateTab: (tab: string, batchCodeSelect?: string) => void;
  onSelectBatchForQR: (batchCode: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  batches,
  hasRoleDashboard = false,
  onNavigateTab,
  onSelectBatchForQR,
  canCreateBatch,
  canUseLookupMenu,
  onConnectWallet,
  isConnected,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVerified, setFilterVerified] = useState<'ALL' | 'VERIFIED' | 'PENDING'>('ALL');

  const batchList = Object.values(batches);
  const totalBatches = batchList.length;
  const verifiedCount = batchList.filter((b) => b.isVerified).length;
  const verifiedRatio = totalBatches > 0 ? Math.round((verifiedCount / totalBatches) * 100) : 0;

  // Dem so dai ly phan phoi ghi nhan tren he thong from checkpoints / listings
  const recordedAgentsSet = new Set<string>();
  batchList.forEach((b) => {
    b.checkpoints?.forEach((chk) => {
      if (
        chk.role === 'ROLE_RETAILER' ||
        chk.role === 'RETAILER' ||
        chk.roleTitle?.toLowerCase().includes('đại lý') ||
        chk.stepName?.toLowerCase().includes('bán lẻ') ||
        chk.stepName?.toLowerCase().includes('đại lý') ||
        chk.action?.toLowerCase().includes('niêm yết')
      ) {
        if (chk.location) recordedAgentsSet.add(chk.location.trim().toLowerCase());
        else if (chk.recorder) recordedAgentsSet.add(chk.recorder.trim().toLowerCase());
      }
    });
  });
  const totalRecordedAgents = recordedAgentsSet.size;

  const filteredBatches = batchList.filter((batch) => {
    const matchesSearch =
      batch.batchCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.origin.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterVerified === 'VERIFIED') return matchesSearch && batch.isVerified;
    if (filterVerified === 'PENDING') return matchesSearch && !batch.isVerified;
    return matchesSearch;
  });

  return (
    <section className="space-y-5 font-sans" data-testid="overview-batches">
      {/* Top Banner with Imperial Hue Motif */}
      {!hasRoleDashboard ? (
      <div className="relative overflow-hidden rounded-[28px] border border-[#295543] bg-gradient-to-r from-[#1C4836] via-[#1D4938] to-[#183729] p-6 text-white shadow-[0_15px_35px_-25px_rgba(21,62,45,.8)] sm:p-8">
        <img
          src="/assets/hue_landscape_banner.png"
          alt="Huế Landscape"
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 object-cover opacity-[0.14] mix-blend-screen"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E0C382]/25 bg-[#E0C382]/10 px-3 py-1.5 text-[10px] font-bold tracking-wide text-[#E8D09C] sm:text-xs">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>ĐẶC SẢN HUẾ • TRUY XUẤT NGUỒN GỐC</span>
          </div>

          <h1 className="max-w-xl text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
            Tinh hoa xứ Huế, minh bạch từng hành trình
          </h1>

          <p className="max-w-lg text-sm leading-6 text-white/75">
            Khám phá các lô đặc sản và theo dõi thông tin nguồn gốc, kiểm định OCOP được ghi nhận trên Ethereum Sepolia.
          </p>

          <div className="flex flex-wrap gap-2.5 pt-2">
            <button
              onClick={() => onNavigateTab(canCreateBatch ? 'create-batch' : 'store')}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#E1BE77] px-5 py-2.5 text-xs font-extrabold text-[#244132] transition hover:bg-[#F0D49A]"
            >
              <span>{canCreateBatch ? 'Tạo lô hàng mới' : 'Khám phá cửa hàng'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => canUseLookupMenu ? onNavigateTab('lookup') : onConnectWallet()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-white/20"
            >
              <QrCode className="w-4 h-4" />
              <span>{canUseLookupMenu ? 'Tra cứu mã QR' : isConnected ? 'Kiểm tra quyền ví' : 'Kết nối MetaMask'}</span>
            </button>
          </div>
        </div>
      </div>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
          <div>
            <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#799385]">Danh mục dữ liệu</div>
            <h2 className="text-xl font-extrabold tracking-tight text-[#1F4332] sm:text-2xl">Danh sách lô hàng</h2>
            <p className="mt-1 text-xs text-[#708278]">Tra cứu sản phẩm, theo dõi các chặng và xem tem QR.</p>
          </div>
          <span className="rounded-full border border-[#D9E4DA] bg-white px-3 py-1.5 text-[11px] font-bold text-[#527361]">{totalBatches} lô trên hệ thống</span>
        </div>
      )}

      {!hasRoleDashboard && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#D9E4DA] bg-[#F2F8F0] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-serif text-base font-extrabold text-[#264939]">Khám phá danh mục 15 đặc sản Huế</p>
            <p className="text-xs text-[#5E7166]">Giới thiệu sản phẩm từ CSV tham khảo; số lô on-chain và chứng nhận OCOP được thống kê riêng bên dưới.</p>
          </div>
          <button
            onClick={() => onNavigateTab('store')}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#264939] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1c372b]"
          >
            Xem 15 đặc sản <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      {!hasRoleDashboard && <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E6E1D7] shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#E0ECE4] text-[#264939] flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-sans font-bold text-[#8A9D92] uppercase tracking-wider">TỔNG LÔ HÀNG ON-CHAIN</div>
            <div className="text-2xl font-serif font-extrabold text-[#264939] mt-0.5">{totalBatches}</div>
            <div className="text-[11px] font-sans text-[#5E7166]">Lô đặc sản từ Sepolia</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E6E1D7] shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#C29B38] flex items-center justify-center shrink-0 border border-amber-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-sans font-bold text-[#8A9D92] uppercase tracking-wider">XÁC NHẬN ĐẠT OCOP</div>
            <div className="text-2xl font-serif font-extrabold text-[#C29B38] mt-0.5">
              {verifiedCount} <span className="text-xs font-sans font-normal text-gray-500">({verifiedRatio}%)</span>
            </div>
            <div className="text-[11px] font-sans text-[#5E7166]">Đã kiểm định chất lượng</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E6E1D7] shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-sans font-bold text-[#8A9D92] uppercase tracking-wider">SỐ ĐẠI LÝ GHI NHẬN</div>
            <div className="text-2xl font-serif font-extrabold text-[#1A2820] mt-0.5">{totalRecordedAgents}</div>
            <div className="text-[11px] font-sans text-[#5E7166]">Đại lý phân phối OCOP</div>
          </div>
        </div>
      </div>}

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E6E8E1] bg-white p-3.5 shadow-[0_5px_20px_-20px_rgba(20,51,37,.25)] sm:p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            aria-label="Tìm kiếm lô hàng"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm mã lô, tên đặc sản hoặc địa danh..."
            className="w-full rounded-xl border border-[#E0E8E1] bg-[#F9FAF7] py-3 pl-10 pr-4 text-xs text-[#254636] outline-none transition placeholder:text-[#99A59D] focus:border-[#5D9675] focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <Filter className="h-4 w-4 shrink-0 text-[#6C8073]" />
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-xl border border-[#E9EDE6] bg-[#F7F9F5] p-1 xl:flex-none">
            <button
              onClick={() => setFilterVerified('ALL')}
              className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold transition-all ${
                filterVerified === 'ALL'
                  ? 'bg-[#264939] text-white shadow-2xs'
                  : 'text-[#5E7166] hover:text-[#264939]'
              }`}
            >
              Tất cả ({totalBatches})
            </button>
            <button
              onClick={() => setFilterVerified('VERIFIED')}
              className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold transition-all ${
                filterVerified === 'VERIFIED'
                  ? 'bg-[#C29B38] text-white shadow-2xs'
                  : 'text-[#5E7166] hover:text-[#264939]'
              }`}
            >
              Đã xác minh ({verifiedCount})
            </button>
            <button
              onClick={() => setFilterVerified('PENDING')}
              className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold transition-all ${
                filterVerified === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-[#5E7166] hover:text-[#264939]'
              }`}
            >
              Chờ kiểm định ({totalBatches - verifiedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Batch Grid Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filteredBatches.map((batch) => {
          const checkpointCount = batch.checkpoints?.length || 0;
          const createdDate = new Date(batch.createdAt * 1000).toLocaleDateString('vi-VN');

          return (
            <div
              key={batch.batchCode}
              className="group flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-[#E1E8E1] bg-white p-5 shadow-[0_8px_26px_-24px_rgba(20,51,37,.5)] transition hover:-translate-y-0.5 hover:border-[#C2D8C6] hover:shadow-[0_18px_32px_-25px_rgba(20,51,37,.35)] sm:p-6"
            >
              <div>
                {/* Card Top Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EDF0EB] pb-4">
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-lg border border-[#D4E6D9] bg-[#ECF5EE] px-2.5 py-1 font-mono text-[11px] font-bold text-[#315F43]">
                      {batch.batchCode}
                    </span>
                    <h3 className="mt-2.5 text-base font-extrabold leading-snug text-[#233F31] transition-colors group-hover:text-[#38764E] sm:text-lg">
                      {batch.productName}
                    </h3>
                  </div>

                  {batch.isVerified ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#C29B38]" />
                      <span>Đã xác minh</span>
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>Chờ kiểm định</span>
                    </span>
                  )}
                </div>

                {/* Info Metadata */}
                <div className="space-y-2.5 py-4 text-xs text-[#52695A]">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#5E7166] shrink-0" />
                    <span className="truncate">{batch.origin}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-[#5E7166] shrink-0" />
                    <span className="font-medium">Tiêu chuẩn: {batch.ocopStandard || 'Đang cập nhật'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#5E7166] shrink-0" />
                    <span>Khởi tạo: {createdDate}</span>
                  </div>
                </div>

                {/* Progress Checkpoint Pill */}
                <div className="rounded-xl border border-[#E6EDE5] bg-[#F7FAF6] p-3.5 text-xs">
                  <div className="flex items-center justify-between text-[#5E7166] font-semibold mb-1">
                    <span>Số chặng ghi nhận:</span>
                    <span className="font-bold text-[#264939]">{checkpointCount} chặng</span>
                  </div>
                  <div className="text-[11px] text-[#8A9D92] truncate">
                    Giai đoạn hiện tại: <span className="font-bold text-[#1A2820]">{batch.currentStage || 'Xưởng sản xuất'}</span>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#EDF0EB] pt-4">
                <button
                  onClick={() => onSelectBatchForQR(batch.batchCode)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-[#356F4C] transition hover:bg-[#EAF4EC]"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Xem tem QR</span>
                </button>

                <button
                  onClick={() => onNavigateTab('lookup', batch.batchCode)}
                  className="inline-flex min-h-9 items-center gap-1 rounded-xl bg-[#24533A] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#193B2A]"
                >
                  <span>Xem chi tiết</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State when no batches are found or contract is empty */}
      {filteredBatches.length === 0 && (
        <div className="space-y-4 rounded-2xl border border-dashed border-[#D4E4D7] bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F6F0]"><Package className="h-7 w-7 text-[#7EA18A]" /></div>
          <h3 className="text-lg font-extrabold text-[#1F4332]">
            {totalBatches === 0 ? 'Chưa có lô hàng nào' : 'Không tìm thấy lô hàng phù hợp'}
          </h3>
          <p className="mx-auto max-w-md text-xs leading-6 text-[#738578]">
            {totalBatches > 0 ? 'Hãy thử tên sản phẩm khác hoặc đổi bộ lọc trạng thái.' : canCreateBatch ? 'Bạn có thể bắt đầu bằng việc tạo lô hàng đã xác minh quyền trên Sepolia.' : 'Dữ liệu sẽ được hiển thị khi có lô hàng mới trên mạng Sepolia.'}
          </p>
          <button
            onClick={() => onNavigateTab(canCreateBatch ? 'create-batch' : 'store')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#24533A] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#193B2A]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{canCreateBatch ? 'Tạo lô hàng mới' : 'Khám phá cửa hàng'}</span>
          </button>
        </div>
      )}
    </section>
  );
};
