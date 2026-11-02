import React, { useState } from 'react';
import { PlusCircle, Wallet, AlertTriangle, Upload, Image as ImageIcon, Sparkles, Calendar, Clock, Lock, FolderTree } from 'lucide-react';
import { SPECIALTY_CATEGORIES } from '../types';

interface CreateBatchTabProps {
  batchCreationFeeEth: string;
  producerStakeBalance?: string;
  isProducerRole?: boolean;
  currentAccount?: string | null;
  onConnectWallet?: () => void;
  onCreateBatch: (
    batchCode: string,
    productName: string,
    origin: string,
    metadataURI: string,
    imageUrl?: string,
    productionDate?: string,
    expiryDate?: string,
    quantity?: string,
    category?: string
  ) => Promise<void>;
  onDepositStake?: (amountEth: string) => Promise<void>;
  onWithdrawStake?: () => Promise<void>;
}

export const CreateBatchTab: React.FC<CreateBatchTabProps> = ({
  batchCreationFeeEth,
  currentAccount,
  onConnectWallet,
  onCreateBatch,
}) => {
  const [batchCode, setBatchCode] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<string>(SPECIALTY_CATEGORIES[0]);
  const [origin, setOrigin] = useState('');
  const [quantity, setQuantity] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Thoi gian: Ngay san xuat va Han su dung
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultExpDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [productionDate, setProductionDate] = useState(todayStr);
  const [expiryDate, setExpiryDate] = useState(defaultExpDate);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fast duration selection helper
  const setExpiryInMonths = (months: number) => {
    const baseDate = productionDate ? new Date(productionDate) : new Date();
    baseDate.setMonth(baseDate.getMonth() + months);
    setExpiryDate(baseDate.toISOString().split('T')[0]);
  };

  // Danh sach anh dac san Cố Đô Huế mẫu
  const sampleSpecialtyImages = [
    { name: 'Mè Xửng Huế', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600' },
    { name: 'Trà Cung Đình', url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=600' },
    { name: 'Dầu Tràm Huế', url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=600' },
    { name: 'Nón Lá Bài Thơ', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&q=80&w=600' },
    { name: 'Tôm Chua Cố Đô', url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&q=80&w=600' },
  ];

  // Xu ly tai anh tu may tinh
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setImageUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Auto-generate batch code from product name
  const generateBatchCodeFromProductName = (name: string): string => {
    if (!name.trim()) return '';
    const noAccents = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');

    const words = noAccents
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);

    if (words.length === 0) return '';

    const prefix = words.slice(0, 3).join('').slice(0, 10);
    const year = new Date().getFullYear();
    return `HL-${prefix}-${year}-001`;
  };

  const handleProductNameChange = (val: string) => {
    setProductName(val);
    const autoCode = generateBatchCodeFromProductName(val);
    setBatchCode(autoCode);
  };

  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount) {
      if (onConnectWallet) onConnectWallet();
      return;
    }
    if (!batchCode.trim() || !productName.trim() || !origin.trim()) return;

    setIsSubmitting(true);
    try {
      const generatedMetadataURI = `ipfs://huelegend/batch/${batchCode.trim()}`;
      await onCreateBatch(
        batchCode.trim(),
        productName.trim(),
        origin.trim(),
        generatedMetadataURI,
        imageUrl,
        productionDate,
        expiryDate,
        quantity.trim(),
        category
      );
      setBatchCode('');
      setProductName('');
      setCategory(SPECIALTY_CATEGORIES[0]);
      setOrigin('');
      setQuantity('');
      setImageUrl('');
      const freshToday = new Date().toISOString().split('T')[0];
      const freshDefaultExp = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setProductionDate(freshToday);
      setExpiryDate(freshDefaultExp);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto font-sans space-y-4">
      {/* Step Indicator Banner */}
      <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#E6E1D7] flex flex-wrap items-center justify-between gap-2 text-xs font-sans">
        <span className="font-bold text-[#264939] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <PlusCircle className="w-4 h-4 text-[#C29B38]" />
          Quy Trình Chuỗi Cung Ứng On-Chain:
        </span>
        <div className="flex items-center gap-1.5 sm:gap-3 text-[11px] font-bold">
          <span className="px-2.5 py-1 rounded-lg bg-[#264939] text-white shadow-2xs">1. Khai Báo Lô</span>
          <span className="text-[#8A9D92]">→</span>
          <span className="text-[#5E7166]">2. Thẩm Định OCOP</span>
          <span className="text-[#8A9D92]">→</span>
          <span className="text-[#5E7166]">3. Vận Chuyển</span>
          <span className="text-[#8A9D92]">→</span>
          <span className="text-[#5E7166]">4. Quản Lý Niêm Yết</span>
        </div>
      </div>

      {/* Banner hien thi khi chua ket noi vi */}
      {!currentAccount && (
        <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl flex items-center gap-3 text-xs text-amber-950 shadow-2xs font-sans">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold block text-sm font-serif text-amber-950">Vui lòng kết nối ví MetaMask trước khi tạo lô hàng</span>
            <span className="text-amber-900 font-medium">Địa chỉ ví sản xuất sẽ tự động trích xuất trực tiếp từ tài khoản MetaMask đang hoạt động.</span>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-[#E6E1D7] shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#EDE9E0]">
          <div>
            <h2 className="text-lg font-serif font-extrabold text-[#264939]">
              Khai Báo Lô Hàng On-Chain
            </h2>
          </div>
          <span className="px-3 py-1 bg-[#E0ECE4] text-[#264939] rounded-full text-xs font-bold border border-[#CCD8CF]">
            Tổng Phí: {(parseFloat(batchCreationFeeEth || '0.001') + 0.004).toFixed(3)} ETH
          </span>
        </div>

        {/* Fee breakdown notice for Producer */}
        <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E6E1D7] text-xs space-y-1">
          <div className="flex items-center justify-between font-bold text-[#264939]">
            <span>💰 Chi tiết phí On-Chain khởi tạo lô hàng:</span>
            <span className="font-mono font-extrabold">{(parseFloat(batchCreationFeeEth || '0.001') + 0.004).toFixed(3)} ETH</span>
          </div>
          <div className="text-[11px] text-[#5E7166] flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-[#EDE9E0]">
            <span>• Phí khởi tạo lô hàng: <strong className="text-[#1A2820] font-mono">{batchCreationFeeEth || '0.001'} ETH</strong></span>
            <span>• Phí thẩm định OCOP (đã trả gộp): <strong className="text-[#C29B38] font-mono">0.002 ETH</strong></span>
            <span>• Phí Vận Chuyển (đã trả gộp): <strong className="text-[#264939] font-mono">0.002 ETH</strong></span>
          </div>
        </div>

        <form onSubmit={handleSubmitBatch} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1A2820] mb-1">
              Tên Đặc Sản *
            </label>
            <input
              type="text"
              required
              value={productName}
              onChange={(e) => handleProductNameChange(e.target.value)}
              placeholder="Ví dụ: Mè Xửng Dừa Hoàng Gia Huế..."
              className="w-full px-3.5 py-2 rounded-xl border border-[#E6E1D7] text-xs font-bold focus:outline-none focus:border-[#264939]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1A2820] mb-1 flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-[#264939]" />
              <span>Danh Mục Đặc Sản Huế *</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E6E1D7] text-xs font-bold focus:outline-none focus:border-[#264939] bg-[#FAF9F5] text-[#264939]"
            >
              {SPECIALTY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-[#1A2820]">
                Mã Lô Hàng On-Chain *
              </label>
              <span className="text-[10px] font-bold text-[#264939] bg-[#E0ECE4] px-2 py-0.5 rounded-full border border-[#CCD8CF]">
                ⚡ Tự động tạo từ Tên Đặc Sản
              </span>
            </div>
            <input
              type="text"
              readOnly
              required
              value={batchCode}
              placeholder="Mã lô hàng sẽ tự động xuất hiện sau khi nhập Tên Đặc Sản..."
              className="w-full px-3.5 py-2 rounded-xl border border-[#E6E1D7] text-xs font-mono font-bold focus:outline-none bg-[#FAF9F5] text-[#264939] cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1A2820] mb-1">
              Địa Danh / Nguồn Gốc *
            </label>
            <input
              type="text"
              required
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Ví dụ: Phường Hương Long, TP Huế, Thừa Thiên Huế..."
              className="w-full px-3.5 py-2 rounded-xl border border-[#E6E1D7] text-xs focus:outline-none focus:border-[#264939]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1A2820] mb-1">
              Sản Lượng (Quy Mô / Số Lượng Khởi Tạo) *
            </label>
            <input
              type="text"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ví dụ: 500 Hộp, 1.000 Gói, 200 Chai..."
              className="w-full px-3.5 py-2 rounded-xl border border-[#E6E1D7] text-xs font-bold focus:outline-none focus:border-[#264939]"
            />
            <p className="text-[10px] text-[#8A9D92] mt-1">
              * Số lượng này sẽ tự động hiển thị ở mục <strong>Quy Mô / Sản Lượng</strong> khi tra cứu và làm mặc định cho <strong>Số Lượng Nhập Kho</strong> khi niêm yết bán lẻ.
            </p>
          </div>

          {/* Mục Thời Gian: Ngày Sản Xuất & Hạn Sử Dụng */}
          <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#E6E1D7] space-y-3">
            <div className="flex items-center justify-between border-b border-[#EDE9E0] pb-2">
              <span className="text-xs font-serif font-extrabold text-[#264939] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#C29B38]" />
                <span>Khung Thời Gian Lô Hàng (Ngày Sản Xuất & Hạn Sử Dụng) *</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-[#8A9D92] bg-white px-2 py-0.5 rounded border border-[#E6E1D7]">
                Mã Hóa Blockchain
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Ngay san xuat - khoat mac dinh ngay hien tai */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-[#1A2820] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#264939]" />
                    <span>Ngày Sản Xuất (NSX) *</span>
                  </label>
                  <span className="text-[9px] font-bold text-[#264939] bg-[#E0ECE4] px-1.5 py-0.5 rounded border border-[#CCD8CF] flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-[#264939]" /> Khoá ngày hiện tại
                  </span>
                </div>
                <input
                  type="date"
                  readOnly
                  required
                  value={productionDate}
                  title="Ngay san xuat duoc khoat mac dinh la ngay hien tai de dam bao tinh minh bach"
                  className="w-full px-3 py-2 rounded-xl border border-[#E6E1D7] text-xs font-mono font-bold focus:outline-none bg-[#FAF9F5] text-[#264939] cursor-not-allowed select-none"
                />
              </div>

              {/* Han Su Dung */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-[#1A2820] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#C29B38]" />
                    <span>Hạn Sử Dụng (HSD) *</span>
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setExpiryInMonths(3)}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-[#8C6D1F] border border-amber-200 hover:bg-amber-100 transition-colors"
                      title="Cộng 3 tháng"
                    >
                      +3 Tháng
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpiryInMonths(6)}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-[#8C6D1F] border border-amber-200 hover:bg-amber-100 transition-colors"
                      title="Cộng 6 tháng"
                    >
                      +6 Tháng
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpiryInMonths(12)}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-[#8C6D1F] border border-amber-200 hover:bg-amber-100 transition-colors"
                      title="Cộng 12 tháng"
                    >
                      +1 Năm
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6E1D7] text-xs font-mono font-bold focus:outline-none focus:border-[#264939] bg-white"
                />
              </div>
            </div>
          </div>

          {/* Specialty Product Image Upload Section */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#1A2820]">
              Hình Ảnh Đặc Sản *
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Image Preview Card */}
              <div className="bg-[#FAF9F5] p-3 rounded-2xl border border-[#E6E1D7] flex flex-col items-center justify-center text-center">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview Đặc Sản"
                    className="h-24 w-full object-contain rounded-xl bg-white border border-[#EDE9E0] p-1"
                  />
                ) : (
                  <div className="h-24 w-full flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-dashed border-[#CCD8CF]">
                    <ImageIcon className="w-6 h-6 text-gray-300" />
                    <span className="text-[10px] mt-1">Chưa có ảnh</span>
                  </div>
                )}
                <span className="text-[10px] font-bold text-[#264939] mt-2">Xem Trước Ảnh Lô Hàng</span>
              </div>

              {/* Upload Input & Presets */}
              <div className="sm:col-span-2 space-y-2.5">
                <div className="flex items-center gap-2">
                  <label className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-[#E0ECE4] text-[#264939] text-xs font-bold border border-[#CCD8CF] cursor-pointer hover:bg-[#d0e2d5] transition-all">
                    <Upload className="w-4 h-4 text-[#264939]" />
                    <span>Tải Ảnh Từ Máy Tính</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Hoặc dán đường dẫn ảnh URL (https://...)..."
                    className="w-full px-3 py-1.5 rounded-xl border border-[#E6E1D7] text-[11px] font-mono focus:outline-none focus:border-[#264939] bg-[#FAF9F5]"
                  />
                </div>

                {/* Preset Selector */}
                <div>
                  <span className="text-[10px] font-bold text-[#8A9D92] block mb-1">
                    Hoặc chọn ảnh đặc sản mẫu:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {sampleSpecialtyImages.map((sample) => (
                      <button
                        type="button"
                        key={sample.name}
                        onClick={() => setImageUrl(sample.url)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                          imageUrl === sample.url
                            ? 'bg-[#264939] text-white border-[#264939]'
                            : 'bg-[#FAF9F5] text-[#5E7166] border-[#E6E1D7] hover:border-[#264939]'
                        }`}
                      >
                        {sample.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#EDE9E0] flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#264939] text-white font-bold text-xs hover:bg-[#1c372b] transition-all shadow-2xs disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Khởi Tạo Lô Hàng</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
