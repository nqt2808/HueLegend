import React, { useState, useEffect } from 'react';
import {
  Store,
  QrCode,
  ShoppingBag,
  ShieldCheck,
  Tag,
  Sparkles,
  Search,
  Filter,
  ShoppingCart,
  Plus,
  Minus,
  X,
  CheckCircle2,
  ExternalLink,
  CreditCard,
  Truck,
  Building2,
  Star,
  ChevronRight,
  Send,
  AlertCircle
} from 'lucide-react';
import { Batch, SPECIALTY_CATEGORIES } from '../types';
import { ETHERSCAN_BASE_URL } from '../constants';

interface StoreTabProps {
  batches: Record<string, Batch>;
  onNavigateToLookup: (batchCode: string) => void;
  onNavigateToRetailer?: () => void;
  currentAccount?: string | null;
  onAddCheckpoint?: (
    batchCode: string,
    role: string,
    location: string,
    action: string,
    metadataURI: string,
    stepName: string,
    conditionNote: string
  ) => Promise<void>;
  onOpenJourneyModal?: (batchCode: string) => void;
}

interface ProductItem {
  id: string;
  batchCode: string;
  name: string;
  category: string;
  priceVnd: number;
  priceEth: number;
  starRating: string;
  origin: string;
  image: string;
  description: string;
  unit: string;
  inStock: boolean;
  ocopStandard: string;
}

interface CartItem {
  product: ProductItem;
  quantity: number;
}

