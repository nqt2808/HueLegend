import React, { useState, useEffect } from 'react';
import { Batch, Checkpoint } from '../types';
import {
  Search,
  QrCode,
  ShieldCheck,
  Building2,
  MapPin,
  ExternalLink,
  Printer,
  CheckCircle2,
  Clock,
  UserCheck,
  Camera,
  Layers,
  Package,
  Star,
  Award,
  Calendar,
  Truck,
  Store,
  Thermometer,
  FileCheck,
  Copy,
  Check,
  Lock,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ETHERSCAN_BASE_URL, ROLE_HASHES } from '../constants';

interface LookupTabProps {
  batches: Record<string, Batch>;
  selectedBatchCode?: string;
  onOpenQRStampModal: (batchCode: string) => void;
  onOpenJourneyModal?: (batchCode: string) => void;
  currentAccount?: string | null;
  onConnectWallet?: () => void;
}

// Ham tao danh sach nhat ky hanh trinh chuoi cung ung day du 4 chang chi tiet theo thu tu sequential (Chiet 1 -> 2 -> 3 -> 4)
export const getEnrichedCheckpoints = (batch: Batch): (Checkpoint & { stageIcon: any; stageBadgeColor: string; envNote?: string; isCompleted: boolean })[] => {
  const existing = batch.checkpoints || [];

  const prodDate = batch.productionDate || new Date(batch.createdAt * 1000).toLocaleDateString('vi-VN');
  const expDate = batch.expiryDate || new Date((batch.createdAt + 180 * 86400) * 1000).toLocaleDateString('vi-VN');

  // Chang 1: San xuat & Khai bao lo hang (Luon la buoc dau tien khi tao lo)
  const explicitCp1 = existing[0];
  const cp1: Checkpoint & { stageIcon: any; stageBadgeColor: string; envNote?: string; isCompleted: boolean } = explicitCp1 ? {
    ...explicitCp1,
    stepName: explicitCp1.stepName || 'Cháº·ng 1: Khai BÃ¡o Nguá»“n Gá»‘c & Sáº£n Xuáº¥t Ban Äáº§u',
    stageIcon: Package,
    stageBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    envNote: `NSX: ${prodDate} | HSD: ${expDate} | Äáº¡t ATVSTP`,
    isCompleted: true
  } : {
    stepName: 'Cháº·ng 1: Khai BÃ¡o Nguá»“n Gá»‘c & Sáº£n Xuáº¥t Ban Äáº§u',
    role: ROLE_HASHES.ROLE_PRODUCER,
    roleTitle: 'CÆ¡ Sá»Ÿ Sáº£n Xuáº¥t',
    location: batch.origin || 'PhÃº Vang, Thá»«a ThiÃªn Huáº¿',
    action: `Khá»Ÿi táº¡o lÃ´ hÃ ng & thanh toÃ¡n phÃ­ tháº©m Ä‘á»‹nh OCOP. ÄÃ£ mÃ£ hÃ³a dá»¯ liá»‡u nguyÃªn liá»‡u vÃ  quy trÃ¬nh sáº£n xuáº¥t thá»§ cÃ´ng truyá»n thá»‘ng lÃªn Sepolia Testnet.`,
    timestamp: batch.createdAt,
    recorder: batch.producer,
    metadataURI: `ipfs://huelegend/batch/${batch.batchCode}`,
    txHash: batch.txHash || '0x4f8e...82a1',
    conditionNote: `Nhiá»‡t Ä‘á»™ Ä‘Ã³ng gÃ³i: 22Â°C | Äá»™ áº©m: 45% | Háº¡n sá»­ dá»¥ng: ${expDate}`,
    stageIcon: Package,
    stageBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    envNote: `NSX: ${prodDate} | HSD: ${expDate} | Báº£o quáº£n nÆ¡i khÃ´ rÃ¡o thoÃ¡ng mÃ¡t`,
    isCompleted: true
  };

  // Chang 2: Kiem dinh OCOP (Yeu cau Chang 1 hoan thanh -> Boolean(batch.isVerified))
  const explicitCp2 = existing.find(c =>
    c.role === ROLE_HASHES.ROLE_INSPECTOR ||
    (c.stepName && (c.stepName.toLowerCase().includes('ocop') || c.stepName.toLowerCase().includes('kiá»ƒm Ä‘á»‹nh') || c.stepName.toLowerCase().includes('cháº·ng 2')))
  );

  const isCp2Done = Boolean(batch.isVerified);

  const cp2: Checkpoint & { stageIcon: any; stageBadgeColor: string; envNote?: string; isCompleted: boolean } = explicitCp2 ? {
    ...explicitCp2,
    stageIcon: Award,
    stageBadgeColor: isCp2Done ? 'bg-amber-100 text-[#8C6D1F] border-amber-300' : 'bg-gray-100 text-gray-600 border-gray-300',
    envNote: isCp2Done ? `Chá»©ng nháº­n OCOP ${batch.starRating || '4'} Sao | Sá»‘ HS: ${batch.certificationNo || 'OCOP-HUE-2026'}` : 'Chá» xÃ©t duyá»‡t OCOP',
    isCompleted: isCp2Done
  } : {
    stepName: 'Cháº·ng 2: Tháº©m Äá»‹nh & Cáº¥p Chá»©ng Nháº­n OCOP Thá»«a ThiÃªn Huáº¿',
    role: ROLE_HASHES.ROLE_INSPECTOR,
    roleTitle: 'Kiá»ƒm Äá»‹nh ViÃªn OCOP',
    location: 'Sá»Ÿ NÃ´ng Nghiá»‡p & PTNT Tá»‰nh Thá»«a ThiÃªn Huáº¿',
    action: isCp2Done
      ? `Há»™i Ä‘á»“ng tháº©m Ä‘á»‹nh OCOP Tá»‰nh Thá»«a ThiÃªn Huáº¿ Ä‘Ã£ duyá»‡t vÃ  cáº¥p chá»©ng nháº­n háº¡ng ${batch.starRating || '4'} Sao. Ghi chÃº: ${batch.inspectorNote || 'Äáº¡t tiÃªu chuáº©n an toÃ n thá»±c pháº©m vÃ  cháº¥t lÆ°á»£ng Ä‘áº·c sáº£n Thá»«a ThiÃªn Huáº¿.'}`
      : 'Há»“ sÆ¡ lÃ´ hÃ ng Ä‘ang chá» Há»™i Ä‘á»“ng tháº©m Ä‘á»‹nh OCOP tá»‰nh xÃ©t duyá»‡t vÃ  kÃ½ sá»‘ chá»©ng nháº­n on-chain.',
    timestamp: isCp2Done ? batch.createdAt + 3600 : batch.createdAt + 1800,
    recorder: 'ChÆ°a cÃ³ Ä‘á»‹a chá»‰ ngÆ°á»i ghi tá»« blockchain',
    metadataURI: batch.certificateURI || `ipfs://huelegend/cert/${batch.batchCode}`,
    txHash: batch.verifyTxHash || (isCp2Done ? '0xa19c...982f' : ''),
    conditionNote: isCp2Done ? `Cáº¥p mÃ£ sá»‘ OCOP: ${batch.certificationNo || 'OCOP-HUE-2026'}. ÄÃ£ xÃ¡c thá»±c phÃ­ 0.002 ETH.` : 'Äang trong quy trÃ¬nh Ä‘Ã¡nh giÃ¡ chá»‰ tiÃªu cháº¥t lÆ°á»£ng.',
    stageIcon: Award,
    stageBadgeColor: isCp2Done ? 'bg-amber-100 text-[#8C6D1F] border-amber-300' : 'bg-gray-100 text-gray-600 border-gray-300',
    envNote: isCp2Done ? `Äáº¡t Háº¡ng OCOP ${batch.starRating || '4'} Sao Tá»‰nh Thá»«a ThiÃªn Huáº¿` : 'Chá» cáº¥p chá»©ng nháº­n OCOP',
    isCompleted: isCp2Done
  };

  // Chang 3: Vanchuyen & Cold-Chain (Yeu cau Chang 2 hoan thanh -> isCp2Done va co checkpoint Van chuyen)
  const explicitCp3: Checkpoint | undefined = existing.find(c =>
    c.role === ROLE_HASHES.ROLE_LOGISTICS ||
    (c.stepName && (c.stepName.toLowerCase().includes('váº­n chuyá»ƒn') || c.stepName.toLowerCase().includes('cháº·ng 3') || c.stepName.toLowerCase().includes('kho')))
  );

  const isCp3Done = Boolean(isCp2Done && explicitCp3);

  const cp3: Checkpoint & { stageIcon: any; stageBadgeColor: string; envNote?: string; isCompleted: boolean } = explicitCp3 ? {
    ...explicitCp3,
    stageIcon: Truck,
    stageBadgeColor: isCp3Done ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-gray-100 text-gray-500 border-gray-300',
    envNote: isCp3Done ? 'Kho láº¡nh báº£o quáº£n 16Â°C - 20Â°C | NiÃªm phong xe thÃ¹ng xá»‘p báº£o Ã´n' : 'ChÆ°a hoÃ n thÃ nh Cháº·ng 2 OCOP',
    isCompleted: isCp3Done
  } : {
    stepName: 'Cháº·ng 3: ÄÃ³ng GÃ³i NiÃªm Phong & Váº­n Chuyá»ƒn Cold-Chain',
    role: ROLE_HASHES.ROLE_LOGISTICS,
    roleTitle: 'ÄÆ¡n Vá»‹ Logistics & BÆ°u ChÃ­nh',
    location: 'Trung TÃ¢m BÆ°u ChÃ­nh Logistics Cá»‘ ÄÃ´ Huáº¿ - Ga Huáº¿ & SÃ¢n Bay PhÃº BÃ i',
    action: !isCp2Done
      ? 'ChÆ°a thá»ƒ thá»±c hiá»‡n: LÃ´ hÃ ng cáº§n hoÃ n thÃ nh Tháº©m Äá»‹nh OCOP (Cháº·ng 2) trÆ°á»›c khi ÄÆ¡n vá»‹ váº­n chuyá»ƒn tiáº¿p nháº­n.'
      : 'ÄÃ£ hoÃ n thÃ nh Tháº©m Ä‘á»‹nh OCOP. Äang chá» ÄÆ¡n vá»‹ váº­n chuyá»ƒn (ROLE_LOGISTICS) tiáº¿p nháº­n kho láº¡nh & ghi nháº­n cháº·ng váº­n chuyá»ƒn 3.',
    timestamp: isCp3Done ? batch.createdAt + 7200 : batch.createdAt + 3600,
    recorder: (explicitCp3 as any)?.recorder || batch.producer,
    metadataURI: `ipfs://huelegend/logistics/${batch.batchCode}`,
    txHash: (explicitCp3 as any)?.txHash || '',
    conditionNote: isCp3Done ? 'Nhiá»‡t Ä‘á»™ thÃ¹ng láº¡nh: 18Â°C | Äá»™ áº©m 50% | Tráº¡ng thÃ¡i niÃªm phong nguyÃªn váº¹n.' : 'Chá» Ä‘Æ¡n vá»‹ váº­n chuyá»ƒn tiáº¿p nháº­n',
    stageIcon: Truck,
    stageBadgeColor: isCp3Done ? 'bg-blue-100 text-blue-800 border-blue-300' : (isCp2Done ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'),
    envNote: isCp3Done ? 'Theo dÃµi cáº£m biáº¿n Cold-Chain | Xe táº£i chuyÃªn dá»¥ng báº£o quáº£n Ä‘áº·c sáº£n' : (isCp2Done ? 'Äá»§ Ä‘iá»u kiá»‡n â€” Chá» ÄÆ¡n vá»‹ Váº­n chuyá»ƒn ghi Cháº·ng 3' : 'KhÃ³a â€” Cáº§n hoÃ n thÃ nh Cháº·ng 2 Tháº©m Äá»‹nh OCOP'),
    isCompleted: isCp3Done
  };

  // Chang 4: Niem yet Cua hang & Ban le (Yeu cau Chang 3 hoan thanh -> isCp3Done va batch.isListed / explicitCp4)
  const explicitCp4: Checkpoint | undefined = existing.find(c =>
    c.role === ROLE_HASHES.ROLE_RETAILER ||
    (c.stepName && (c.stepName.toLowerCase().includes('niÃªm yáº¿t') || c.stepName.toLowerCase().includes('cháº·ng 4') || c.stepName.toLowerCase().includes('cá»­a hÃ ng')))
  );

  const isCp4Done = Boolean(isCp3Done && (batch.isListed || explicitCp4));

  const cp4: Checkpoint & { stageIcon: any; stageBadgeColor: string; envNote?: string; isCompleted: boolean } = explicitCp4 ? {
    ...explicitCp4,
    stageIcon: Store,
    stageBadgeColor: isCp4Done ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-gray-100 text-gray-500 border-gray-300',
    envNote: isCp4Done ? `Cá»­a hÃ ng: ${batch.storeName || 'Äáº¡i lÃ½ Äáº·c sáº£n Huáº¿'} | GiÃ¡: ${batch.listingPriceEth || '0.005'} ETH` : 'ChÆ°a hoÃ n thÃ nh Cháº·ng 3 Váº­n chuyá»ƒn',
    isCompleted: isCp4Done
  } : {
    stepName: 'Cháº·ng 4: NiÃªm Yáº¿t Cá»­a HÃ ng Äáº·c Sáº£n & Tra Cá»©u Tem QR KhÃ¡ch HÃ ng',
    role: ROLE_HASHES.ROLE_RETAILER,
    roleTitle: 'Äáº¡i LÃ½ PhÃ¢n Phá»‘i / Cá»­a HÃ ng Äáº·c Sáº£n',
    location: batch.storeName || 'Cá»­a HÃ ng Äáº·c Sáº£n HueLegend - 12 LÃª Lá»£i, TP. Huáº¿',
    action: isCp4Done
      ? `ÄÃ£ nháº­n lÃ´ hÃ ng táº¡i showroom, quÃ©t mÃ£ tem QR kiá»ƒm tra chá»¯ kÃ½ sá»‘ on-chain há»£p lá»‡ vÃ  niÃªm yáº¿t cÃ´ng khai cho du khÃ¡ch & khÃ¡ch hÃ ng.`
      : (!isCp3Done
          ? 'ChÆ°a thá»ƒ thá»±c hiá»‡n: LÃ´ hÃ ng pháº£i Ä‘Æ°á»£c ÄÆ¡n vá»‹ Váº­n chuyá»ƒn tiáº¿p nháº­n & hoÃ n thÃ nh Cháº·ng 3 trÆ°á»›c khi Äáº¡i lÃ½ NiÃªm yáº¿t táº¡i Showroom.'
          : 'ÄÃ£ hoÃ n thÃ nh Cháº·ng 3 Váº­n chuyá»ƒn. Äang chá» Äáº¡i lÃ½ BÃ¡n láº» (ROLE_RETAILER) tiáº¿p nháº­n vÃ  NiÃªm yáº¿t giÃ¡ bÃ¡n cÃ´ng khai táº¡i Showroom.'),
    timestamp: isCp4Done ? batch.createdAt + 14400 : batch.createdAt + 10800,
    recorder: (explicitCp4 as any)?.recorder || batch.producer,
    metadataURI: `ipfs://huelegend/store/${batch.batchCode}`,
    txHash: (explicitCp4 as any)?.txHash || '',
    conditionNote: isCp4Done ? `GiÃ¡ niÃªm yáº¿t showroom: ${batch.listingPriceEth || '0.005'} ETH. Sáºµn sÃ ng quÃ©t QR tra cá»©u minh báº¡ch.` : 'Chá» Ä‘áº¡i lÃ½ bÃ¡n láº» niÃªm yáº¿t',
    stageIcon: Store,
    stageBadgeColor: isCp4Done ? 'bg-purple-100 text-purple-800 border-purple-300' : (isCp3Done ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-500 border-gray-200'),
    envNote: isCp4Done ? 'ÄÃ£ niÃªm yáº¿t chÃ­nh thá»©c táº¡i showroom Ä‘áº·c sáº£n' : (isCp3Done ? 'Äá»§ Ä‘iá»u kiá»‡n â€” Chá» Äáº¡i lÃ½ NiÃªm yáº¿t Cháº·ng 4' : 'KhÃ³a â€” Cáº§n hoÃ n thÃ nh Cháº·ng 3 Váº­n Chuyá»ƒn'),
    isCompleted: isCp4Done
  };

  const allBaseStages = [cp1, cp2, cp3, cp4];

  // Chi lay cac chang DA DUOC XAC NHAN VA HOAN THANH (isCompleted === true)
  const completedBaseStages = allBaseStages.filter((st) => st.isCompleted);

  // Tim cac chang bo sung khac (nhu Chang 5 Khach hang thanh toan don hang)
  const extraCheckpoints = existing.slice(1).filter((c) => {
    const is2 = c.role === ROLE_HASHES.ROLE_INSPECTOR || (c.stepName && (c.stepName.toLowerCase().includes('ocop') || c.stepName.toLowerCase().includes('kiá»ƒm Ä‘á»‹nh') || c.stepName.toLowerCase().includes('cháº·ng 2')));
    const is3 = c.role === ROLE_HASHES.ROLE_LOGISTICS || (c.stepName && (c.stepName.toLowerCase().includes('váº­n chuyá»ƒn') || c.stepName.toLowerCase().includes('cháº·ng 3') || c.stepName.toLowerCase().includes('kho')));
    const is4 = c.role === ROLE_HASHES.ROLE_RETAILER || (c.stepName && (c.stepName.toLowerCase().includes('niÃªm yáº¿t') || c.stepName.toLowerCase().includes('cháº·ng 4') || c.stepName.toLowerCase().includes('cá»­a hÃ ng')));
    return !is2 && !is3 && !is4;
  }).map((c) => ({
    ...c,
    stageIcon: Store,
    stageBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    isCompleted: true
  }));

  // Tra ve danh sach cac chang da xac nhan
  return [...completedBaseStages, ...extraCheckpoints];
};

export const LookupTab: React.FC<LookupTabProps> = ({
  batches,
  selectedBatchCode = '',
  onOpenQRStampModal,
  onOpenJourneyModal,
  currentAccount,
  onConnectWallet,
}) => {
  const batchKeys = Object.keys(batches);
  const batchList = Object.values(batches);

  // Khoi tao searchCode va activeBatch chi khi duoc chon
  const [searchCode, setSearchCode] = useState('');
  const [activeBatch, setActiveBatch] = useState<Batch | null>(
    selectedBatchCode && batches[selectedBatchCode] ? batches[selectedBatchCode] : null
  );
  const [isScanning, setIsScanning] = useState(false);
  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  useEffect(() => {
    if (selectedBatchCode && batches[selectedBatchCode]) {
      setActiveBatch(batches[selectedBatchCode]);
    } else {
      setActiveBatch(null);
    }
  }, [selectedBatchCode, batches]);

  const handleSearch = (code: string) => {
    const formatted = code.trim().toUpperCase();
    if (!formatted) {
      setActiveBatch(null);
      setSearchCode('');
      return;
    }
    setSearchCode(formatted);
    if (batches[formatted]) {
      setActiveBatch(batches[formatted]);
      if (onOpenJourneyModal) {
        onOpenJourneyModal(formatted);
      }
    } else {
      setActiveBatch(null);
    }
  };

  const handleCopyText = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedTx(text);
      setTimeout(() => setCopiedTx(null), 2000);
    }
  };

  const currentOriginUrl = window.location.href;
  const suggestedPlaceholder = batchKeys[0]
    ? `Gá»£i Ã½ nháº­p mÃ£ lÃ´: ${batchKeys[0]}`
    : 'Nháº­p mÃ£ lÃ´ Ä‘áº·c sáº£n (VÃ­ dá»¥: HL-MEXUNG-2026-001)...';

  const enrichedCheckpoints = activeBatch ? getEnrichedCheckpoints(activeBatch) : [];

  return (
    <div className="space-y-6 font-sans">
      {/* Top Search & Camera Scan Bar */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E6E1D7] shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#EDE9E0]">
          <div className="space-y-1 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E0ECE4] text-[#264939] text-[11px] font-bold border border-[#CCD8CF]">
              <QrCode className="w-3.5 h-3.5 text-[#C29B38]" />
              <span>Cá»”NG XÃC THá»°C BLOCKCHAIN SEPOLIA</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-extrabold text-[#264939]">
              Tra Cá»©u & XÃ¡c Thá»±c Nguá»“n Gá»‘c Äáº·c Sáº£n
            </h2>
            <p className="text-xs font-sans text-[#5E7166]">
              Nháº­p mÃ£ Ä‘á»‹nh danh lÃ´ hÃ ng hoáº·c quÃ©t mÃ£ tem QR niÃªm phong Ä‘á»ƒ Ä‘á»c nháº­t kÃ½ minh báº¡ch tá»« Sepolia Testnet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onOpenQRStampModal(activeBatch?.batchCode || batchKeys[0] || '')}
              disabled={batchKeys.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C29B38] text-white text-xs font-sans font-bold hover:bg-[#8C6D1F] transition-all shadow-2xs disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>In Tem QR NiÃªm Phong</span>
            </button>
          </div>
        </div>

        {/* Refined Form Width & Search Inputs */}
        <div className="max-w-3xl mx-auto w-full pt-1 space-y-3 font-sans">
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchCode)}
                placeholder={suggestedPlaceholder}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-[#E6E1D7] text-xs sm:text-sm font-mono focus:outline-none focus:border-[#264939] bg-[#FAF9F5] shadow-inner transition-colors placeholder:text-[#8A9D92] placeholder:font-sans placeholder:font-normal"
              />
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleSearch(searchCode)}
                className="px-6 py-3 bg-[#264939] text-white font-sans font-bold text-xs rounded-2xl hover:bg-[#1c372b] transition-all shadow-xs flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Tra Cá»©u</span>
              </button>

              <button
                onClick={() => setIsScanning(!isScanning)}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#E0ECE4] text-[#264939] font-sans font-bold text-xs rounded-2xl hover:bg-[#d0e2d5] transition-all border border-[#CCD8CF] flex-1 sm:flex-none"
              >
                <Camera className="w-4 h-4" />
                <span>{isScanning ? 'Táº¯t Camera' : 'QuÃ©t MÃ£ Camera'}</span>
              </button>
            </div>
          </div>

          {/* Quick Batch Suggestion Pills */}
          {batchKeys.length > 0 && (
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2 font-sans">
              <span className="text-[11px] font-extrabold text-[#8A9D92] uppercase tracking-wider">LÃ´ On-Chain:</span>
              {batchKeys.map((code) => (
                <button
                  key={code}
                  onClick={() => handleSearch(code)}
                  className={`text-xs font-mono px-3 py-1 rounded-xl border transition-all shadow-2xs ${
                    searchCode === code
                      ? 'bg-[#264939] text-white border-[#264939] font-extrabold scale-105'
                      : 'bg-[#FAF9F5] text-[#3B4D43] border-[#E6E1D7] hover:border-[#264939] hover:bg-[#E0ECE4]/50'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          )}

          {/* Camera Simulator panel if toggled */}
          {isScanning && (
            <div className="p-5 bg-emerald-950 text-white rounded-2xl text-center space-y-3 animate-in fade-in font-sans shadow-lg">
              <div className="w-12 h-12 rounded-full bg-emerald-800/50 flex items-center justify-center mx-auto text-emerald-300">
                <QrCode className="w-6 h-6 animate-pulse" />
              </div>
              <p className="text-xs text-emerald-200 font-medium">
                {batchKeys.length > 0
                  ? 'Äang giáº£ láº­p Camera quÃ©t QR Code... Vui lÃ²ng chá»n lÃ´ bÃªn dÆ°á»›i Ä‘á»ƒ nháº­n diá»‡n láº­p tá»©c:'
                  : 'ChÆ°a cÃ³ sáº£n pháº©m nÃ o trÃªn Blockchain Ä‘á»ƒ quÃ©t.'}
              </p>
              {batchKeys.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 font-mono">
                  {batchKeys.map((code) => (
                    <button
                      key={code}
                      onClick={() => {
                        handleSearch(code);
                        setIsScanning(false);
                      }}
                      className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 rounded-xl text-xs font-bold text-white transition-all border border-emerald-700"
                    >
                      Nháº­n diá»‡n {code}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Result Display - Tu dong hien thi Lich su chi tiet khi quet tem QR HOAC khi bam Xem Chi Tiet */}
      {activeBatch ? (
        <div className="space-y-4">
          {/* Back Button to Product List */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF9F5] p-3 sm:p-4 rounded-2xl border border-[#E6E1D7] shadow-2xs font-sans">
            <button
              onClick={() => {
                setActiveBatch(null);
                setSearchCode('');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#CCD8CF] text-[#264939] hover:bg-[#E0ECE4] font-bold text-xs transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-[#264939]" />
              <span>Quay Láº¡i Danh SÃ¡ch Sáº£n Pháº©m</span>
            </button>
            <span className="text-xs text-[#5E7166] font-medium">
              Äang tra cá»©u chi tiáº¿t lÃ´ hÃ ng: <strong className="font-mono text-[#264939] text-sm">{activeBatch.batchCode}</strong> â€” {activeBatch.productName}
            </span>
          </div>
          {!currentAccount && (
            <div className="bg-[#E0ECE4] border border-[#CCD8CF] p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs font-sans text-[#264939]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#C29B38] shrink-0" />
                <span>
                  <strong>Cháº¿ Ä‘á»™ Xem CÃ´ng Khai tá»« Tem QR:</strong> Äang hiá»ƒn thá»‹ nháº­t kÃ½ hÃ nh trÃ¬nh minh báº¡ch On-Chain cho lÃ´ hÃ ng <strong>{activeBatch.batchCode}</strong>.
                </span>
              </div>
              {onConnectWallet && (
                <button
                  onClick={onConnectWallet}
                  className="px-3 py-1.5 rounded-xl bg-[#264939] text-white font-bold text-[11px] hover:bg-[#1c372b] transition-all shrink-0"
                >
                  Káº¿t Ná»‘i VÃ­
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans items-start">
            {/* Left Summary Card (5/12 Grid) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-[#E6E1D7] shadow-sm space-y-5 relative overflow-hidden">
                {/* Header Badge Row */}
                <div className="flex items-center justify-between pb-4 border-b border-[#EDE9E0] gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-sans font-bold text-[#8A9D92] uppercase tracking-wider block">
                      MÃƒ Äá»ŠNH DANH LÃ” HÃ€NG
                    </span>
                    <div className="font-mono text-xs sm:text-sm font-extrabold text-[#264939] bg-[#E0ECE4] px-2.5 py-1 rounded-lg border border-[#CCD8CF] inline-block mt-0.5 whitespace-nowrap">
                      {activeBatch.batchCode}
                    </div>
                  </div>

                  {activeBatch.isVerified ? (
                    <span className="flex items-center gap-1.5 bg-amber-50 text-[#8C6D1F] border border-amber-200 px-3 py-1.5 rounded-full text-xs font-sans font-extrabold shadow-2xs shrink-0">
                      <ShieldCheck className="w-4 h-4 text-[#C29B38]" />
                      <span>OCOP {activeBatch.starRating || '4'} SAO</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200/80 px-3 py-1.5 rounded-full text-xs font-sans font-bold shrink-0">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Chá» Kiá»ƒm Äá»‹nh</span>
                    </span>
                  )}
                </div>

                {/* Title & Product Image Header */}
                <div className="flex items-start gap-4 pt-1">
                  <img
                    src={activeBatch.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600'}
                    alt={activeBatch.productName}
                    className="w-20 h-20 rounded-2xl object-cover border border-[#EDE9E0] shadow-2xs shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif font-extrabold text-xl text-[#1A2820] leading-snug">
                      {activeBatch.productName}
                    </h3>
                    <p className="text-xs font-sans font-medium text-[#5E7166] mt-1">{activeBatch.ocopStandard}</p>
                  </div>
                </div>

                {/* OCOP Star Badge Card if verified */}
                {activeBatch.isVerified && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50/40 p-4 rounded-2xl border border-amber-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Number(activeBatch.starRating || '4') }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-[#C29B38] text-[#C29B38]" />
                        ))}
                      </div>
                      <span className="text-[11px] font-bold text-[#8C6D1F] bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                        Háº¡ng {activeBatch.starRating || '4'} Sao OCOP
                      </span>
                    </div>
                    {activeBatch.inspectorNote && (
                      <p className="text-xs text-[#1A2820] italic font-serif leading-relaxed">
                        "{activeBatch.inspectorNote}"
                      </p>
                    )}
                    <div className="text-[10px] text-[#8C6D1F] flex items-center gap-1 pt-1 font-sans border-t border-amber-200/60">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>PhÃ­ tháº©m Ä‘á»‹nh 0.002 ETH Ä‘Ã£ Ä‘Æ°á»£c CÆ¡ sá»Ÿ sáº£n xuáº¥t chi tráº£.</span>
                    </div>
                  </div>
                )}

                {/* Compact QR Code Graphic Box */}
                <div className="p-4 bg-[#FAF9F5] rounded-2xl border border-[#E6E1D7] flex flex-col items-center justify-center gap-2">
                  <QRCodeSVG
                    value={`${currentOriginUrl}?batch=${activeBatch.batchCode}`}
                    size={120}
                    level="H"
                    includeMargin={true}
                  />
                  <span className="text-[10px] text-[#8A9D92] font-mono font-medium text-center">
                    QuÃ©t mÃ£ QR báº±ng Ä‘iá»‡n thoáº¡i Ä‘á»ƒ xem chá»©ng nháº­n Sepolia
                  </span>
                </div>

                {/* Key Metadata Details with Clean Truncated Addresses */}
                <div className="space-y-3.5 text-xs sm:text-sm font-sans border-t border-[#EDE9E0] pt-4">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-[#C29B38] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[#1A2820]">Nguá»“n Gá»‘c Xuáº¥t Xá»©:</span>
                      <p className="text-[#5E7166] truncate mt-0.5">{activeBatch.origin}</p>
                    </div>
                  </div>

                  {/* Muc Thoi Gian: Ngay San Xuat & Han Su Dung */}
                  <div className="grid grid-cols-2 gap-2 bg-[#FAF9F5] p-2.5 rounded-xl border border-[#EDE9E0]">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#264939] shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-[#8A9D92] block">NgÃ y Sáº£n Xuáº¥t:</span>
                        <strong className="text-[11px] font-mono font-bold text-[#1A2820]">
                          {activeBatch.productionDate || new Date(activeBatch.createdAt * 1000).toLocaleDateString('vi-VN')}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#C29B38] shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-[#8A9D92] block">Háº¡n Sá»­ Dá»¥ng:</span>
                        <strong className="text-[11px] font-mono font-bold text-[#8C6D1F]">
                          {activeBatch.expiryDate || new Date((activeBatch.createdAt + 180 * 86400) * 1000).toLocaleDateString('vi-VN')}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Chi hien thi So Chung Nhan OCOP khi lo hang da duoc tham dinh OCOP thanh cong */}
                  {activeBatch.isVerified && (
                    <div className="flex items-start gap-2.5">
                      <Building2 className="w-4 h-4 text-[#264939] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-[#1A2820]">Sá»‘ Chá»©ng Nháº­n OCOP:</span>
                        <p className="text-[#5E7166] truncate mt-0.5">{activeBatch.certificationNo || 'Äang cáº¥p phÃ©p'}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2.5">
                    <Layers className="w-4 h-4 text-[#264939] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[#1A2820]">Quy MÃ´ / Sáº£n LÆ°á»£ng:</span>
                      <p className="text-[#5E7166] truncate mt-0.5">{activeBatch.quantity || 'Sáº£n lÆ°á»£ng On-Chain'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <UserCheck className="w-4 h-4 text-[#264939] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[#1A2820]">Äá»‹a Chá»‰ Chá»§ CÆ¡ Sá»Ÿ (Producer):</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <a
                          href={`${ETHERSCAN_BASE_URL}/address/${activeBatch.producer}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#264939] hover:underline font-mono text-xs font-bold truncate block"
                          title={activeBatch.producer}
                        >
                          {activeBatch.producer ? `${activeBatch.producer.slice(0, 10)}...${activeBatch.producer.slice(-6)}` : 'ChÆ°a cáº­p nháº­t'}
                        </a>
                        <ExternalLink className="w-3.5 h-3.5 text-[#C29B38] shrink-0" />
                      </div>
                    </div>
                  </div>

                  {activeBatch.txHash && (
                    <div className="flex items-start gap-2.5">
                      <ExternalLink className="w-4 h-4 text-[#C29B38] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-[#1A2820]">MÃ£ BÄƒm Táº¡o LÃ´ (Tx Hash):</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <a
                            href={`${ETHERSCAN_BASE_URL}/tx/${activeBatch.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#264939] hover:underline font-mono text-xs font-bold truncate block"
                            title={activeBatch.txHash}
                          >
                            {`${activeBatch.txHash.slice(0, 10)}...${activeBatch.txHash.slice(-6)}`}
                          </a>
                          <ExternalLink className="w-3.5 h-3.5 text-[#C29B38] shrink-0" />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeBatch.verifyTxHash && (
                    <div className="flex items-start gap-2.5">
                      <Award className="w-4 h-4 text-[#C29B38] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-[#1A2820]">MÃ£ BÄƒm Tháº©m Äá»‹nh (Verify Tx):</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <a
                            href={`${ETHERSCAN_BASE_URL}/tx/${activeBatch.verifyTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#264939] hover:underline font-mono text-xs font-bold truncate block"
                            title={activeBatch.verifyTxHash}
                          >
                            {`${activeBatch.verifyTxHash.slice(0, 10)}...${activeBatch.verifyTxHash.slice(-6)}`}
                          </a>
                          <ExternalLink className="w-3.5 h-3.5 text-[#C29B38] shrink-0" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Supply Chain Timeline Column (7/12 Grid) - Chi tiet hoa 4 chang hanh trinh chuoi cung ung */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-[#E6E1D7] shadow-sm space-y-6">
                <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#EDE9E0] gap-2">
                  <div>
                    <h3 className="text-xl font-serif font-extrabold text-[#264939] flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-[#C29B38]" />
                      <span>Nháº­t KÃ½ HÃ nh TrÃ¬nh Supply Chain On-Chain</span>
                    </h3>
                    <p className="text-xs font-sans text-[#5E7166] mt-0.5">
                      ToÃ n bá»™ 4 cháº·ng tá»« sáº£n xuáº¥t, tháº©m Ä‘á»‹nh OCOP, kho cold-chain Ä‘áº¿n cá»­a hÃ ng Ä‘Æ°á»£c xÃ¡c thá»±c cryptographic on-chain.
                    </p>
                  </div>
                  <span className="text-xs font-sans font-extrabold px-3 py-1 bg-[#E0ECE4] text-[#264939] rounded-full border border-[#CCD8CF] shrink-0">
                    {enrichedCheckpoints.filter(c => c.isCompleted).length}/{enrichedCheckpoints.length} Cháº·ng ÄÃ£ XÃ¡c Thá»±c
                  </span>
                </div>



                {/* Timeline Items - Detailed Step Breakdown */}
                <div className="relative pl-7 space-y-6 before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#CCD8CF]">
                  {enrichedCheckpoints.map((cp, idx) => {
                    const StageIconComponent = cp.stageIcon || CheckCircle2;
                    const dateStr = cp.timestamp
                      ? new Date(cp.timestamp * 1000).toLocaleString('vi-VN')
                      : 'ÄÃ£ mÃ£ hÃ³a on-chain';

                    return (
                      <div key={idx} className="relative group font-sans">
                        {/* Circle Node Indicator */}
                        <div className={`absolute -left-7 top-1 w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold font-mono transition-transform group-hover:scale-110 ${
                          cp.isCompleted ? 'bg-[#264939]' : 'bg-gray-400'
                        }`}>
                          {idx + 1}
                        </div>

                        <div className={`p-5 rounded-2xl border transition-all shadow-2xs space-y-3.5 ${
                          cp.isCompleted ? 'bg-[#FAF9F5] border-[#E6E1D7] hover:border-[#264939]' : 'bg-gray-50/70 border-gray-200 opacity-80'
                        }`}>
                          {/* Step Header */}
                          <div className="flex flex-wrap items-start justify-between gap-2 pb-2.5 border-b border-[#EDE9E0]">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border ${cp.stageBadgeColor}`}>
                                  {cp.roleTitle || cp.role}
                                </span>
                                {cp.isCompleted ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Há»£p Lá»‡ On-Chain</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                    <Clock className="w-3 h-3 text-gray-400" />
                                    <span>Äang Chá» Thá»±c Hiá»‡n</span>
                                  </span>
                                )}
                              </div>
                              <h4 className="font-serif font-extrabold text-base sm:text-lg text-[#1A2820] flex items-center gap-2">
                                <StageIconComponent className="w-4 h-4 text-[#C29B38] shrink-0" />
                                <span>{cp.stepName}</span>
                              </h4>
                            </div>

                            <span className="text-[11px] font-mono font-semibold text-[#5E7166] bg-white px-3 py-1 rounded-xl border border-[#EDE9E0] shrink-0 shadow-2xs">
                              {dateStr}
                            </span>
                          </div>

                          {/* Location & Action Breakdown */}
                          <div className="space-y-2.5 text-xs text-[#3B4D43]">
                            <div className="flex items-center gap-2 text-[#264939] font-bold">
                              <MapPin className="w-3.5 h-3.5 text-[#C29B38] shrink-0" />
                              <span>Äá»‹a Äiá»ƒm: {cp.location}</span>
                            </div>

                            <div className="bg-white p-3.5 rounded-xl border border-[#EDE9E0] space-y-1.5 shadow-2xs">
                              <span className="text-[10px] font-extrabold text-[#8A9D92] uppercase block">
                                Ná»™i Dung Thao TÃ¡c Supply Chain:
                              </span>
                              <p className="leading-relaxed text-[#1A2820] font-sans">
                                {cp.action}
                              </p>
                            </div>

                            {/* Sensor & Environmental Note Block */}
                            {cp.envNote && (
                              <div className="flex items-center gap-2 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/80 text-[11px] text-[#264939] font-medium">
                                <Thermometer className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span><strong>ThÃ´ng Sá»‘ Cáº£m Biáº¿n:</strong> {cp.envNote}</span>
                              </div>
                            )}

                            {cp.conditionNote && (
                              <div className="flex items-start gap-1.5 bg-[#E0ECE4]/60 p-2.5 rounded-xl border border-[#CCD8CF] text-[11px] text-[#264939]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#264939] shrink-0 mt-0.5" />
                                <span><strong>Ghi ChÃº NiÃªm Phong:</strong> {cp.conditionNote}</span>
                              </div>
                            )}
                          </div>

                          {/* Cryptographic Verification Footer */}
                          <div className="pt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8A9D92] border-t border-[#EDE9E0]">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[#1A2820] font-semibold truncate">
                                VÃ­ Ghi: {cp.recorder ? `${cp.recorder.slice(0, 8)}...${cp.recorder.slice(-6)}` : '0x...'}
                              </span>
                              {cp.recorder && (
                                <button
                                  onClick={() => handleCopyText(cp.recorder)}
                                  className="text-[#5E7166] hover:text-[#264939] transition-colors"
                                  title="Sao chÃ©p Ä‘á»‹a chá»‰ vÃ­"
                                >
                                  {copiedTx === cp.recorder ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {cp.metadataURI && (
                                <span className="font-mono text-[10px] text-[#5E7166] bg-white px-2 py-0.5 rounded border border-[#EDE9E0]">
                                  {cp.metadataURI.slice(0, 18)}...
                                </span>
                              )}
                              <a
                                href={`${ETHERSCAN_BASE_URL}/tx/${cp.txHash || activeBatch.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[#264939] font-bold hover:underline bg-[#E0ECE4] px-2.5 py-1 rounded-lg border border-[#CCD8CF]"
                              >
                                <span>Sepolia Block</span>
                                <ExternalLink className="w-3 h-3 text-[#C29B38]" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5 font-sans">
          <div className="bg-white p-6 rounded-3xl border border-[#E6E1D7] shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EDE9E0]">
              <div>
                <h3 className="text-xl font-serif font-extrabold text-[#264939] flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#C29B38]" />
                  <span>Danh SÃ¡ch Táº¥t Cáº£ Sáº£n Pháº©m & LÃ´ HÃ ng Äáº·c Sáº£n</span>
                </h3>
                <p className="text-xs text-[#5E7166] mt-0.5">
                  Báº¥m "Xem Chi Tiáº¿t Tra Cá»©u" trÃªn tá»«ng sáº£n pháº©m Ä‘á»ƒ xem tem QR niÃªm phong vÃ  nháº­t kÃ½ hÃ nh trÃ¬nh 4 cháº·ng on-chain.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-[#E0ECE4] text-[#264939] rounded-full border border-[#CCD8CF]">
                Tá»•ng sá»‘: {batchList.length} lÃ´ hÃ ng
              </span>
            </div>

            {batchList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
                {batchList.map((batch) => (
                  <div
                    key={batch.batchCode}
                    className="bg-[#FAF9F5] rounded-2xl border border-[#E6E1D7] hover:border-[#264939] p-5 space-y-4 transition-all shadow-2xs hover:shadow-md flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      {/* Batch Header & Star Rating */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold bg-[#E0ECE4] text-[#264939] px-2.5 py-1 rounded-lg border border-[#CCD8CF] truncate">
                          {batch.batchCode}
                        </span>
                        {batch.isVerified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#8C6D1F] bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                            <Star className="w-3 h-3 fill-[#C29B38] text-[#C29B38]" />
                            <span>OCOP {batch.starRating || '4'} Sao</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Chá» Kiá»ƒm Äá»‹nh</span>
                          </span>
                        )}
                      </div>

                      {/* Product Thumbnail & Name */}
                      <div className="flex items-center gap-3">
                        <img
                          src={batch.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600'}
                          alt={batch.productName}
                          className="w-16 h-16 rounded-xl object-cover border border-[#EDE9E0] shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-serif font-extrabold text-base text-[#1A2820] truncate group-hover:text-[#264939] transition-colors">
                            {batch.productName}
                          </h4>
                          <p className="text-xs text-[#5E7166] truncate mt-0.5">{batch.ocopStandard}</p>
                        </div>
                      </div>

                      {/* Meta Info */}
                      <div className="space-y-1.5 text-xs text-[#3B4D43] bg-white p-3 rounded-xl border border-[#EDE9E0]">
                        <div className="flex items-center justify-between">
                          <span className="text-[#8A9D92]">Xuáº¥t xá»©:</span>
                          <span className="font-medium text-[#1A2820] truncate max-w-[160px]">{batch.origin}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#8A9D92]">NgÃ y sáº£n xuáº¥t:</span>
                          <span className="font-mono text-[#1A2820]">
                            {batch.productionDate || new Date(batch.createdAt * 1000).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#8A9D92]">Sáº£n lÆ°á»£ng:</span>
                          <span className="font-medium text-[#1A2820]">{batch.quantity || 'ChÆ°a cáº­p nháº­t'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => {
                        setActiveBatch(batch);
                        setSearchCode(batch.batchCode);
                      }}
                      className="w-full py-2.5 px-4 bg-[#264939] hover:bg-[#1c372b] text-white font-sans font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <QrCode className="w-4 h-4 text-[#C29B38]" />
                      <span>Xem Chi Tiáº¿t Tra Cá»©u</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center space-y-3 font-sans">
                <Package className="w-12 h-12 text-gray-300 mx-auto" />
                <h4 className="text-lg font-serif font-extrabold text-[#1A2820]">
                  ChÆ°a cÃ³ sáº£n pháº©m nÃ o trÃªn Blockchain
                </h4>
                <p className="text-xs text-[#5E7166] max-w-md mx-auto">
                  {searchCode
                    ? `KhÃ´ng tÃ¬m tháº¥y lÃ´ hÃ ng "${searchCode}" trÃªn Smart Contract Sepolia.`
                    : 'HÃ£y káº¿t ná»‘i vÃ­ quáº£n trá»‹ hoáº·c sáº£n xuáº¥t Ä‘á»ƒ khá»Ÿi táº¡o lÃ´ hÃ ng Ä‘áº·c sáº£n Ä‘áº§u tiÃªn.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


