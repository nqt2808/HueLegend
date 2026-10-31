import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { Batch, ToastMessage, GrantedWallet } from './types';
import {
  CONTRACT_ADDRESS,
  PROJECT_CORE_ABI,
  SEPOLIA_CHAIN_ID,
  ROLE_HASHES,
  ETHERSCAN_BASE_URL,
  safeGetAddress
} from './constants';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { OverviewTab } from './components/OverviewTab';
import { LookupTab } from './components/LookupTab';
import { CreateBatchTab } from './components/CreateBatchTab';
import { CheckpointTab } from './components/CheckpointTab';
import { InspectorTab } from './components/InspectorTab';
import { AdminTab } from './components/AdminTab';
import { StoreTab } from './components/StoreTab';
import { RetailerTab } from './components/RetailerTab';
import { ToastContainer } from './components/ToastContainer';
import { QRStampModal } from './components/QRStampModal';
import { RoleConnectModal } from './components/RoleConnectModal';
import { WalletDetailsModal } from './components/WalletDetailsModal';
import { BatchJourneyModal } from './components/BatchJourneyModal';
import { MobileMetaMaskModal } from './components/MobileMetaMaskModal';
import { useWalletAccess } from './hooks/useWalletAccess';
import { canPerform, canVisitTab, checkpointWorkspace, ROLE_LABELS, visibleTabs, WorkspaceRole } from './lib/access';