export const StoreTab: React.FC<StoreTabProps> = ({
  batches,
  onNavigateToLookup,
  onNavigateToRetailer,
  currentAccount,
  onAddCheckpoint,
  onOpenJourneyModal
}) => {
  const categories = ['Tất Cả', ...SPECIALTY_CATEGORIES];

  // Danh sach san pham duoc lay hoan toan tu du lieu lo hang da QUA XAC NHAN NIEM YET
  const [catalog, setCatalog] = useState<ProductItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất Cả');
  const [selectedStar, setSelectedStar] = useState<string>('Tất Cả');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Trang thai gio hang
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedProductDetails, setSelectedProductDetails] = useState<ProductItem | null>(null);

  // Trang thai thanh toan
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'WEB3' | 'BANK'>('COD');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [orderNote, setOrderNote] = useState<string>('');
  const [confirmedOrder, setConfirmedOrder] = useState<any>(null);

  // Loc va cap nhat danh sach cac lo hang DA XAC NHAN NIEM YET
  useEffect(() => {
    // Chi lay cac lo hang DA QUA XAC NHAN NIEM YET
    const listedBatches = Object.values(batches).filter((b) => {
      if (b.isListed) return true;
      if (b.currentStage?.toLowerCase().includes('niêm yết') || b.currentStage?.toLowerCase().includes('inretail')) return true;
      return b.checkpoints?.some(
        (cp) =>
          cp.role === '0x992329381cbb4c1a2f1a603952f4a0c8b668d2c41c7b80a6c6e755543d8c1c5a' || // ROLE_RETAILER
          cp.stepName?.toLowerCase().includes('niêm yết') ||
          cp.action?.toLowerCase().includes('niêm yết') ||
          cp.action?.toLowerCase().includes('inretail')
      );
    });

    const dynamicItems: ProductItem[] = listedBatches.map((b) => {
      const priceEth = b.listingPriceEth ? parseFloat(b.listingPriceEth) : 0.002;
      const priceVnd = Math.round(priceEth * 65000000);

      // Lay danh muc duoc chon tu lo hang hoac nhat ky niem yet
      let batchCategory = b.category;
      if (!batchCategory && b.checkpoints) {
        for (const cp of b.checkpoints) {
          const match = String(cp.action || '').match(/Danh mục:\s*([^—\n\]]+)/i);
          if (match && match[1]) {
            batchCategory = match[1].trim();
            break;
          }
        }
      }

      return {
        id: `batch-${b.batchCode}`,
        batchCode: b.batchCode,
        name: b.productName,
        category: batchCategory || SPECIALTY_CATEGORIES[0],
        priceVnd: priceVnd > 0 ? priceVnd : 130000,
        priceEth: priceEth > 0 ? priceEth : 0.002,
        starRating: b.starRating || '4',
        origin: b.storeName ? `${b.storeName} (${b.origin})` : b.origin,
        image: b.imageUrl || '/assets/aistudio/image_28ddda16.png',
        description: `Lô đặc sản ${b.productName} đã qua xác nhận niêm yết bán lẻ & niêm phong nhật ký Blockchain.`,
        unit: 'Lô / Sản Phẩm',
        inStock: true,
        ocopStandard: b.ocopStandard || 'Sản phẩm OCOP Huế On-Chain'
      };
    });

    setCatalog(dynamicItems);
  }, [batches]);

  // Them vao gio hang
  const handleAddToCart = (product: ProductItem, qty = 1) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === product.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += qty;
        return updated;
      } else {
        return [...prev, { product, quantity: qty }];
      }
    });
    setIsCartOpen(true);
  };

  // Thay doi so luong trong gio hang
  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Tong thanh tien
  const totalVnd = cart.reduce((sum, item) => sum + item.product.priceVnd * item.quantity, 0);
  const totalEth = cart.reduce((sum, item) => sum + item.product.priceEth * item.quantity, 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Filter Catalog
  const filteredProducts = catalog.filter((prod) => {
    const matchesCat = selectedCategory === 'Tất Cả' || prod.category === selectedCategory;
    const matchesStar = selectedStar === 'Tất Cả' || `${prod.starRating} SAO` === selectedStar;
    const matchesSearch =
      searchQuery === '' ||
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.batchCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.origin.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesStar && matchesSearch;
  });

  // Bat dau dat hang
  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !customerAddress) {
      alert('Vui lòng nhập đầy đủ thông tin Họ tên, Số điện thoại và Địa chỉ giao hàng.');
      return;
    }

    const newOrder = {
      orderId: `HL-ORDER-${Math.floor(100000 + Math.random() * 900000)}`,
      customerName,
      customerPhone,
      customerAddress,
      paymentMethod,
      items: [...cart],
      totalVnd,
      totalEth,
      createdAt: new Date().toLocaleString('vi-VN'),
      txHash: paymentMethod === 'WEB3' ? '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('') : null
    };

    // Tu dong ghi chang thanh toan ban giao vao Nhat Ky Hanh Trinh Supply Chain On-Chain
    if (onAddCheckpoint && cart.length > 0) {
      for (const item of cart) {
        try {
          await onAddCheckpoint(
            item.product.batchCode,
            'RETAILER',
            customerAddress,
            `Khách hàng ${customerName} (${customerPhone}) đã thanh toán thành công đơn hàng ${newOrder.orderId} (Phương thức: ${paymentMethod}).`,
            `ipfs://huelegend/order/${newOrder.orderId}`,
            `Chặng 5: Khách Hàng Thanh Toán & Bàn Giao Đơn Hàng ${newOrder.orderId}`,
            `Thanh toán thành công ${item.product.priceVnd.toLocaleString('vi-VN')} VNĐ (~${item.product.priceEth} ETH)`
          );
        } catch (err) {
          console.warn('Ghi chang thanh toan:', err);
        }
      }
    }

    setConfirmedOrder(newOrder);
    setCart([]);
    setIsCheckoutOpen(false);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Store Banner */}
      <div className="bg-gradient-to-r from-[#264939] via-[#1c372b] to-[#264939] text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none bg-[radial-gradient(#C29B38_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 border border-white/20 text-xs font-semibold backdrop-blur-xs">
              <Store className="w-4 h-4 text-[#C29B38]" />
              <span>CỬA HÀNG ĐẶC SẢN CỐ ĐÔ HUẾ - BLOCKCHAIN CERTIFIED</span>
            </div>

            <h2 className="font-serif font-extrabold text-2xl sm:text-3xl lg:text-4xl tracking-tight text-amber-100 leading-snug">
              Thưởng Thức Đặc Sản Chuẩn OCOP Cố Đô
            </h2>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-sans">
              Điểm bán niêm phong sản phẩm OCOP Thừa Thiên Huế. Khách hàng mua sắm trực tuyến với chứng nhận nguồn gốc Blockchain minh bạch 100%.
            </p>
          </div>

          {/* Quick Cart Trigger */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="inline-flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-[#C29B38] text-white font-sans font-bold text-xs sm:text-sm hover:bg-[#8C6D1F] transition-all shadow-md shrink-0 self-start md:self-center group"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {totalItemsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white animate-bounce">
                  {totalItemsCount}
                </span>
              )}
            </div>
            <span>Giỏ Hàng ({totalItemsCount})</span>
            <span className="bg-black/20 px-2 py-0.5 rounded-lg font-mono text-xs">
              {totalVnd.toLocaleString('vi-VN')} đ
            </span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-[#E6E1D7] shadow-sm space-y-4 font-sans">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên đặc sản, mã lô hàng hoặc nguồn gốc..."
              className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-[#E6E1D7] text-xs sm:text-sm font-sans focus:outline-none focus:border-[#264939] bg-[#FAF9F5] shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Star Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-bold text-[#8A9D92] uppercase shrink-0">Đánh giá OCOP:</span>
            {['Tất Cả', '5 SAO', '4 SAO'].map((star) => (
              <button
                key={star}
                onClick={() => setSelectedStar(star)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedStar === star
                    ? 'bg-[#264939] text-white shadow-2xs'
                    : 'bg-[#FAF9F5] text-[#5E7166] border border-[#E6E1D7] hover:border-[#264939]'
                }`}
              >
                {star}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-[#EDE9E0] no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-[#264939] text-white shadow-xs'
                  : 'bg-[#FAF9F5] text-[#1A2820] border border-[#E6E1D7] hover:border-[#264939] hover:bg-[#E0ECE4]/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white p-10 sm:p-14 rounded-3xl border border-[#E6E1D7] text-center space-y-4 max-w-xl mx-auto shadow-2xs">
          <div className="w-16 h-16 rounded-full bg-[#E0ECE4] text-[#264939] flex items-center justify-center mx-auto border border-[#CCD8CF]">
            <Tag className="w-8 h-8 text-[#264939]" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-serif font-extrabold text-lg sm:text-xl text-[#264939]">
              {catalog.length === 0
                ? 'Chưa Có Sản Phẩm Nào Được Xác Nhận Niêm Yết'
                : 'Không Tìm Thấy Sản Phẩm Phù Hợp'}
            </h3>
            <p className="text-xs text-[#5E7166] leading-relaxed max-w-md mx-auto">
              {catalog.length === 0
                ? 'Sản phẩm sau khi được tạo lô hàng và kiểm định OCOP cần trải qua bước Xác Nhận Niêm Yết Bán Lẻ (bởi Đại lý / Retailer) trước khi chính thức xuất hiện trên Cửa Hàng Đặc Sản.'
                : 'Thử thay đổi từ khoá tìm kiếm hoặc chọn danh mục đặc sản khác.'}
            </p>
          </div>

          {catalog.length === 0 && onNavigateToRetailer && (
            <button
              onClick={onNavigateToRetailer}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#264939] text-white font-sans font-bold text-xs hover:bg-[#1c372b] transition-all shadow-2xs mt-2"
            >
              <Store className="w-4 h-4 text-[#C29B38]" />
              <span>Chuyển Đến Trang Niêm Yết Bán Lẻ (Retailer)</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="bg-white rounded-3xl border border-[#E6E1D7] overflow-hidden shadow-xs hover:shadow-md hover:border-[#264939] transition-all flex flex-col group"
            >
              {/* Image & Badges */}
              <div className="relative h-48 bg-[#FAF9F5] overflow-hidden flex items-center justify-center p-4 border-b border-[#EDE9E0]">
                <img
                  src={prod.image}
                  alt={prod.name}
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/aistudio/image_28ddda16.png';
                  }}
                />

                {/* OCOP Star Badge */}
                <span className="absolute top-3 left-3 flex items-center gap-1 bg-amber-500/95 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-full shadow-sm backdrop-blur-xs">
                  <Star className="w-3 h-3 fill-white text-white" />
                  <span>OCOP {prod.starRating} SAO</span>
                </span>

                {/* Batch Code Badge */}
                <button
                  onClick={() => onNavigateToLookup(prod.batchCode)}
                  className="absolute bottom-3 right-3 flex items-center gap-1 bg-[#264939]/90 hover:bg-[#264939] text-white font-mono font-bold text-[10px] px-2.5 py-1 rounded-lg backdrop-blur-xs transition-all shadow-xs"
                  title="Xem nhật ký minh bạch Blockchain"
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-300" />
                  <span>{prod.batchCode}</span>
                </button>
              </div>

              {/* Body Content */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#8A9D92]">
                    <span className="font-semibold text-[#264939]">{prod.category}</span>
                    <span>{prod.unit}</span>
                  </div>

                  <h3
                    onClick={() => setSelectedProductDetails(prod)}
                    className="font-serif font-extrabold text-base text-[#1A2820] hover:text-[#264939] transition-colors cursor-pointer line-clamp-2 leading-snug"
                  >
                    {prod.name}
                  </h3>

                  <p className="text-xs text-[#5E7166] line-clamp-2 leading-relaxed">
                    {prod.description}
                  </p>
                </div>

                {/* Origin Info */}
                <div className="text-[11px] text-[#5E7166] bg-[#FAF9F5] p-2.5 rounded-xl border border-[#EDE9E0] flex items-center justify-between">
                  <span className="truncate">Nguồn gốc: <b>{prod.origin}</b></span>
                  <button
                    onClick={() => onNavigateToLookup(prod.batchCode)}
                    className="text-[#264939] font-bold hover:underline shrink-0 flex items-center gap-0.5 ml-1"
                  >
                    <span>Tem QR</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* Price & Action Row */}
                <div className="pt-2 border-t border-[#EDE9E0] flex items-center justify-between gap-2">
                  <div>
                    <div className="font-serif font-extrabold text-base sm:text-lg text-[#264939]">
                      {prod.priceVnd.toLocaleString('vi-VN')} đ
                    </div>
                    <div className="text-[10px] font-mono text-[#8C6D1F]">
                      ~{prod.priceEth} ETH (Sepolia)
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedProductDetails(prod)}
                      className="p-2 rounded-xl bg-[#FAF9F5] border border-[#E6E1D7] text-[#5E7166] hover:text-[#264939] hover:bg-[#E0ECE4]/60 transition-all"
                      title="Xem chi tiết"
                    >
                      <Sparkles className="w-4 h-4 text-[#C29B38]" />
                    </button>

                    <button
                      onClick={() => handleAddToCart(prod, 1)}
                      className="px-3.5 py-2.5 rounded-xl bg-[#264939] text-white font-sans font-bold text-xs hover:bg-[#1c372b] transition-all flex items-center gap-1.5 shadow-2xs"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Mua Ngay</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Details Modal */}
      {selectedProductDetails && (
        <div
          onClick={() => setSelectedProductDetails(null)}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans overflow-hidden"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-[#E6E1D7] max-w-2xl w-full max-h-[85vh] flex flex-col p-5 sm:p-7 shadow-2xl relative overflow-y-auto space-y-5 my-0"
          >
            <div className="flex items-start justify-between pb-3 border-b border-[#EDE9E0]">
              <div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-[#E0ECE4] text-[#264939] border border-[#CCD8CF]">
                  {selectedProductDetails.batchCode}
                </span>
                <h3 className="font-serif font-extrabold text-xl text-[#1A2820] mt-1">
                  {selectedProductDetails.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProductDetails(null)}
                className="p-1.5 rounded-full bg-[#FAF9F5] border border-[#E6E1D7] text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#E6E1D7] flex items-center justify-center">
                <img
                  src={selectedProductDetails.image}
                  alt={selectedProductDetails.name}
                  className="max-h-56 object-contain"
                />
              </div>

              <div className="space-y-3 text-xs text-[#5E7166]">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-500 text-white font-extrabold px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                    <Star className="w-3 h-3 fill-white" />
                    <span>OCOP {selectedProductDetails.starRating} SAO</span>
                  </span>
                  <span className="font-semibold text-[#264939]">{selectedProductDetails.category}</span>
                </div>

                <p className="leading-relaxed text-[#1A2820]">{selectedProductDetails.description}</p>

                <div className="bg-[#E0ECE4]/40 p-3 rounded-xl space-y-1.5 border border-[#CCD8CF]/60">
                  <div className="flex justify-between">
                    <span>Cơ sở sản xuất:</span>
                    <strong className="text-[#1A2820]">{selectedProductDetails.origin}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Quy cách đóng gói:</span>
                    <strong className="text-[#1A2820]">{selectedProductDetails.unit}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tiêu chuẩn OCOP:</span>
                    <strong className="text-[#264939]">{selectedProductDetails.ocopStandard}</strong>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="font-serif font-extrabold text-xl text-[#264939]">
                    {selectedProductDetails.priceVnd.toLocaleString('vi-VN')} VNĐ
                  </div>
                  <div className="text-xs font-mono text-[#8C6D1F]">
                    (~{selectedProductDetails.priceEth} ETH Sepolia)
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#EDE9E0] flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => {
                  const code = selectedProductDetails.batchCode;
                  setSelectedProductDetails(null);
                  onNavigateToLookup(code);
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#E0ECE4] text-[#264939] font-bold text-xs rounded-xl hover:bg-[#d0e2d5] transition-all border border-[#CCD8CF] flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-[#264939]" />
                <span>Kiểm Tra Nhật Ký Tem QR On-Chain</span>
              </button>

              <button
                onClick={() => {
                  handleAddToCart(selectedProductDetails, 1);
                  setSelectedProductDetails(null);
                }}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#264939] text-white font-bold text-xs rounded-xl hover:bg-[#1c372b] transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Thêm Vào Giỏ Hàng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shopping Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[180] flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
          <div className="bg-white w-full max-w-md h-full flex flex-col p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[#EDE9E0]">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#264939]" />
                <h3 className="font-serif font-extrabold text-lg text-[#264939]">
                  Giỏ Hàng Đặc Sản ({totalItemsCount})
                </h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-full bg-[#FAF9F5] border border-[#E6E1D7] text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 p-6 text-gray-400">
                <ShoppingBag className="w-12 h-12 text-gray-300" />
                <p className="font-bold text-[#264939]">Giỏ Hàng Của Bạn Đang Trống</p>
                <p className="text-xs">Vui lòng chọn đặc sản OCOP Huế yêu thích để tiến hành đặt hàng.</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E6E1D7] flex items-center justify-between gap-3"
                    >
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-14 h-14 object-contain rounded-xl bg-white p-1 border border-[#E6E1D7] shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <h4 className="font-serif font-extrabold text-xs text-[#1A2820] truncate">
                          {item.product.name}
                        </h4>
                        <div className="text-[11px] font-bold text-[#264939] mt-0.5">
                          {item.product.priceVnd.toLocaleString('vi-VN')} đ
                        </div>
                        <span className="text-[9px] font-mono text-[#8C6D1F]">
                          ~{item.product.priceEth} ETH
                        </span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 bg-white border border-[#E6E1D7] rounded-xl p-1 shrink-0">
                        <button
                          onClick={() => handleUpdateQuantity(item.product.id, -1)}
                          className="p-1 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-extrabold w-5 text-center">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.product.id, 1)}
                          className="p-1 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cart Summary Footer */}
                <div className="pt-4 border-t border-[#EDE9E0] space-y-3">
                  <div className="space-y-1.5 text-xs text-[#5E7166]">
                    <div className="flex justify-between">
                      <span>Tổng tiền hàng (VNĐ):</span>
                      <strong className="text-base font-serif text-[#264939]">
                        {totalVnd.toLocaleString('vi-VN')} VNĐ
                      </strong>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span>Quy đổi ETH Sepolia:</span>
                      <strong className="text-amber-800">~{totalEth.toFixed(4)} ETH</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Phí giao hàng:</span>
                      <span className="text-emerald-700 font-bold">Miễn phí giao tại Huế</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutOpen(true);
                    }}
                    className="w-full py-3.5 bg-[#264939] text-white font-sans font-bold text-xs rounded-2xl hover:bg-[#1c372b] transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    <span>Tiến Hành Đặt Hàng</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div
          onClick={() => setIsCheckoutOpen(false)}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans overflow-hidden"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-[#E6E1D7] max-w-lg w-full max-h-[85vh] flex flex-col p-5 sm:p-6 shadow-2xl relative overflow-y-auto my-0"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EDE9E0]">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#264939]" />
                <h3 className="font-serif font-extrabold text-lg text-[#264939]">
                  Xác Nhận Đơn Hàng Đặc Sản
                </h3>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1.5 rounded-full bg-[#FAF9F5] border border-[#E6E1D7] text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteOrder} className="space-y-4 pt-2 text-xs">
              {/* Order Summary Box */}
              <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#E6E1D7] space-y-2">
                <div className="font-bold text-[#264939] flex justify-between">
                  <span>TỔNG ĐƠN HÀNG ({totalItemsCount} sản phẩm):</span>
                  <span className="font-serif text-sm">{totalVnd.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono flex justify-between">
                  <span>Tương đương ETH:</span>
                  <span>~{totalEth.toFixed(4)} ETH Sepolia</span>
                </div>
              </div>

              {/* Customer Info Form */}
              <div className="space-y-3">
                <h4 className="font-serif font-extrabold text-xs text-[#1A2820] uppercase tracking-wider">
                  Thông Tin Giao Hàng
                </h4>

                <div>
                  <label className="block text-[11px] font-bold text-[#5E7166] mb-1">
                    Họ và Tên người nhận: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D7] focus:outline-none focus:border-[#264939] bg-[#FAF9F5]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#5E7166] mb-1">
                      Số điện thoại: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0905 xxx xxx"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D7] focus:outline-none focus:border-[#264939] bg-[#FAF9F5]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#5E7166] mb-1">
                      Phương thức thanh toán:
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e: any) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#E6E1D7] focus:outline-none focus:border-[#264939] bg-[#FAF9F5] font-bold text-[#264939]"
                    >
                      <option value="COD">Thanh toán khi nhận hàng (COD)</option>
                      <option value="WEB3">Thanh toán Ví Web3 ETH (Sepolia)</option>
                      <option value="BANK">Chuyển khoản Ngân hàng QR</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#5E7166] mb-1">
                    Địa chỉ giao hàng chi tiết: <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, TP. Huế hoặc tỉnh thành..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E6E1D7] focus:outline-none focus:border-[#264939] bg-[#FAF9F5]"
                  />
                </div>
              </div>

              {/* Payment Notes */}
              {paymentMethod === 'WEB3' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1 font-mono">
                  <div className="font-bold flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                    <span>Thanh Toán Trực Tiếp Qua Ví Web3:</span>
                  </div>
                  <p className="font-sans text-[10px]">
                    Địa chỉ ví kết nối: {currentAccount ? `${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}` : 'Chưa kết nối ví'}
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-[#264939] text-white font-sans font-bold text-xs rounded-2xl hover:bg-[#1c372b] transition-all flex items-center justify-center gap-2 shadow-md pt-3"
              >
                <Send className="w-4 h-4" />
                <span>Xác Nhận Đặt Hàng Ngay</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Order Confirmation Modal */}
      {confirmedOrder && (
        <div
          onClick={() => setConfirmedOrder(null)}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans overflow-hidden"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-[#E6E1D7] max-w-md w-full p-6 shadow-2xl relative text-center space-y-4 my-0 max-h-[85vh] overflow-y-auto"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto border border-emerald-300">
              <CheckCircle2 className="w-7 h-7 text-emerald-700" />
            </div>

            <div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                MÃ ĐƠN HÀNG: {confirmedOrder.orderId}
              </span>
              <h3 className="font-serif font-extrabold text-xl text-[#264939] mt-2">
                Đặt Hàng Thành Công!
              </h3>
              <p className="text-xs text-[#5E7166] mt-1">
                Cảm ơn bạn đã ủng hộ đặc sản OCOP Cố Đô Huế. Đơn hàng đang được chuẩn bị đóng gói niêm phong tem QR.
              </p>
            </div>

            <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#E6E1D7] text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span>Người nhận:</span>
                <strong className="text-[#1A2820]">{confirmedOrder.customerName}</strong>
              </div>
              <div className="flex justify-between">
                <span>Số điện thoại:</span>
                <strong className="text-[#1A2820]">{confirmedOrder.customerPhone}</strong>
              </div>
              <div className="flex justify-between">
                <span>Hình thức:</span>
                <strong className="text-[#264939]">{confirmedOrder.paymentMethod}</strong>
              </div>
              <div className="flex justify-between border-t border-[#EDE9E0] pt-1.5">
                <span>Tổng giá trị:</span>
                <strong className="font-serif text-sm text-[#264939]">
                  {confirmedOrder.totalVnd.toLocaleString('vi-VN')} đ
                </strong>
              </div>
            </div>

            <div className="space-y-2 pt-1 font-sans">
              {confirmedOrder.items && confirmedOrder.items.length > 0 && (
                <button
                  onClick={() => {
                    const firstBatchCode = confirmedOrder.items[0]?.product?.batchCode;
                    setConfirmedOrder(null);
                    if (firstBatchCode) {
                      if (onOpenJourneyModal) onOpenJourneyModal(firstBatchCode);
                      onNavigateToLookup(firstBatchCode);
                    }
                  }}
                  className="w-full py-3 bg-[#C29B38] text-white font-extrabold text-xs rounded-xl hover:bg-[#8C6D1F] transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span>Xem Nhật Ký Hành Trình On-Chain Vừa Cập Nhật</span>
                </button>
              )}

              <button
                onClick={() => setConfirmedOrder(null)}
                className="w-full py-3 bg-[#264939] text-white font-bold text-xs rounded-xl hover:bg-[#1c372b] transition-all"
              >
                Đóng & Tiếp Tục Mua Sắm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
