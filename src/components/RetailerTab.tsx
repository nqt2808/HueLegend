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
  batches,
  isRetailerRole,
  currentAccount,
  contractBalanceEth = '0.00',
  customerSalesEth = '0.00',
  onConnectWallet,
  onAddCheckpoint,
  onWithdrawEarnings,
}) => {
  const batchList = Object.values(batches);
  // Loc danh sach cac lo hang da qua kiem dinh OCOP (Chang 2) VA da duoc don vi van chuyen ghi nhat ky (Chang 3)
  const transportBatches = batchList.filter((b) => {
    if (!b.isVerified) return false;
    const hasLogisticsCp = b.checkpoints && b.checkpoints.some(
      (c) =>
        c.role === 'ROLE_LOGISTICS' ||
        c.role === '0x32c4b0b14798e1f57ec053359d33b879c5a1a0df3bc25e62f6b8df05373a0c4f' ||
        (c.stepName && (c.stepName.toLowerCase().includes('váº­n chuyá»ƒn') || c.stepName.toLowerCase().includes('cháº·ng 3') || c.stepName.toLowerCase().includes('kho')))
    );
    return Boolean(hasLogisticsCp);
  });

  const [selectedBatchCode, setSelectedBatchCode] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(SPECIALTY_CATEGORIES[0]);
  const [storeName, setStoreName] = useState('');
  const [storeLocation, setStoreLocation] = useState('');
  const [listingPriceEth, setListingPriceEth] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [listedPrices, setListedPrices] = useState<Record<string, { price: string; store: string; storeLocation: string; stock: string; category: string; sellerAddr: string }>>({});

  const selectedBatch = batches[selectedBatchCode];

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

    setIsSubmitting(true);
    try {
      if (onAddCheckpoint) {
        const fullLocation = storeLocation ? `${storeName} - ${storeLocation}` : storeName;
        await onAddCheckpoint(
          selectedBatchCode,
          'RETAILER',
          fullLocation,
          `ÄÃ£ Nháº­p Kho & NiÃªm Yáº¿t GiÃ¡ BÃ¡n (${listingPriceEth} ETH) â€” [Cá»­a HÃ ng: ${storeName} | Äiá»ƒm BÃ¡n: ${storeLocation}] â€” [Danh má»¥c: ${selectedCategory}]`,
          'ipfs://QmHueRetailerListing2026',
          'NiÃªm Yáº¿t BÃ¡n Láº»',
          `TÃªn Cá»­a HÃ ng: ${storeName} â€” Äiá»ƒm BÃ¡n: ${storeLocation} â€” Danh má»¥c: ${selectedCategory} â€” GiÃ¡ niÃªm yáº¿t: ${listingPriceEth} ETH â€” Sá»‘ lÆ°á»£ng nháº­p kho: ${stockQuantity} â€” NgÆ°á»i bÃ¡n (Retailer): ${currentAccount || 'ChÆ°a xÃ¡c Ä‘á»‹nh'}`
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
          sellerAddr: currentAccount || 'VÃ­ Äáº¡i LÃ½ Sepolia'
        }
      }));
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
          Quy TrÃ¬nh Chuá»—i Cung á»¨ng On-Chain:
        </span>
        <div className="flex items-center gap-1.5 sm:gap-3 text-[11px] font-bold">
          <span className="text-[#5E7166]">1. Khai BÃ¡o LÃ´</span>
          <span className="text-[#8A9D92]">â†’</span>
          <span className="text-[#5E7166]">2. Tháº©m Äá»‹nh OCOP</span>
          <span className="text-[#8A9D92]">â†’</span>
          <span className="text-[#5E7166]">3. Váº­n Chuyá»ƒn</span>
          <span className="text-[#8A9D92]">â†’</span>
          <span className="px-2.5 py-1 rounded-lg bg-[#264939] text-white shadow-2xs">4. Quáº£n LÃ½ NiÃªm Yáº¿t</span>
        </div>
      </div>

      {/* KHá»I 1: BANNER THá»NG KÃŠ DOANH THU SMART CONTRACT TRÃŠN CÃ™NG (FULL WIDTH) */}
      <div className="bg-gradient-to-r from-[#264939] via-[#1c382b] to-[#12261d] text-white p-6 rounded-3xl shadow-sm border border-[#264939]/40 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#C29B38]/20 border border-[#C29B38]/40 text-[#C29B38]">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-extrabold text-base md:text-lg text-[#FAF9F5]">
                  Sá» DÆ¯ ETH KHÃCH HÃ€NG MUA Sáº¢N PHáº¨M TRONG SMART CONTRACT
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#C29B38]/20 text-[#C29B38] border border-[#C29B38]/40 shrink-0">
                  SEPOLIA
                </span>
              </div>
              <p className="text-xs text-[#E0ECE4]/70 mt-0.5">
                ProjectCore hiá»‡n táº¡i ghi nháº­n niÃªm yáº¿t on-chain; chÆ°a cÃ³ escrow/doanh thu bÃ¡n láº» on-chain
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
            <span>ChÆ°a Há»— Trá»£ RÃºt Doanh Thu On-Chain</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Item 1: So Du ETH Tu Khach Mua Hang */}
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
            <span className="text-xs text-[#E0ECE4]/70 font-medium">Doanh Thu TÃ­ch LÅ©y Tá»« KhÃ¡ch Mua HÃ ng:</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-extrabold text-amber-300">
                {displayRevenueEth}
              </span>
              <span className="text-xs font-mono font-bold text-[#E0ECE4]">ETH</span>
            </div>
            <p className="text-[10px] text-amber-200/80 font-mono">
              {!currentAccount
                ? 'ChÆ°a káº¿t ná»‘i vÃ­ (Sá»‘ dÆ° = 0.00 ETH)'
                : Number(displayRevenueEth) === 0
                ? 'ChÆ°a cÃ³ khÃ¡ch hÃ ng mua sáº£n pháº©m (Sá»‘ dÆ° = 0.00 ETH)'
                : 'ÄÃ£ nháº­n thanh toÃ¡n tá»« khÃ¡ch mua hÃ ng'}
            </p>
          </div>

          {/* Item 2: Vi Dai Ly Thu Huong */}
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
            <span className="text-xs text-[#E0ECE4]/70 font-medium">TÃ i Khoáº£n Äáº¡i LÃ½ Thá»¥ HÆ°á»Ÿng:</span>
            <div className="font-mono text-emerald-300 font-bold text-sm truncate pt-1">
              {currentAccount ? `${currentAccount.slice(0, 10)}...${currentAccount.slice(-8)}` : 'ChÆ°a káº¿t ná»‘i vÃ­'}
            </div>
            <div className="text-[10px] text-white/50">
              {currentAccount ? 'VÃ­ Ä‘ang kÃ­ch hoáº¡t trÃªn máº¡ng Sepolia' : 'Nháº¥n nÃºt phÃ­a trÃªn Ä‘á»ƒ káº¿t ná»‘i vÃ­'}
            </div>
          </div>

          {/* Item 3: Quy Tac Thanh Toan */}
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
            <span className="text-xs text-[#E0ECE4]/70 font-medium">CÆ¡ Cháº¿ KhÃ¡ch Mua HÃ ng:</span>
            <p className="text-[11px] text-white/80 leading-relaxed pt-0.5">
              {currentAccount
                ? 'VÃ­ nÃ y chá»‰ tá»± Ä‘á»™ng nháº­n & tÄƒng sá»‘ dÆ° khi khÃ¡ch mua Ä‘áº·c sáº£n thanh toÃ¡n On-Chain.'
                : 'Vui lÃ²ng káº¿t ná»‘i vÃ­ Ä‘á»ƒ xem sá»‘ dÆ° tÃ­ch lÅ©y tá»« khÃ¡ch thanh toÃ¡n vÃ  thá»±c hiá»‡n rÃºt.'}
            </p>
          </div>
        </div>
      </div>

      {/* KHá»I 2: GRID 2 Cá»˜T CÃ‚N Báº°NG CHO FORM NIÃŠM Yáº¾T VÃ€ Báº¢NG TRáº NG THÃI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cot trai (7/12): Form Niem Yet */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-[#E6E1D7] shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#EDE9E0]">
            <div className="flex items-center gap-2">
              <Store className="w-6 h-6 text-[#264939]" />
              <h2 className="text-lg font-serif font-extrabold text-[#264939]">
                Quáº£n LÃ½ NiÃªm Yáº¿t BÃ¡n Láº»
              </h2>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#E0ECE4] text-[#264939] border border-[#CCD8CF]">
              Äáº I LÃ & Cá»¬A HÃ€NG Äáº¶C Sáº¢N
            </span>
          </div>

          <p className="text-xs text-[#5E7166] leading-relaxed">
            Chá»n lÃ´ hÃ ng nháº­n tá»« Ä‘Æ¡n vá»‹ váº­n chuyá»ƒn (Ä‘Ã£ qua <strong>Kiá»ƒm Äá»‹nh OCOP</strong> & <strong>Váº­n Chuyá»ƒn</strong>) Ä‘á»ƒ nháº­p kho vÃ  niÃªm yáº¿t giÃ¡ bÃ¡n On-Chain.
          </p>

          <form onSubmit={handleListForSale} className="space-y-4 font-sans">
            <div>
              <label className="block text-xs font-bold text-[#1A2820] mb-1">
                Chá»n LÃ´ HÃ ng tá»« Ä‘Æ¡n vá»‹ váº­n chuyá»ƒn *
              </label>
              <select
                value={selectedBatchCode}
                onChange={(e) => setSelectedBatchCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D7] text-xs font-mono font-bold focus:outline-none focus:border-[#264939] bg-[#FAF9F5]"
              >
                <option value="">-- Chá»n LÃ´ HÃ ng tá»« Ä‘Æ¡n vá»‹ váº­n chuyá»ƒn --</option>
                {transportBatches.length > 0 &&
                  transportBatches.map((batch) => (
                    <option key={batch.batchCode} value={batch.batchCode}>
                      {batch.batchCode} â€” {batch.productName} (ÄÃ£ Qua Váº­n Chuyá»ƒn)
                    </option>
                  ))}
              </select>
            </div>

            {/* Chon Danh Muc Dac San (5 Danh Muc Bat Buoc) */}
            <div>
              <label className="block text-xs font-bold text-[#1A2820] mb-1 flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-[#264939]" />
                <span>Chá»n Danh Má»¥c Äáº·c Sáº£n *</span>
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
                    áº¢nh Sáº£n Pháº©m (Máº·c Äá»‹nh Tá»« ÄÆ¡n Vá»‹ Táº¡o LÃ´ HÃ ng)
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
                      <span className="text-[#8A9D92]">MÃ£ LÃ´: </span>
                      <strong className="font-mono text-[#264939]">{selectedBatch.batchCode}</strong>
                    </div>
                    <div>
                      <span className="text-[#8A9D92]">ÄÆ¡n Vá»‹ Khá»Ÿi Táº¡o: </span>
                      <strong className="font-mono text-xs">{selectedBatch.producer ? `${selectedBatch.producer.slice(0, 8)}...${selectedBatch.producer.slice(-6)}` : 'ChÆ°a cáº­p nháº­t'}</strong>
                    </div>
                    <div>
                      <span className="text-[#8A9D92]">Nguá»“n Gá»‘c: </span>
                      <strong className="text-[#1A2820]">{selectedBatch.origin}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1A2820] mb-1">
                  TÃªn Cá»­a HÃ ng *
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="VÃ­ dá»¥: Cá»­a HÃ ng Äáº·c Sáº£n Cá»‘ ÄÃ´ Huáº¿"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D7] text-xs focus:outline-none focus:border-[#264939]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A2820] mb-1">
                  Äiá»ƒm BÃ¡n *
                </label>
                <input
                  type="text"
                  required
                  value={storeLocation}
                  onChange={(e) => setStoreLocation(e.target.value)}
                  placeholder="VÃ­ dá»¥: 12 LÃª Lá»£i, TP. Huáº¿, Thá»«a ThiÃªn Huáº¿"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D7] text-xs focus:outline-none focus:border-[#264939]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1A2820] mb-1">
                  GiÃ¡ NiÃªm Yáº¿t BÃ¡n Láº» (Sepolia ETH) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    required
                    value={listingPriceEth}
                    onChange={(e) => setListingPriceEth(e.target.value)}
                    placeholder="VÃ­ dá»¥: 0.002"
                    className="w-full px-3.5 py-2.5 pr-12 rounded-xl border border-[#E6E1D7] text-xs font-mono font-bold focus:outline-none focus:border-[#264939]"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-[#8A9D92]">
                    ETH
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A2820] mb-1">
                  Sá»‘ LÆ°á»£ng Nháº­p Kho (ÄÆ¡n Vá»‹) *
                </label>
                <input
                  type="text"
                  required
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="VÃ­ dá»¥: 500 Há»™p"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D7] text-xs font-mono font-bold focus:outline-none focus:border-[#264939] bg-[#FAF9F5]"
                />
                {selectedBatch?.quantity && (
                  <p className="text-[10px] text-[#264939] font-medium mt-1">
                    âš¡ Tá»± Ä‘á»™ng láº¥y tá»« <strong>Sáº£n LÆ°á»£ng ({selectedBatch.quantity})</strong> khi khá»Ÿi táº¡o lÃ´ hÃ ng On-Chain.
                  </p>
                )}
              </div>
            </div>

            {/* Khá»‘i hiá»ƒn thá»‹ PhÃ­ NiÃªm Yáº¿t MetaMask On-Chain = (Sá»‘ LÆ°á»£ng x 0.001) + 0.005 ETH */}
            {selectedBatchCode && (
              <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#CCD8CF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#264939]">
                <div className="flex items-start gap-2.5">
                  <Wallet className="w-4 h-4 text-[#C29B38] mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-[#264939]">Giao Dá»‹ch MetaMask NiÃªm Yáº¿t On-Chain:</span>
                    <div className="text-[11px] text-[#5E7166]">
                      CÃ´ng thá»©c: (Sá»‘ lÆ°á»£ng nháº­p kho Ã— 0.001 ETH) + 0.005 ETH
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
                VÃ­ Thá»¥ HÆ°á»Ÿng: <strong className="font-mono text-[#264939]">{currentAccount ? `${currentAccount.slice(0, 8)}...${currentAccount.slice(-4)}` : 'ChÆ°a káº¿t ná»‘i vÃ­'}</strong>
              </span>

              <button
                type="submit"
                disabled={isSubmitting || !selectedBatch}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#264939] text-white font-sans font-bold text-xs hover:bg-[#1c372b] transition-all shadow-2xs disabled:opacity-50"
              >
                <Tag className="w-4 h-4 text-[#C29B38]" />
                <span>XÃ¡c Nháº­n NiÃªm Yáº¿t On-Chain</span>
              </button>
            </div>
          </form>
        </div>

        {/* Cot phai (5/12): Danh Sach Lo Hang Niem Yet */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#E6E1D7] shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EDE9E0]">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#C29B38]" />
              <h3 className="font-serif font-extrabold text-base text-[#264939]">
                Tráº¡ng ThÃ¡i NiÃªm Yáº¿t LÃ´ HÃ ng
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Active Listings
            </span>
          </div>

          {transportBatches.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 bg-[#FAF9F5] rounded-2xl border border-[#EDE9E0] space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="font-bold text-[#264939] text-sm">ChÆ°a cÃ³ lÃ´ hÃ ng tá»« Ä‘Æ¡n vá»‹ váº­n chuyá»ƒn</p>
              <p className="text-gray-500 leading-relaxed max-w-xs mx-auto">
                Cáº§n Ä‘Æ¡n vá»‹ váº­n chuyá»ƒn ghi nháº­t kÃ½ váº­n chuyá»ƒn trÆ°á»›c khi Ä‘áº¡i lÃ½ cÃ³ thá»ƒ niÃªm yáº¿t lÃªn Cá»­a hÃ ng Ä‘áº·c sáº£n.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transportBatches.map((batch: Batch) => {
                const listingInfo = listedPrices[batch.batchCode];
                return (
                  <div
                    key={batch.batchCode}
                    className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E6E1D7] space-y-2.5 hover:border-[#264939]/30 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={batch.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600'}
                        alt={batch.productName}
                        className="w-12 h-12 rounded-lg object-cover border border-[#EDE9E0] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200 truncate">
                            {batch.batchCode}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                            InRetail
                          </span>
                        </div>
                        <h4 className="font-serif font-bold text-xs text-[#1A2820] mt-1 truncate">
                          {batch.productName}
                        </h4>
                      </div>
                    </div>

                    <div className="text-xs text-[#5E7166] space-y-1 bg-white p-2.5 rounded-xl border border-[#EDE9E0]">
                      <div className="flex justify-between">
                        <span>TÃªn cá»­a hÃ ng:</span>
                        <span className="font-bold text-[#1A2820] truncate max-w-[160px]">
                          {listingInfo?.store || storeName || 'Äáº¡i LÃ½ Cá»‘ ÄÃ´'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Äiá»ƒm bÃ¡n:</span>
                        <span className="font-medium text-[#264939] truncate max-w-[160px]">
                          {listingInfo?.storeLocation || storeLocation || 'Thá»«a ThiÃªn Huáº¿'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Danh má»¥c Ä‘áº·c sáº£n:</span>
                        <span className="font-bold text-[#264939] truncate max-w-[160px]">
                          {listingInfo?.category || selectedCategory}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>GiÃ¡ bÃ¡n niÃªm yáº¿t:</span>
                        <span className="font-mono font-bold text-[#264939]">
                          {listingInfo?.price || '0.002'} ETH
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tá»“n kho Ä‘áº¡i lÃ½:</span>
                        <span className="font-mono font-bold text-amber-800">
                          {listingInfo?.stock || '100'} Ä‘Æ¡n vá»‹
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span>VÃ­ Retailer thá»¥ hÆ°á»Ÿng:</span>
                        <span className="font-mono font-bold text-emerald-700 truncate max-w-[140px]">
                          {listingInfo?.sellerAddr || currentAccount?.slice(0, 10) || 'ROLE_RETAILER'}
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



