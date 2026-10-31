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
    <div className="space-y-6">
      {/* Top Banner with Imperial Hue Motif */}
      <div className="relative bg-gradient-to-r from-[#264939] via-[#1c372b] to-[#12251c] text-white rounded-3xl p-5 sm:p-8 shadow-xl overflow-hidden border border-[#CCD8CF]/20">
        <img
          src="/assets/hue_landscape_banner.png"
          alt="Huế Landscape"
          className="absolute right-0 top-0 bottom-0 w-1/2 object-cover opacity-20 pointer-events-none mix-blend-overlay"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C29B38]/20 text-[#C29B38] text-[11px] sm:text-xs font-sans font-bold border border-[#C29B38]/30">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="tracking-wide">QUẢN TRỊ & TRUY XUẤT NGUỒN GỐC ĐẶC SẢN CỐ ĐÔ</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-extrabold tracking-tight leading-tight text-white">
            Hệ Thống Truy Xuất Nguồn Gốc Đặc Sản Huế
          </h1>

          <p className="text-emerald-100/90 text-sm font-sans leading-relaxed">
            Số hóa minh bạch 100% từng chặng chăn nuôi, chế biến, vận chuyển kho lạnh và phân phối OCOP trên Ethereum Sepolia Testnet.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigateTab(canCreateBatch ? 'create-batch' : 'store')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C29B38] text-white font-sans font-bold text-xs hover:bg-[#8C6D1F] transition-all shadow-md"
            >
              <span>{canCreateBatch ? '+ Tạo Lô Hàng Mới On-Chain' : 'Khám Phá Cửa Hàng'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => canUseLookupMenu ? onNavigateTab('lookup') : onConnectWallet()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white font-sans font-bold text-xs hover:bg-white/20 transition-all border border-white/20"
            >
              <QrCode className="w-4 h-4" />
              <span>{canUseLookupMenu ? 'Tra Cứu / Quét Mã QR' : isConnected ? 'Kiểm Tra Quyền Ví' : 'Kết Nối Ví MetaMask'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E6E1D7] shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Mã lô, Tên đặc sản, hoặc Địa danh..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E6E1D7] text-xs font-sans focus:outline-none focus:border-[#264939] bg-[#FAF9F5]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#5E7166]" />
          <span className="text-xs font-sans font-bold text-[#5E7166]">Trạng thái:</span>
          <div className="inline-flex p-1 bg-[#FAF9F5] border border-[#E6E1D7] rounded-xl font-sans">
            <button
              onClick={() => setFilterVerified('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filterVerified === 'ALL'
                  ? 'bg-[#264939] text-white shadow-2xs'
                  : 'text-[#5E7166] hover:text-[#264939]'
              }`}
            >
              Tất cả ({totalBatches})
            </button>
            <button
              onClick={() => setFilterVerified('VERIFIED')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filterVerified === 'VERIFIED'
                  ? 'bg-[#C29B38] text-white shadow-2xs'
                  : 'text-[#5E7166] hover:text-[#264939]'
              }`}
            >
              Đã OCOP ({verifiedCount})
            </button>
            <button
              onClick={() => setFilterVerified('PENDING')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filterVerified === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-[#5E7166] hover:text-[#264939]'
              }`}
            >
              Chờ Kiểm Định ({totalBatches - verifiedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Batch Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBatches.map((batch) => {
          const checkpointCount = batch.checkpoints?.length || 0;
          const createdDate = new Date(batch.createdAt * 1000).toLocaleDateString('vi-VN');

          return (
            <div
              key={batch.batchCode}
              className="bg-white rounded-2xl border border-[#E6E1D7] p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Card Top Header */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#EDE9E0]">
                  <div>
                    <span className="inline-block font-mono text-xs font-extrabold text-[#264939] bg-[#E0ECE4] px-2.5 py-0.5 rounded-lg border border-[#CCD8CF]">
                      {batch.batchCode}
                    </span>
                    <h3 className="font-serif font-extrabold text-lg text-[#1A2820] mt-2 group-hover:text-[#264939] transition-colors leading-snug">
                      {batch.productName}
                    </h3>
                  </div>

                  {batch.isVerified ? (
                    <span className="shrink-0 flex items-center gap-1 text-[11px] font-sans font-extrabold bg-amber-50 text-[#8C6D1F] border border-amber-200 px-2.5 py-1 rounded-full shadow-2xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#C29B38]" />
                      <span>ĐẠT OCOP</span>
                    </span>
                  ) : (
                    <span className="shrink-0 flex items-center gap-1 text-[11px] font-sans font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>Chờ Duyệt</span>
                    </span>
                  )}
                </div>

                {/* Info Metadata */}
                <div className="py-3 space-y-2 text-xs font-sans text-[#3B4D43]">
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
                <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#EDE9E0] text-xs font-sans">
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
              <div className="pt-4 mt-4 border-t border-[#EDE9E0] flex items-center justify-between gap-2 font-sans">
                <button
                  onClick={() => onSelectBatchForQR(batch.batchCode)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#264939] hover:text-[#1c372b] p-1 rounded-lg hover:bg-[#E0ECE4] transition-colors"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Tem QR Stamp</span>
                </button>

                <button
                  onClick={() => onNavigateTab('lookup', batch.batchCode)}
                  className="flex items-center gap-1 text-xs font-bold text-white bg-[#264939] px-3.5 py-1.5 rounded-xl hover:bg-[#1c372b] transition-all shadow-2xs"
                >
                  <span>Xem Chi Tiết</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State when no batches are found or contract is empty */}
      {filteredBatches.length === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-[#E6E1D7] text-center space-y-4">
          <Package className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-xl font-serif font-extrabold text-[#1A2820]">
            Chưa có sản phẩm nào trên Blockchain
          </h3>
          <p className="text-xs font-sans text-[#5E7166] max-w-md mx-auto leading-relaxed">
            {canCreateBatch ? 'Bạn có thể đăng ký lô hàng bằng ví đã được cấp quyền sản xuất trên Sepolia.' : 'Chưa có lô hàng để hiển thị. Khách có thể xem cửa hàng; các chức năng nghiệp vụ chỉ mở sau khi ví được xác minh quyền.'}
          </p>
          <button
            onClick={() => onNavigateTab(canCreateBatch ? 'create-batch' : 'store')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#264939] text-white font-sans font-bold text-xs hover:bg-[#1c372b] transition-all shadow-md"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{canCreateBatch ? 'Tạo Lô Hàng Đầu Tiên On-Chain' : 'Mở Cửa Hàng Đặc Sản'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