export const App: React.FC = () => {
  // Global State
  const [batches, setBatches] = useState<Record<string, Batch>>({});
  const [grantedWallets, setGrantedWallets] = useState<GrantedWallet[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedLookupBatch, setSelectedLookupBatch] = useState('');
  const [qrStampBatch, setQrStampBatch] = useState<Batch | null>(null);
  const [journeyBatch, setJourneyBatch] = useState<Batch | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isWalletDetailsModalOpen, setIsWalletDetailsModalOpen] = useState(false);
  const [isOpenMobileMenu, setIsOpenMobileMenu] = useState(false);
  const [isMobileMetaMaskModalOpen, setIsMobileMetaMaskModalOpen] = useState(false);
  const [mobileMetaMaskDeepLink, setMobileMetaMaskDeepLink] = useState('');
  const [modalClickPos, setModalClickPos] = useState<{ x: number; y: number } | null>(null);

  // Quyen duoc xac minh tu provider va contract, khong phuc hoi tu localStorage.
  const wallet = useWalletAccess();
  const access = wallet.session;
  const currentAccount = access.account;
  const workspace = access.workspace;
  const allowedTabs = visibleTabs(access);
  const safeActiveTab = canVisitTab(activeTab, access) ? activeTab : 'overview';
  const isCurrentAccountAdmin = canPerform(access, 'ADMIN');
  const isCurrentAccountRetailer = canPerform(access, 'RETAILER');
  const isCurrentAccountInspector = canPerform(access, 'INSPECTOR');
  const isCurrentAccountLogistics = canPerform(access, 'LOGISTICS');
  const accountRef = useRef(currentAccount);
  accountRef.current = currentAccount;
  const dataRequestRef = useRef(0);
  const [producerStakeBalance, setProducerStakeBalance] = useState('0.00');
  const [batchCreationFeeEth, setBatchCreationFeeEth] = useState('0.001');
  const [contractBalanceEth, setContractBalanceEth] = useState('0.00');
  const [customerSalesEth, setCustomerSalesEth] = useState('0.00');
  const [isSystemPaused, setIsSystemPaused] = useState(false);
  const [isLoadingContract, setIsLoadingContract] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((
    title: string,
    message: string,
    type: 'info' | 'success' | 'error' | 'warning' | 'loading' = 'info',
    duration = 4500
  ) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, title, message, type }]);

    if (duration > 0 && type !== 'loading') {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Map OpenZeppelin role hash to title
  const getRoleTitle = (roleHash: string): string => {
    if (roleHash === ROLE_HASHES.ROLE_PRODUCER) return 'Cơ Sở Sản Xuất';
    if (roleHash === ROLE_HASHES.ROLE_LOGISTICS) return 'Đơn Vị Vận Chuyển';
    if (roleHash === ROLE_HASHES.ROLE_RETAILER) return 'Đại Lý Phân Phối';
    if (roleHash === ROLE_HASHES.ROLE_INSPECTOR) return 'Kiểm Định Viên OCOP';
    if (roleHash === ROLE_HASHES.ROLE_ADMIN) return 'Quản Trị Viên';
    return 'Đơn Vị Tham Gia';
  };

  // Truy vấn dữ liệu trực tiếp từ Smart Contract Sepolia thông qua Ethers.js RPC Provider (Không sử dụng LocalStorage)
  const fetchContractData = useCallback(async (accountAddr?: string) => {
    if (typeof window === 'undefined') return;

    const requestId = ++dataRequestRef.current;
    setIsLoadingContract(true);
    try {
      const normalizedContractAddr = safeGetAddress(CONTRACT_ADDRESS);

      // Khởi tạo Ethers.js Provider: Ưu tiên BrowserProvider nếu kết nối ví, hoặc JsonRpcProvider Sepolia RPC
      const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');

      const contract = new ethers.Contract(normalizedContractAddr, PROJECT_CORE_ABI, provider);

      // 1. Truy vấn số dư ETH của Smart Contract từ Sepolia Testnet
      try {
        const balanceWei = await provider.getBalance(normalizedContractAddr);
        setContractBalanceEth(ethers.formatEther(balanceWei));
      } catch (err) {
        console.warn('Khong the lay so du ETH cua contract:', err);
      }

      // 2. Truy vấn phí khởi tạo lô hàng từ Smart Contract
      try {
        const feeWei = await contract.batchCreationFee();
        setBatchCreationFeeEth(ethers.formatEther(feeWei));
      } catch (err) {
        console.warn('Khong the lay phi tao lo hang:', err);
      }

      // Chi doc so du; khong gan quyen trong ham tai du lieu cong khai.
      const activeAccount = accountAddr || accountRef.current;
      if (activeAccount) {
        try {
          const stakeInfo = await contract.getStakeInfo(safeGetAddress(activeAccount));
          if (requestId === dataRequestRef.current && activeAccount.toLowerCase() === accountRef.current?.toLowerCase()) {
            setProducerStakeBalance(ethers.formatEther(stakeInfo.balance));
          }
        } catch { /* Khong suy doan quyen khi RPC loi. */ }
      }

      // 4. Truy vấn toàn bộ danh sách lô hàng trực tiếp từ Smart Contract qua Ethers.js
      let total = 0n;
      try {
        total = await contract.getTotalBatches();
      } catch (err) {
        console.warn('Khong the lay totalBatches tu Smart Contract:', err);
      }

      const fetchedBatches: Record<string, Batch> = {};

      if (total > 0n) {
        for (let i = 0n; i < total; i++) {
          try {
            const batchCode = await contract.getBatchCodeByIndex(i);
            const batchData = await contract.getBatch(batchCode);
            const isVerifiedOnChain = Boolean(batchData.isVerified);

            // Truy vấn mảng nhật ký chặng (checkpoints) trực tiếp từ Smart Contract
            const checkpointsData = await contract.getCheckpoints(batchCode);

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

            // Tách xếp hạng sao kiểm định OCOP từ nhật ký chặng
            let starRating = '4';
            let inspectorNote = '';
            const inspectorCp = checkpoints.find((cp: any) => cp.role === ROLE_HASHES.ROLE_INSPECTOR || (cp.action && cp.action.toLowerCase().includes('ocop')));
            if (inspectorCp) {
              const starMatch = inspectorCp.action.match(/(\d)\s*Sao/i);
              if (starMatch && starMatch[1]) starRating = starMatch[1];
              inspectorNote = inspectorCp.action;
            }

            // Kiểm tra trạng thái niêm yết bán lẻ on-chain
            const isListedOnChain = checkpoints.some(
              (cp: any) =>
                cp.role === ROLE_HASHES.ROLE_RETAILER ||
                (cp.action && cp.action.toLowerCase().includes('niêm yết')) ||
                (cp.action && cp.action.toLowerCase().includes('inretail'))
            );

            // Trích xuất số lượng nhập kho/sản lượng từ nhật ký sản xuất ban đầu
            let onChainQuantity = '';
            if (checkpoints.length > 0) {
              const cp1Action = checkpoints[0].action;
              const qtyMatch = cp1Action.match(/Sản lượng:\s*([^—\n]+)/i);
              if (qtyMatch && qtyMatch[1]) {
                onChainQuantity = qtyMatch[1].trim();
              }
            }

            fetchedBatches[batchCode] = {
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
              certificationNo: `OCOP-HUE-2026-${batchCode.slice(-3)}`,
              quantity: onChainQuantity,
              currentStage:
                checkpoints.length > 0
                  ? checkpoints[checkpoints.length - 1].action
                  : isVerifiedOnChain
                  ? 'Đã đạt chuẩn OCOP (Chờ Vận Chuyển)'
                  : 'Xưởng sản xuất (Chờ Thẩm Định OCOP)',
              certificateURI: batchData.certificateURI || `ipfs://huelegend/cert/${batchCode}`,
              txHash: 'Xác nhận từ Smart Contract',
              inspectionFeePaid: '0.002 ETH',
              checkpoints
            };
          } catch (e) {
            console.error(`Lỗi truy vấn lô hàng chỉ số ${i} từ Smart Contract:`, e);
          }
        }
      }

      // Cập nhật State trực tiếp từ kết quả truy vấn Ethers.js
      if (requestId === dataRequestRef.current) setBatches(fetchedBatches);
    } catch (err: any) {
      console.warn('Lỗi kết nối RPC Provider Smart Contract:', err);
    } finally {
      if (requestId === dataRequestRef.current) setIsLoadingContract(false);
    }
  }, []);

  // Tu dong doc tham so ?batch=... tu URL (khi quet QR) va mo Popup Nhat Ky Hanh Trinh Chi Tiet On-Chain
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const searchString = window.location.search || (window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '');
        const urlParams = new URLSearchParams(searchString);
        const batchFromUrl = urlParams.get('batch') || urlParams.get('batchCode');
        if (batchFromUrl) {
          const cleanCode = batchFromUrl.trim().toUpperCase();
          setActiveTab('lookup');

          if (batches[cleanCode]) {
            setSelectedLookupBatch(cleanCode);
            setJourneyBatch(batches[cleanCode]);
          } else {
            // Truoc khi tat ca danh sach batch duoc fetch xong, truy van RPC don le cho cleanCode
            const fetchSingleBatch = async () => {
              try {
                const normalizedContractAddr = safeGetAddress(CONTRACT_ADDRESS);
                const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
                const contract = new ethers.Contract(normalizedContractAddr, PROJECT_CORE_ABI, provider);

                const batchData = await contract.getBatch(cleanCode);
                if (batchData && batchData.exists) {
                  const isVerifiedOnChain = Boolean(batchData.isVerified);
                  const checkpointsData = await contract.getCheckpoints(cleanCode);

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

                  const singleBatch: Batch = {
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
                    certificationNo: `OCOP-HUE-2026-${cleanCode.slice(-3)}`,
                    quantity: onChainQuantity,
                    currentStage:
                      checkpoints.length > 0
                        ? checkpoints[checkpoints.length - 1].action
                        : isVerifiedOnChain
                        ? 'Đã đạt chuẩn OCOP (Chờ Vận Chuyển)'
                        : 'Xưởng sản xuất (Chờ Thẩm Định OCOP)',
                    certificateURI: batchData.certificateURI || `ipfs://huelegend/cert/${cleanCode}`,
                    txHash: 'Xác nhận từ Smart Contract',
                    inspectionFeePaid: '0.002 ETH',
                    checkpoints
                  };

                  setBatches((prev) => ({ ...prev, [cleanCode]: singleBatch }));
                  setSelectedLookupBatch(cleanCode);
                  setJourneyBatch(singleBatch);
                }
              } catch (err) {
                console.warn('Loi khi truy van lo hang tu QR URL qua RPC:', err);
              }
            };
            fetchSingleBatch();
          }
        }
      } catch (e) {
        console.warn('Khong the doc tham so URL QR:', e);
      }
    }
  }, [batches]);

  // Chi tai du lieu cong khai; khong dong bo danh tinh hay quyen giua cac trinh duyet.
  const notifyDataSync = useCallback(() => {
    try { localStorage.setItem('hl_last_sync_timestamp', Date.now().toString()); } catch {}
  }, []);

  useEffect(() => {
    void fetchContractData();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'hl_last_sync_timestamp') void fetchContractData();
    };
    window.addEventListener('storage', handleStorage);
    return () => { window.removeEventListener('storage', handleStorage); ++dataRequestRef.current; };
  }, [fetchContractData]);

  useEffect(() => {
    if (!canVisitTab(activeTab, access)) setActiveTab('overview');
  }, [activeTab, access]);

  useEffect(() => {
    setProducerStakeBalance('0.00');
    setIsWalletDetailsModalOpen(false);
    setIsOpenMobileMenu(false);
    setGrantedWallets([]);
  }, [currentAccount]);

  const executeMetaMaskConnect = async (targetRole?: string) => {
    if (!(window as any).ethereum) {
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        setMobileMetaMaskDeepLink(`https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`);
        setIsMobileMetaMaskModalOpen(true);
      } else addToast('Cần MetaMask', 'Vui lòng cài MetaMask để kết nối ví.', 'warning');
      return;
    }
    const toast = addToast('Đang Kết Nối Ví', 'Chọn tài khoản trên MetaMask. Hệ thống sẽ kiểm tra quyền trên Sepolia.', 'loading', 0);
    try {
      const verified = await wallet.connect(targetRole);
      if (verified.status === 'ready') {
        addToast(verified.notice ? 'Chưa Có Quyền Đã Chọn' : 'Kết Nối Thành Công',
          verified.notice || `Khu vực hiện tại: ${ROLE_LABELS[verified.workspace]}.`, verified.notice ? 'warning' : 'success');
        if (verified.account) void fetchContractData(verified.account);
      } else if (verified.notice) addToast('Chưa Thể Mở Chức Năng', verified.notice, 'warning');
    } catch (err: any) { addToast('Lỗi Kết Nối', err?.message || 'Không thể kết nối MetaMask.', 'error'); }
    finally { removeToast(toast); }
  };

  // Mo modal hoac xem chi tiet vi tuy theo trang thai va vi tri bam
  const handleOpenRoleConnectModal = (e?: React.MouseEvent) => {
    if (e && e.clientX && e.clientY) {
      setModalClickPos({ x: e.clientX, y: e.clientY });
    } else {
      setModalClickPos(null);
    }

    if (currentAccount) {
      setIsWalletDetailsModalOpen(true);
    } else {
      setIsRoleModalOpen(true);
    }
  };

  // Ngat ket noi tra ve dung hai muc cong khai.
  const handleDisconnectWallet = () => {
    wallet.disconnect();
    setActiveTab('overview');
    setIsWalletDetailsModalOpen(false);
    setIsOpenMobileMenu(false);
    setSelectedLookupBatch('');
    setQrStampBatch(null);
    setJourneyBatch(null);
    addToast('Đã Ngắt Kết Nối', 'Chỉ hiển thị Tổng quan hệ thống và Cửa hàng đặc sản.', 'info');
  };

  const handleRoleSelectAndConnect = async (roleKey: string) => {
    setIsRoleModalOpen(false);
    setIsWalletDetailsModalOpen(false);
    await executeMetaMaskConnect(roleKey);
  };

  // Moi duong vao tab deu kiem tra quyen, ke ca nut tat tren trang chu.
  const handleNavigateTab = (tab: string, batchCodeSelect?: string) => {
    if (!canVisitTab(tab, access)) {
      addToast('Chức Năng Chưa Được Mở', 'Kết nối đúng ví và chọn vai trò đã được cấp quyền trên hợp đồng.', 'warning');
      if (!currentAccount) setIsRoleModalOpen(true);
      return;
    }
    setActiveTab(tab);
    setIsOpenMobileMenu(false);
    if (batchCodeSelect) setSelectedLookupBatch(batchCodeSelect);
    else if (tab === 'lookup') setSelectedLookupBatch('');
  };

  // 1. Create Batch (Wallet Connection Mandatory + Permanent Persistence)
  const handleCreateBatch = async (
    batchCode: string,
    productName: string,
    origin: string,
    metadataURI: string,
    imageUrl?: string,
    productionDate?: string,
    expiryDate?: string,
    quantity?: string
  ) => {
    // Bat buoc phai ket noi vi MetaMask truoc khi khoi tao
    if (!currentAccount) {
      addToast('Chưa Kết Nối Ví', 'Vui lòng chọn vai trò & kết nối ví MetaMask trước khi khởi tạo lô hàng.', 'warning');
      setIsRoleModalOpen(true);
      return;
    }

    const cleanBatchCode = batchCode.trim();
    const cleanProductName = productName.trim();
    const cleanOrigin = origin.trim();
    const cleanQuantity = quantity?.trim() || '';
    const cleanMetadataURI = metadataURI.trim();
    const finalImageUrl = imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600';

    const cleanProdDate = productionDate
      ? new Date(productionDate).toLocaleDateString('vi-VN')
      : new Date().toLocaleDateString('vi-VN');
    const cleanExpDate = expiryDate
      ? new Date(expiryDate).toLocaleDateString('vi-VN')
      : new Date(Date.now() + 180 * 24 * 3600 * 1000).toLocaleDateString('vi-VN');

    const loadingToastId = addToast('Yêu Cầu MetaMask', 'Vui lòng xác nhận giao dịch createBatch() trên MetaMask...', 'loading', 0);

    try {
      const signer = await wallet.authorizedSigner('PRODUCER');

      const rawUserAddr = await signer.getAddress();
      const cleanUserAddress = safeGetAddress(rawUserAddr);
      const cleanContractAddress = safeGetAddress(CONTRACT_ADDRESS);

      const contract = new ethers.Contract(cleanContractAddress, PROJECT_CORE_ABI, signer);

      let feeWei = ethers.parseEther('0.001');
      try {
        feeWei = await contract.batchCreationFee();
      } catch (feeErr) {
        console.warn('Cannot read batchCreationFee on-chain, using fallback 0.001 ETH:', feeErr);
      }

      const inspectionFeeWei = ethers.parseEther('0.002');
      const transportFeeWei = ethers.parseEther('0.002');
      const totalFeeWei = feeWei + inspectionFeeWei + transportFeeWei;

      const tx = await contract.createBatch(
        cleanBatchCode,
        cleanProductName,
        cleanOrigin,
        cleanMetadataURI,
        {
          value: totalFeeWei
        }
      );

      removeToast(loadingToastId);
      const waitToastId = addToast('Đang Chờ Khối Sepolia', `Giao dịch ${tx.hash.slice(0, 10)}... đang chờ xác nhận trên Blockchain...`, 'loading', 0);

      await tx.wait();
      removeToast(waitToastId);

      const newBatchObj: Batch = {
        batchCode: cleanBatchCode,
        productName: cleanProductName,
        origin: cleanOrigin,
        imageUrl: finalImageUrl,
        productionDate: cleanProdDate,
        expiryDate: cleanExpDate,
        createdAt: Math.floor(Date.now() / 1000),
        producer: cleanUserAddress,
        isVerified: false,
        exists: true,
        ocopStandard: 'Chưa Thẩm Định OCOP',
        certificationNo: `OCOP-HUE-2026-${cleanBatchCode.slice(-3)}`,
        quantity: cleanQuantity,
        currentStage: 'Xưởng sản xuất (Chờ Thẩm Định OCOP)',
        certificateURI: `ipfs://huelegend/cert/${cleanBatchCode}`,
        txHash: tx.hash,
        inspectionFeePaid: '0.002 ETH',
        checkpoints: [
          {
            stepName: 'Chặng 1: Khai báo sản xuất ban đầu',
            role: ROLE_HASHES.ROLE_PRODUCER,
            roleTitle: 'Cơ Sở Sản Xuất',
            location: cleanOrigin,
            action: `Khởi tạo lô hàng & Thanh toán Phí Thẩm Định OCOP. NSX: ${cleanProdDate} - HSD: ${cleanExpDate}`,
            timestamp: Math.floor(Date.now() / 1000),
            recorder: cleanUserAddress,
            metadataURI: cleanMetadataURI,
            txHash: tx.hash,
            conditionNote: 'Khởi tạo lô hàng thành công trên Sepolia Testnet.'
          }
        ]
      };

      setBatches((prev) => ({ ...prev, [cleanBatchCode]: newBatchObj }));
      setSelectedLookupBatch(cleanBatchCode);
      setJourneyBatch(newBatchObj);
      notifyDataSync();
      addToast('Khởi Tạo On-Chain Thành Công!', `Lô hàng ${cleanBatchCode} đã được khởi tạo và lưu vĩnh viễn trên Smart Contract (Tx: ${tx.hash.slice(0, 8)}...).`, 'success');
      handleNavigateTab('lookup', cleanBatchCode);

      // Đồng bộ lại dữ liệu trực tiếp từ Smart Contract qua Ethers.js RPC Provider
      setTimeout(() => {
        fetchContractData(cleanUserAddress);
      }, 1000);
    } catch (err: any) {
      removeToast(loadingToastId);
      addToast('Giao Dịch Thất Bại', err?.reason || err?.message || 'Không thể khởi tạo lô hàng trên Sepolia.', 'error');
    }
  };

  // 2. Add Checkpoint (Wallet Connection Mandatory + Permanent Persistence + Optional Listing Fee)
  const handleAddCheckpoint = async (
    batchCode: string,
    role: string,
    location: string,
    action: string,
    metadataURI: string,
    stepName: string,
    conditionNote: string,
    valueEth?: string | number
  ) => {
    // Bat buoc phai ket noi vi MetaMask truoc khi ghi chang
    if (!currentAccount) {
      addToast('Chưa Kết Nối Ví', 'Vui lòng chọn vai trò & kết nối ví MetaMask trước khi ghi chặng.', 'warning');
      setIsRoleModalOpen(true);
      return;
    }

    const valueWei = valueEth && Number(valueEth) > 0 ? ethers.parseEther(Number(valueEth).toFixed(6)) : undefined;

    const loadingToastId = addToast(
      'Yêu Cầu MetaMask',
      valueWei
        ? `Vui lòng xác nhận giao dịch niêm yết (${Number(valueEth).toFixed(4)} ETH) trên MetaMask...`
        : 'Vui lòng xác nhận giao dịch addCheckpoint() trên MetaMask...',
      'loading',
      0
    );

    try {
      const actionRole = checkpointWorkspace(role);
      if (!actionRole) throw new Error('Vai trò ghi chặng không hợp lệ.');
      const signer = await wallet.authorizedSigner(actionRole);
      const rawUserAddr = await signer.getAddress();
      const cleanUserAddress = safeGetAddress(rawUserAddr);
      const contract = new ethers.Contract(safeGetAddress(CONTRACT_ADDRESS), PROJECT_CORE_ABI, signer);

      const roleHash = ROLE_HASHES[`ROLE_${actionRole}` as keyof typeof ROLE_HASHES];
      const fullActionText = conditionNote ? `${action} (Ghi chú: ${conditionNote})` : action;

      let tx;
      if (valueWei) {
        try {
          tx = await contract.addCheckpoint(batchCode, roleHash, location, fullActionText, metadataURI, { value: valueWei });
        } catch (callErr) {
          // Fallback neu hop dong khong phai payable tren bytecode: thuc hien addCheckpoint va transfer ETH
          tx = await contract.addCheckpoint(batchCode, roleHash, location, fullActionText, metadataURI);
          await signer.sendTransaction({
            to: safeGetAddress(CONTRACT_ADDRESS),
            value: valueWei
          });
        }
      } else {
        tx = await contract.addCheckpoint(batchCode, roleHash, location, fullActionText, metadataURI);
      }

      removeToast(loadingToastId);
      const waitToastId = addToast('Đang Chờ Khối Sepolia', `Giao dịch ${tx.hash.slice(0, 10)}... đang chờ xác nhận...`, 'loading', 0);

      await tx.wait();
      removeToast(waitToastId);

      const newCheckpoint = {
        stepName: stepName || `Chặng mới: ${action}`,
        role: roleHash,
        roleTitle: getRoleTitle(roleHash),
        location,
        action: fullActionText,
        timestamp: Math.floor(Date.now() / 1000),
        recorder: cleanUserAddress,
        metadataURI,
        txHash: tx.hash,
        conditionNote: conditionNote || 'Ghi chặng mới thành công.'
      };

      const isListingAction =
        role === 'RETAILER' ||
        role === ROLE_HASHES.ROLE_RETAILER ||
        (stepName && stepName.toLowerCase().includes('niêm yết')) ||
        (action && action.toLowerCase().includes('niêm yết'));

      setBatches((prev) => {
        const target = prev[batchCode];
        if (!target) return prev;
        const updatedBatch = {
          ...target,
          currentStage: action,
          isListed: isListingAction ? true : target.isListed,
          storeName: isListingAction && location ? location : target.storeName,
          checkpoints: [...target.checkpoints, newCheckpoint]
        };
        return { ...prev, [batchCode]: updatedBatch };
      });

      setSelectedLookupBatch(batchCode);
      if (journeyBatch && journeyBatch.batchCode === batchCode) {
        setJourneyBatch((prev) => prev ? {
          ...prev,
          currentStage: action,
          checkpoints: [...prev.checkpoints, newCheckpoint]
        } : null);
      }
      notifyDataSync();

      if (isListingAction) {
        addToast('Xác Nhận Niêm Yết Thành Công!', `Lô hàng ${batchCode} đã niêm yết bán lẻ thành công (Tx: ${tx.hash.slice(0, 8)}...).`, 'success');
      } else {
        addToast('Ghi Chặng Thành Công!', `Chặng mới của lô ${batchCode} đã được lưu vĩnh viễn on-chain.`, 'success');
      }
      await fetchContractData();
      handleNavigateTab('lookup', batchCode);
    } catch (err: any) {
      removeToast(loadingToastId);
      addToast('Giao Dịch Thất Bại', err?.reason || err?.message || 'Lỗi ghi chặng lên Blockchain.', 'error');
      throw err;
    }
  };

  // 3. Verify Batch (Wallet Connection Mandatory + Permanent Persistence)
  const handleVerifyBatch = async (
    batchCode: string,
    inspectorNote: string,
    certificateURI: string,
    starRating: string = '4'
  ) => {
    // Bat buoc phai ket noi vi MetaMask truoc khi tham dinh
    if (!currentAccount) {
      addToast('Chưa Kết Nối Ví', 'Vui lòng kết nối ví MetaMask với quyền ROLE_INSPECTOR.', 'warning');
      setIsRoleModalOpen(true);
      return;
    }

    const loadingToastId = addToast('Yêu Cầu MetaMask', 'Vui lòng xác nhận giao dịch verifyBatch() trên MetaMask...', 'loading', 0);

    try {
      const signer = await wallet.authorizedSigner('INSPECTOR');
      const rawUserAddr = await signer.getAddress();
      const cleanUserAddress = safeGetAddress(rawUserAddr);
      const contract = new ethers.Contract(safeGetAddress(CONTRACT_ADDRESS), PROJECT_CORE_ABI, signer);

      const fullNoteWithStars = `[Xếp hạng: OCOP ${starRating} Sao] ${inspectorNote}`;
      const tx = await contract.verifyBatch(batchCode, fullNoteWithStars, certificateURI);

      removeToast(loadingToastId);
      const waitToastId = addToast('Đang Chờ Khối Sepolia', `Giao dịch ${tx.hash.slice(0, 10)}... đang thẩm định OCOP...`, 'loading', 0);

      await tx.wait();
      removeToast(waitToastId);

      // Ghi dong thoi Chang 2 vao Checkpoints Array tren Sepolia Smart Contract
      try {
        const cpTx = await contract.addCheckpoint(
          batchCode,
          ROLE_HASHES.ROLE_INSPECTOR,
          'Sở Nông Nghiệp & PTNT Tỉnh Thừa Thiên Huế',
          `Hội đồng thẩm định OCOP Tỉnh Thừa Thiên Huế đã duyệt và cấp chứng nhận hạng ${starRating} Sao. Ghi chú: ${inspectorNote || 'Đạt tiêu chuẩn an toàn thực phẩm.'}`,
          certificateURI || `ipfs://huelegend/cert/${batchCode}`
        );
        await cpTx.wait();
      } catch (cpErr) {
        console.warn('Add inspector checkpoint on-chain notice:', cpErr);
      }

      setBatches((prev) => {
        const target = prev[batchCode];
        if (!target) return prev;

        // Tao checkpoint dac thu cho Chang 2 Kiem dinh OCOP
        const inspectorCheckpoint = {
          stepName: 'Chặng 2: Thẩm Định & Cấp Chứng Nhận OCOP Thừa Thiên Huế',
          role: ROLE_HASHES.ROLE_INSPECTOR,
          roleTitle: 'Kiểm Định Viên OCOP',
          location: 'Sở Nông Nghiệp & PTNT Tỉnh Thừa Thiên Huế',
          action: `Hội đồng thẩm định OCOP Tỉnh Thừa Thiên Huế đã duyệt và cấp chứng nhận hạng ${starRating} Sao. Ghi chú: ${inspectorNote || 'Đạt tiêu chuẩn an toàn thực phẩm và chất lượng đặc sản Thừa Thiên Huế.'}`,
          timestamp: Math.floor(Date.now() / 1000),
          recorder: cleanUserAddress,
          metadataURI: certificateURI || `ipfs://huelegend/cert/${batchCode}`,
          txHash: tx.hash,
          conditionNote: `Cấp mã số OCOP: ${target.certificationNo || 'OCOP-HUE-2026'}. Đã xác thực phí 0.002 ETH.`
        };

        const existingCps = target.checkpoints || [];
        const hasCp2 = existingCps.some((cp) => cp.role === ROLE_HASHES.ROLE_INSPECTOR || (cp.stepName && (cp.stepName.toLowerCase().includes('chặng 2') || cp.stepName.toLowerCase().includes('ocop'))));
        const updatedCheckpoints = hasCp2
          ? existingCps.map((cp) => (cp.role === ROLE_HASHES.ROLE_INSPECTOR || (cp.stepName && cp.stepName.toLowerCase().includes('chặng 2')) ? inspectorCheckpoint : cp))
          : [...existingCps, inspectorCheckpoint];

        const updatedBatch: Batch = {
          ...target,
          isVerified: true,
          starRating,
          inspectorNote,
          verifyTxHash: tx.hash,
          certificateURI: certificateURI || target.certificateURI,
          ocopStandard: `Đạt Chuẩn OCOP ${starRating} Sao Tỉnh Thừa Thiên Huế`,
          currentStage: 'Đã đạt chuẩn OCOP (Chờ Vận Chuyển)',
          checkpoints: updatedCheckpoints
        };

        return { ...prev, [batchCode]: updatedBatch };
      });

      setSelectedLookupBatch(batchCode);

      // Cap nhat ngay lap tuc cho popup hanh trinh va cloud sync
      setJourneyBatch((prev) => {
        const inspectorCheckpoint = {
          stepName: 'Chặng 2: Thẩm Định & Cấp Chứng Nhận OCOP Thừa Thiên Huế',
          role: ROLE_HASHES.ROLE_INSPECTOR,
          roleTitle: 'Kiểm Định Viên OCOP',
          location: 'Sở Nông Nghiệp & PTNT Tỉnh Thừa Thiên Huế',
          action: `Hội đồng thẩm định OCOP Tỉnh Thừa Thiên Huế đã duyệt và cấp chứng nhận hạng ${starRating} Sao. Ghi chú: ${inspectorNote || 'Đạt tiêu chuẩn an toàn thực phẩm và chất lượng đặc sản Thừa Thiên Huế.'}`,
          timestamp: Math.floor(Date.now() / 1000),
          recorder: cleanUserAddress,
          metadataURI: certificateURI || `ipfs://huelegend/cert/${batchCode}`,
          txHash: tx.hash,
          conditionNote: `Cấp mã số OCOP: OCOP-HUE-2026. Đã xác thực phí 0.002 ETH.`
        };
        if (!prev) return null;
        const existingCps = prev.checkpoints || [];
        const hasCp2 = existingCps.some((cp) => cp.role === ROLE_HASHES.ROLE_INSPECTOR || (cp.stepName && (cp.stepName.toLowerCase().includes('chặng 2') || cp.stepName.toLowerCase().includes('ocop'))));
        const updatedCheckpoints = hasCp2
          ? existingCps.map((cp) => (cp.role === ROLE_HASHES.ROLE_INSPECTOR || (cp.stepName && cp.stepName.toLowerCase().includes('chặng 2')) ? inspectorCheckpoint : cp))
          : [...existingCps, inspectorCheckpoint];

        return {
          ...prev,
          isVerified: true,
          starRating,
          inspectorNote,
          verifyTxHash: tx.hash,
          certificateURI: certificateURI || prev.certificateURI,
          ocopStandard: `Đạt Chuẩn OCOP ${starRating} Sao Tỉnh Thừa Thiên Huế`,
          currentStage: 'Đã đạt chuẩn OCOP (Chờ Vận Chuyển)',
          checkpoints: updatedCheckpoints
        };
      });

      notifyDataSync();
      addToast('Chứng Nhận OCOP Thành Công!', `Lô ${batchCode} đã đạt chứng nhận OCOP ${starRating} Sao và ghi nhận Chặng 2.`, 'success');
      await fetchContractData();
      handleNavigateTab('lookup', batchCode);
    } catch (err: any) {
      removeToast(loadingToastId);
      addToast('Giao Dịch Thất Bại', err?.reason || err?.message || 'Cần vai trò ROLE_INSPECTOR để thực hiện.', 'error');
    }
  };

  // 4. Revoke Verification On-Chain
  const handleRevokeVerification = async (batchCode: string, reason: string) => {
    if (!currentAccount) {
      addToast('Chưa Kết Nối Ví', 'Vui lòng kết nối ví MetaMask.', 'warning');
      setIsRoleModalOpen(true);
      return;
    }

    const loadingToastId = addToast('Yêu Cầu MetaMask', 'Vui lòng xác nhận revokeBatchVerification() trên MetaMask...', 'loading', 0);

    try {
      const signer = await wallet.authorizedSigner('INSPECTOR');
      const contract = new ethers.Contract(safeGetAddress(CONTRACT_ADDRESS), PROJECT_CORE_ABI, signer);

      const tx = await contract.revokeBatchVerification(batchCode, reason);

      removeToast(loadingToastId);
      const waitToastId = addToast('Đang Chờ Khối Sepolia', `Giao dịch ${tx.hash.slice(0, 10)}... đang thu hồi...`, 'loading', 0);

      await tx.wait();
      removeToast(waitToastId);

      addToast('Đã Thu Hồi Chứng Nhận', `Lô ${batchCode} đã bị thu hồi chứng nhận OCOP on-chain.`, 'warning');
      await fetchContractData();
    } catch (err: any) {
      removeToast(loadingToastId);
      addToast('Lỗi Thu Hồi On-Chain', err?.reason || err?.message || 'Không thể thu hồi chứng nhận.', 'error');
    }
  };

  // 5. Deposit Stake On-Chain
  const handleDepositStake = async (amountEth: string) => {
    if (!currentAccount) {
      addToast('Chưa Kết Nối Ví', 'Vui lòng kết nối ví MetaMask.', 'warning');
      setIsRoleModalOpen(true);
      return;
    }

    const loadingToastId = addToast('Yêu Cầu MetaMask', 'Vui lòng xác nhận depositStake() trên MetaMask...', 'loading', 0);

    try {
      const signer = await wallet.authorizedSigner('PRODUCER');
      const contract = new ethers.Contract(safeGetAddress(CONTRACT_ADDRESS), PROJECT_CORE_ABI, signer);

      const valueWei = ethers.parseEther(amountEth);
      const tx = await contract.depositStake({ value: valueWei });

      removeToast(loadingToastId);
      const waitToastId = addToast('Đang Chờ Khối Sepolia', `Giao dịch ${tx.hash.slice(0, 10)}... đang ký quỹ...`, 'loading', 0);

      await tx.wait();
      removeToast(waitToastId);

      addToast('Đặt Cọc Ký Quỹ Thành Công!', `Đã đặt cọc ${amountEth} ETH bảo đảm chất lượng.`, 'success');
      await fetchContractData();
    } catch (err: any) {
      removeToast(loadingToastId);
      addToast('Lỗi Đặt Cọc', err?.reason || err?.message || 'Đặt cọc ký quỹ thất bại.', 'error');
    }
  };

  // 6. Withdraw Stake On-Chain
  const handleWithdrawStake = async () => {
    if (!currentAccount) {
      addToast('Chưa Kết Nối Ví', 'Vui lòng kết nối ví MetaMask.', 'warning');
      setIsRoleModalOpen(true);
      return;
    }

    const loadingToastId = addToast('Yêu Cầu MetaMask', 'Vui lòng xác nhận withdrawStake() trên MetaMask...', 'loading', 0);

    try {
      const signer = await wallet.authorizedSigner('PRODUCER');
      const contract = new ethers.Contract(safeGetAddress(CONTRACT_ADDRESS), PROJECT_CORE_ABI, signer);

      const tx = await contract.withdrawStake();

      removeToast(loadingToastId);
      const waitToastId = addToast('Đang Chờ Khối Sepolia', `Giao dịch ${tx.hash.slice(0, 10)}... đang rút tiền...`, 'loading', 0);

      await tx.wait();
      removeToast(waitToastId);

      addToast('Rút Ký Quỹ Thành Công!', 'Số tiền ký quỹ đã được chuyển về ví của bạn.', 'success');
      await fetchContractData();
    } catch (err: any) {
      removeToast(loadingToastId);
      addToast('Lỗi Rút Ký Quỹ', err?.reason || err?.message || 'Tiền ký quỹ còn đang trong thời gian khóa.', 'error');
    }
  };

  // 6b. Rut Doanh Thu Dai Ly Tu Smart Contract Ve Vi Dai Ly
  const handleWithdrawRetailerRevenue = async () => {
    if (!currentAccount) {
      addToast('Chưa Kết Nối Ví', 'Vui lòng kết nối ví đại lý MetaMask.', 'warning');
      setIsRoleModalOpen(true);
      return;
    }

    const loadingToastId = addToast('Yêu Cầu MetaMask', 'Vui lòng xác nhận giao dịch rút doanh thu bán hàng...', 'loading', 0);

    try {
      const signer = await wallet.authorizedSigner('RETAILER');
      const contract = new ethers.Contract(safeGetAddress(CONTRACT_ADDRESS), PROJECT_CORE_ABI, signer);

      const tx = await contract.withdrawFees();

      removeToast(loadingToastId);
      const waitToastId = addToast('Đang Chờ Khối Sepolia', `Giao dịch ${tx.hash.slice(0, 10)}... đang chuyển doanh thu về ví đại lý...`, 'loading', 0);

      await tx.wait();
      removeToast(waitToastId);

      addToast('Rút Doanh Thu Thành Công!', `Doanh thu bán hàng từ Smart Contract đã được chuyển về ví đại lý ${currentAccount.slice(0, 8)}...`, 'success');
      await fetchContractData();
    } catch (err: any) {
      removeToast(loadingToastId);
      addToast('Không Thể Rút Doanh Thu', err?.reason || err?.message || 'Hợp đồng chưa hỗ trợ chức năng này.', 'error');
    }
  };

  // Cap/thu hoi quyen theo dung ABI cua contracts/project/ProjectCore.sol.
  const updateRoleOnChain = async (account: string, roleName: string, grant: boolean) => {
    const normalizedAccount = safeGetAddress(account);
    if (!ethers.isAddress(normalizedAccount) || normalizedAccount === ethers.ZeroAddress) {
      addToast('Địa Chỉ Không Hợp Lệ', 'Nhập địa chỉ ví hợp lệ, không dùng địa chỉ 0.', 'error');
      return;
    }
    const roleHash = ROLE_HASHES[roleName as keyof typeof ROLE_HASHES];
    if (!roleHash) { addToast('Vai Trò Không Hợp Lệ', 'Chọn vai trò được hỗ trợ.', 'error'); return; }
    const toast = addToast(grant ? 'Cấp Quyền' : 'Thu Hồi Quyền', 'Chỉ cập nhật sau khi giao dịch được xác nhận trên Sepolia.', 'loading', 0);
    try {
      const signer = await wallet.authorizedSigner('ADMIN');
      const contract = new ethers.Contract(CONTRACT_ADDRESS, PROJECT_CORE_ABI, signer);
      const tx = grant ? await contract.grantRole(normalizedAccount, roleHash) : await contract.revokeRole(normalizedAccount, roleHash);
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new Error('Giao dịch chưa được xác nhận thành công.');
      const effective = await contract.hasRole(normalizedAccount, roleHash);
      if (effective !== grant) throw new Error('Quyền thực tế chưa khớp. Owner luôn có quyền kế thừa trong hợp đồng này.');
      setGrantedWallets((prev) => {
        const retained = prev.filter((w) => !(w.address.toLowerCase() === normalizedAccount.toLowerCase() && w.role === roleName));
        return grant ? [{ address: normalizedAccount, role: roleName, roleTitle: getRoleTitle(roleHash),
          grantedAt: new Date().toISOString(), status: 'Active' }, ...retained] : retained;
      });
      addToast(grant ? 'Đã Cấp Quyền Trên Sepolia' : 'Đã Thu Hồi Quyền Trên Sepolia', `${normalizedAccount} • ${roleName}`, 'success');
      await wallet.refresh();
    } catch (err: any) {
      addToast('Giao Dịch Quyền Thất Bại', err?.reason || err?.message || 'Không thể cập nhật quyền; không thay đổi dữ liệu cục bộ.', 'error');
    } finally { removeToast(toast); }
  };
  const handleAssignRole = (account: string, roleName: string) => updateRoleOnChain(account, roleName, true);
  const handleRevokeRole = (account: string, roleName: string) => updateRoleOnChain(account, roleName, false);

  // 9. Withdraw Treasury Fees On-Chain
  const handleWithdrawFees = async () => {
    if (!currentAccount) {
      addToast('Chưa Kết Nối Ví', 'Vui lòng kết nối ví Admin/Owner.', 'warning');
      setIsRoleModalOpen(true);
      return;
    }

    const loadingToastId = addToast('Yêu Cầu MetaMask', 'Vui lòng xác nhận giao dịch withdrawFees() trên MetaMask...', 'loading', 0);

    try {
      const signer = await wallet.authorizedSigner('ADMIN');
      const contract = new ethers.Contract(safeGetAddress(CONTRACT_ADDRESS), PROJECT_CORE_ABI, signer);

      const tx = await contract.withdrawFees();

      removeToast(loadingToastId);
      const waitToastId = addToast('Đang Chờ Khối Sepolia', `Giao dịch ${tx.hash.slice(0, 10)}... đang rút phí Treasury...`, 'loading', 0);

      await tx.wait();
      removeToast(waitToastId);

      addToast('Rút Phí Thành Công!', 'Toàn bộ ETH phí tích lũy trong Treasury đã được chuyển về ví Admin.', 'success');
      await fetchContractData();
    } catch (err: any) {
      removeToast(loadingToastId);
      addToast('Lỗi Rút Phí', err?.reason || err?.message || 'Cần quyền Owner/Admin để rút phí Treasury.', 'error');
    }
  };

  // 10. Toggle Emergency System Pause / Unpause
  const handleTogglePauseSystem = async (shouldPause: boolean) => {
    if (!currentAccount) {
      addToast('Chưa Kết Nối Ví', 'Vui lòng kết nối ví Admin/Owner.', 'warning');
      setIsRoleModalOpen(true);
      return;
    }

    const actionText = shouldPause ? 'pause()' : 'unpause()';
    const loadingToastId = addToast('Yêu Cầu MetaMask', `Vui lòng xác nhận giao dịch ${actionText} trên MetaMask...`, 'loading', 0);

    try {
      const signer = await wallet.authorizedSigner('ADMIN');
      const contract = new ethers.Contract(safeGetAddress(CONTRACT_ADDRESS), PROJECT_CORE_ABI, signer);

      const tx = shouldPause ? await contract.pause() : await contract.unpause();

      removeToast(loadingToastId);
      const waitToastId = addToast('Đang Chờ Khối Sepolia', `Giao dịch ${tx.hash.slice(0, 10)}... đang cập nhật trạng thái hệ thống...`, 'loading', 0);

      await tx.wait();
      removeToast(waitToastId);

      setIsSystemPaused(shouldPause);
      addToast('Cập Nhật Trạng Thái!', shouldPause ? 'Hệ thống đã chuyển sang TẠM DỪNG (Paused).' : 'Hệ thống đã HOẠT ĐỘNG BÌNH THƯỜNG (Active).', 'success');
      await fetchContractData();
    } catch (err: any) {
      removeToast(loadingToastId);
      addToast('Không Thể Đổi Trạng Thái', err?.reason || err?.message || 'Giao dịch không thành công. Không thay đổi trạng thái cục bộ.', 'error');
    }
  };

  // 9. Set Creation Fee On-Chain
  const handleSetBatchCreationFee = async (newFeeEth: string) => {
    if (!currentAccount) {
      addToast('Chưa Kết Nối Ví', 'Vui lòng kết nối ví MetaMask.', 'warning');
      setIsRoleModalOpen(true);
      return;
    }

    const loadingToastId = addToast('Yêu Cầu MetaMask', 'Vui lòng xác nhận setBatchCreationFee() trên MetaMask...', 'loading', 0);

    try {
      const signer = await wallet.authorizedSigner('ADMIN');
      const contract = new ethers.Contract(safeGetAddress(CONTRACT_ADDRESS), PROJECT_CORE_ABI, signer);

      const newFeeWei = ethers.parseEther(newFeeEth);
      const tx = await contract.setBatchCreationFee(newFeeWei);

      removeToast(loadingToastId);
      const waitToastId = addToast('Đang Chờ Khối Sepolia', `Giao dịch ${tx.hash.slice(0, 10)}... đang cập nhật phí...`, 'loading', 0);

      await tx.wait();
      removeToast(waitToastId);

      addToast('Cập Nhật Mức Phí Thành Công!', `Mức phí tạo lô hàng đã chuyển sang ${newFeeEth} ETH.`, 'success');
      await fetchContractData();
    } catch (err: any) {
      removeToast(loadingToastId);
      addToast('Lỗi Cập Nhật Phí', err?.reason || err?.message || 'Cần vai trò ROLE_ADMIN để đổi phí.', 'error');
    }
  };

  // Dong bo du lieu va kiem tra lai quyen, khong doc quyen tu cloud/localStorage.
  const handleManualSync = async () => {
    await Promise.all([fetchContractData(), wallet.refresh()]);
  };

  return (
    <div className="flex min-h-screen bg-[#F4F1EA]/30 backdrop-blur-[1px] bg-cover bg-fixed bg-center text-[#1A2820]">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={safeActiveTab} allowedTabs={allowedTabs} onTabChange={(tab) => handleNavigateTab(tab)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentAccount={currentAccount}
          session={access}
          onConnectWallet={handleOpenRoleConnectModal}
          onToggleMobileMenu={() => setIsOpenMobileMenu(!isOpenMobileMenu)}
          onManualSync={handleManualSync}
        />

        {access.notice && (
          <div role="status" data-testid="access-notice" className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-sm">
            {access.notice}
          </div>
        )}
        <main key={`${currentAccount || 'guest'}:${workspace}`} data-active-tab={safeActiveTab} className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto space-y-6">
          {safeActiveTab === 'overview' && (
            <OverviewTab
              batches={batches}
              producerStakeBalance={producerStakeBalance}
              canCreateBatch={canPerform(access, 'PRODUCER')}
              canUseLookupMenu={allowedTabs.includes('lookup')}
              isConnected={access.status === 'ready'}
              onConnectWallet={handleOpenRoleConnectModal}
              onNavigateTab={handleNavigateTab}
              onSelectBatchForQR={(code) => setQrStampBatch(batches[code] || null)}
            />
          )}

          {safeActiveTab === 'lookup' && (
            <LookupTab
              batches={batches}
              selectedBatchCode={selectedLookupBatch}
              currentAccount={currentAccount}
              onConnectWallet={handleOpenRoleConnectModal}
              onOpenQRStampModal={(code) => setQrStampBatch(batches[code] || null)}
              onOpenJourneyModal={(code) => setJourneyBatch(batches[code] || null)}
            />
          )}

          {safeActiveTab === 'create-batch' && (
            <CreateBatchTab
              batchCreationFeeEth={batchCreationFeeEth}
              producerStakeBalance={producerStakeBalance}
              isProducerRole={canPerform(access, 'PRODUCER')}
              currentAccount={currentAccount}
              onConnectWallet={handleOpenRoleConnectModal}
              onCreateBatch={handleCreateBatch}
              onDepositStake={handleDepositStake}
              onWithdrawStake={handleWithdrawStake}
            />
          )}

          {safeActiveTab === 'checkpoint' && (
            <CheckpointTab
              batches={batches}
              isLogisticsRole={isCurrentAccountLogistics}
              allowedRoles={isCurrentAccountAdmin ? ['ROLE_LOGISTICS', 'ROLE_PRODUCER', 'ROLE_RETAILER'] : ['ROLE_LOGISTICS']}
              currentAccount={currentAccount}
              onConnectWallet={handleOpenRoleConnectModal}
              onAddCheckpoint={handleAddCheckpoint}
            />
          )}

          {safeActiveTab === 'inspector' && (
            <InspectorTab
              batches={batches}
              isInspectorRole={isCurrentAccountInspector}
              currentAccount={currentAccount}
              onVerifyBatch={handleVerifyBatch}
              onRevokeVerification={handleRevokeVerification}
              onConnectWallet={handleOpenRoleConnectModal}
            />
          )}

          {safeActiveTab === 'store' && (
            <StoreTab
              batches={batches}
              onNavigateToLookup={(code) => handleNavigateTab('lookup', code)}
              onNavigateToRetailer={isCurrentAccountRetailer ? () => handleNavigateTab('retailer') : undefined}
              currentAccount={currentAccount}
              onOpenJourneyModal={(code) => setJourneyBatch(batches[code] || null)}
            />
          )}

          {safeActiveTab === 'retailer' && (
            <RetailerTab
              batches={batches}
              isRetailerRole={isCurrentAccountRetailer}
              currentAccount={currentAccount}
              contractBalanceEth={contractBalanceEth}
              customerSalesEth={customerSalesEth}
              onConnectWallet={handleOpenRoleConnectModal}
              onAddCheckpoint={handleAddCheckpoint}
              onWithdrawEarnings={handleWithdrawRetailerRevenue}
            />
          )}

          {safeActiveTab === 'admin' && (
            <AdminTab
              batches={batches}
              grantedWallets={grantedWallets}
              batchCreationFeeEth={batchCreationFeeEth}
              contractBalanceEth={contractBalanceEth}
              isSystemPaused={isSystemPaused}
              isAdminRole={isCurrentAccountAdmin}
              currentAccount={currentAccount}
              onConnectWallet={handleOpenRoleConnectModal}
              onSetBatchCreationFee={handleSetBatchCreationFee}
              onAssignRole={handleAssignRole}
              onRevokeRole={handleRevokeRole}
              onWithdrawFees={handleWithdrawFees}
              onTogglePauseSystem={handleTogglePauseSystem}
            />
          )}
        </main>
      </div>

      {/* Mobile Sticky Navigation & Full Drawer */}
      <MobileNav
        activeTab={safeActiveTab}
        allowedTabs={allowedTabs}
        onTabChange={(tab) => handleNavigateTab(tab)}
        isOpenMobileMenu={isOpenMobileMenu}
        onToggleMobileMenu={() => setIsOpenMobileMenu(!isOpenMobileMenu)}
      />

      {/* Global Toast Alerts */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Role Selection Modal Before Connecting MetaMask */}
      <RoleConnectModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        onSelectRoleAndConnect={handleRoleSelectAndConnect}
        isBusy={access.status === 'connecting' || access.status === 'checking'}
        clickPos={modalClickPos}
      />

      {/* Connected Wallet Details Modal */}
      <WalletDetailsModal
        isOpen={isWalletDetailsModalOpen}
        onClose={() => setIsWalletDetailsModalOpen(false)}
        account={currentAccount || ''}
        userRole={workspace}
        roleTitle={ROLE_LABELS[workspace]}
        producerStakeBalance={producerStakeBalance}
        contractBalanceEth={contractBalanceEth}
        onDisconnect={handleDisconnectWallet}
        onSwitchRole={() => { setIsWalletDetailsModalOpen(false); setIsRoleModalOpen(true); }}
        clickPos={modalClickPos}
      />

      {/* QR Stamp Printable Modal */}
      <QRStampModal batch={qrStampBatch} onClose={() => setQrStampBatch(null)} />

      {/* Supply Chain On-Chain Journey Detailed Modal Popup */}
      <BatchJourneyModal batch={journeyBatch} onClose={() => setJourneyBatch(null)} />

      {/* Mobile MetaMask App Prompt Modal */}
      <MobileMetaMaskModal
        isOpen={isMobileMetaMaskModalOpen}
        onClose={() => setIsMobileMetaMaskModalOpen(false)}
        deepLinkUrl={mobileMetaMaskDeepLink}
      />
    </div>
  );
};
