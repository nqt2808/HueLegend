import React, { useState } from 'react';
import { Store, Tag, Package, AlertTriangle, Wallet, ArrowDownRight, Image as ImageIcon, CheckCircle2, ShieldCheck, RefreshCw, FolderTree } from 'lucide-react';
import { Batch, SPECIALTY_CATEGORIES } from '../types';

interface RetailerTabProps {
  batches: Record<string, Batch>;
  isRetailerRole: boolean;
  currentAccount: string | null;
  contractBalanceEth?: string;
  customerSalesEth?: string;
  onConnectWallet: () => void;
  onAddCheckpoint?: (
    batchCode: string,
    role: string,
    location: string,
    action: string,
    metadataURI: string,
    stepName: string,
    conditionNote: string,
    valueEth?: string | number
  ) => Promise<void>;
  onWithdrawEarnings?: () => Promise<void>;
}

export const RetailerTab: React.FC<RetailerTabProps> = ({
  batches = {},
  isRetailerRole,
  currentAccount,
  contractBalanceEth = '0.00',
  customerSalesEth = '0.00',
  onConnectWallet,
  onAddCheckpoint,
  onWithdrawEarnings,
}) => {
  const [selectedBatchCode, setSelectedBatchCode] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(SPECIALTY_CATEGORIES[0]);
  const [storeName, setStoreName] = useState('');
  const [storeLocation, setStoreLocation] = useState('');
  const [listingPriceEth, setListingPriceEth] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [listedPrices, setListedPrices] = useState<Record<string, { price: string; store: string; storeLocation: string; stock: string; category: string; sellerAddr: string }>>({});

  const batchList = batches ? Object.values(batches) : [];
  // Tat ca cac lo hang da qua van chuyen (Chang 3)
  const allTransportBatches = batchList.filter((b) => {
    if (!b || !b.isVerified) return false;
    const hasLogisticsCp = b.checkpoints && b.checkpoints.some(
      (c) =>
        c.role === 'ROLE_LOGISTICS' ||
        c.role === '0x32c4b0b14798e1f57ec053359d33b879c5a1a0df3bc25e62f6b8df05373a0c4f' ||
        (c.stepName && (c.stepName.toLowerCase().includes('vận chuyển') || c.stepName.toLowerCase().includes('chặng 3') || c.stepName.toLowerCase().includes('kho')))
    );
    return Boolean(hasLogisticsCp);
  });

  // Danh sach lo hang chua niêm yết de hien thi trong Dropdown chon lo hang
  const unlistedTransportBatches = allTransportBatches.filter((b) => {
    const isAlreadyListedInState = Boolean(listedPrices[b.batchCode]);
    const isAlreadyListedInBatch = Boolean(
      b.isListed ||
      b.listingPriceEth ||
      (b.checkpoints && b.checkpoints.some(
        (c) =>
          c.role === 'ROLE_RETAILER' ||
          c.role === 'RETAILER' ||
          (c.stepName && (c.stepName.toLowerCase().includes('niêm yết') || c.stepName.toLowerCase().includes('bán lẻ')))
      ))
    );

    return !isAlreadyListedInState && !isAlreadyListedInBatch;
  });

  const selectedBatch = batches && selectedBatchCode ? batches[selectedBatchCode] : undefined;

  // Tu dong dong bo So Luong Nhap Kho voi San Luong duoc khoi tao tu Step 1 (CreateBatchTab)
  React.useEffect(() => {
    if (selectedBatchCode && selectedBatch?.quantity) {
      setStockQuantity(selectedBatch.quantity);
    } else if (!selectedBatchCode) {
      setStockQuantity('');
    }
  }, [selectedBatchCode, selectedBatch]);

  // Mac dinh lay anh dac san cua don vi tao lo hang
  const defaultProductImageUrl = selectedBatch?.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600';

  const handleListForSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchCode) return;

    const numericQty = parseFloat(stockQuantity.replace(/[^0-9.]/g, '')) || 0;
    const calculatedListingFeeEth = (numericQty * 0.001 + 0.005).toFixed(6);

    setIsSubmitting(true);
    try {
      if (onAddCheckpoint) {
        const fullLocation = storeLocation ? `${storeName} - ${storeLocation}` : storeName;
        await onAddCheckpoint(
          selectedBatchCode,
          'RETAILER',
          fullLocation,
          `Đã Nhập Kho & Niêm Yết Giá Bán (${listingPriceEth} ETH) — [Phí On-Chain: ${calculatedListingFeeEth} ETH] — [Cửa Hàng: ${storeName} | Điểm Bán: ${storeLocation}] — [Danh mục: ${selectedCategory}]`,
          'ipfs://QmHueRetailerListing2026',
          'Niêm Yết Bán Lẻ',
          `Tên Cửa Hàng: ${storeName} — Điểm Bán: ${storeLocation} — Danh mục: ${selectedCategory} — Giá niêm yết: ${listingPriceEth} ETH — Số lượng nhập kho: ${stockQuantity} — Phí MetaMask Sepolia: ${calculatedListingFeeEth} ETH — Người bán (Retailer): ${currentAccount || 'Chưa xác định'}`,
          calculatedListingFeeEth
        );
      }

      setListedPrices((prev) => ({
        ...prev,
        [selectedBatchCode]: {
          price: listingPriceEth,
          store: storeName,
          storeLocation: storeLocation,
          stock: stockQuantity,
          category: selectedCategory,
          sellerAddr: currentAccount || 'Ví Đại Lý Sepolia'
        }
      }));

      // Khi xac nhan niem yet thanh cong -> reset form va xoa chọn lo hang
      setSelectedBatchCode('');
      setStoreName('');
      setStoreLocation('');
      setListingPriceEth('');
      setStockQuantity('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawRevenue = async () => {
    if (!currentAccount) {
      onConnectWallet();
      return;
    }
    if (!onWithdrawEarnings) return;

    setIsWithdrawing(true);
    try {
      await onWithdrawEarnings();
    } catch (err) {
      console.error(err);
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Chi hien thi so du khi co khach hang thanh toan mua hang, neu chua mua se de ve 0.00 ETH
  const displayRevenueEth = currentAccount && Number(customerSalesEth) > 0 ? customerSalesEth : '0.00';

  return (
    <div className="space-y-6 font-sans">
      {/* Step Indicator Banner */}
      <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#E6E1D7] flex flex-wrap items-center justify-between gap-2 text-xs font-sans">
        <span className="font-bold text-[#264939] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-[#C29B38]" />
          Quy Trình Chuỗi Cung Ứng On-Chain:
        </span>
        <div className="flex items-center gap-1.5 sm:gap-3 text-[11px] font-bold">
          <span className="text-[#5E7166]">1. Khai Báo Lô</span>
          <span className="text-[#8A9D92]">→</span>
          <span className="text-[#5E7166]">2. Thẩm Định OCOP</span>
          <span className="text-[#8A9D92]">→</span>
          <span className="text-[#5E7166]">3. Vận Chuyển</span>
          <span className="text-[#8A9D92]">→</span>
          <span className="px-2.5 py-1 rounded-lg bg-[#264939] text-white shadow-2xs">4. Quản Lý Niêm Yết</span>
        </div>
      </div>

      {/* KHỐI 1: BANNER THỐNG KÊ DOANH THU SMART CONTRACT TRÊN CÙNG (FULL WIDTH) */}
      <div className="bg-gradient-to-r from-[#264939] via-[#1c382b] to-[#12261d] text-white p-6 rounded-3xl shadow-sm border border-[#264939]/40 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#C29B38]/20 border border-[#C29B38]/40 text-[#C29B38]">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-extrabold text-base md:text-lg text-[#FAF9F5]">
                  SỐ DƯ ETH KHÁCH HÀNG MUA SẢN PHẨM TRONG SMART CONTRACT
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#C29B38]/20 text-[#C29B38] border border-[#C29B38]/40 shrink-0">
                  SEPOLIA
                </span>
              </div>
              <p className="text-xs text-[#E0ECE4]/70 mt-0.5">
                Quản lý doanh thu tích lũy On-Chain tự động từ các giao dịch thanh toán của khách hàng
              </p>
            </div>
          </div>

          {/* Rut Doanh Thu Button */}
          <button
            type="button"
            onClick={handleWithdrawRevenue}
            disabled={isWithdrawing || Number(displayRevenueEth) === 0}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#C29B38] text-[#1A2820] font-sans font-extrabold text-xs hover:bg-[#b08c31] active:scale-[0.98] transition-all shadow-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownRight className="w-4 h-4 text-[#1A2820]" />
            <span>{currentAccount ? 'Rút Doanh Thu Về Ví Đại Lý' : 'Kết Nối Ví Để Rút Doanh Thu'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Item 1: So Du ETH Tu Khach Mua Hang */}
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
            <span className="text-xs text-[#E0ECE4]/70 font-medium">Doanh Thu Tích Lũy Từ Khách Mua Hàng:</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-extrabold text-amber-300">
                {displayRevenueEth}
              </span>
              <span className="text-xs font-mono font-bold text-[#E0ECE4]">ETH</span>
            </div>
            <p className="text-[10px] text-amber-200/80 font-mono">
              {!currentAccount
                ? 'Chưa kết nối ví (Số dư = 0.00 ETH)'
                : Number(displayRevenueEth) === 0
                ? 'Chưa có khách hàng mua sản phẩm (Số dư = 0.00 ETH)'
                : 'Đã nhận thanh toán từ khách mua hàng'}
            </p>
          </div>

          {/* Item 2: Vi Dai Ly Thu Huong */}
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
            <span className="text-xs text-[#E0ECE4]/70 font-medium">Tài Khoản Đại Lý Thụ Hưởng:</span>
            <div className="font-mono text-emerald-300 font-bold text-sm truncate pt-1">
              {currentAccount ? `${currentAccount.slice(0, 10)}...${currentAccount.slice(-8)}` : 'Chưa kết nối ví'}
            </div>
            <div className="text-[10px] text-white/50">
              {currentAccount ? 'Ví đang kích hoạt trên mạng Sepolia' : 'Nhấn nút phía trên để kết nối ví'}
            </div>
          </div>

          {/* Item 3: Quy Tac Thanh Toan */}
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
            <span className="text-xs text-[#E0ECE4]/70 font-medium">Cơ Chế Khách Mua Hàng:</span>
            <p className="text-[11px] text-white/80 leading-relaxed pt-0.5">
              {currentAccount
                ? 'Ví này chỉ tự động nhận & tăng số dư khi khách mua đặc sản thanh toán On-Chain.'
                : 'Vui lòng kết nối ví để xem số dư tích lũy từ khách thanh toán và thực hiện rút.'}
            </p>
          </div>
        </div>
      </div>

      {/* KHỐI 2: GRID 2 CỘT CÂN BẰNG CHO FORM NIÊM YẾT VÀ BẢNG TRẠNG THÁI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cot trai (7/12): Form Niem Yet */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-[#E6E1D7] shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#EDE9E0]">
            <div className="flex items-center gap-2">
              <Store className="w-6 h-6 text-[#264939]" />
              <h2 className="text-lg font-serif font-extrabold text-[#264939]">
                Quản Lý Niêm Yết Bán Lẻ
              </h2>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#E0ECE4] text-[#264939] border border-[#CCD8CF]">
              ĐẠI LÝ & CỬA HÀNG ĐẶC SẢN
            </span>
          </div>

          <p className="text-xs text-[#5E7166] leading-relaxed">
            Chọn lô hàng nhận từ đơn vị vận chuyển (đã qua <strong>Kiểm Định OCOP</strong> & <strong>Vận Chuyển</strong>) để nhập kho và niêm yết giá bán On-Chain.
          </p>

          <form onSubmit={handleListForSale} className="space-y-4 font-sans">
            <div>
              <label className="block text-xs font-bold text-[#1A2820] mb-1">
                Chọn Lô Hàng từ đơn vị vận chuyển *
              </label>
              <select
                value={selectedBatchCode}
                onChange={(e) => setSelectedBatchCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D7] text-xs font-mono font-bold focus:outline-none focus:border-[#264939] bg-[#FAF9F5]"
              >
                <option value="">-- Chọn Lô Hàng từ đơn vị vận chuyển --</option>
                {unlistedTransportBatches.length > 0 ? (
                  unlistedTransportBatches.map((batch) => (
                    <option key={batch.batchCode} value={batch.batchCode}>
                      {batch.batchCode} — {batch.productName} (Đã Qua Vận Chuyển)
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    Tất cả các lô hàng đã được niêm yết bán lẻ
                  </option>
                )}
              </select>
            </div>

            {/* Chon Danh Muc Dac San (5 Danh Muc Bat Buoc) */}
            <div>
              <label className="block text-xs font-bold text-[#1A2820] mb-1 flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-[#264939]" />
                <span>Chọn Danh Mục Đặc Sản *</span>
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D7] text-xs font-bold focus:outline-none focus:border-[#264939] bg-[#FAF9F5] text-[#264939]"
              >
                {SPECIALTY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Muc Anh San Pham mac dinh tu Don Vi Tao Lo Hang */}
            {selectedBatch && (
              <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E6E1D7] space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-[#EDE9E0]">
                  <ImageIcon className="w-4 h-4 text-[#264939]" />
                  <span className="text-xs font-bold text-[#264939]">
                    Ảnh Sản Phẩm (Mặc Định Từ Đơn Vị Tạo Lô Hàng)
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <img
                    src={defaultProductImageUrl}
                    alt={selectedBatch.productName}
                    className="w-24 h-24 object-cover rounded-xl border border-[#EDE9E0] shadow-2xs shrink-0"
                  />
                  <div className="space-y-1.5 text-xs text-[#5E7166] flex-1">
                    <div className="font-bold text-[#1A2820] text-sm font-serif">
                      {selectedBatch.productName}
                    </div>
                    <div>
                      <span className="text-[#8A9D92]">Mã Lô: </span>
                      <strong className="font-mono text-[#264939]">{selectedBatch.batchCode}</strong>
                    </div>
                    <div>
                      <span className="text-[#8A9D92]">Đơn Vị Khởi Tạo: </span>
                      <strong className="font-mono text-xs">{selectedBatch.producer ? `${selectedBatch.producer.slice(0, 8)}...${selectedBatch.producer.slice(-6)}` : 'Chưa cập nhật'}</strong>
                    </div>
                    <div>
                      <span className="text-[#8A9D92]">Nguồn Gốc: </span>
                      <strong className="text-[#1A2820]">{selectedBatch.origin}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1A2820] mb-1">
                  Tên Cửa Hàng *
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Ví dụ: Cửa Hàng Đặc Sản Cố Đô Huế"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D7] text-xs focus:outline-none focus:border-[#264939]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A2820] mb-1">
                  Điểm Bán *
                </label>
                <input
                  type="text"
                  required
                  value={storeLocation}
                  onChange={(e) => setStoreLocation(e.target.value)}
                  placeholder="Ví dụ: 12 Lê Lợi, TP. Huế, Thừa Thiên Huế"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D7] text-xs focus:outline-none focus:border-[#264939]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1A2820] mb-1">
                  Giá Niêm Yết Bán Lẻ (Sepolia ETH) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    required
                    value={listingPriceEth}
                    onChange={(e) => setListingPriceEth(e.target.value)}
                    placeholder="Ví dụ: 0.002"
                    className="w-full px-3.5 py-2.5 pr-12 rounded-xl border border-[#E6E1D7] text-xs font-mono font-bold focus:outline-none focus:border-[#264939]"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-[#8A9D92]">
                    ETH
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A2820] mb-1">
                  Số Lượng Nhập Kho (Đơn Vị) *
                </label>
                <input
                  type="text"
                  required
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="Ví dụ: 500 Hộp"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D7] text-xs font-mono font-bold focus:outline-none focus:border-[#264939] bg-[#FAF9F5]"
                />
                {selectedBatch?.quantity && (
                  <p className="text-[10px] text-[#264939] font-medium mt-1">
                    ⚡ Tự động lấy từ <strong>Sản Lượng ({selectedBatch.quantity})</strong> khi khởi tạo lô hàng On-Chain.
                  </p>
                )}
              </div>
            </div>

            {/* Khoi hien thi Phi Niem Yet MetaMask On-Chain = (So Luong x 0.001) + 0.005 ETH chuyen ve vi Co so san xuat */}
            {selectedBatchCode && (
              <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#CCD8CF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#264939]">
                <div className="flex items-start gap-2.5">
                  <Wallet className="w-4 h-4 text-[#C29B38] mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-[#264939]">Giao Dịch MetaMask Chuyển Tiền Cho Cơ Sở Sản Xuất:</span>
                    <div className="text-[11px] text-[#5E7166]">
                      Số ETH = (Số lượng nhập kho × 0.001 ETH) + 0.005 ETH — Chuyển về ví CS SX: <strong className="font-mono text-[#264939]">{selectedBatch?.producer ? `${selectedBatch.producer.slice(0, 6)}...${selectedBatch.producer.slice(-4)}` : 'Chưa xác định'}</strong>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-black text-sm text-[#264939] bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs inline-block">
                    {((parseFloat(stockQuantity.replace(/[^0-9.]/g, '')) || 0) * 0.001 + 0.005).toFixed(4)} ETH
                  </div>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-[#EDE9E0] flex items-center justify-between">
              <span className="text-[11px] text-[#8A9D92]">
                Ví Thụ Hưởng: <strong className="font-mono text-[#264939]">{currentAccount ? `${currentAccount.slice(0, 8)}...${currentAccount.slice(-4)}` : 'Chưa kết nối ví'}</strong>
              </span>

              <button
                type="submit"
                disabled={isSubmitting || !selectedBatch}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#264939] text-white font-sans font-bold text-xs hover:bg-[#1c372b] transition-all shadow-2xs disabled:opacity-50"
              >
                <Tag className="w-4 h-4 text-[#C29B38]" />
                <span>Xác Nhận Niêm Yết On-Chain</span>
              </button>
            </div>
          </form>
        </div>

        {/* Cot phai (5/12): Trang Thai Niem Yet Lo Hang (LUON HIENTHI) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#E6E1D7] shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EDE9E0]">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#C29B38]" />
              <h3 className="font-serif font-extrabold text-base text-[#264939]">
                Trạng Thái Niêm Yết Lô Hàng
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Danh Sách Lô Hàng
            </span>
          </div>

          {allTransportBatches.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 bg-[#FAF9F5] rounded-2xl border border-[#EDE9E0] space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="font-bold text-[#264939] text-sm">Chưa có lô hàng từ đơn vị vận chuyển</p>
              <p className="text-gray-500 leading-relaxed max-w-xs mx-auto">
                Cần đơn vị vận chuyển ghi nhật ký vận chuyển trước khi đại lý có thể niêm yết lên Cửa hàng đặc sản.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {allTransportBatches.map((batch: Batch) => {
                const listingInfo = listedPrices[batch.batchCode];
                const isSelected = batch.batchCode === selectedBatchCode;
                const isListed = Boolean(
                  listingInfo ||
                  batch.isListed ||
                  batch.listingPriceEth ||
                  (batch.checkpoints && batch.checkpoints.some(
                    (c) =>
                      c.role === 'ROLE_RETAILER' ||
                      c.role === 'RETAILER' ||
                      (c.stepName && (c.stepName.toLowerCase().includes('niêm yết') || c.stepName.toLowerCase().includes('bán lẻ')))
                  ))
                );

                return (
                  <div
                    key={batch.batchCode}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-amber-50/90 border-[#C29B38] ring-2 ring-[#C29B38]/30 shadow-xs'
                        : 'bg-[#FAF9F5] border-[#E6E1D7] hover:border-[#264939]/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={batch.imageUrl || defaultProductImageUrl}
                        alt={batch.productName}
                        className="w-12 h-12 rounded-xl object-cover border border-[#EDE9E0] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200 truncate">
                            {batch.batchCode}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                            isListed
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-amber-100 text-amber-900 border-amber-200'
                          }`}>
                            {isListed ? 'Đã Niêm Yết' : 'Sẵn Sàng Niêm Yết'}
                          </span>
                        </div>
                        <h4 className="font-serif font-bold text-xs text-[#1A2820] mt-1 truncate">
                          {batch.productName}
                        </h4>
                      </div>
                    </div>

                    <div className="text-xs text-[#5E7166] space-y-1.5 mt-2 bg-white p-2.5 rounded-xl border border-[#EDE9E0]">
                      <div className="flex justify-between">
                        <span>Tên cửa hàng:</span>
                        <span className="font-bold text-[#1A2820] truncate max-w-[160px]">
                          {listingInfo?.store || (isSelected ? storeName : null) || 'Đại Lý Cố Đô'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Điểm bán:</span>
                        <span className="font-medium text-[#264939] truncate max-w-[160px]">
                          {listingInfo?.storeLocation || (isSelected ? storeLocation : null) || 'Thừa Thiên Huế'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Danh mục đặc sản:</span>
                        <span className="font-bold text-[#264939] truncate max-w-[160px]">
                          {listingInfo?.category || (isSelected ? selectedCategory : null) || 'Đặc Sản Huế'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Giá bán niêm yết:</span>
                        <span className="font-mono font-bold text-[#264939]">
                          {listingInfo?.price || (isSelected ? listingPriceEth : null) || batch.listingPriceEth || '0.002'} ETH
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tồn kho đại lý:</span>
                        <span className="font-mono font-bold text-amber-800">
                          {listingInfo?.stock || (isSelected ? stockQuantity : null) || batch.quantity || '100'} đơn vị
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] pt-1 border-t border-[#EDE9E0]">
                        <span>Ví Retailer thụ hưởng:</span>
                        <span className="font-mono font-bold text-emerald-700 truncate max-w-[140px]">
                          {listingInfo?.sellerAddr || (currentAccount ? `${currentAccount.slice(0, 8)}...${currentAccount.slice(-4)}` : 'ROLE_RETAILER')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


