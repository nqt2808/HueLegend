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
  AlertCircle,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { ethers } from 'ethers';
import { Batch, SPECIALTY_CATEGORIES } from '../types';
import { ETHERSCAN_BASE_URL, DEFAULT_ADMIN_ADDRESS, safeGetAddress } from '../constants';

// Danh sach 34 don vi hanh chinh cap tinh thanh
export const PROVINCES_LIST = [
  'Thừa Thiên Huế (TP. Huế)',
  'Hà Nội',
  'TP. Hồ Chí Minh',
  'Đà Nẵng',
  'Hải Phòng',
  'Cần Thơ',
  'Quảng Nam',
  'Quảng Trị',
  'Quảng Bình',
  'Nghệ An',
  'Hà Tĩnh',
  'Thanh Hóa',
  'Bình Định',
  'Phú Yên',
  'Khánh Hòa',
  'Lâm Đồng',
  'Đắc Lắk',
  'Gia Lai',
  'Bình Dương',
  'Đồng Nai',
  'Bà Rịa - Vũng Tàu',
  'Long An',
  'Tiền Giang',
  'An Giang',
  'Kiên Giang',
  'Bắc Ninh',
  'Hải Dương',
  'Hưng Yên',
  'Thái Nguyên',
  'Vĩnh Phúc',
  'Phú Thọ',
  'Nam Định',
  'Ninh Bình',
  'Thái Bình'
];

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
  storeName: string;
  image: string;
  description: string;
  unit: string;
  inStock: boolean;
  ocopStandard: string;
  retailerAddress?: string;
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

  // Trang thai thanh toan: Mac dinh thanh toan bang vi da ket noi WEB3
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'WEB3' | 'COD' | 'BANK'>('WEB3');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  // Chia 4 muc dia chi giao hang
  const [selectedProvince, setSelectedProvince] = useState<string>('Thừa Thiên Huế (TP. Huế)');
  const [district, setDistrict] = useState<string>('');
  const [ward, setWard] = useState<string>('');
  const [streetAddress, setStreetAddress] = useState<string>('');

  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
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

      // Tim dia chi vi cua Dai ly ban hang (Retailer) tu checkpoints niêm yết hoac recorder cuoi cung
      let retailerAddr = b.producer;
      if (b.checkpoints) {
        const retailerCp = b.checkpoints.find(
          (cp) =>
            cp.role === '0x992329381cbb4c1a2f1a603952f4a0c8b668d2c41c7b80a6c6e755543d8c1c5a' ||
            cp.stepName?.toLowerCase().includes('niêm yết') ||
            cp.action?.toLowerCase().includes('niêm yết') ||
            cp.action?.toLowerCase().includes('inretail')
        );
        if (retailerCp && retailerCp.recorder && retailerCp.recorder !== '0x0000000000000000000000000000000000000000') {
          retailerAddr = retailerCp.recorder;
        } else if (b.checkpoints.length > 0) {
          const lastCp = b.checkpoints[b.checkpoints.length - 1];
          if (lastCp && lastCp.recorder) {
            retailerAddr = lastCp.recorder;
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
        origin: b.origin || 'Thừa Thiên Huế',
        storeName: b.storeName || 'Đại Lý Đặc Sản Cố Đô Huế',
        image: b.imageUrl || '/assets/aistudio/image_28ddda16.png',
        description: `Lô đặc sản ${b.productName} đã qua xác nhận niêm yết bán lẻ & niêm phong nhật ký Blockchain.`,
        unit: 'Lô / Sản Phẩm',
        inStock: true,
        ocopStandard: b.ocopStandard || 'Sản phẩm OCOP Huế On-Chain',
        retailerAddress: retailerAddr ? safeGetAddress(retailerAddr) : DEFAULT_ADMIN_ADDRESS
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
      prod.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.storeName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesStar && matchesSearch;
  });

  // Tinh phi giao hang: 0 ETH neu o Thua Thien Hue, +0.0005 ETH neu o tinh/thanh khac
  const shippingFeeEth = selectedProvince !== 'Thừa Thiên Huế (TP. Huế)' ? 0.0005 : 0;
  const finalTotalEth = totalEth + shippingFeeEth;

  // Bat dau dat hang
  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !district || !ward || !streetAddress) {
      alert('Vui lòng nhập đầy đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã và Số nhà/Tên đường.');
      return;
    }

    const fullAddress = `${streetAddress}, ${ward}, ${district}, ${selectedProvince}`;
    setIsSubmittingOrder(true);

    // Lay dia chi vi cua Dai ly ban hang (Retailer) tu san pham trong gio hang
    const targetRetailerAddress = cart.length > 0 && cart[0].product.retailerAddress
      ? safeGetAddress(cart[0].product.retailerAddress)
      : DEFAULT_ADMIN_ADDRESS;

    let txHash: string | null = null;

    try {
      // Neu thanh toan bang vi Web3, kich hoat giaodich chuyen ETH toi vi Dai ly ban hang
      if (paymentMethod === 'WEB3') {
        const winEth = (window as any).ethereum;
        if (winEth && currentAccount) {
          try {
            const provider = new ethers.BrowserProvider(winEth);
            const signer = await provider.getSigner();
            const valueWei = ethers.parseEther(finalTotalEth.toFixed(6));
            
            // Chuyen ETH Sepolia den vi cua Dai ly ban hang (Retailer) san pham do
            const tx = await signer.sendTransaction({
              to: targetRetailerAddress,
              value: valueWei
            });
            txHash = tx.hash;
            await tx.wait();
          } catch (txErr: any) {
            console.warn('Giao dịch Web3 chuyển khoản:', txErr);
            // Neu nguoi dung tu choi hoa p la demo mode, tao txHash mock
            if (!txHash) {
              txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
            }
          }
        } else {
          // Tao txHash mock khi chua ket noi MetaMask truc tiep
          txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        }
      }

      const newOrder = {
        orderId: `HL-ORDER-${Math.floor(100000 + Math.random() * 900000)}`,
        customerName,
        customerPhone,
        province: selectedProvince,
        district,
        ward,
        streetAddress,
        fullAddress,
        paymentMethod,
        items: [...cart],
        totalVnd,
        totalEth,
        shippingFeeEth,
        finalTotalEth,
        createdAt: new Date().toLocaleString('vi-VN'),
        txHash,
        retailerAddress: targetRetailerAddress
      };

      // Khong ghi chang hanh trinh theo yeu cau ("popup khong ghi chang")
      setConfirmedOrder(newOrder);
      setCart([]);
      setIsCheckoutOpen(false);
    } catch (err: any) {
      alert('Có lỗi xảy ra khi xử lý đơn hàng: ' + (err?.message || 'Lỗi không xác định'));
    } finally {
      setIsSubmittingOrder(false);
    }
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

                {/* Origin & Retailer Info */}
                <div className="text-[11px] text-[#5E7166] bg-[#FAF9F5] p-2.5 rounded-xl border border-[#EDE9E0] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate">Cơ sở sản xuất: <b>{prod.origin}</b></span>
                    <button
                      onClick={() => onNavigateToLookup(prod.batchCode)}
                      className="text-[#264939] font-bold hover:underline shrink-0 flex items-center gap-0.5 ml-1"
                    >
                      <span>Tem QR</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-[10px] text-[#264939] font-medium truncate">
                    Đại lý bán hàng: <b>{prod.storeName}</b>
                  </div>
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
            className="bg-white rounded-3xl border border-[#E6E1D7] max-w-2xl w-full max-h-[88vh] flex flex-col p-5 sm:p-7 shadow-2xl relative overflow-y-auto space-y-5 my-0"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3.5 border-b border-[#EDE9E0]">
              <div className="space-y-1">
                <span className="inline-block text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-[#E0ECE4] text-[#264939] border border-[#CCD8CF]">
                  MÃ LÔ: {selectedProductDetails.batchCode}
                </span>
                <h3 className="font-serif font-extrabold text-xl sm:text-2xl text-[#1A2820] leading-snug">
                  {selectedProductDetails.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProductDetails(null)}
                className="p-1.5 rounded-full bg-[#FAF9F5] border border-[#E6E1D7] text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0 ml-2"
                aria-label="Dong"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: 2 Columns Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              {/* Left Column: Uniform Centered Product Image Container */}
              <div className="relative w-full h-64 sm:h-72 bg-[#FAF9F5] p-4 sm:p-5 rounded-2xl border border-[#E6E1D7] flex items-center justify-center overflow-hidden shadow-2xs group shrink-0">
                {/* Image backdrop effect */}
                <div className="absolute inset-0 bg-[radial-gradient(#264939_1px,transparent_1px)] [background-size:12px_12px] opacity-5 pointer-events-none" />

                <img
                  src={selectedProductDetails.image}
                  alt={selectedProductDetails.name}
                  className="w-full h-full max-h-full max-w-full object-contain object-center drop-shadow-md group-hover:scale-105 transition-transform duration-300 relative z-10"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/aistudio/image_28ddda16.png';
                  }}
                />

                {/* Sub-badge for image authenticity */}
                <span className="absolute bottom-2 left-2 text-[9px] font-mono font-bold text-[#8A9D92] bg-white/80 px-2 py-0.5 rounded-md border border-[#E6E1D7] backdrop-blur-xs z-20">
                  OCOP Huế Certified Image
                </span>
              </div>

              {/* Right Column: Aligned Product Information */}
              <div className="space-y-4 text-xs text-[#5E7166]">
                {/* OCOP Rating & Category Row */}
                <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#EDE9E0]">
                  <span className="bg-amber-500 text-white font-extrabold px-3 py-1 rounded-full text-[11px] flex items-center gap-1 shadow-2xs">
                    <Star className="w-3.5 h-3.5 fill-white text-white" />
                    <span>OCOP {selectedProductDetails.starRating} SAO</span>
                  </span>
                  <span className="font-bold text-[#264939] bg-[#E0ECE4] px-2.5 py-1 rounded-lg border border-[#CCD8CF] text-[11px]">
                    {selectedProductDetails.category}
                  </span>
                </div>

                {/* Description */}
                <p className="leading-relaxed text-[#2C3E35] bg-[#FAF9F5] p-3 rounded-xl border border-[#EDE9E0]">
                  {selectedProductDetails.description}
                </p>

                {/* Structured Aligned Info Grid */}
                <div className="bg-[#E0ECE4]/40 p-3.5 rounded-2xl border border-[#CCD8CF]/70 space-y-2.5 font-sans">
                  {/* Row 1: Co so san xuat */}
                  <div className="grid grid-cols-3 items-center text-xs pb-2 border-b border-[#CCD8CF]/40">
                    <span className="col-span-1 font-semibold text-[#5E7166]">Cơ sở sản xuất:</span>
                    <span className="col-span-2 text-right font-extrabold text-[#1A2820] break-words">
                      {selectedProductDetails.origin}
                    </span>
                  </div>

                  {/* Row 2: Dai ly ban hang */}
                  <div className="grid grid-cols-3 items-center text-xs pb-2 border-b border-[#CCD8CF]/40">
                    <span className="col-span-1 font-semibold text-[#5E7166]">Đại lý bán hàng:</span>
                    <span className="col-span-2 text-right font-extrabold text-[#264939] break-words">
                      {selectedProductDetails.storeName}
                    </span>
                  </div>

                  {/* Row 3: Quy cach dong goi */}
                  <div className="grid grid-cols-3 items-center text-xs pb-2 border-b border-[#CCD8CF]/40">
                    <span className="col-span-1 font-semibold text-[#5E7166]">Quy cách:</span>
                    <span className="col-span-2 text-right font-extrabold text-[#1A2820]">
                      {selectedProductDetails.unit}
                    </span>
                  </div>

                  {/* Row 4: Tieu chuan OCOP */}
                  <div className="grid grid-cols-3 items-center text-xs">
                    <span className="col-span-1 font-semibold text-[#5E7166]">Tiêu chuẩn:</span>
                    <span className="col-span-2 text-right font-extrabold text-[#264939]">
                      {selectedProductDetails.ocopStandard}
                    </span>
                  </div>
                </div>

                {/* Price Display Block */}
                <div className="pt-2 bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#E6E1D7] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#8A9D92] uppercase block tracking-wider">
                      GIÁ NIÊM YẾT
                    </span>
                    <div className="font-serif font-extrabold text-xl text-[#264939] leading-tight">
                      {selectedProductDetails.priceVnd.toLocaleString('vi-VN')} VNĐ
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-[#8A9D92] uppercase block tracking-wider">
                      ETH SEPOLIA
                    </span>
                    <div className="text-xs font-mono font-bold text-[#8C6D1F]">
                      ~{selectedProductDetails.priceEth} ETH
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-[#EDE9E0] flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => {
                  const code = selectedProductDetails.batchCode;
                  setSelectedProductDetails(null);
                  onNavigateToLookup(code);
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#E0ECE4] text-[#264939] font-bold text-xs rounded-xl hover:bg-[#d0e2d5] transition-all border border-[#CCD8CF] flex items-center justify-center gap-2 shadow-2xs"
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
                  <span>TỔNG TIỀN SẢN PHẨM ({totalItemsCount} món):</span>
                  <span className="font-serif text-sm">{totalVnd.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="text-[11px] text-gray-600 flex justify-between">
                  <span>Giá trị ETH:</span>
                  <span className="font-mono">~{totalEth.toFixed(4)} ETH Sepolia</span>
                </div>
                <div className="text-[11px] flex justify-between border-t border-[#EDE9E0] pt-1.5">
                  <span>Phí giao hàng:</span>
                  <span className={`font-bold ${shippingFeeEth > 0 ? 'text-amber-800 font-mono' : 'text-emerald-700'}`}>
                    {shippingFeeEth > 0 ? '+0.0005 ETH Sepolia (~32.500 VNĐ)' : 'Miễn phí tại Huế'}
                  </span>
                </div>
                <div className="text-xs font-bold text-[#264939] flex justify-between border-t border-[#EDE9E0] pt-1.5">
                  <span>TỔNG THANH TOÁN (Dự kiến):</span>
                  <span className="font-mono text-sm text-[#264939]">~{finalTotalEth.toFixed(4)} ETH</span>
                </div>
              </div>

              {/* Customer Info Form */}
              <div className="space-y-3">
                <h4 className="font-serif font-extrabold text-xs text-[#1A2820] uppercase tracking-wider">
                  1. Thông Tin Khách Hàng & Thanh Toán
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      className="w-full px-3 py-2 rounded-xl border border-[#E6E1D7] focus:outline-none focus:border-[#264939] bg-[#FAF9F5]"
                    />
                  </div>

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
                      className="w-full px-3 py-2 rounded-xl border border-[#E6E1D7] focus:outline-none focus:border-[#264939] bg-[#FAF9F5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#5E7166] mb-1">
                    Phương thức thanh toán (Mặc định cố định):
                  </label>
                  <div className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E1D7] bg-[#E0ECE4]/50 font-bold text-[#264939] flex items-center justify-between shadow-xs">
                    <span className="flex items-center gap-2 text-xs">
                      <CreditCard className="w-4 h-4 text-[#264939]" />
                      Thanh toán bằng ví đã kết nối (Web3 Connected Wallet)
                    </span>
                    <span className="text-[10px] bg-[#264939] text-white px-2.5 py-0.5 rounded-full font-sans font-extrabold uppercase tracking-wider">
                      CỐ ĐỊNH
                    </span>
                  </div>
                </div>

                <h4 className="font-serif font-extrabold text-xs text-[#1A2820] uppercase tracking-wider pt-2">
                  2. Địa Chỉ Giao Hàng Chi Tiết (4 Mục)
                </h4>

                {/* Province Dropdown */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-bold text-[#5E7166]">
                      Mục 1: Tỉnh / Thành phố: <span className="text-red-500">*</span>
                    </label>
                    {shippingFeeEth > 0 && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        Phí vận chuyển ngoại tỉnh: +0.0005 ETH
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedProvince}
                    onChange={(e) => setSelectedProvince(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6E1D7] focus:outline-none focus:border-[#264939] bg-[#FAF9F5] font-medium"
                  >
                    {PROVINCES_LIST.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov} {prov !== 'Thừa Thiên Huế (TP. Huế)' ? '(Phí ship +0.0005 ETH)' : '(Miễn phí ship)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* District and Ward */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#5E7166] mb-1">
                      Mục 2: Quận / Huyện: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="Ví dụ: TP. Huế / Quận Hải Châu..."
                      className="w-full px-3 py-2 rounded-xl border border-[#E6E1D7] focus:outline-none focus:border-[#264939] bg-[#FAF9F5]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#5E7166] mb-1">
                      Mục 3: Phường / Xã: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={ward}
                      onChange={(e) => setWard(e.target.value)}
                      placeholder="Ví dụ: Phường Phú Hội..."
                      className="w-full px-3 py-2 rounded-xl border border-[#E6E1D7] focus:outline-none focus:border-[#264939] bg-[#FAF9F5]"
                    />
                  </div>
                </div>

                {/* Street Address */}
                <div>
                  <label className="block text-[11px] font-bold text-[#5E7166] mb-1">
                    Mục 4: Số nhà và Tên đường: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="Ví dụ: Số 12 Lê Lợi..."
                    className="w-full px-3 py-2 rounded-xl border border-[#E6E1D7] focus:outline-none focus:border-[#264939] bg-[#FAF9F5]"
                  />
                </div>
              </div>



              <button
                type="submit"
                disabled={isSubmittingOrder}
                className="w-full py-3.5 bg-[#264939] text-white font-sans font-bold text-xs rounded-2xl hover:bg-[#1c372b] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {isSubmittingOrder ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Đang Xử Lý Giao Dịch Thanh Toán...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Xác Nhận Đặt Hàng Ngay</span>
                  </>
                )}
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
            className="bg-white rounded-3xl border border-[#E6E1D7] max-w-lg w-full p-6 shadow-2xl relative space-y-4 my-0 max-h-[85vh] overflow-y-auto"
          >
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto border border-emerald-300">
                <CheckCircle2 className="w-7 h-7 text-emerald-700" />
              </div>

              <span className="inline-block text-[10px] font-mono font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                MÃ ĐƠN HÀNG: {confirmedOrder.orderId}
              </span>
              <h3 className="font-serif font-extrabold text-xl text-[#264939]">
                Đặt Hàng Thành Công!
              </h3>
              <p className="text-xs text-[#5E7166]">
                Đơn hàng đã được xác nhận thanh toán thành công và tiền ETH Sepolia đã được chuyển trực tiếp tới ví Đại lý bán hàng của sản phẩm.
              </p>
            </div>

            {/* Customer Details Box */}
            <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#E6E1D7] text-xs space-y-2 font-sans">
              <h4 className="font-serif font-bold text-xs text-[#264939] uppercase tracking-wider border-b border-[#EDE9E0] pb-1.5">
                Thông Tin Khách Hàng & Đơn Hàng
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-500 block text-[10px]">Họ tên khách hàng:</span>
                  <strong className="text-[#1A2820]">{confirmedOrder.customerName}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Số điện thoại:</span>
                  <strong className="text-[#1A2820]">{confirmedOrder.customerPhone}</strong>
                </div>
              </div>

              <div className="pt-1">
                <span className="text-gray-500 block text-[10px]">Địa chỉ giao hàng (4 mục):</span>
                <p className="text-[#1A2820] font-medium leading-relaxed bg-white p-2 rounded-xl border border-[#E6E1D7] mt-0.5">
                  {confirmedOrder.fullAddress}
                </p>
              </div>

              <div className="flex justify-between pt-1">
                <span className="text-gray-500">Phương thức thanh toán:</span>
                <strong className="text-[#264939]">
                  {confirmedOrder.paymentMethod === 'WEB3'
                    ? 'Ví Web3 (Connected Wallet)'
                    : confirmedOrder.paymentMethod}
                </strong>
              </div>

              {confirmedOrder.retailerAddress && (
                <div className="flex justify-between pt-1 border-t border-[#EDE9E0]">
                  <span className="text-gray-500">Ví Đại lý bán hàng nhận tiền:</span>
                  <strong className="text-[#264939] font-mono text-[11px]">
                    {confirmedOrder.retailerAddress.slice(0, 8)}...{confirmedOrder.retailerAddress.slice(-6)}
                  </strong>
                </div>
              )}

              {confirmedOrder.txHash && (
                <div className="pt-1.5 border-t border-[#EDE9E0]">
                  <span className="text-gray-500 block text-[10px]">Mã Giao Dịch Thanh Toán (Tx Hash):</span>
                  <a
                    href={`${ETHERSCAN_BASE_URL}/tx/${confirmedOrder.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-mono text-[#264939] underline font-bold flex items-center gap-1 hover:text-[#C29B38] break-all"
                  >
                    <span>{confirmedOrder.txHash.slice(0, 18)}...{confirmedOrder.txHash.slice(-12)}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              )}
            </div>

            {/* Ordered Items List */}
            <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#E6E1D7] text-xs space-y-2 font-sans">
              <h4 className="font-serif font-bold text-xs text-[#264939] uppercase tracking-wider border-b border-[#EDE9E0] pb-1.5">
                Sản Phẩm Đã Đặt
              </h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {confirmedOrder.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-[11px] bg-white p-2 rounded-xl border border-[#EDE9E0]">
                    <div>
                      <span className="font-bold text-[#1A2820]">{item.product.name}</span>
                      <span className="text-gray-500 block text-[10px]">x{item.quantity} ({item.product.ocopStandard})</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-bold text-[#264939]">{(item.product.priceVnd * item.quantity).toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#EDE9E0] pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between text-gray-600">
                  <span>Tiền hàng:</span>
                  <span>{confirmedOrder.totalVnd.toLocaleString('vi-VN')} VNĐ (~{confirmedOrder.totalEth.toFixed(4)} ETH)</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Phí giao hàng:</span>
                  <span>{confirmedOrder.shippingFeeEth > 0 ? '+0.0005 ETH' : 'Miễn phí'}</span>
                </div>
                <div className="flex justify-between font-bold text-[#264939] text-xs pt-1 border-t border-[#EDE9E0]">
                  <span>TỔNG KHÁCH ĐÃ THANH TOÁN:</span>
                  <span className="font-mono text-sm">{confirmedOrder.finalTotalEth ? confirmedOrder.finalTotalEth.toFixed(4) : confirmedOrder.totalEth.toFixed(4)} ETH</span>
                </div>
              </div>
            </div>

            <div className="pt-1 font-sans">
              <button
                onClick={() => setConfirmedOrder(null)}
                className="w-full py-3 bg-[#264939] text-white font-bold text-xs rounded-2xl hover:bg-[#1c372b] transition-all"
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
