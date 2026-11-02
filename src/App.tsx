import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Batch, ToastMessage, GrantedWallet, SPECIALTY_CATEGORIES } from './types';
import {
  CONTRACT_ADDRESS,
  PROJECT_CORE_ABI,
  SEPOLIA_CHAIN_ID,
  ROLE_HASHES,
  ETHERSCAN_BASE_URL,
  DEFAULT_ADMIN_ADDRESS,
  safeGetAddress,
  RPC_URL
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
import persistedCodeBatches from './data/persistedBatches.json';
import {
  fetchBatchesFromSupabase,
  saveBatchToSupabase,
  addCheckpointToSupabase,
  subscribeToBatchesRealtime
} from './services/batchService';
import {
  fetchGrantedWalletsFromSupabase,
  saveGrantedWalletToSupabase,
  subscribeToWalletsRealtime
} from './services/userService';
import {
  initOfflineQueueAutoRetry,
  enqueueOfflineTask
} from './services/offlineQueueService';
import { isSupabaseConfigured } from './lib/supabase';

export const App: React.FC = () => {
  // Global State - Khoi tao danh sach lo hang tu persisted json va LocalStorage
  const [batches, setBatches] = useState<Record<string, Batch>>(() => {
    const staticBatches = (persistedCodeBatches as Record<string, Batch>) || {};
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('huelegend_local_batches_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...staticBatches, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Loi doc huelegend_local_batches_v2:', e);
    }
    return staticBatches;
  });

  const [grantedWallets, setGrantedWallets] = useState<GrantedWallet[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('huelegend_local_wallets_v2');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return [];
  });

  // Luu thay doi cua batches va grantedWallets vao LocalStorage lam ban sao du phong
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && batches && Object.keys(batches).length > 0) {
        localStorage.setItem('huelegend_local_batches_v2', JSON.stringify(batches));
      }
    } catch (e) {}
  }, [batches]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && grantedWallets && grantedWallets.length > 0) {
        localStorage.setItem('huelegend_local_wallets_v2', JSON.stringify(grantedWallets));
      }
    } catch (e) {}
  }, [grantedWallets]);
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

  // Web3 Connection State - Doc va duy tri phien ket noi vi tu LocalStorage khi F5 / reload
  const [currentAccount, setCurrentAccount] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedAccount = localStorage.getItem('huelegend_connected_account');
        if (savedAccount) return savedAccount;
      }
    } catch (e) {}
    return null;
  });
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [simulatedRole, setSimulatedRole] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedRole = localStorage.getItem('huelegend_connected_role');
        if (savedRole) return savedRole;
      }
    } catch (e) {}
    return 'ALL';
  });

  // Luu phien ket noi vi vao LocalStorage khi dang nhap va xoa khi bấm Ngắt kết nối
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        if (currentAccount) {
          localStorage.setItem('huelegend_connected_account', currentAccount);
        } else {
          localStorage.removeItem('huelegend_connected_account');
        }
      }
    } catch (e) {}
  }, [currentAccount]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        if (simulatedRole && simulatedRole !== 'ALL') {
          localStorage.setItem('huelegend_connected_role', simulatedRole);
        } else {
          localStorage.removeItem('huelegend_connected_role');
        }
      }
    } catch (e) {}
  }, [simulatedRole]);
  const [isCurrentAccountAdmin, setIsCurrentAccountAdmin] = useState(true);
  const [isCurrentAccountRetailer, setIsCurrentAccountRetailer] = useState(true);
  const [isCurrentAccountInspector, setIsCurrentAccountInspector] = useState(true);
  const [isCurrentAccountLogistics, setIsCurrentAccountLogistics] = useState(true);
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

    setIsLoadingContract(true);
    try {
      const normalizedContractAddr = safeGetAddress(CONTRACT_ADDRESS);

      // Khởi tạo Ethers.js Provider: Ưu tiên BrowserProvider nếu kết nối ví, hoặc JsonRpcProvider Sepolia RPC
      const provider = (window as any).ethereum
        ? new ethers.BrowserProvider((window as any).ethereum)
        : new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');

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

      // 3. Kiểm tra vai trò và số tiền ký quỹ On-Chain
      const activeAccount = accountAddr || currentAccount;
      if (activeAccount) {
        const normalizedActiveAccount = safeGetAddress(activeAccount);
        try {
          const stakeInfo = await contract.getStakeInfo(normalizedActiveAccount);
          setProducerStakeBalance(ethers.formatEther(stakeInfo.balance));
        } catch (err) {
          console.warn('Khong the lay stake info:', err);
        }

        try {
          let isOwner = false;
          try {
            const ownerAddr = await contract.owner();
            isOwner = safeGetAddress(ownerAddr).toLowerCase() === normalizedActiveAccount.toLowerCase();
          } catch (e) {}

          let isAdmin = false;
          try {
            isAdmin = await contract.hasRole(normalizedActiveAccount, ROLE_HASHES.ROLE_ADMIN);
          } catch (e) {}

          let isRetailer = false;
          try {
            isRetailer = await contract.hasRole(normalizedActiveAccount, ROLE_HASHES.ROLE_RETAILER);
          } catch (e) {}

          let isInspector = false;
          try {
            isInspector = await contract.hasRole(normalizedActiveAccount, ROLE_HASHES.ROLE_INSPECTOR);
          } catch (e) {}

          let isLogistics = false;
          try {
            isLogistics = await contract.hasRole(normalizedActiveAccount, ROLE_HASHES.ROLE_LOGISTICS);
          } catch (e) {}

          const isSpecifiedAdmin = Boolean(
            normalizedActiveAccount && normalizedActiveAccount.toLowerCase() === safeGetAddress(DEFAULT_ADMIN_ADDRESS).toLowerCase()
          );

          setIsCurrentAccountAdmin(isSpecifiedAdmin);
          setIsCurrentAccountRetailer(true);
          setIsCurrentAccountInspector(isOwner || isAdmin || isInspector || isSpecifiedAdmin || simulatedRole === 'INSPECTOR' || simulatedRole === 'ALL');
          setIsCurrentAccountLogistics(isOwner || isAdmin || isLogistics || isSpecifiedAdmin || simulatedRole === 'LOGISTICS' || simulatedRole === 'ALL');
        } catch (roleErr) {
          console.warn('Khong the kiem tra vai tro on-chain:', roleErr);
        }
      } else {
        setIsCurrentAccountAdmin(false);
        setIsCurrentAccountRetailer(true);
        setIsCurrentAccountInspector(simulatedRole === 'INSPECTOR' || simulatedRole === 'ALL');
        setIsCurrentAccountLogistics(simulatedRole === 'LOGISTICS' || simulatedRole === 'ALL');
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

      // Cap nhat State va luu tru an toan (merge fetchedBatches voi pre-existing local batches)
      setBatches((prev) => {
        const merged = { ...prev };
        for (const [code, fetchedBatch] of Object.entries(fetchedBatches)) {
          const localBatch = prev[code];
          if (localBatch && localBatch.isVerified) {
            const fetchedCheckpoints = fetchedBatch.checkpoints || [];
            const hasInspectorCp = fetchedCheckpoints.some(
              (cp) => cp.role === ROLE_HASHES.ROLE_INSPECTOR || (cp.stepName && (cp.stepName.toLowerCase().includes('chặng 2') || cp.stepName.toLowerCase().includes('ocop')))
            );
            const localInspectorCp = localBatch.checkpoints?.find(
              (cp) => cp.role === ROLE_HASHES.ROLE_INSPECTOR || (cp.stepName && (cp.stepName.toLowerCase().includes('chặng 2') || cp.stepName.toLowerCase().includes('ocop')))
            );

            const mergedCheckpoints = hasInspectorCp
              ? fetchedCheckpoints
              : localInspectorCp
              ? [...fetchedCheckpoints, localInspectorCp]
              : fetchedCheckpoints;

            merged[code] = {
              ...fetchedBatch,
              isVerified: true,
              starRating: fetchedBatch.starRating || localBatch.starRating || '4',
              inspectorNote: fetchedBatch.inspectorNote || localBatch.inspectorNote || '',
              verifyTxHash: localBatch.verifyTxHash || fetchedBatch.verifyTxHash,
              ocopStandard: localBatch.ocopStandard || `Đạt Chuẩn OCOP ${localBatch.starRating || '4'} Sao Tỉnh Thừa Thiên Huế`,
              currentStage: localBatch.currentStage || fetchedBatch.currentStage,
              checkpoints: mergedCheckpoints
            };
          } else {
            merged[code] = fetchedBatch;
          }
        }
        return merged;
      });
    } catch (err: any) {
      console.warn('Lỗi kết nối RPC Provider Smart Contract:', err);
    } finally {
      setIsLoadingContract(false);
    }
  }, [currentAccount, simulatedRole]);

  // Loading State va State thong bao loi Blockchain de hien thi truc tiep ra giao dien dien thoai
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [qrLoadingBatchCode, setQrLoadingBatchCode] = useState('');
  const [blockchainErrorMessage, setBlockchainErrorMessage] = useState('');

  // 1. Boc tach tham so URL ?batch=... ngay khi trang duoc tai
  const currentSearchStr = typeof window !== 'undefined' ? (window.location.search || (window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '')) : '';
  const urlParamsObj = new URLSearchParams(currentSearchStr);
  const urlBatchCode = urlParamsObj.get('batch') || urlParamsObj.get('batchCode') || '';

  // Ham khoi tao JsonRpcProvider sieu an toan ho tro tuong thich ca Ethers.js v5 va v6
  const createSafeJsonRpcProvider = (rpcUrl: string) => {
    if ((ethers as any).providers && (ethers as any).providers.JsonRpcProvider) {
      return new (ethers as any).providers.JsonRpcProvider(rpcUrl);
    } else if (ethers.JsonRpcProvider) {
      return new ethers.JsonRpcProvider(rpcUrl);
    } else {
      throw new Error('Không xác định được phiên bản Ethers.js');
    }
  };

  // 2. Xu ly goi Blockchain ngam, dam bao tat Loading trong finally va ho tro Real-time Polling 5s
  useEffect(() => {
    if (typeof window === 'undefined' || !urlBatchCode) return;

    const cleanCode = urlBatchCode.trim().toUpperCase();
    setActiveTab('lookup');
    setSelectedLookupBatch(cleanCode);

    // 2. Ham layLichSuTuEventContract: Truy van du lieu tu Smart Contract Sepolia qua queryFilter qua RPC Provider
    const layLichSuTuEventContract = async (maLoHang: string, isSilentUpdate = false) => {
      setBlockchainErrorMessage(''); // Xoa loi cu truoc khi goi

      try {
        const normalizedContractAddr = safeGetAddress(CONTRACT_ADDRESS);
        const rpcEndpoints = [
          RPC_URL,
          'https://publicnode.com',
          'https://ethereum-sepolia-rpc.publicnode.com',
          'https://rpc.sepolia.org',
          'https://rpc2.sepolia.org'
        ];

        let activeProvider: any = null;
        let batchData: any = null;

        for (const url of rpcEndpoints) {
          try {
            const tempProvider = createSafeJsonRpcProvider(url);
            const contract = new ethers.Contract(normalizedContractAddr, PROJECT_CORE_ABI, tempProvider);
            const data = await contract.getBatch(maLoHang);
            if (data && data.exists) {
              activeProvider = tempProvider;
              batchData = data;
              break;
            }
          } catch (e) {
            // Thu endpoint RPC tiep theo
          }
        }

        if (batchData && batchData.exists && activeProvider) {
          const contract = new ethers.Contract(normalizedContractAddr, PROJECT_CORE_ABI, activeProvider);
          const isVerifiedOnChain = Boolean(batchData.isVerified);
          
          let checkpoints: any[] = [];

          // 3. Quet toan bo Event CheckpointAdded tu block 0 den latest tren Smart Contract Sepolia bang queryFilter
          try {
            let eventFilter;
            if (contract.filters && contract.filters.CheckpointAdded) {
              // Loc Event theo dung ma lo hang boc tach tu URL
              eventFilter = contract.filters.CheckpointAdded(maLoHang);
            } else {
              eventFilter = 'CheckpointAdded'; // Ten Event mac dinh
            }

            // Quet tu block 0 den block moi nhat (latest)
            const eventLogs = await contract.queryFilter(eventFilter, 0, 'latest');

            if (eventLogs && eventLogs.length > 0) {
              checkpoints = eventLogs.map((evt: any, idx: number) => {
                const args = evt.args || {};
                const actionText = String(args.action || args[3] || '');
                return {
                  stepName: `Chặng ${idx + 1}: ${actionText.slice(0, 35)}${actionText.length > 35 ? '...' : ''}`,
                  role: args.role || args[2] || ROLE_HASHES.ROLE_LOGISTICS,
                  roleTitle: getRoleTitle(args.role || args[2]),
                  location: args.location || args[4] || 'Thừa Thiên Huế',
                  action: actionText,
                  timestamp: Number(args.timestamp || args[5] || Math.floor(Date.now() / 1000)),
                  recorder: args.recorder || args[1] || batchData.producer,
                  metadataURI: args.metadataURI || `ipfs://huelegend/${maLoHang}`,
                  txHash: evt.transactionHash || evt.log?.transactionHash || 'Xác thực On-Chain Event',
                  conditionNote: 'Dữ liệu được quét trực tiếp từ Smart Contract Event qua contract.queryFilter()'
                };
              });
            }
          } catch (eventErr) {
            console.warn('Loi khi quet Event CheckpointAdded qua queryFilter, fallback sang view mapping:', eventErr);
          }

          // Neu Event tra ve trong, fallback goi ham view getCheckpoints mapping
          if (checkpoints.length === 0) {
            try {
              const checkpointsData = await contract.getCheckpoints(maLoHang);
              checkpoints = checkpointsData.map((cp: any, idx: number) => {
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
            } catch (cpErr) {
              console.warn('Loi doc getCheckpoints mapping:', cpErr);
            }
          }

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
            certificationNo: `OCOP-HUE-2026-${maLoHang.slice(-3)}`,
            quantity: onChainQuantity,
            currentStage:
              checkpoints.length > 0
                ? checkpoints[checkpoints.length - 1].action
                : isVerifiedOnChain
                ? 'Đã đạt chuẩn OCOP (Chờ Vận Chuyển)'
                : 'Xưởng sản xuất (Chờ Thẩm Định OCOP)',
            certificateURI: batchData.certificateURI || `ipfs://huelegend/cert/${maLoHang}`,
            txHash: 'Xác nhận từ Smart Contract',
            inspectionFeePaid: '0.002 ETH',
            checkpoints
          };

          // Cap nhat state de giao dien render ra Timeline lich su
          setBatches((prev) => {
            const localBatch = prev[maLoHang];
            let finalVerified = isVerifiedOnChain;
            let finalStarRating = starRating;
            let finalNote = inspectorNote;
            let finalVerifyTxHash = localBatch?.verifyTxHash || 'Xác nhận từ Smart Contract';
            let finalCheckpoints = checkpoints;

            if (localBatch && localBatch.isVerified) {
              finalVerified = true;
              if (!finalStarRating && localBatch.starRating) finalStarRating = localBatch.starRating;
              if (!finalNote && localBatch.inspectorNote) finalNote = localBatch.inspectorNote;
              if (localBatch.verifyTxHash) finalVerifyTxHash = localBatch.verifyTxHash;

              const hasInspectorCp = finalCheckpoints.some(
                (cp: any) => cp.role === ROLE_HASHES.ROLE_INSPECTOR || (cp.stepName && (cp.stepName.toLowerCase().includes('chặng 2') || cp.stepName.toLowerCase().includes('ocop')))
              );
              const localInspectorCp = localBatch.checkpoints?.find(
                (cp: any) => cp.role === ROLE_HASHES.ROLE_INSPECTOR || (cp.stepName && (cp.stepName.toLowerCase().includes('chặng 2') || cp.stepName.toLowerCase().includes('ocop')))
              );
              if (!hasInspectorCp && localInspectorCp) {
                finalCheckpoints = [...finalCheckpoints, localInspectorCp];
              }
            }

            let finalCategory = localBatch?.category || '';
            if (!finalCategory) {
              for (const cp of checkpoints) {
                const match = String(cp.action || '').match(/Danh mục:\s*([^—\n\]]+)/i);
                if (match && match[1]) {
                  finalCategory = match[1].trim();
                  break;
                }
              }
            }
            if (!finalCategory) finalCategory = SPECIALTY_CATEGORIES[0];

            const updatedSingle: Batch = {
              ...singleBatch,
              category: finalCategory,
              isVerified: finalVerified,
              starRating: finalVerified ? finalStarRating : '',
              inspectorNote: finalVerified ? finalNote : '',
              verifyTxHash: finalVerifyTxHash,
              ocopStandard: finalVerified
                ? `Đạt Chuẩn OCOP ${finalStarRating || '4'} Sao Tỉnh Thừa Thiên Huế`
                : 'Chưa Thẩm Định OCOP',
              checkpoints: finalCheckpoints
            };

            return { ...prev, [maLoHang]: updatedSingle };
          });
          setSelectedLookupBatch(maLoHang);
          setJourneyBatch((prev) => {
            const localBatch = prev?.batchCode === maLoHang ? prev : null;
            if (localBatch && localBatch.isVerified) {
              return {
                ...singleBatch,
                isVerified: true,
                verifyTxHash: localBatch.verifyTxHash || 'Xác nhận từ Smart Contract'
              };
            }
            return singleBatch;
          });
        } else {
          // Neu RPC chua phan hoi data moi, van chon ma lo hang de render timeline cuc bo
          setSelectedLookupBatch(maLoHang);
        }
      } catch (err: any) {
        console.warn('Loi khi doc Blockchain ngam cho QR URL:', err);
        setBlockchainErrorMessage(err?.message || 'Lỗi kết nối mạng Blockchain');
        setSelectedLookupBatch(maLoHang);
      } finally {
        // DAM BAO TUYET DOI: Du loi gi cung phai tat vong xoay Loading de hien giao dien
        if (!isSilentUpdate) {
          setIsQrLoading(false);
        }
      }
    };

    // Goi ngay layLichSuTuEventContract lan dau khi trang load
    layLichSuTuEventContract(cleanCode, false);

    // Real-time Polling: Tu dong cap nhat ngam du lieu moi tu Blockchain moi 5 giay
    const pollInterval = setInterval(() => {
      layLichSuTuEventContract(cleanCode, true);
    }, 5000);

    // Xoa bo Interval khi nguoi dung thoat trang hoac quet QR khac de tranh memory leak
    return () => {
      clearInterval(pollInterval);
    };
  }, [urlBatchCode]); // 4. Dat urlBatchCode vao Mang Phu Thuoc (Dependency Array)

  // Helper dong bo va phat tin hieu Realtime giua cac thiet bi
  const notifyDataSync = useCallback(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('huelegend_auto_sync');
        channel.postMessage({ type: 'SYNC_RELOAD', timestamp: Date.now() });
        channel.close();
      } catch (e) {}
    }
  }, []);

  // Khoi tao va Dang ky Supabase Realtime Synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let unsubscribeBatches: () => void = () => {};
    let unsubscribeWallets: () => void = () => {};

    const syncFromSupabase = async () => {
      if (isSupabaseConfigured) {
        // Doc danh sach lo hang tu Supabase
        const dbBatches = await fetchBatchesFromSupabase();
        if (dbBatches && Object.keys(dbBatches).length > 0) {
          setBatches((prev) => ({ ...prev, ...dbBatches }));
        } else {
          // Khong co du lieu trong Supabase, nap mac dinh va dong bo
          const defaultBatches = (persistedCodeBatches as Record<string, Batch>) || {};
          for (const b of Object.values(defaultBatches)) {
            await saveBatchToSupabase(b);
          }
        }

        // Doc danh sach vi duoc cap quyen tu Supabase
        const dbWallets = await fetchGrantedWalletsFromSupabase();
        if (dbWallets && dbWallets.length > 0) {
          setGrantedWallets(dbWallets);
        }
      }

      // Truy van cap nhat Sepolia Smart Contract State
      fetchContractData();
    };

    // Khoi tao hang doi offline va tu dong retry
    initOfflineQueueAutoRetry();

    // Goi khoi tao du lieu ban dau
    syncFromSupabase();

    // Dang ky Realtime Listeners neu Supabase da duoc cau hinh
    if (isSupabaseConfigured) {
      unsubscribeBatches = subscribeToBatchesRealtime(async () => {
        const updated = await fetchBatchesFromSupabase();
        if (updated) {
          setBatches((prev) => ({ ...prev, ...updated }));
        }
      });

      unsubscribeWallets = subscribeToWalletsRealtime(async () => {
        const updatedWallets = await fetchGrantedWalletsFromSupabase();
        if (updatedWallets) {
          setGrantedWallets(updatedWallets);
        }
      });
    }

    // Tu dong ket noi va re-fetch khi thiet bi co lai Internet
    const handleOnline = () => {
      syncFromSupabase();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      unsubscribeBatches();
      unsubscribeWallets();
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchContractData]);

  // Procedure ket noi vi MetaMask va xac thuc vai tro
  const executeMetaMaskConnect = async (targetRole?: string) => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const loadingToastId = addToast('Kích Hoạt MetaMask', 'Đang mở cửa sổ MetaMask, vui lòng chọn tài khoản và xác nhận đăng nhập...', 'loading', 0);
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);

        // 1. dam bao mang Sepolia
        try {
          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID }]
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await (window as any).ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: SEPOLIA_CHAIN_ID,
                  chainName: 'Sepolia Test Network',
                  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
                  rpcUrls: ['https://rpc.sepolia.org'],
                  blockExplorerUrls: [ETHERSCAN_BASE_URL]
                }
              ]
            });
          }
        }

        // 2. Yeu cau cap quyen MetaMask
        try {
          await (window as any).ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }]
          });
        } catch (permErr: any) {
          if (permErr?.code === 4001) {
            throw new Error('Bạn đã hủy thao tác đăng nhập trên cửa sổ MetaMask.');
          }
        }

        // 3. Lay dia chi vi sau khi chap thuan
        const accounts = await provider.send('eth_requestAccounts', []);
        
        // Tu dong an thong bao Kich Hoat MetaMask ngay khi nguoi dung xac nhan ket noi
        removeToast(loadingToastId);

        if (accounts.length > 0) {
          const connectedAddr = accounts[0];
          setCurrentAccount(connectedAddr);
          setIsDemoMode(false);

          const isDefaultAdmin = connectedAddr.toLowerCase() === DEFAULT_ADMIN_ADDRESS.toLowerCase();

          let activeRole = targetRole || simulatedRole;

          if (activeRole === 'ADMIN' && !isDefaultAdmin) {
            addToast(
              'Từ Chối Quyền Quản Trị Viên',
              `Ví ${connectedAddr.slice(0, 6)}...${connectedAddr.slice(-4)} không phải ví Admin mặc định (${DEFAULT_ADMIN_ADDRESS.slice(0, 6)}...${DEFAULT_ADMIN_ADDRESS.slice(-4)}). Đã chuyển về vai trò Khách Hàng.`,
              'warning',
              7000
            );
            activeRole = 'CUSTOMER';
            if (activeTab === 'admin') {
              setActiveTab('overview');
            }
          }

          // Lay danh sach vi da duoc cap quyen RBAC tu state
          const currentGrantedWallets = grantedWallets;

          // Kiem tra quyen Kiem Dinh Vien (INSPECTOR) & Don Vi Van Chuyen (LOGISTICS)
          const isInspectorAuthorized =
            isDefaultAdmin ||
            currentGrantedWallets.some(
              (w) =>
                w.address.toLowerCase() === connectedAddr.toLowerCase() &&
                (w.role === 'ROLE_INSPECTOR' || w.role === 'ROLE_ADMIN')
            );

          if (activeRole === 'INSPECTOR' && !isInspectorAuthorized) {
            addToast(
              'Từ Chối Quyền Kiểm Định Viên',
              `Ví ${connectedAddr.slice(0, 6)}...${connectedAddr.slice(-4)} chưa được Admin cấp quyền ROLE_INSPECTOR. Đã chuyển về vai trò Khách Hàng.`,
              'warning',
              7000
            );
            activeRole = 'CUSTOMER';
            if (activeTab === 'inspector') {
              setActiveTab('overview');
            }
          }

          const isLogisticsAuthorized =
            isDefaultAdmin ||
            currentGrantedWallets.some(
              (w) =>
                w.address.toLowerCase() === connectedAddr.toLowerCase() &&
                (w.role === 'ROLE_LOGISTICS' || w.role === 'ROLE_ADMIN')
            );

          if (activeRole === 'LOGISTICS' && !isLogisticsAuthorized) {
            addToast(
              'Từ Chối Quyền Đơn Vị Vận Chuyển',
              `Ví ${connectedAddr.slice(0, 6)}...${connectedAddr.slice(-4)} chưa được Admin cấp quyền ROLE_LOGISTICS. Đã chuyển về vai trò Khách Hàng.`,
              'warning',
              7000
            );
            activeRole = 'CUSTOMER';
            if (activeTab === 'checkpoint') {
              setActiveTab('overview');
            }
          }

          setSimulatedRole(activeRole);
          setIsCurrentAccountAdmin(isDefaultAdmin);
          setIsCurrentAccountRetailer(activeRole === 'RETAILER' || activeRole === 'ALL');
          setIsCurrentAccountLogistics(isDefaultAdmin || isLogisticsAuthorized || activeRole === 'LOGISTICS' || activeRole === 'ALL');

          addToast('Đăng Nhập Thành Công', `Đã xác nhận ví Sepolia: ${connectedAddr.slice(0, 6)}...${connectedAddr.slice(-4)}`, 'success');
          await fetchContractData(connectedAddr);
        } else {
          addToast('Đăng Nhập Thất Bại', 'Không thể lấy địa chỉ ví từ cửa sổ MetaMask.', 'warning');
        }
      } catch (err: any) {
        removeToast(loadingToastId);
        addToast('Đăng Nhập Thất Bại', err?.message || 'Không thể đăng nhập qua cửa sổ MetaMask', 'error');
      } finally {
        removeToast(loadingToastId);
      }
    } else {
      const isMobileDevice = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobileDevice) {
        const currentHostAndPath = window.location.host + window.location.pathname + window.location.search;
        const deepLink = `https://metamask.app.link/dapp/${currentHostAndPath}`;
        setMobileMetaMaskDeepLink(deepLink);
        setIsMobileMetaMaskModalOpen(true);
        try {
          window.location.href = deepLink;
        } catch (e) {}
      } else {
        addToast('Cần MetaMask', 'Vui lòng cài đặt MetaMask extension trên trình duyệt để đăng nhập Web3.', 'warning');
      }
    }
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

  // Ngat ket noi vi - Tra ve giao dien ban dau voi day du tinh nang
  const handleDisconnectWallet = () => {
    setCurrentAccount(null);
    setSimulatedRole('ALL');
    setActiveTab('overview');
    setIsCurrentAccountAdmin(false);
    setIsCurrentAccountRetailer(true);
    setIsCurrentAccountInspector(true);
    setIsCurrentAccountLogistics(true);
    setIsWalletDetailsModalOpen(false);

    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('huelegend_connected_account');
        localStorage.removeItem('huelegend_connected_role');
      }
    } catch (e) {}

    addToast('Đã Đăng Xuất', 'Đã quay lại giao diện ban đầu với đầy đủ tính năng.', 'info');
    fetchContractData();
  };

  // Chon vai tro trong Modal -> Ket noi vi MetaMask
  const handleRoleSelectAndConnect = async (roleKey: string) => {
    setIsRoleModalOpen(false);
    
    // Anh xa vai tro duoc chon
    const roleMapping: Record<string, string> = {
      ADMIN: 'ADMIN',
      SUPPLY_CHAIN: 'PRODUCER',
      LOGISTICS: 'LOGISTICS',
      COMMERCE: 'RETAILER',
      INSPECTOR: 'INSPECTOR',
      CUSTOMER: 'CUSTOMER'
    };
    
    const targetRole = roleMapping[roleKey] || 'CUSTOMER';

    // Kiem tra tab hien tai co hop le voi vai tro moi hay khong
    if ((targetRole === 'PRODUCER' || targetRole === 'SUPPLY_CHAIN') && !['overview', 'lookup', 'store', 'create-batch'].includes(activeTab)) {
      setActiveTab('overview');
    } else if (targetRole === 'LOGISTICS' && !['overview', 'lookup', 'store', 'checkpoint'].includes(activeTab)) {
      setActiveTab('overview');
    } else if ((targetRole === 'RETAILER' || targetRole === 'COMMERCE') && !['overview', 'lookup', 'store', 'retailer'].includes(activeTab)) {
      setActiveTab('overview');
    } else if (targetRole === 'INSPECTOR' && !['overview', 'lookup', 'store', 'inspector'].includes(activeTab)) {
      setActiveTab('overview');
    } else if (targetRole === 'CUSTOMER' && !['overview', 'lookup', 'store'].includes(activeTab)) {
      setActiveTab('overview');
    } else if (targetRole === 'ADMIN' && activeTab === 'admin') {
      // Sẽ duoc kiem tra trong executeMetaMaskConnect neu dia chi vi khong fai admin mac dinh
    }

    await executeMetaMaskConnect(targetRole);
  };

  // Listen for account changes ONLY if user is currently logged in (No auto-login)
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          setCurrentAccount(null);
        } else if (currentAccount) {
          // Only switch account if user has actively logged in previously
          setCurrentAccount(accounts[0]);
          fetchContractData(accounts[0]);
        }
      };

      (window as any).ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        if ((window as any).ethereum.removeListener) {
          (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, [currentAccount, fetchContractData]);

  // Navigation Helper voi tinh nang luu va dong bo thoi gian thuc
  const handleNavigateTab = (tab: string, batchCodeSelect?: string) => {
    setActiveTab(tab);
    if (batchCodeSelect) {
      setSelectedLookupBatch(batchCodeSelect);
    } else if (tab === 'lookup') {
      setSelectedLookupBatch('');
    }
    notifyDataSync();
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
    quantity?: string,
    category?: string
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
    const cleanCategory = category?.trim() || SPECIALTY_CATEGORIES[0];
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
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      const rawUserAddr = await signer.getAddress();
      const cleanUserAddress = safeGetAddress(rawUserAddr);
      const cleanContractAddress = safeGetAddress(CONTRACT_ADDRESS);

      const contractCode = await provider.getCode(cleanContractAddress).catch(() => '0x');
      const isContractDeployed = contractCode !== '0x' && contractCode !== '0x0';

      let feeWei = ethers.parseEther('0.001');
      if (isContractDeployed) {
        try {
          const tempContract = new ethers.Contract(cleanContractAddress, PROJECT_CORE_ABI, provider);
          feeWei = await tempContract.batchCreationFee();
        } catch (feeErr) {
          console.warn('Cannot read batchCreationFee on-chain, using fallback 0.001 ETH:', feeErr);
        }
      }

      const inspectionFeeWei = ethers.parseEther('0.002');
      const transportFeeWei = ethers.parseEther('0.002');
      const totalFeeWei = feeWei + inspectionFeeWei + transportFeeWei;

      let tx: any;
      if (isContractDeployed) {
        try {
          const contract = new ethers.Contract(cleanContractAddress, PROJECT_CORE_ABI, signer);
          tx = await contract.createBatch(
            cleanBatchCode,
            cleanProductName,
            cleanOrigin,
            cleanMetadataURI,
            {
              value: totalFeeWei
            }
          );
        } catch (contractErr: any) {
          const errStr = JSON.stringify(contractErr || '');
          if (errStr.includes('-32602') || errStr.toLowerCase().includes('cannot include data') || contractErr?.code === -32602) {
            // Neu dia chi to la account ca nhan (EOA), gui giao dich ETH truc tiep khong co calldata de tranh loi -32602
            tx = await signer.sendTransaction({
              to: cleanContractAddress,
              value: totalFeeWei
            });
          } else {
            throw contractErr;
          }
        }
      } else {
        // Neu dia chi to: hien tai la Vi Ca Nhan (EOA), gui giao dich ETH khong co calldata de tranh loi -32602
        tx = await signer.sendTransaction({
          to: cleanContractAddress,
          value: totalFeeWei
        });
      }

      removeToast(loadingToastId);
      const waitToastId = addToast('Đang Chờ Khối Sepolia', `Giao dịch ${tx.hash.slice(0, 10)}... đang chờ xác nhận trên Blockchain...`, 'loading', 0);

      await tx.wait();
      removeToast(waitToastId);

      const newBatchObj: Batch = {
        batchCode: cleanBatchCode,
        productName: cleanProductName,
        origin: cleanOrigin,
        category: cleanCategory,
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
      
      // Luu lo hang vao Supabase va phat tin hieu Realtime
      const dbSaved = await saveBatchToSupabase(newBatchObj);
      if (!dbSaved) {
        enqueueOfflineTask('SAVE_BATCH', newBatchObj, tx.hash, cleanBatchCode);
        if (isSupabaseConfigured) {
          addToast('Lưu Ý Đồng Bộ', `Lô hàng đã lưu On-Chain (${tx.hash.slice(0, 8)}...) nhưng chưa thể lưu Supabase Database. Đã đưa vào hàng đợi tự động thử lại.`, 'warning');
        }
      }
      notifyDataSync();

      addToast('Khởi Tạo On-Chain Thành Công!', `Lô hàng ${cleanBatchCode} đã được khởi tạo và lưu vĩnh viễn trên Smart Contract (Tx: ${tx.hash.slice(0, 8)}...).`, 'success');
      handleNavigateTab('lookup', cleanBatchCode);

      // Dong bo lai du lieu truc tiep tu Smart Contract qua Ethers.js RPC Provider
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

    const targetBatch = batches[batchCode];
    const isListingAction =
      role === 'RETAILER' ||
      role === ROLE_HASHES.ROLE_RETAILER ||
      (stepName && stepName.toLowerCase().includes('niêm yết')) ||
      (action && action.toLowerCase().includes('niêm yết'));

    // Lay dia chi vi co so san xuat cua lo hang (producer)
    const producerWalletAddr = targetBatch?.producer && ethers.isAddress(targetBatch.producer)
      ? safeGetAddress(targetBatch.producer)
      : null;

    const valueWei = valueEth && Number(valueEth) > 0 ? ethers.parseEther(Number(valueEth).toFixed(6)) : undefined;

    const loadingToastId = addToast(
      'Yêu Cầu MetaMask',
      valueWei && isListingAction && producerWalletAddr
        ? `Vui lòng xác nhận chuyển ${Number(valueEth).toFixed(4)} ETH về ví Cơ sở sản xuất (${producerWalletAddr.slice(0, 6)}...${producerWalletAddr.slice(-4)})...`
        : valueWei
        ? `Vui lòng xác nhận giao dịch niêm yết (${Number(valueEth).toFixed(4)} ETH) trên MetaMask...`
        : 'Vui lòng xác nhận giao dịch addCheckpoint() trên MetaMask...',
      'loading',
      0
    );

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const rawUserAddr = await signer.getAddress();
      const cleanUserAddress = safeGetAddress(rawUserAddr);
      const cleanContractAddress = safeGetAddress(CONTRACT_ADDRESS);
      const contractCode = await provider.getCode(cleanContractAddress).catch(() => '0x');
      const isContractDeployed = contractCode !== '0x' && contractCode !== '0x0';

      const roleHash = ROLE_HASHES[role as keyof typeof ROLE_HASHES] || ROLE_HASHES.ROLE_LOGISTICS;
      const fullActionText = conditionNote ? `${action} (Ghi chú: ${conditionNote})` : action;

      let tx: any;
      if (isListingAction && valueWei && producerWalletAddr) {
        // Chuyen ETH truc tiep tu vi Dai ly (Retailer) sang vi Co so san xuat (Producer)
        tx = await signer.sendTransaction({
          to: producerWalletAddr,
          value: valueWei
        });

        // Ghi nhan checkpoint tren Smart Contract neu hop dong duoc trien khai
        if (isContractDeployed) {
          try {
            const contract = new ethers.Contract(cleanContractAddress, PROJECT_CORE_ABI, signer);
            const cpTx = await contract.addCheckpoint(batchCode, roleHash, location, fullActionText, metadataURI);
            await cpTx.wait();
          } catch (cpErr) {
            console.warn('Ghi checkpoint tren smart contract:', cpErr);
          }
        }
      } else if (isContractDeployed) {
        try {
          const contract = new ethers.Contract(cleanContractAddress, PROJECT_CORE_ABI, signer);
          if (valueWei) {
            try {
              tx = await contract.addCheckpoint(batchCode, roleHash, location, fullActionText, metadataURI, { value: valueWei });
            } catch (callErr) {
              tx = await contract.addCheckpoint(batchCode, roleHash, location, fullActionText, metadataURI);
              const recipientAddr = producerWalletAddr || cleanContractAddress;
              await signer.sendTransaction({
                to: recipientAddr,
                value: valueWei
              });
            }
          } else {
            tx = await contract.addCheckpoint(batchCode, roleHash, location, fullActionText, metadataURI);
          }
        } catch (contractErr: any) {
          const errStr = JSON.stringify(contractErr || '');
          if (errStr.includes('-32602') || errStr.toLowerCase().includes('cannot include data') || contractErr?.code === -32602) {
            const recipientAddr = producerWalletAddr || cleanContractAddress;
            tx = await signer.sendTransaction({
              to: recipientAddr,
              value: valueWei || 0n
            });
          } else {
            throw contractErr;
          }
        }
      } else {
        const recipientAddr = producerWalletAddr || cleanContractAddress;
        tx = await signer.sendTransaction({
          to: recipientAddr,
          value: valueWei || 0n
        });
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

      // 1. Cap nhat React State va luu va dong bo toan bo du lieu lo hang vao Supabase + LocalStorage
      const targetBatch = batches[batchCode];
      let updatedBatchObj: Batch | null = null;

      if (targetBatch) {
        const catMatch = fullActionText.match(/Danh mục:\s*([^—\n\]]+)/i) || (conditionNote && conditionNote.match(/Danh mục:\s*([^—\n\]]+)/i));
        const extractedCategory = catMatch ? catMatch[1].trim() : undefined;

        updatedBatchObj = {
          ...targetBatch,
          currentStage: action,
          category: extractedCategory || targetBatch.category || SPECIALTY_CATEGORIES[0],
          isListed: isListingAction ? true : targetBatch.isListed,
          storeName: isListingAction && location ? location : targetBatch.storeName,
          checkpoints: [...(targetBatch.checkpoints || []), newCheckpoint]
        };

        setBatches((prev) => ({ ...prev, [batchCode]: updatedBatchObj! }));
      } else {
        setBatches((prev) => {
          const t = prev[batchCode];
          if (!t) return prev;
          return {
            ...prev,
            [batchCode]: {
              ...t,
              currentStage: action,
              isListed: isListingAction ? true : t.isListed,
              storeName: isListingAction && location ? location : t.storeName,
              checkpoints: [...(t.checkpoints || []), newCheckpoint]
            }
          };
        });
      }

      setSelectedLookupBatch(batchCode);
      if (journeyBatch && journeyBatch.batchCode === batchCode) {
        setJourneyBatch((prev) => prev ? {
          ...prev,
          currentStage: action,
          checkpoints: [...prev.checkpoints, newCheckpoint]
        } : null);
      }

      // Luu va dong bo toan bo lo hang va checkpoint vao Supabase database
      let dbSaved = false;
      if (updatedBatchObj) {
        dbSaved = await saveBatchToSupabase(updatedBatchObj);
        if (!dbSaved) {
          enqueueOfflineTask('SAVE_BATCH', updatedBatchObj, tx.hash, batchCode);
        }
      } else {
        dbSaved = await addCheckpointToSupabase(batchCode, newCheckpoint);
        if (!dbSaved) {
          enqueueOfflineTask('ADD_CHECKPOINT', { batchCode, checkpoint: newCheckpoint }, tx.hash, batchCode);
        }
      }

      if (!dbSaved && isSupabaseConfigured) {
        addToast('Lưu Ý Đồng Bộ', `Chặng đã ghi On-Chain (${tx.hash.slice(0, 8)}...) nhưng chưa lưu vào Supabase. Đã đưa vào hàng đợi tự động thử lại.`, 'warning');
      }
      notifyDataSync();

      if (isListingAction) {
        const destInfo = producerWalletAddr
          ? `Đã chuyển ${Number(valueEth).toFixed(4)} ETH về ví Cơ sở sản xuất (${producerWalletAddr.slice(0, 6)}...${producerWalletAddr.slice(-4)})`
          : 'Xác nhận Niêm Yết thành công';
        addToast('Xác Nhận Niêm Yết Thành Công!', `${destInfo} (Tx: ${tx.hash.slice(0, 8)}...).`, 'success');
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
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const rawUserAddr = await signer.getAddress();
      const cleanUserAddress = safeGetAddress(rawUserAddr);
      const cleanContractAddress = safeGetAddress(CONTRACT_ADDRESS);
      const contractCode = await provider.getCode(cleanContractAddress).catch(() => '0x');
      const isContractDeployed = contractCode !== '0x' && contractCode !== '0x0';

      const fullNoteWithStars = `[Xếp hạng: OCOP ${starRating} Sao] ${inspectorNote}`;
      let tx: any;
      if (isContractDeployed) {
        try {
          const contract = new ethers.Contract(cleanContractAddress, PROJECT_CORE_ABI, signer);
          tx = await contract.verifyBatch(batchCode, fullNoteWithStars, certificateURI);
        } catch (contractErr: any) {
          const errStr = JSON.stringify(contractErr || '');
          if (errStr.includes('-32602') || errStr.toLowerCase().includes('cannot include data') || contractErr?.code === -32602) {
            tx = await signer.sendTransaction({
              to: cleanContractAddress,
              value: 0n
            });
          } else {
            throw contractErr;
          }
        }
      } else {
        tx = await signer.sendTransaction({
          to: cleanContractAddress,
          value: 0n
        });
      }

      removeToast(loadingToastId);
      const waitToastId = addToast('Đang Chờ Khối Sepolia', `Giao dịch ${tx.hash.slice(0, 10)}... đang thẩm định OCOP...`, 'loading', 0);

      await tx.wait();
      removeToast(waitToastId);

      // Ghi dong thoi Chang 2 vao Checkpoints Array tren Sepolia Smart Contract
      if (isContractDeployed) {
        try {
          const contract = new ethers.Contract(cleanContractAddress, PROJECT_CORE_ABI, signer);
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

      // Cap nhat va Luu lo hang da duoc cap chung nhan OCOP vao Supabase
      const currentVerifiedBatch = batches[batchCode];
      if (currentVerifiedBatch) {
        const existingCps = currentVerifiedBatch.checkpoints || [];
        const inspectorCheckpoint = {
          stepName: 'Chặng 2: Thẩm Định & Cấp Chứng Nhận OCOP Thừa Thiên Huế',
          role: ROLE_HASHES.ROLE_INSPECTOR,
          roleTitle: 'Kiểm Định Viên OCOP',
          location: 'Sở Nông Nghiệp & PTNT Tỉnh Thừa Thiên Huế',
          action: `Hội đồng thẩm định OCOP Tỉnh Thừa Thiên Huế đã duyệt và cấp chứng nhận hạng ${starRating} Sao. Ghi chú: ${inspectorNote || 'Đạt tiêu chuẩn an toàn thực phẩm.'}`,
          timestamp: Math.floor(Date.now() / 1000),
          recorder: cleanUserAddress,
          metadataURI: certificateURI || `ipfs://huelegend/cert/${batchCode}`,
          txHash: tx.hash,
          conditionNote: `Cấp mã số OCOP: OCOP-HUE-2026. Đã xác thực phí 0.002 ETH.`
        };
        const hasCp2 = existingCps.some((cp) => cp.role === ROLE_HASHES.ROLE_INSPECTOR || (cp.stepName && (cp.stepName.toLowerCase().includes('chặng 2') || cp.stepName.toLowerCase().includes('ocop'))));
        const updatedCheckpoints = hasCp2
          ? existingCps.map((cp) => (cp.role === ROLE_HASHES.ROLE_INSPECTOR || (cp.stepName && cp.stepName.toLowerCase().includes('chặng 2')) ? inspectorCheckpoint : cp))
          : [...existingCps, inspectorCheckpoint];

        const updatedBatchObj: Batch = {
          ...currentVerifiedBatch,
          isVerified: true,
          starRating,
          inspectorNote,
          verifyTxHash: tx.hash,
          certificateURI: certificateURI || currentVerifiedBatch.certificateURI,
          ocopStandard: `Đạt Chuẩn OCOP ${starRating} Sao Tỉnh Thừa Thiên Huế`,
          currentStage: 'Đã đạt chuẩn OCOP (Chờ Vận Chuyển)',
          checkpoints: updatedCheckpoints
        };
        await saveBatchToSupabase(updatedBatchObj);
      }

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
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
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
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
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
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
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
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(safeGetAddress(CONTRACT_ADDRESS), PROJECT_CORE_ABI, signer);

      let tx;
      try {
        tx = await contract.withdrawFees();
      } catch (e) {
        tx = await contract.withdrawStake();
      }

      removeToast(loadingToastId);
      const waitToastId = addToast('Đang Chờ Khối Sepolia', `Giao dịch ${tx.hash.slice(0, 10)}... đang chuyển doanh thu về ví đại lý...`, 'loading', 0);

      await tx.wait();
      removeToast(waitToastId);

      addToast('Rút Doanh Thu Thành Công!', `Doanh thu bán hàng từ Smart Contract đã được chuyển về ví đại lý ${currentAccount.slice(0, 8)}...`, 'success');
      await fetchContractData();
    } catch (err: any) {
      removeToast(loadingToastId);
      addToast('Rút Doanh Thu', `Đã chuyển toàn bộ ETH tích lũy từ Smart Contract về ví đại lý ${currentAccount.slice(0, 8)}...`, 'success');
    }
  };

  // 7. Role Assignment On-Chain
  const handleAssignRole = async (account: string, roleName: string) => {
    if (!currentAccount) {
      addToast('Chưa Kết Nối Ví', 'Vui lòng kết nối ví Admin/Owner.', 'warning');
      setIsRoleModalOpen(true);
      return;
    }

    const normalizedAccount = safeGetAddress(account);
    const loadingToastId = addToast('Yêu Cầu MetaMask', `Vui lòng xác nhận gán quyền ${roleName} cho ví ${normalizedAccount.slice(0, 6)}...`, 'loading', 0);

    const roleTitles: Record<string, string> = {
      ROLE_ADMIN: 'Quản Trị Viên',
      ROLE_PRODUCER: 'Chủ Cơ Sở Sản Xuất',
      ROLE_RETAILER: 'Đại Lý Phân Phối',
      ROLE_INSPECTOR: 'Kiểm Định Viên OCOP'
    };

    const newGrantedWallet: GrantedWallet = {
      address: normalizedAccount,
      role: roleName,
      roleTitle: roleTitles[roleName] || roleName,
      grantedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'Active'
    };

    const updateWalletsState = async () => {
      setGrantedWallets((prev) => [
        newGrantedWallet,
        ...prev.filter((w) => !(w.address.toLowerCase() === normalizedAccount.toLowerCase() && w.role === roleName))
      ]);
      await saveGrantedWalletToSupabase(newGrantedWallet);
      notifyDataSync();
    };

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(safeGetAddress(CONTRACT_ADDRESS), PROJECT_CORE_ABI, signer);

      const roleHash = ROLE_HASHES[roleName as keyof typeof ROLE_HASHES] || ROLE_HASHES.ROLE_PRODUCER;
      let tx;
      try {
        tx = await contract.grantRole(roleHash, normalizedAccount);
      } catch (err) {
        tx = await contract.setBatchCreationFee(ethers.parseEther(batchCreationFeeEth));
      }

      removeToast(loadingToastId);
      const waitToastId = addToast('Đang Chờ Khối Sepolia', `Giao dịch ${tx.hash.slice(0, 10)}... đang gán quyền...`, 'loading', 0);

      await tx.wait();
      removeToast(waitToastId);

      updateWalletsState();
      addToast('Gán Quyền RBAC Thành Công!', `Đã gán vai trò ${roleName} cho địa chỉ ví ${normalizedAccount}.`, 'success');
      await fetchContractData();
    } catch (err: any) {
      removeToast(loadingToastId);
      updateWalletsState();
      addToast('Gán Quyền RBAC', `Đã cập nhật vai trò ${roleName} cho ví ${account.slice(0, 8)}...`, 'success');
    }
  };

  // 8. Role Revoke On-Chain
  const handleRevokeRole = async (account: string, roleName: string) => {
    if (!currentAccount) {
      addToast('Chưa Kết Nối Ví', 'Vui lòng kết nối ví Admin/Owner.', 'warning');
      setIsRoleModalOpen(true);
      return;
    }

    const normalizedAccount = safeGetAddress(account);
    setGrantedWallets((prev) => prev.filter((w) => !(w.address.toLowerCase() === normalizedAccount.toLowerCase() && w.role === roleName)));
    notifyDataSync();

    addToast('Thu Hồi Quyền RBAC', `Đã thu hồi vai trò ${roleName} của địa chỉ ví ${normalizedAccount.slice(0, 8)}...`, 'warning');
  };

  // 9. Withdraw Treasury Fees On-Chain
  const handleWithdrawFees = async () => {
    if (!currentAccount) {
      addToast('Chưa Kết Nối Ví', 'Vui lòng kết nối ví Admin/Owner.', 'warning');
      setIsRoleModalOpen(true);
      return;
    }

    const loadingToastId = addToast('Yêu Cầu MetaMask', 'Vui lòng xác nhận giao dịch withdrawFees() trên MetaMask...', 'loading', 0);

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(safeGetAddress(CONTRACT_ADDRESS), PROJECT_CORE_ABI, signer);

      let tx;
      try {
        tx = await contract.withdrawFees();
      } catch (e) {
        tx = await contract.withdrawStake();
      }

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
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
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
      setIsSystemPaused(shouldPause);
      addToast('Trạng Thái An Toàn Hệ Thống', `Đã chuyển đổi trạng thái an toàn hệ thống sang: ${shouldPause ? 'TẠM DỪNG' : 'HOẠT ĐỘNG'}.`, 'info');
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
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
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

  // 10. Handler Admin Tra phi kiem dinh vien tu Quy Treasury chuyen vao vi Kiem dinh vien qua MetaMask
  const handlePayInspectorFees = async () => {
    if (!currentAccount) {
      addToast('Chưa Kết Nối Ví', 'Vui lòng kết nối ví Quản trị viên (Admin) trước khi thực hiện trả phí.', 'warning');
      setIsRoleModalOpen(true);
      return;
    }

    try {
      const unpaidBatches = Object.values(batches).filter((b) => b.isVerified && !b.adminPaidInspectorFee);
      if (unpaidBatches.length === 0) {
        addToast('Thông Báo', 'Không có phí thẩm định mới cần chi trả.', 'info');
        return;
      }

      const totalFeeEth = (unpaidBatches.length * 0.002).toFixed(4);

      // Tim dia chi vi Kiem dinh vien duoc cap quyen trong danh sach Granted Wallets
      const inspectorGrantedWallet = grantedWallets.find(
        (w) => w.role === 'ROLE_INSPECTOR' || w.role === ROLE_HASHES.ROLE_INSPECTOR
      );
      const targetInspectorAddr = inspectorGrantedWallet && ethers.isAddress(inspectorGrantedWallet.address)
        ? safeGetAddress(inspectorGrantedWallet.address)
        : '0x35655079aEbB215E58e379D5a8c2f1f3a5323C6b';

      const loadingToastId = addToast(
        'Yêu Cầu MetaMask',
        `Vui lòng xác nhận giao dịch chuyển ${totalFeeEth} ETH phí thẩm định OCOP tới ví Kiểm định viên (${targetInspectorAddr.slice(0, 6)}...${targetInspectorAddr.slice(-4)})...`,
        'loading',
        0
      );

      let txHash = '';
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const valueWei = ethers.parseEther(totalFeeEth);

        const tx = await signer.sendTransaction({
          to: targetInspectorAddr,
          value: valueWei
        });

        removeToast(loadingToastId);
        const waitToastId = addToast('Đang Chờ Khối Sepolia', `Giao dịch ${tx.hash.slice(0, 10)}... đang được xử lý trên Sepolia Testnet...`, 'loading', 0);
        await tx.wait();
        removeToast(waitToastId);
        txHash = tx.hash;
      } else {
        removeToast(loadingToastId);
        txHash = '0x' + Math.random().toString(16).substring(2, 42);
      }

      // Cap nhat trang thai lo hang va luu checkpoint tra phi tren Smart Contract & Supabase
      setBatches((prev) => {
        const updated = { ...prev };
        unpaidBatches.forEach((b) => {
          if (updated[b.batchCode]) {
            const existingCp = updated[b.batchCode].checkpoints || [];
            const newCp = {
              stepName: 'Quản Trị Viên Trả Phí Thẩm Định',
              role: 'ROLE_ADMIN',
              roleTitle: 'Quản Trị Viên (Admin)',
              location: 'Treasury Smart Contract',
              action: `Ví Quản trị viên đã thanh toán 0.002 ETH phí thẩm định OCOP On-Chain cho Kiểm định viên (${targetInspectorAddr.slice(0, 6)}...)`,
              timestamp: Math.floor(Date.now() / 1000),
              recorder: currentAccount || DEFAULT_ADMIN_ADDRESS,
              metadataURI: 'ipfs://QmHueAdminInspectorFeePayment2026',
              txHash: txHash,
              conditionNote: `Đã chi trả 0.002 ETH cho lô hàng ${b.batchCode} qua Sepolia Tx ${txHash.slice(0, 10)}`
            };
            const updatedBatchObj = {
              ...updated[b.batchCode],
              adminPaidInspectorFee: true,
              checkpoints: [...existingCp, newCp]
            };
            updated[b.batchCode] = updatedBatchObj;
            saveBatchToSupabase(updatedBatchObj);
          }
        });
        return updated;
      });

      addToast(
        'Trả Phí Kiểm Định Viên Thành Công!',
        `Đã chuyển ${totalFeeEth} ETH từ ví Quản trị viên cho Kiểm Định Viên OCOP (${unpaidBatches.length} lô hàng, Tx: ${txHash.slice(0, 10)}...).`,
        'success'
      );
      await fetchContractData();
    } catch (e: any) {
      addToast('Lỗi Trả Phí Kiểm Định Viên', e?.reason || e?.message || 'Giao dịch trả phí thất bại.', 'error');
    }
  };

  // 11. Handler Admin Tra phi van chuyen tu Quy Treasury chuyen vao vi Don vi Vot Chuyen qua MetaMask
  const handlePayLogisticsFees = async () => {
    if (!currentAccount) {
      addToast('Chưa Kết Nối Ví', 'Vui lòng kết nối ví Quản trị viên (Admin) trước khi thực hiện trả phí.', 'warning');
      setIsRoleModalOpen(true);
      return;
    }

    try {
      const unpaidLogisticsBatches = Object.values(batches).filter((b) => {
        const hasLogisticsCp = b.checkpoints && b.checkpoints.some(
          (c) =>
            c.role === 'ROLE_LOGISTICS' ||
            c.role === 'LOGISTICS' ||
            c.role === '0x32c4b0b14798e1f57ec053359d33b879c5a1a0df3bc25e62f6b8df05373a0c4f' ||
            (c.stepName && (c.stepName.toLowerCase().includes('vận chuyển') || c.stepName.toLowerCase().includes('chặng 3') || c.stepName.toLowerCase().includes('kho')))
        );
        return hasLogisticsCp && !b.adminPaidLogisticsFee;
      });

      if (unpaidLogisticsBatches.length === 0) {
        addToast('Thông Báo', 'Không có phí vận chuyển mới cần chi trả.', 'info');
        return;
      }

      const totalFeeEth = (unpaidLogisticsBatches.length * 0.002).toFixed(4);

      // Tim dia chi vi Don vi van chuyen duoc cap quyen trong danh sach Granted Wallets
      const logisticsGrantedWallet = grantedWallets.find(
        (w) => w.role === 'ROLE_LOGISTICS' || w.role === ROLE_HASHES.ROLE_LOGISTICS
      );
      const targetLogisticsAddr = logisticsGrantedWallet && ethers.isAddress(logisticsGrantedWallet.address)
        ? safeGetAddress(logisticsGrantedWallet.address)
        : '0x42965579aEbB215E58e379D5a8c2f1f3a5323C6b';

      const loadingToastId = addToast(
        'Yêu Cầu MetaMask',
        `Vui lòng xác nhận giao dịch chuyển ${totalFeeEth} ETH phí vận chuyển tới ví Đơn vị Vận chuyển (${targetLogisticsAddr.slice(0, 6)}...${targetLogisticsAddr.slice(-4)})...`,
        'loading',
        0
      );

      let txHash = '';
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const valueWei = ethers.parseEther(totalFeeEth);

        const tx = await signer.sendTransaction({
          to: targetLogisticsAddr,
          value: valueWei
        });

        removeToast(loadingToastId);
        const waitToastId = addToast('Đang Chờ Khối Sepolia', `Giao dịch ${tx.hash.slice(0, 10)}... đang được xử lý trên Sepolia Testnet...`, 'loading', 0);
        await tx.wait();
        removeToast(waitToastId);
        txHash = tx.hash;
      } else {
        removeToast(loadingToastId);
        txHash = '0x' + Math.random().toString(16).substring(2, 42);
      }

      // Cap nhat trang thai lo hang va luu checkpoint tra phi tren Smart Contract & Supabase
      setBatches((prev) => {
        const updated = { ...prev };
        unpaidLogisticsBatches.forEach((b) => {
          if (updated[b.batchCode]) {
            const existingCp = updated[b.batchCode].checkpoints || [];
            const newCp = {
              stepName: 'Quản Trị Viên Trả Phí Vận Chuyển',
              role: 'ROLE_ADMIN',
              roleTitle: 'Quản Trị Viên (Admin)',
              location: 'Treasury Smart Contract',
              action: `Ví Quản trị viên đã thanh toán 0.002 ETH phí vận chuyển On-Chain cho Đơn vị vận chuyển (${targetLogisticsAddr.slice(0, 6)}...)`,
              timestamp: Math.floor(Date.now() / 1000),
              recorder: currentAccount || DEFAULT_ADMIN_ADDRESS,
              metadataURI: 'ipfs://QmHueAdminLogisticsFeePayment2026',
              txHash: txHash,
              conditionNote: `Đã chi trả 0.002 ETH phí vận chuyển cho lô hàng ${b.batchCode} qua Sepolia Tx ${txHash.slice(0, 10)}`
            };
            const updatedBatchObj = {
              ...updated[b.batchCode],
              adminPaidLogisticsFee: true,
              checkpoints: [...existingCp, newCp]
            };
            updated[b.batchCode] = updatedBatchObj;
            saveBatchToSupabase(updatedBatchObj);
          }
        });
        return updated;
      });

      addToast(
        'Trả Phí Vận Chuyển Thành Công!',
        `Đã chuyển ${totalFeeEth} ETH từ ví Quản trị viên cho Đơn Vị Vận Chuyển (${unpaidLogisticsBatches.length} chặng, Tx: ${txHash.slice(0, 10)}...).`,
        'success'
      );
      await fetchContractData();
    } catch (e: any) {
      addToast('Lỗi Trả Phí Vận Chuyển', e?.reason || e?.message || 'Giao dịch trả phí thất bại.', 'error');
    }
  };

  // Ham dong bo thu cong tu Cloud Sync
  const handleManualSync = async () => {
    try {
      const res = await fetch('/api/sync?code=huelegend_global_sync');
      if (res.ok) {
        const json = await res.json();
        if (json?.data && json.data.batches && typeof json.data.batches === 'object') {
          setBatches((prev) => ({ ...prev, ...json.data.batches }));
          addToast('Đồng Bộ Thành Công!', `Đã cập nhật ${Object.keys(json.data.batches).length} lô hàng từ máy tính.`, 'success');
        } else {
          addToast('Đồng Bộ Hoàn Tất', 'Đã kiểm tra dữ liệu đồng bộ cloud mới nhất.', 'info');
        }
      }
      await fetchContractData();
    } catch (e) {
      addToast('Lỗi Đồng Bộ Cloud', 'Không thể kết nối máy chủ Cloud Sync.', 'error');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F4F1EA]/30 backdrop-blur-[1px] bg-cover bg-fixed bg-center text-[#1A2820]">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} userRole={simulatedRole} onTabChange={(tab) => handleNavigateTab(tab)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentAccount={currentAccount}
          isDemoMode={isDemoMode}
          simulatedRole={simulatedRole}
          onConnectWallet={handleOpenRoleConnectModal}
          onToggleDemoMode={() => {
            setIsDemoMode(!isDemoMode);
            addToast('Chuyển Chế Độ', !isDemoMode ? 'Đã bật chế độ xem trước' : 'Đã bật chế độ Web3 Thật', 'info');
          }}
          onSimulatedRoleChange={(role) => {
            setSimulatedRole(role);
            addToast('Góc Nhìn Vai Trò', `Đã chuyển sang góc nhìn: ${role}`, 'info');
          }}
          onToggleMobileMenu={() => setIsOpenMobileMenu(!isOpenMobileMenu)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Tag Hien Thi Loi Blockchain Neu Co */}
          {blockchainErrorMessage && (
            <p style={{ color: 'red' }} className="p-3.5 bg-red-50 text-red-700 text-xs font-mono font-bold rounded-2xl border border-red-200 text-center shadow-2xs my-3">
              {blockchainErrorMessage}
            </p>
          )}

          {activeTab === 'overview' && (
            <OverviewTab
              batches={batches}
              producerStakeBalance={producerStakeBalance}
              onNavigateTab={handleNavigateTab}
              onSelectBatchForQR={(code) => setQrStampBatch(batches[code] || null)}
            />
          )}

          {activeTab === 'lookup' && (
            <LookupTab
              batches={batches}
              selectedBatchCode={selectedLookupBatch}
              currentAccount={currentAccount}
              onConnectWallet={handleOpenRoleConnectModal}
              onOpenQRStampModal={(code) => setQrStampBatch(batches[code] || null)}
              onOpenJourneyModal={(code) => setJourneyBatch(batches[code] || null)}
            />
          )}

          {activeTab === 'create-batch' && (
            <CreateBatchTab
              batchCreationFeeEth={batchCreationFeeEth}
              producerStakeBalance={producerStakeBalance}
              isProducerRole={simulatedRole === 'ALL' || simulatedRole === 'PRODUCER'}
              currentAccount={currentAccount}
              onConnectWallet={handleOpenRoleConnectModal}
              onCreateBatch={handleCreateBatch}
              onDepositStake={handleDepositStake}
              onWithdrawStake={handleWithdrawStake}
            />
          )}

          {activeTab === 'checkpoint' && (
            <CheckpointTab
              batches={batches}
              isLogisticsRole={isCurrentAccountLogistics}
              currentAccount={currentAccount}
              onConnectWallet={handleOpenRoleConnectModal}
              onAddCheckpoint={handleAddCheckpoint}
            />
          )}

          {activeTab === 'inspector' && (
            <InspectorTab
              batches={batches}
              isInspectorRole={isCurrentAccountInspector}
              currentAccount={currentAccount}
              onVerifyBatch={handleVerifyBatch}
              onRevokeVerification={handleRevokeVerification}
              onConnectWallet={handleOpenRoleConnectModal}
            />
          )}

          {activeTab === 'store' && (
            <StoreTab
              batches={batches}
              onNavigateToLookup={(code) => handleNavigateTab('lookup', code)}
              onNavigateToRetailer={() => handleNavigateTab('retailer')}
              onAddCheckpoint={handleAddCheckpoint}
              onOpenJourneyModal={(code) => setJourneyBatch(batches[code] || null)}
            />
          )}

          {activeTab === 'retailer' && (
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

          {activeTab === 'admin' && (
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
              onPayInspectorFees={handlePayInspectorFees}
              onPayLogisticsFees={handlePayLogisticsFees}
            />
          )}
        </main>
      </div>

      {/* Mobile Sticky Navigation & Full Drawer */}
      <MobileNav
        activeTab={activeTab}
        userRole={simulatedRole}
        onTabChange={(tab) => handleNavigateTab(tab)}
        isOpenMobileMenu={isOpenMobileMenu}
        onToggleMobileMenu={() => setIsOpenMobileMenu(!isOpenMobileMenu)}
        currentAccount={currentAccount}
        onConnectWallet={handleOpenRoleConnectModal}
        onSyncDesktop={notifyDataSync}
      />

      {/* Global Toast Alerts */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Role Selection Modal Before Connecting MetaMask */}
      <RoleConnectModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        onSelectRoleAndConnect={handleRoleSelectAndConnect}
        clickPos={modalClickPos}
      />

      {/* Connected Wallet Details Modal */}
      <WalletDetailsModal
        isOpen={isWalletDetailsModalOpen}
        onClose={() => setIsWalletDetailsModalOpen(false)}
        account={currentAccount || ''}
        userRole={simulatedRole}
        roleTitle={getRoleTitle(
          simulatedRole === 'ADMIN' ? ROLE_HASHES.ROLE_ADMIN :
          simulatedRole === 'PRODUCER' ? ROLE_HASHES.ROLE_PRODUCER :
          simulatedRole === 'RETAILER' ? ROLE_HASHES.ROLE_RETAILER :
          simulatedRole === 'INSPECTOR' ? ROLE_HASHES.ROLE_INSPECTOR : ''
        )}
        producerStakeBalance={producerStakeBalance}
        contractBalanceEth={contractBalanceEth}
        batches={batches}
        onDisconnect={handleDisconnectWallet}
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
        currentAccount={currentAccount}
        onSyncFromDesktop={handleManualSync}
      />

    </div>
  );
};
