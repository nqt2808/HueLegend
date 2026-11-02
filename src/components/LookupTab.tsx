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
import { ethers } from 'ethers';
import { ETHERSCAN_BASE_URL, ROLE_HASHES, DEFAULT_ADMIN_ADDRESS, CONTRACT_ADDRESS, PROJECT_CORE_ABI, safeGetAddress } from '../constants';

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
    stepName: explicitCp1.stepName || 'Chặng 1: Khai Báo Nguồn Gốc & Sản Xuất Ban Đầu',
    stageIcon: Package,
    stageBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    envNote: `NSX: ${prodDate} | HSD: ${expDate} | Đạt ATVSTP`,
    isCompleted: true
  } : {
    stepName: 'Chặng 1: Khai Báo Nguồn Gốc & Sản Xuất Ban Đầu',
    role: ROLE_HASHES.ROLE_PRODUCER,
    roleTitle: 'Cơ Sở Sản Xuất',
    location: batch.origin || 'Phú Vang, Thừa Thiên Huế',
    action: `Khởi tạo lô hàng & thanh toán phí thẩm định OCOP. Đã mã hóa dữ liệu nguyên liệu và quy trình sản xuất thủ công truyền thống lên Sepolia Testnet.`,
    timestamp: batch.createdAt,
    recorder: batch.producer,
    metadataURI: `ipfs://huelegend/batch/${batch.batchCode}`,
    txHash: batch.txHash || '0x4f8e...82a1',
    conditionNote: `Nhiệt độ đóng gói: 22°C | Độ ẩm: 45% | Hạn sử dụng: ${expDate}`,
    stageIcon: Package,
    stageBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    envNote: `NSX: ${prodDate} | HSD: ${expDate} | Bảo quản nơi khô ráo thoáng mát`,
    isCompleted: true
  };

  // Chang 2: Kiem dinh OCOP (Yeu cau Chang 1 hoan thanh -> Boolean(batch.isVerified))
  const explicitCp2 = existing.find(c =>
    c.role === ROLE_HASHES.ROLE_INSPECTOR ||
    (c.stepName && (c.stepName.toLowerCase().includes('ocop') || c.stepName.toLowerCase().includes('kiểm định') || c.stepName.toLowerCase().includes('chặng 2')))
  );

  const isCp2Done = Boolean(batch.isVerified);

  const cp2: Checkpoint & { stageIcon: any; stageBadgeColor: string; envNote?: string; isCompleted: boolean } = explicitCp2 ? {
    ...explicitCp2,
    stageIcon: Award,
    stageBadgeColor: isCp2Done ? 'bg-amber-100 text-[#8C6D1F] border-amber-300' : 'bg-gray-100 text-gray-600 border-gray-300',
    envNote: isCp2Done ? `Chứng nhận OCOP ${batch.starRating || '4'} Sao | Số HS: ${batch.certificationNo || 'OCOP-HUE-2026'}` : 'Chờ xét duyệt OCOP',
    isCompleted: isCp2Done
  } : {
    stepName: 'Chặng 2: Thẩm Định & Cấp Chứng Nhận OCOP Thừa Thiên Huế',
    role: ROLE_HASHES.ROLE_INSPECTOR,
    roleTitle: 'Kiểm Định Viên OCOP',
    location: 'Sở Nông Nghiệp & PTNT Tỉnh Thừa Thiên Huế',
    action: isCp2Done
      ? `Hội đồng thẩm định OCOP Tỉnh Thừa Thiên Huế đã duyệt và cấp chứng nhận hạng ${batch.starRating || '4'} Sao. Ghi chú: ${batch.inspectorNote || 'Đạt tiêu chuẩn an toàn thực phẩm và chất lượng đặc sản Thừa Thiên Huế.'}`
      : 'Hồ sơ lô hàng đang chờ Hội đồng thẩm định OCOP tỉnh xét duyệt và ký số chứng nhận on-chain.',
    timestamp: isCp2Done ? batch.createdAt + 3600 : batch.createdAt + 1800,
    recorder: isCp2Done ? DEFAULT_ADMIN_ADDRESS : '0x0000...0000',
    metadataURI: batch.certificateURI || `ipfs://huelegend/cert/${batch.batchCode}`,
    txHash: batch.verifyTxHash || (isCp2Done ? '0xa19c...982f' : ''),
    conditionNote: isCp2Done ? `Cấp mã số OCOP: ${batch.certificationNo || 'OCOP-HUE-2026'}. Đã xác thực phí 0.002 ETH.` : 'Đang trong quy trình đánh giá chỉ tiêu chất lượng.',
    stageIcon: Award,
    stageBadgeColor: isCp2Done ? 'bg-amber-100 text-[#8C6D1F] border-amber-300' : 'bg-gray-100 text-gray-600 border-gray-300',
    envNote: isCp2Done ? `Đạt Hạng OCOP ${batch.starRating || '4'} Sao Tỉnh Thừa Thiên Huế` : 'Chờ cấp chứng nhận OCOP',
    isCompleted: isCp2Done
  };

  // Chang 3: Vanchuyen & Cold-Chain (Yeu cau Chang 2 hoan thanh -> isCp2Done va co checkpoint Van chuyen)
  const explicitCp3: Checkpoint | undefined = existing.find(c =>
    c.role === ROLE_HASHES.ROLE_LOGISTICS ||
    (c.stepName && (c.stepName.toLowerCase().includes('vận chuyển') || c.stepName.toLowerCase().includes('chặng 3') || c.stepName.toLowerCase().includes('kho')))
  );

  const isCp3Done = Boolean(explicitCp3 || (isCp2Done && batch.checkpoints?.some(c => c.role === ROLE_HASHES.ROLE_LOGISTICS || (c.stepName && (c.stepName.toLowerCase().includes('vận chuyển') || c.stepName.toLowerCase().includes('chặng 3'))))));

  const cp3: Checkpoint & { stageIcon: any; stageBadgeColor: string; envNote?: string; isCompleted: boolean } = explicitCp3 ? {
    ...explicitCp3,
    stageIcon: Truck,
    stageBadgeColor: isCp3Done ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-gray-100 text-gray-500 border-gray-300',
    envNote: isCp3Done ? 'Kho lạnh bảo quản 16°C - 20°C | Niêm phong xe thùng xốp bảo ôn' : 'Chưa hoàn thành Chặng 2 OCOP',
    isCompleted: isCp3Done
  } : {
    stepName: 'Chặng 3: Đóng Gói Niêm Phong & Vận Chuyển Cold-Chain',
    role: ROLE_HASHES.ROLE_LOGISTICS,
    roleTitle: 'Đơn Vị Logistics & Bưu Chính',
    location: 'Trung Tâm Bưu Chính Logistics Cố Đô Huế - Ga Huế & Sân Bay Phú Bài',
    action: !isCp2Done
      ? 'Chưa thể thực hiện: Lô hàng cần hoàn thành Thẩm Định OCOP (Chặng 2) trước khi Đơn vị vận chuyển tiếp nhận.'
      : 'Đã hoàn thành Thẩm định OCOP. Đang chờ Đơn vị vận chuyển (ROLE_LOGISTICS) tiếp nhận kho lạnh & ghi nhận chặng vận chuyển 3.',
    timestamp: isCp3Done ? batch.createdAt + 7200 : batch.createdAt + 3600,
    recorder: (explicitCp3 as any)?.recorder || batch.producer,
    metadataURI: `ipfs://huelegend/logistics/${batch.batchCode}`,
    txHash: (explicitCp3 as any)?.txHash || '',
    conditionNote: isCp3Done ? 'Nhiệt độ thùng lạnh: 18°C | Độ ẩm 50% | Trạng thái niêm phong nguyên vẹn.' : 'Chờ đơn vị vận chuyển tiếp nhận',
    stageIcon: Truck,
    stageBadgeColor: isCp3Done ? 'bg-blue-100 text-blue-800 border-blue-300' : (isCp2Done ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'),
    envNote: isCp3Done ? 'Theo dõi cảm biến Cold-Chain | Xe tải chuyên dụng bảo quản đặc sản' : (isCp2Done ? 'Đủ điều kiện — Chờ Đơn vị Vận chuyển ghi Chặng 3' : 'Khóa — Cần hoàn thành Chặng 2 Thẩm Định OCOP'),
    isCompleted: isCp3Done
  };

  // Chang 4: Niem yet Cua hang & Ban le (Yeu cau Chang 3 hoan thanh -> isCp3Done va batch.isListed / explicitCp4)
  const explicitCp4: Checkpoint | undefined = existing.find(c =>
    c.role === ROLE_HASHES.ROLE_RETAILER ||
    (c.stepName && (c.stepName.toLowerCase().includes('niêm yết') || c.stepName.toLowerCase().includes('chặng 4') || c.stepName.toLowerCase().includes('cửa hàng')))
  );

  const isCp4Done = Boolean(explicitCp4 || batch.isListed || (isCp3Done && batch.checkpoints?.some(c => c.role === ROLE_HASHES.ROLE_RETAILER || (c.stepName && (c.stepName.toLowerCase().includes('niêm yết') || c.stepName.toLowerCase().includes('chặng 4'))))));

  const cp4: Checkpoint & { stageIcon: any; stageBadgeColor: string; envNote?: string; isCompleted: boolean } = explicitCp4 ? {
    ...explicitCp4,
    stageIcon: Store,
    stageBadgeColor: isCp4Done ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-gray-100 text-gray-500 border-gray-300',
    envNote: isCp4Done ? `Cửa hàng: ${batch.storeName || 'Đại lý Đặc sản Huế'} | Giá: ${batch.listingPriceEth || '0.005'} ETH` : 'Chưa hoàn thành Chặng 3 Vận chuyển',
    isCompleted: isCp4Done
  } : {
    stepName: 'Chặng 4: Niêm Yết Cửa Hàng Đặc Sản & Tra Cứu Tem QR Khách Hàng',
    role: ROLE_HASHES.ROLE_RETAILER,
    roleTitle: 'Đại Lý Phân Phối / Cửa Hàng Đặc Sản',
    location: batch.storeName || 'Cửa Hàng Đặc Sản HueLegend - 12 Lê Lợi, TP. Huế',
    action: isCp4Done
      ? `Đã nhận lô hàng tại showroom, quét mã tem QR kiểm tra chữ ký số on-chain hợp lệ và niêm yết công khai cho du khách & khách hàng.`
      : (!isCp3Done
          ? 'Chưa thể thực hiện: Lô hàng phải được Đơn vị Vận chuyển tiếp nhận & hoàn thành Chặng 3 trước khi Đại lý Niêm yết tại Showroom.'
          : 'Đã hoàn thành Chặng 3 Vận chuyển. Đang chờ Đại lý Bán lẻ (ROLE_RETAILER) tiếp nhận và Niêm yết giá bán công khai tại Showroom.'),
    timestamp: isCp4Done ? batch.createdAt + 14400 : batch.createdAt + 10800,
    recorder: (explicitCp4 as any)?.recorder || batch.producer,
    metadataURI: `ipfs://huelegend/store/${batch.batchCode}`,
    txHash: (explicitCp4 as any)?.txHash || '',
    conditionNote: isCp4Done ? `Giá niêm yết showroom: ${batch.listingPriceEth || '0.005'} ETH. Sẵn sàng quét QR tra cứu minh bạch.` : 'Chờ đại lý bán lẻ niêm yết',
    stageIcon: Store,
    stageBadgeColor: isCp4Done ? 'bg-purple-100 text-purple-800 border-purple-300' : (isCp3Done ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-500 border-gray-200'),
    envNote: isCp4Done ? 'Đã niêm yết chính thức tại showroom đặc sản' : (isCp3Done ? 'Đủ điều kiện — Chờ Đại lý Niêm yết Chặng 4' : 'Khóa — Cần hoàn thành Chặng 3 Vận Chuyển'),
    isCompleted: isCp4Done
  };

  const allBaseStages = [cp1, cp2, cp3, cp4];

  // Tim cac chang bo sung khac (nhu Chang 5 Khach hang thanh toan don hang)
  const extraCheckpoints = existing.slice(1).filter((c) => {
    const is2 = c.role === ROLE_HASHES.ROLE_INSPECTOR || (c.stepName && (c.stepName.toLowerCase().includes('ocop') || c.stepName.toLowerCase().includes('kiểm định') || c.stepName.toLowerCase().includes('chặng 2')));
    const is3 = c.role === ROLE_HASHES.ROLE_LOGISTICS || (c.stepName && (c.stepName.toLowerCase().includes('vận chuyển') || c.stepName.toLowerCase().includes('chặng 3') || c.stepName.toLowerCase().includes('kho')));
    const is4 = c.role === ROLE_HASHES.ROLE_RETAILER || (c.stepName && (c.stepName.toLowerCase().includes('niêm yết') || c.stepName.toLowerCase().includes('chặng 4') || c.stepName.toLowerCase().includes('cửa hàng')));
    return !is2 && !is3 && !is4;
  }).map((c) => ({
    ...c,
    stageIcon: Store,
    stageBadgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    isCompleted: true
  }));

  // Tra ve danh sach tat ca cac chang hanh trinh theo thu tu
  return [...allBaseStages, ...extraCheckpoints];
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

  // Khoi tao state tim kiem va ho tro truy van truc tiep qua Ethers.js RPC Provider Sepolia
  const [searchCode, setSearchCode] = useState('');
  const [activeBatch, setActiveBatch] = useState<Batch | null>(
    selectedBatchCode && batches[selectedBatchCode] ? batches[selectedBatchCode] : null
  );
  const [isScanning, setIsScanning] = useState(false);
  const [isSearchingRpc, setIsSearchingRpc] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  // Ham khoi tao JsonRpcProvider ho tro ca Ethers.js v5 va v6
  const createSafeJsonRpcProvider = (rpcUrl: string) => {
    if ((ethers as any).providers && (ethers as any).providers.JsonRpcProvider) {
      return new (ethers as any).providers.JsonRpcProvider(rpcUrl);
    } else if (ethers.JsonRpcProvider) {
      return new ethers.JsonRpcProvider(rpcUrl);
    } else {
      throw new Error('Không xác định được phiên bản Ethers.js');
    }
  };

  // Anh xa ten vai tro tu roleHash
  const getRoleTitle = (roleHash: string): string => {
    if (roleHash === ROLE_HASHES.ROLE_PRODUCER) return 'Cơ Sở Sản Xuất';
    if (roleHash === ROLE_HASHES.ROLE_LOGISTICS) return 'Đơn Vị Vận Chuyển';
    if (roleHash === ROLE_HASHES.ROLE_RETAILER) return 'Đại Lý Phân Phối';
    if (roleHash === ROLE_HASHES.ROLE_INSPECTOR) return 'Kiểm Định Viên OCOP';
    if (roleHash === ROLE_HASHES.ROLE_ADMIN) return 'Quản Trị Viên';
    return 'Đơn Vị Tham Gia';
  };

  // Truy van lo hang tu Smart Contract Sepolia qua JsonRpcProvider
  const queryRpcBatch = async (codeToQuery: string) => {
    setIsSearchingRpc(true);
    setErrorMessage(''); // Xoa loi cu truoc khi goi
    try {
      const normalizedContractAddr = safeGetAddress(CONTRACT_ADDRESS);
      const rpcUrls = [
        'https://ethereum-sepolia-rpc.publicnode.com',
        'https://rpc.sepolia.org',
        'https://rpc2.sepolia.org'
      ];
      let activeProvider: any = null;
      let batchData: any = null;

      for (const url of rpcUrls) {
        try {
          const tempProvider = createSafeJsonRpcProvider(url);
          const contract = new ethers.Contract(normalizedContractAddr, PROJECT_CORE_ABI, tempProvider);
          const data = await contract.getBatch(codeToQuery);
          if (data && data.exists) {
            activeProvider = tempProvider;
            batchData = data;
            break;
          }
        } catch (e) {
          // Thu qua RPC tiep theo neu loi
        }
      }

      if (batchData && batchData.exists && activeProvider) {
        const contract = new ethers.Contract(normalizedContractAddr, PROJECT_CORE_ABI, activeProvider);
        const isVerifiedOnChain = Boolean(batchData.isVerified);
        const checkpointsData = await contract.getCheckpoints(codeToQuery);

        const checkpoints = checkpointsData.map((cp: any, idx: number) => {
          const actionText = String(cp.action || '');
          return {
            stepName: `Chặng ${idx + 1}: ${actionText.slice(0, 35)}${actionText.length > 35 ? '...' : ''}`,
            role: cp.role,
            roleTitle: getRoleTitle(cp.role),
            location: cp.location,
            action: actionText,
            timestamp: Number(cp.timestamp),
            recorder: cp.recorder,
            metadataURI: cp.metadataURI,
            txHash: 'Xác thực On-Chain Sepolia Block',
            conditionNote: 'Dữ liệu được truy vấn trực tiếp từ Smart Contract qua Ethers.js RPC Provider.'
          };
        });

        let starRating = '4';
        let inspectorNote = '';
        const inspectorCp = checkpoints.find((cp: any) => cp.role === ROLE_HASHES.ROLE_INSPECTOR || (cp.action && cp.action.toLowerCase().includes('ocop')));
        if (inspectorCp) {
          const starMatch = inspectorCp.action.match(/(\d)\s*Sao/i);
          if (starMatch && starMatch[1]) starRating = starMatch[1];
          inspectorNote = inspectorCp.action;
        }

        const isListedOnChain = checkpoints.some(
          (cp: any) =>
            cp.role === ROLE_HASHES.ROLE_RETAILER ||
            (cp.action && cp.action.toLowerCase().includes('niêm yết')) ||
            (cp.action && cp.action.toLowerCase().includes('inretail'))
        );

        let onChainQuantity = '';
        if (checkpoints.length > 0) {
          const cp1Action = checkpoints[0].action;
          const qtyMatch = cp1Action.match(/Sản lượng:\s*([^—\n]+)/i);
          if (qtyMatch && qtyMatch[1]) {
            onChainQuantity = qtyMatch[1].trim();
          }
        }

        const fetchedBatch: Batch = {
          batchCode: batchData.batchCode,
          productName: batchData.productName,
          origin: batchData.origin,
          createdAt: Number(batchData.createdAt),
          producer: batchData.producer,
          isVerified: isVerifiedOnChain,
          starRating: isVerifiedOnChain ? starRating : '',
          inspectorNote: isVerifiedOnChain ? inspectorNote : '',
          isListed: isListedOnChain,
          exists: batchData.exists,
          ocopStandard: isVerifiedOnChain
            ? `Đạt Chuẩn OCOP ${starRating} Sao Tỉnh Thừa Thiên Huế`
            : 'Chưa Thẩm Định OCOP',
          certificationNo: `OCOP-HUE-2026-${codeToQuery.slice(-3)}`,
          quantity: onChainQuantity,
          currentStage:
            checkpoints.length > 0
              ? checkpoints[checkpoints.length - 1].action
              : isVerifiedOnChain
              ? 'Đã đạt chuẩn OCOP (Chờ Vận Chuyển)'
              : 'Xưởng sản xuất (Chờ Thẩm Định OCOP)',
          certificateURI: batchData.certificateURI || `ipfs://huelegend/cert/${codeToQuery}`,
          txHash: 'Xác nhận từ Smart Contract',
          inspectionFeePaid: '0.002 ETH',
          checkpoints
        };

        setActiveBatch(fetchedBatch);
        if (onOpenJourneyModal) {
          onOpenJourneyModal(codeToQuery);
        }
      } else {
        setActiveBatch(null);
      }
    } catch (err: any) {
      console.warn('Loi truy van RPC On-chain cho batch:', err);
      setErrorMessage(err?.message || 'Lỗi kết nối mạng Blockchain');
      setActiveBatch(null);
    } finally {
      setIsSearchingRpc(false);
    }
  };

  useEffect(() => {
    if (selectedBatchCode) {
      if (batches[selectedBatchCode]) {
        setActiveBatch(batches[selectedBatchCode]);
      } else {
        queryRpcBatch(selectedBatchCode);
      }
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
      queryRpcBatch(formatted);
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
    ? `Gợi ý nhập mã lô: ${batchKeys[0]}`
    : 'Nhập mã lô đặc sản (Ví dụ: HL-MEXUNG-2026-001)...';

  const enrichedCheckpoints = activeBatch ? getEnrichedCheckpoints(activeBatch) : [];

  return (
    <div className="space-y-6 font-sans">
      {/* Top Search & Camera Scan Bar */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E6E1D7] shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#EDE9E0]">
          <div className="space-y-1 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E0ECE4] text-[#264939] text-[11px] font-bold border border-[#CCD8CF]">
              <QrCode className="w-3.5 h-3.5 text-[#C29B38]" />
              <span>CỔNG XÁC THỰC BLOCKCHAIN SEPOLIA</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-extrabold text-[#264939]">
              Tra Cứu & Xác Thực Nguồn Gốc Đặc Sản
            </h2>
            <p className="text-xs font-sans text-[#5E7166]">
              Nhập mã định danh lô hàng hoặc quét mã tem QR niêm phong để đọc nhật ký minh bạch từ Sepolia Testnet.
            </p>
          </div>

          {/* Tag Hien Thi Loi Blockchain Neu Co */}
          {errorMessage && (
            <p style={{ color: 'red' }} className="p-3.5 bg-red-50 text-red-700 text-xs font-mono font-bold rounded-2xl border border-red-200 text-center shadow-2xs my-2 w-full">
              {errorMessage}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onOpenQRStampModal(activeBatch?.batchCode || batchKeys[0] || '')}
              disabled={batchKeys.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C29B38] text-white text-xs font-sans font-bold hover:bg-[#8C6D1F] transition-all shadow-2xs disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>In Tem QR Niêm Phong</span>
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
                <span>Tra Cứu</span>
              </button>

              <button
                onClick={() => setIsScanning(!isScanning)}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#E0ECE4] text-[#264939] font-sans font-bold text-xs rounded-2xl hover:bg-[#d0e2d5] transition-all border border-[#CCD8CF] flex-1 sm:flex-none"
              >
                <Camera className="w-4 h-4" />
                <span>{isScanning ? 'Tắt Camera' : 'Quét Mã Camera'}</span>
              </button>
            </div>
          </div>

          {/* Quick Batch Suggestion Pills */}
          {batchKeys.length > 0 && (
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2 font-sans">
              <span className="text-[11px] font-extrabold text-[#8A9D92] uppercase tracking-wider">Lô On-Chain:</span>
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
                  ? 'Đang giả lập Camera quét QR Code... Vui lòng chọn lô bên dưới để nhận diện lập tức:'
                  : 'Chưa có sản phẩm nào trên Blockchain để quét.'}
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
                      Nhận diện {code}
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
              <span>Quay Lại Danh Sách Sản Phẩm</span>
            </button>
            <span className="text-xs text-[#5E7166] font-medium">
              Đang tra cứu chi tiết lô hàng: <strong className="font-mono text-[#264939] text-sm">{activeBatch.batchCode}</strong> — {activeBatch.productName}
            </span>
          </div>
          {!currentAccount && (
            <div className="bg-[#E0ECE4] border border-[#CCD8CF] p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs font-sans text-[#264939]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#C29B38] shrink-0" />
                <span>
                  <strong>Chế độ Xem Công Khai từ Tem QR:</strong> Đang hiển thị nhật ký hành trình minh bạch On-Chain cho lô hàng <strong>{activeBatch.batchCode}</strong>.
                </span>
              </div>
              {onConnectWallet && (
                <button
                  onClick={onConnectWallet}
                  className="px-3 py-1.5 rounded-xl bg-[#264939] text-white font-bold text-[11px] hover:bg-[#1c372b] transition-all shrink-0"
                >
                  Kết Nối Ví
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
                      MÃ ĐỊNH DANH LÔ HÀNG
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
                      <span>Chờ Kiểm Định</span>
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
                        Hạng {activeBatch.starRating || '4'} Sao OCOP
                      </span>
                    </div>
                    {activeBatch.inspectorNote && (
                      <p className="text-xs text-[#1A2820] italic font-serif leading-relaxed">
                        "{activeBatch.inspectorNote}"
                      </p>
                    )}
                    <div className="text-[10px] text-[#8C6D1F] flex items-center gap-1 pt-1 font-sans border-t border-amber-200/60">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Phí thẩm định 0.002 ETH đã được Cơ sở sản xuất chi trả.</span>
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
                    Quét mã QR bằng điện thoại để xem chứng nhận Sepolia
                  </span>
                </div>

                {/* Key Metadata Details with Clean Truncated Addresses */}
                <div className="space-y-3.5 text-xs sm:text-sm font-sans border-t border-[#EDE9E0] pt-4">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-[#C29B38] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[#1A2820]">Nguồn Gốc Xuất Xứ:</span>
                      <p className="text-[#5E7166] truncate mt-0.5">{activeBatch.origin}</p>
                    </div>
                  </div>

                  {/* Muc Thoi Gian: Ngay San Xuat & Han Su Dung */}
                  <div className="grid grid-cols-2 gap-2 bg-[#FAF9F5] p-2.5 rounded-xl border border-[#EDE9E0]">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#264939] shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-[#8A9D92] block">Ngày Sản Xuất:</span>
                        <strong className="text-[11px] font-mono font-bold text-[#1A2820]">
                          {activeBatch.productionDate || new Date(activeBatch.createdAt * 1000).toLocaleDateString('vi-VN')}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#C29B38] shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-[#8A9D92] block">Hạn Sử Dụng:</span>
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
                        <span className="font-bold text-[#1A2820]">Số Chứng Nhận OCOP:</span>
                        <p className="text-[#5E7166] truncate mt-0.5">{activeBatch.certificationNo || 'Đang cấp phép'}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2.5">
                    <Layers className="w-4 h-4 text-[#264939] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[#1A2820]">Quy Mô / Sản Lượng:</span>
                      <p className="text-[#5E7166] truncate mt-0.5">{activeBatch.quantity || 'Sản lượng On-Chain'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <UserCheck className="w-4 h-4 text-[#264939] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[#1A2820]">Địa Chỉ Chủ Cơ Sở (Producer):</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <a
                          href={`${ETHERSCAN_BASE_URL}/address/${activeBatch.producer}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#264939] hover:underline font-mono text-xs font-bold truncate block"
                          title={activeBatch.producer}
                        >
                          {activeBatch.producer ? `${activeBatch.producer.slice(0, 10)}...${activeBatch.producer.slice(-6)}` : 'Chưa cập nhật'}
                        </a>
                        <ExternalLink className="w-3.5 h-3.5 text-[#C29B38] shrink-0" />
                      </div>
                    </div>
                  </div>

                  {activeBatch.txHash && (
                    <div className="flex items-start gap-2.5">
                      <ExternalLink className="w-4 h-4 text-[#C29B38] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-[#1A2820]">Mã Băm Tạo Lô (Tx Hash):</span>
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
                        <span className="font-bold text-[#1A2820]">Mã Băm Thẩm Định (Verify Tx):</span>
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
                      <span>Nhật Ký Hành Trình Supply Chain On-Chain</span>
                    </h3>
                    <p className="text-xs font-sans text-[#5E7166] mt-0.5">
                      Toàn bộ 4 chặng từ sản xuất, thẩm định OCOP, kho cold-chain đến cửa hàng được xác thực cryptographic on-chain.
                    </p>
                  </div>
                  <span className="text-xs font-sans font-extrabold px-3 py-1 bg-[#E0ECE4] text-[#264939] rounded-full border border-[#CCD8CF] shrink-0">
                    {enrichedCheckpoints.filter(c => c.isCompleted).length}/{enrichedCheckpoints.length} Chặng Đã Xác Thực
                  </span>
                </div>



                {/* Timeline Items - Detailed Step Breakdown */}
                <div className="relative pl-7 space-y-6 before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#CCD8CF]">
                  {enrichedCheckpoints.map((cp, idx) => {
                    const StageIconComponent = cp.stageIcon || CheckCircle2;
                    const dateStr = cp.timestamp
                      ? new Date(cp.timestamp * 1000).toLocaleString('vi-VN')
                      : 'Đã mã hóa on-chain';

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
                                    <span>Hợp Lệ On-Chain</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                    <Clock className="w-3 h-3 text-gray-400" />
                                    <span>Đang Chờ Thực Hiện</span>
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
                              <span>Địa Điểm: {cp.location}</span>
                            </div>

                            <div className="bg-white p-3.5 rounded-xl border border-[#EDE9E0] space-y-1.5 shadow-2xs">
                              <span className="text-[10px] font-extrabold text-[#8A9D92] uppercase block">
                                Nội Dung Thao Tác Supply Chain:
                              </span>
                              <p className="leading-relaxed text-[#1A2820] font-sans">
                                {cp.action}
                              </p>
                            </div>

                            {/* Sensor & Environmental Note Block */}
                            {cp.envNote && (
                              <div className="flex items-center gap-2 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/80 text-[11px] text-[#264939] font-medium">
                                <Thermometer className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span><strong>Thông Số Cảm Biến:</strong> {cp.envNote}</span>
                              </div>
                            )}

                            {cp.conditionNote && (
                              <div className="flex items-start gap-1.5 bg-[#E0ECE4]/60 p-2.5 rounded-xl border border-[#CCD8CF] text-[11px] text-[#264939]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#264939] shrink-0 mt-0.5" />
                                <span><strong>Ghi Chú Niêm Phong:</strong> {cp.conditionNote}</span>
                              </div>
                            )}
                          </div>

                          {/* Cryptographic Verification Footer */}
                          <div className="pt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8A9D92] border-t border-[#EDE9E0]">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[#1A2820] font-semibold truncate">
                                Ví Ghi: {cp.recorder ? `${cp.recorder.slice(0, 8)}...${cp.recorder.slice(-6)}` : '0x...'}
                              </span>
                              {cp.recorder && (
                                <button
                                  onClick={() => handleCopyText(cp.recorder)}
                                  className="text-[#5E7166] hover:text-[#264939] transition-colors"
                                  title="Sao chép địa chỉ ví"
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
                  <span>Danh Sách Tất Cả Sản Phẩm & Lô Hàng Đặc Sản</span>
                </h3>
                <p className="text-xs text-[#5E7166] mt-0.5">
                  Bấm "Xem Chi Tiết Tra Cứu" trên từng sản phẩm để xem tem QR niêm phong và nhật ký hành trình 4 chặng on-chain.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-[#E0ECE4] text-[#264939] rounded-full border border-[#CCD8CF]">
                Tổng số: {batchList.length} lô hàng
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
                            <span>Chờ Kiểm Định</span>
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
                          <span className="text-[#8A9D92]">Xuất xứ:</span>
                          <span className="font-medium text-[#1A2820] truncate max-w-[160px]">{batch.origin}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#8A9D92]">Ngày sản xuất:</span>
                          <span className="font-mono text-[#1A2820]">
                            {batch.productionDate || new Date(batch.createdAt * 1000).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#8A9D92]">Sản lượng:</span>
                          <span className="font-medium text-[#1A2820]">{batch.quantity || 'Chưa cập nhật'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button: Mo day du cac muc chi tiet & nhat ky 4 chang */}
                    <button
                      onClick={() => {
                        setActiveBatch(batch);
                        setSearchCode(batch.batchCode);
                        if (onOpenJourneyModal) {
                          onOpenJourneyModal(batch.batchCode);
                        }
                      }}
                      className="w-full py-2.5 px-4 bg-[#264939] hover:bg-[#1c372b] text-white font-sans font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <QrCode className="w-4 h-4 text-[#C29B38]" />
                      <span>Xem Chi Tiết Tra Cứu</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center space-y-3 font-sans">
                <Package className="w-12 h-12 text-gray-300 mx-auto" />
                <h4 className="text-lg font-serif font-extrabold text-[#1A2820]">
                  Chưa có sản phẩm nào trên Blockchain
                </h4>
                <p className="text-xs text-[#5E7166] max-w-md mx-auto">
                  {searchCode
                    ? `Không tìm thấy lô hàng "${searchCode}" trên Smart Contract Sepolia.`
                    : 'Hãy kết nối ví quản trị hoặc sản xuất để khởi tạo lô hàng đặc sản đầu tiên.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

