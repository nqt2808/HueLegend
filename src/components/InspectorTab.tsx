import React, { useState, useEffect } from 'react';
import { Batch } from '../types';
import {
  ShieldCheck,
  AlertOctagon,
  Award,
  Clock,
  CheckCircle2,
  Star,
  MapPin,
  UserCheck,
  Calendar,
  ExternalLink,
  Package,
  Coins,
  FileText,
  Wallet,
  RotateCcw,
  Search,
  X,
  Send,
  UserX
} from 'lucide-react';
import { ETHERSCAN_BASE_URL } from '../constants';

interface InspectorTabProps {
  batches: Record<string, Batch>;
  isInspectorRole?: boolean;
  currentAccount?: string | null;
  onVerifyBatch: (
    batchCode: string,
    inspectorNote: string,
    certificateURI: string,
    starRating: string
  ) => Promise<void>;
  onRevokeVerification: (batchCode: string, reason: string) => Promise<void>;
  onConnectWallet?: () => void;
}

export const InspectorTab: React.FC<InspectorTabProps> = ({
  batches,
  isInspectorRole = true,
  currentAccount,
  onVerifyBatch,
  onRevokeVerification,
  onConnectWallet,
}) => {
  const batchList = Object.values(batches);

  // Phan loai danh sach lo hang
  const pendingBatches = batchList.filter((b) => !b.isVerified);
  const verifiedBatches = batchList.filter((b) => b.isVerified);

  // Sub tab view: 'form' (Thua hanh bieu mau) hoac 'verified' (Danh sach da kiem dinh)
  const [activeSubTab, setActiveSubTab] = useState<'form' | 'verified'>('form');

  // Form state cho tham dinh lo hang
  const [selectedBatchCode, setSelectedBatchCode] = useState<string>('');
  const [starRating, setStarRating] = useState('4');
  const [inspectorNote, setInspectorNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Modal State cho Thu Hoi OCOP
  const [revokingBatch, setRevokingBatch] = useState<Batch | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');



  const selectedBatch = selectedBatchCode ? batches[selectedBatchCode] : undefined;

  // Ham xu ly Ky Xac Nhan & Cap OCOP
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchCode) return;

    setIsSubmitting(true);
    try {
      const generatedCertURI = `ipfs://huelegend/cert/${selectedBatchCode}`;
      await onVerifyBatch(selectedBatchCode, inspectorNote, generatedCertURI, starRating);

      // Khi cap chung nhan thành cong, an tat ca thong tin tao lo hang bang cach reset selectedBatchCode ve rông
      setSelectedBatchCode('');
      setInspectorNote('');
      setActiveSubTab('verified');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ham xu ly Thu Hoi Kiem Dinh
  const handleConfirmRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokingBatch || !revokeReason) return;

    setIsSubmitting(true);
    try {
      await onRevokeVerification(revokingBatch.batchCode, revokeReason);
      setRevokingBatch(null);
      setRevokeReason('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loc danh sach cac lo hang da kiem dinh theo tu khoa tim kiem
  const filteredVerifiedBatches = verifiedBatches.filter(
    (b) =>
      b.batchCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.origin.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#264939] via-[#1c382b] to-[#12261d] text-white p-6 sm:p-7 rounded-3xl shadow-sm border border-[#264939]/40 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C29B38]/20 text-[#C29B38] text-xs font-bold border border-[#C29B38]/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>HỘI ĐỒNG THẨM ĐỊNH OCOP TỈNH THỪA THIÊN HUẾ</span>
          </div>
          <h2 className="font-serif font-extrabold text-2xl sm:text-3xl text-amber-100 leading-tight">
            Thẩm Định & Cấp Chứng Nhận OCOP On-Chain
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/80 font-sans">
            Thẩm định chất lượng đặc sản Cố Đô Huế, xếp hạng sao OCOP chính thức và mã hóa chứng nhận lên Blockchain Sepolia Testnet.
          </p>
        </div>

        <div className="p-3 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-xs flex items-center gap-3 shrink-0">
          <Award className="w-8 h-8 text-[#C29B38]" />
          <div>
            <span className="text-[10px] text-emerald-200 uppercase font-bold block">
              Thẩm Định Viên
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {currentAccount ? `${currentAccount.slice(0, 8)}...${currentAccount.slice(-4)}` : 'Chưa kết nối ví'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="bg-white p-2.5 rounded-2xl border border-[#E6E1D7] shadow-2xs flex flex-wrap items-center justify-between gap-3 font-sans">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('form')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'form'
                ? 'bg-[#264939] text-white shadow-xs'
                : 'bg-[#FAF9F5] text-[#5E7166] border border-[#E6E1D7] hover:text-[#264939]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#C29B38]" />
            <span>Thẩm Định Lô Hàng Mới ({pendingBatches.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('verified')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'verified'
                ? 'bg-[#264939] text-white shadow-xs'
                : 'bg-[#FAF9F5] text-[#5E7166] border border-[#E6E1D7] hover:text-[#264939]'
            }`}
          >
            <Award className="w-4 h-4 text-[#C29B38]" />
            <span>Danh Sách Đã Kiểm Định OCOP ({verifiedBatches.length})</span>
          </button>
        </div>

        <div className="text-xs text-[#5E7166] font-medium hidden sm:block">
          Vai trò: <strong className="text-[#264939]">Kiểm Định Viên OCOP (ROLE_INSPECTOR)</strong>
        </div>
      </div>

      {/* Unconnected Wallet Warning */}
      {!currentAccount ? (
        <div className="bg-white p-10 sm:p-12 rounded-3xl border-2 border-dashed border-[#E6E1D7] text-center space-y-4 font-sans shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-[#8C6D1F] flex items-center justify-center mx-auto border border-amber-200">
            <Award className="w-8 h-8 text-[#C29B38]" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-xl font-serif font-extrabold text-[#264939]">
              Yêu Cầu Kết Nối Ví Để Thẩm Định OCOP
            </h3>
            <p className="text-xs text-[#5E7166] leading-relaxed">
              Vui lòng kết nối ví MetaMask có quyền Kiểm Định Viên OCOP (ROLE_INSPECTOR) để thực hiện thẩm định & quản lý danh sách chứng nhận On-Chain.
            </p>
          </div>
          {onConnectWallet && (
            <button
              onClick={onConnectWallet}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#C29B38] text-white font-sans font-bold text-xs hover:bg-[#8C6D1F] transition-all shadow-md mt-2"
            >
              <Wallet className="w-4 h-4 text-white" />
              <span>Kết Nối Ví MetaMask Ngay</span>
            </button>
          )}
        </div>
      ) : activeSubTab === 'form' ? (
        /* ================= SUB TAB 1: FORM THẨM ĐỊNH LÔ HÀNG MỚI ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cot Trai (7/12): Form Tham Dinh */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-3xl border border-[#E6E1D7] shadow-2xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#EDE9E0]">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#E0ECE4] text-[#264939] border border-[#CCD8CF]">
                  <ShieldCheck className="w-5 h-5 text-[#C29B38]" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-extrabold text-[#264939]">
                    Biểu Mẫu Thẩm Định OCOP
                  </h3>
                  <p className="text-xs text-[#5E7166]">
                    Chọn lô hàng đang chờ, xếp hạng sao và bấm ký xác nhận on-chain
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-[#E0ECE4] text-[#264939] border border-[#CCD8CF]">
                ROLE_INSPECTOR
              </span>
            </div>

            {/* Fee Paid Status Banner */}
            <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#E6E1D7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-[#1A2820] block">Phí Thẩm Định Gộp On-Chain:</span>
                  <span className="text-[11px] text-[#5E7166]">Đã được Cơ sở sản xuất chi trả khi khởi tạo lô (0.002 ETH)</span>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px] border border-emerald-200 shrink-0 text-center">
                0.002 ETH Đã Thu
              </span>
            </div>

            <form onSubmit={handleVerify} className="space-y-5 font-sans">
              {/* Field 1: Select Batch */}
              <div>
                <label className="block text-xs font-bold text-[#1A2820] mb-1.5 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#264939]" />
                  <span>Chọn Lô Hàng Cần Thẩm Định *</span>
                </label>
                <select
                  value={selectedBatchCode}
                  onChange={(e) => setSelectedBatchCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#E6E1D7] text-xs font-mono font-bold focus:outline-none focus:border-[#264939] bg-[#FAF9F5] text-[#1A2820] shadow-inner"
                >
                  <option value="">-- Chọn lô hàng mới cần thẩm định OCOP --</option>
                  {pendingBatches.length > 0 ? (
                    pendingBatches.map((batch) => (
                      <option key={batch.batchCode} value={batch.batchCode}>
                        {batch.batchCode} — {batch.productName} (Chờ Thẩm Định OCOP)
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>Tất cả các lô hàng đã được kiểm định OCOP</option>
                  )}
                </select>
              </div>

              {/* Field 2: Select Star Rating Cards */}
              <div>
                <label className="block text-xs font-bold text-[#1A2820] mb-1.5 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-[#C29B38]" />
                  <span>Xếp Hạng Sao OCOP Thừa Thiên Huế *</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { val: '3', label: '3 Sao OCOP', stars: '⭐⭐⭐', desc: 'Đạt chuẩn chất lượng cấp Tỉnh' },
                    { val: '4', label: '4 Sao OCOP', stars: '⭐⭐⭐⭐', desc: 'Chất lượng cao, tiềm năng Quốc gia' },
                    { val: '5', label: '5 Sao OCOP', stars: '⭐⭐⭐⭐⭐', desc: 'Đặc sản Cấp Quốc Gia' },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.val}
                      onClick={() => setStarRating(item.val)}
                      className={`p-3.5 rounded-2xl border text-left transition-all space-y-1 relative ${
                        starRating === item.val
                          ? 'border-[#C29B38] bg-amber-50/80 ring-2 ring-[#C29B38]/40 shadow-xs'
                          : 'border-[#E6E1D7] bg-[#FAF9F5] hover:border-[#264939]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-[#264939] font-serif">{item.label}</span>
                        {starRating === item.val && (
                          <CheckCircle2 className="w-4 h-4 text-[#C29B38]" />
                        )}
                      </div>
                      <div className="text-xs">{item.stars}</div>
                      <p className="text-[10px] text-[#5E7166] leading-tight pt-1">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 3: Inspector Notes */}
              <div>
                <label className="block text-xs font-bold text-[#1A2820] mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#264939]" />
                  <span>Nội Dung / Nhận Xét Thẩm Định Chính Thức *</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={inspectorNote}
                  onChange={(e) => setInspectorNote(e.target.value)}
                  placeholder="Nhập ghi chú thẩm định (Ví dụ: Sản phẩm đạt chuẩn an toàn vệ sinh thực phẩm, quy trình sản xuất truyền thống Cố Đô Huế đạt tiêu chuẩn OCOP 4 sao tỉnh Thừa Thiên Huế...)"
                  className="w-full px-4 py-3 rounded-2xl border border-[#E6E1D7] text-xs focus:outline-none focus:border-[#264939] bg-white placeholder:text-[#8A9D92]"
                />
              </div>

              {/* Gas Note */}
              <div className="text-[11px] text-[#5E7166] bg-[#FAF9F5] p-3 rounded-2xl border border-[#EDE9E0] flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#C29B38] shrink-0" />
                <span>
                  ⚡ <strong>Lưu ý Kiểm Định Viên:</strong> Thao tác ký duyệt OCOP <strong>KHÔNG MẤT PHÍ THẨM ĐỊNH (0 ETH)</strong>. Bạn chỉ cần trả một lượng nhỏ gas Sepolia để ghi nhận chữ ký lên Smart Contract.
                </span>
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-[#EDE9E0] flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedBatch || selectedBatch?.isVerified || !isInspectorRole}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#C29B38] to-[#a38029] text-white font-sans font-extrabold text-xs hover:opacity-95 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span>
                    {selectedBatch?.isVerified ? 'Lô Hàng Đã Đạt OCOP' : 'Ký Xác Nhận & Cấp OCOP On-Chain'}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Cot Phai (5/12): Chi Tiet Lo Hang Dang Chon */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#E6E1D7] shadow-2xs space-y-5">
            {selectedBatch && selectedBatchCode ? (
              <div className="space-y-4 font-sans">
                <div className="pb-3 border-b border-[#EDE9E0] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#8A9D92] uppercase tracking-wider block">
                      TẤT CẢ THÔNG TIN TẠO LÔ HÀNG
                    </span>
                    <div className="font-mono text-sm sm:text-base font-extrabold text-[#264939] mt-0.5">
                      {selectedBatch.batchCode}
                    </div>
                  </div>
                  <Package className="w-6 h-6 text-[#C29B38]" />
                </div>

                {/* Full Specialty Product Image Preview Box */}
                <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#E6E1D7] space-y-3 text-center shadow-inner">
                  <div className="relative overflow-hidden rounded-2xl bg-white border border-[#EDE9E0] p-2 flex items-center justify-center">
                    <img
                      src={selectedBatch.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600'}
                      alt={selectedBatch.productName}
                      className="max-h-48 w-full object-contain rounded-xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600';
                      }}
                    />
                  </div>
                  <div>
                    <h4 className="font-serif font-extrabold text-lg text-[#1A2820]">
                      {selectedBatch.productName}
                    </h4>
                    <span className="text-[10px] font-bold text-[#264939] bg-[#E0ECE4] px-2.5 py-0.5 rounded-full border border-[#CCD8CF] inline-block mt-1">
                      Ảnh Sản Phẩm Mặc Định Từ CS SX
                    </span>
                  </div>
                </div>

                {/* Verification Status Card */}
                <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#E6E1D7] space-y-2">
                  <span className="text-[10px] font-bold text-[#8A9D92] uppercase block">
                    TRẠNG THÁI KIỂM ĐỊNH OCOP:
                  </span>
                  {selectedBatch.isVerified ? (
                    <div className="space-y-1.5">
                      <span className="inline-flex items-center gap-1.5 bg-amber-100 text-[#8C6D1F] border border-amber-300 px-3.5 py-1 rounded-full text-xs font-extrabold shadow-2xs">
                        <ShieldCheck className="w-4 h-4 text-[#C29B38]" />
                        <span>ĐÃ CẤP CHỨNG NHẬN OCOP</span>
                      </span>
                      {selectedBatch.starRating && (
                        <div className="text-xs font-bold text-[#C29B38] flex items-center gap-1 pt-0.5">
                          <Star className="w-3.5 h-3.5 fill-[#C29B38]" />
                          <span>Hạng {selectedBatch.starRating} Sao OCOP Thừa Thiên Huế</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>CHỜ CẤP CHỨNG NHẬN OCOP</span>
                    </span>
                  )}
                </div>

                {/* Complete Batch Creation Attributes List */}
                <div className="space-y-2 text-xs text-[#5E7166]">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] border border-[#EDE9E0]">
                    <span className="font-medium flex items-center gap-1.5 text-[11px]">
                      <Package className="w-3.5 h-3.5 text-[#264939] shrink-0" />
                      <span>Tên Đặc Sản Khai Báo:</span>
                    </span>
                    <strong className="text-[#1A2820] font-serif font-bold truncate max-w-[160px]">
                      {selectedBatch.productName}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] border border-[#EDE9E0]">
                    <span className="font-medium flex items-center gap-1.5 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-[#264939] shrink-0" />
                      <span>Địa Danh / Nguồn Gốc:</span>
                    </span>
                    <strong className="text-[#1A2820] truncate max-w-[160px]">
                      {selectedBatch.origin || 'Thừa Thiên Huế'}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] border border-[#EDE9E0]">
                    <span className="font-medium flex items-center gap-1.5 text-[11px]">
                      <UserCheck className="w-3.5 h-3.5 text-[#264939] shrink-0" />
                      <span>Ví CS SX (Producer):</span>
                    </span>
                    <a
                      href={`${ETHERSCAN_BASE_URL}/address/${selectedBatch.producer}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-emerald-800 font-bold hover:underline flex items-center gap-1 truncate max-w-[140px]"
                    >
                      <span>{selectedBatch.producer ? `${selectedBatch.producer.slice(0, 6)}...${selectedBatch.producer.slice(-4)}` : 'Chưa cập nhật'}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] border border-[#EDE9E0]">
                    <span className="font-medium flex items-center gap-1.5 text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-[#264939] shrink-0" />
                      <span>Thời Gian Khởi Tạo:</span>
                    </span>
                    <strong className="text-[#1A2820] font-mono text-[11px]">
                      {selectedBatch.createdAt ? new Date(selectedBatch.createdAt * 1000).toLocaleString('vi-VN') : 'Vừa tạo'}
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#FAF9F5] p-8 sm:p-10 rounded-3xl border-2 border-dashed border-[#E6E1D7] text-center space-y-3 font-sans">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-[#8C6D1F] flex items-center justify-center mx-auto border border-amber-200">
                  <Package className="w-6 h-6 text-[#C29B38]" />
                </div>
                <h4 className="font-serif font-extrabold text-base text-[#264939]">
                  Thông Tin Tạo Lô Hàng Đã Được Ẩn
                </h4>
                <p className="text-xs text-[#5E7166] leading-relaxed max-w-xs mx-auto">
                  Đã cấp chứng nhận OCOP thành công hoặc chưa chọn lô hàng. Vui lòng chọn một lô hàng mới từ danh sách thả xuống để xem tất cả thông tin tạo lô hàng.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= SUB TAB 2: DANH SÁCH LÔ HÀNG ĐÃ KIỂM ĐỊNH OCOP (DẠNG BẢNG GIỐNG ẢNH 2) ================= */
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E6E1D7] shadow-2xs space-y-6 font-sans">
          {/* Header & Search Bar for Verified Batches */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#EDE9E0]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#E0ECE4] text-[#264939] border border-[#CCD8CF]">
                <Award className="w-6 h-6 text-[#264939]" />
              </div>
              <div>
                <h3 className="text-xl font-serif font-extrabold text-[#264939]">
                  Danh Sách Đã Kiểm Định OCOP
                </h3>
                <p className="text-xs text-[#5E7166]">
                  Danh sách lô hàng đặc sản Thừa Thiên Huế đã được ký duyệt chứng nhận OCOP
                </p>
              </div>
            </div>

            <div className="relative min-w-[280px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo mã lô / sản phẩm..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#E6E1D7] text-xs focus:outline-none focus:border-[#264939] bg-[#FAF9F5]"
              />
            </div>
          </div>

          {/* Table View of Verified Batches */}
          {filteredVerifiedBatches.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400 bg-[#FAF9F5] rounded-3xl border border-dashed border-[#E6E1D7] space-y-3">
              <Award className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="font-bold text-[#264939] text-sm">Chưa có lô hàng nào trong danh sách đã kiểm định</p>
              <p className="text-gray-500 max-w-md mx-auto">
                Sau khi ký xác nhận ở Tab "Thẩm Định Lô Hàng Mới", lô hàng sẽ tự động xuất hiện ở phần này.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#E6E1D7] shadow-2xs">
              <table className="w-full text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-[#FAF9F5] border-b border-[#E6E1D7] text-[11px] font-extrabold text-[#5E7166] uppercase tracking-wider">
                    <th className="py-3.5 px-5">MÃ LÔ HÀNG</th>
                    <th className="py-3.5 px-5">TÊN ĐẶC SẢN / HẠNG OCOP</th>
                    <th className="py-3.5 px-5">THỜI GIAN KIỂM ĐỊNH</th>
                    <th className="py-3.5 px-5 text-right">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDE9E0] text-xs bg-white">
                  {filteredVerifiedBatches.map((batch) => {
                    // Tinh thoi gian kiem dinh tu checkpoint hoac createdAt
                    const inspectorCheckpoint = batch.checkpoints?.find((c) => c.role === 'ROLE_INSPECTOR');
                    const inspectionTimestamp = inspectorCheckpoint?.timestamp || batch.createdAt;
                    const inspectionDateStr = inspectionTimestamp
                      ? new Date(inspectionTimestamp * 1000).toISOString().replace('T', ' ').slice(0, 16)
                      : '2026-10-28 08:30';

                    return (
                      <tr key={batch.batchCode} className="hover:bg-[#FAF9F5]/70 transition-colors">
                        {/* Column 1: Ma Lo Hang */}
                        <td className="py-4 px-5 font-mono font-bold text-[#1A2820]">
                          <span className="bg-amber-50 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-200 inline-block">
                            {batch.batchCode}
                          </span>
                        </td>

                        {/* Column 2: Ten Dac San / Hang OCOP */}
                        <td className="py-4 px-5">
                          <div className="space-y-1">
                            <div className="font-serif font-extrabold text-sm text-[#1A2820]">
                              {batch.productName}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 bg-[#264939] text-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                                <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                                <span>OCOP {batch.starRating || '4'} SAO</span>
                              </span>
                              <span className="text-[10px] text-[#5E7166] font-medium">
                                ROLE_INSPECTOR
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Column 3: Thoi Gian Kiem Dinh */}
                        <td className="py-4 px-5 text-[#5E7166] font-mono text-xs">
                          {inspectionDateStr}
                        </td>

                        {/* Column 4: Thao Tac Thu Hoi Button */}
                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => {
                              setRevokingBatch(batch);
                              setRevokeReason('');
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-red-200 bg-red-50/50 text-red-600 hover:bg-red-100 hover:border-red-300 transition-all text-xs font-bold shadow-2xs active:scale-95"
                          >
                            <UserX className="w-3.5 h-3.5 text-red-600" />
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
      )}

      {/* Modal Popup Confirm Revocation (Thu Hoi Kiem Dinh) */}
      {revokingBatch && (
        <div
          onClick={() => setRevokingBatch(null)}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200 font-sans overflow-hidden"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-[#E6E1D7] max-w-md w-full p-6 shadow-2xl relative space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EDE9E0]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-100 text-red-700 border border-red-200">
                  <AlertOctagon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-serif font-extrabold text-base text-red-900">
                    Thu Hồi Chứng Nhận OCOP
                  </h3>
                  <p className="text-[11px] text-gray-500">Ghi nhận quyết định thu hồi lên Blockchain</p>
                </div>
              </div>
              <button
                onClick={() => setRevokingBatch(null)}
                className="p-1.5 rounded-full bg-[#FAF9F5] border border-[#E6E1D7] text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-red-50 p-3.5 rounded-2xl border border-red-200 text-xs text-red-900 space-y-1">
              <div className="font-bold flex items-center justify-between">
                <span>Lô Hàng Bị Thu Hồi:</span>
                <span className="font-mono font-extrabold text-red-950">{revokingBatch.batchCode}</span>
              </div>
              <div>Tên sản phẩm: <strong>{revokingBatch.productName}</strong></div>
            </div>

            <form onSubmit={handleConfirmRevoke} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1A2820] mb-1">
                  Nhập Lý Do Thu Hồi Chứng Nhận OCOP *
                </label>
                <textarea
                  required
                  rows={3}
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="Ví dụ: Phát hiện lô hàng không đảm bảo chỉ tiêu vệ sinh an toàn thực phẩm theo kết quả kiểm nghiệm đột xuất..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D7] text-xs focus:outline-none focus:border-red-600 bg-[#FAF9F5]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRevokingBatch(null)}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 transition-all"
                >
                  Hủy Bỏ
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !revokeReason}
                  className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Xác Nhận Thu Hồi On-Chain</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
