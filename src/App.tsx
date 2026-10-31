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
    if (roleHash === ROLE_HASHES.ROLE_PRODUCER) return 'CÆ¡ Sá»Ÿ Sáº£n Xuáº¥t';
    if (roleHash === ROLE_HASHES.ROLE_LOGISTICS) return 'ÄÆ¡n Vá»‹ Váº­n Chuyá»ƒn';
    if (roleHash === ROLE_HASHES.ROLE_RETAILER) return 'Äáº¡i LÃ½ PhÃ¢n Phá»‘i';
    if (roleHash === ROLE_HASHES.ROLE_INSPECTOR) return 'Kiá»ƒm Äá»‹nh ViÃªn OCOP';
    if (roleHash === ROLE_HASHES.ROLE_ADMIN) return 'Quáº£n Trá»‹ ViÃªn';
    return 'ÄÆ¡n Vá»‹ Tham Gia';
  };

  // Truy váº¥n dá»¯ liá»‡u trá»±c tiáº¿p tá»« Smart Contract Sepolia thÃ´ng qua Ethers.js RPC Provider (KhÃ´ng sá»­ dá»¥ng LocalStorage)
  const fetchContractData = useCallback(async (accountAddr?: string) => {
    if (typeof window === 'undefined') return;

    const requestId = ++dataRequestRef.current;
    setIsLoadingContract(true);
    try {
      const normalizedContractAddr = safeGetAddress(CONTRACT_ADDRESS);

      // Khá»Ÿi táº¡o Ethers.js Provider: Æ¯u tiÃªn BrowserProvider náº¿u káº¿t ná»‘i vÃ­, hoáº·c JsonRpcProvider Sepolia RPC
      const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');

      const contract = new ethers.Contract(normalizedContractAddr, PROJECT_CORE_ABI, provider);

      // 1. Truy váº¥n sá»‘ dÆ° ETH cá»§a Smart Contract tá»« Sepolia Testnet
      try {
        const balanceWei = await provider.getBalance(normalizedContractAddr);
        setContractBalanceEth(ethers.formatEther(balanceWei));
      } catch (err) {
        console.warn('Khong the lay so du ETH cua contract:', err);
      }

      // 2. Truy váº¥n phÃ­ khá»Ÿi táº¡o lÃ´ hÃ ng tá»« Smart Contract
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

      // 4. Truy váº¥n toÃ n bá»™ danh sÃ¡ch lÃ´ hÃ ng trá»±c tiáº¿p tá»« Smart Contract qua Ethers.js
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

            // Truy váº¥n máº£ng nháº­t kÃ½ cháº·ng (checkpoints) trá»±c tiáº¿p tá»« Smart Contract
            const checkpointsData = await contract.getCheckpoints(batchCode);

            const checkpoints = checkpointsData.map((cp: any, idx: number) => {
              const actionText = String(cp.action || '');
              return {
                stepName: `Cháº·ng ${idx + 1}: ${actionText.slice(0, 35)}${actionText.length > 35 ? '...' : ''}`,
                role: cp.role,
                roleTitle: getRoleTitle(cp.role),
                location: cp.location,
                action: actionText,
                timestamp: Number(cp.timestamp),
                recorder: cp.recorder,
                metadataURI: cp.metadataURI,
                txHash: 'XÃ¡c thá»±c On-Chain Sepolia Block',
                conditionNote: 'Dá»¯ liá»‡u Ä‘Æ°á»£c truy váº¥n trá»±c tiáº¿p tá»« Smart Contract qua Ethers.js RPC Provider.'
              };
            });

            // TÃ¡ch xáº¿p háº¡ng sao kiá»ƒm Ä‘á»‹nh OCOP tá»« nháº­t kÃ½ cháº·ng
            let starRating = '4';
            let inspectorNote = '';
            const inspectorCp = checkpoints.find((cp: any) => cp.role === ROLE_HASHES.ROLE_INSPECTOR || (cp.action && cp.action.toLowerCase().includes('ocop')));
            if (inspectorCp) {
              const starMatch = inspectorCp.action.match(/(\d)\s*Sao/i);
              if (starMatch && starMatch[1]) starRating = starMatch[1];
              inspectorNote = inspectorCp.action;
            }

            // Kiá»ƒm tra tráº¡ng thÃ¡i niÃªm yáº¿t bÃ¡n láº» on-chain
            const isListedOnChain = checkpoints.some(
              (cp: any) =>
                cp.role === ROLE_HASHES.ROLE_RETAILER ||
                (cp.action && cp.action.toLowerCase().includes('niÃªm yáº¿t')) ||
                (cp.action && cp.action.toLowerCase().includes('inretail'))
            );

            // TrÃ­ch xuáº¥t sá»‘ lÆ°á»£ng nháº­p kho/sáº£n lÆ°á»£ng tá»« nháº­t kÃ½ sáº£n xuáº¥t ban Ä‘áº§u
            let onChainQuantity = '';
            if (checkpoints.length > 0) {
              const cp1Action = checkpoints[0].action;
              const qtyMatch = cp1Action.match(/Sáº£n lÆ°á»£ng:\s*([^â€”\n]+)/i);
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
                ? `Äáº¡t Chuáº©n OCOP ${starRating} Sao Tá»‰nh Thá»«a ThiÃªn Huáº¿`
                : 'ChÆ°a Tháº©m Äá»‹nh OCOP',
              certificationNo: `OCOP-HUE-2026-${batchCode.slice(-3)}`,
              quantity: onChainQuantity,
              currentStage:
                checkpoints.length > 0
                  ? checkpoints[checkpoints.length - 1].action
                  : isVerifiedOnChain
                  ? 'ÄÃ£ Ä‘áº¡t chuáº©n OCOP (Chá» Váº­n Chuyá»ƒn)'
                  : 'XÆ°á»Ÿng sáº£n xuáº¥t (Chá» Tháº©m Äá»‹nh OCOP)',
              certificateURI: batchData.certificateURI || `ipfs://huelegend/cert/${batchCode}`,
              txHash: 'XÃ¡c nháº­n tá»« Smart Contract',
              inspectionFeePaid: '0 ETH',
              checkpoints
            };
          } catch (e) {
            console.error(`Lá»—i truy váº¥n lÃ´ hÃ ng chá»‰ sá»‘ ${i} tá»« Smart Contract:`, e);
          }
        }
      }

      // Cáº­p nháº­t State trá»±c tiáº¿p tá»« káº¿t quáº£ truy váº¥n Ethers.js
      if (requestId === dataRequestRef.current) setBatches(fetchedBatches);
    } catch (err: any) {
      console.warn('Lá»—i káº¿t ná»‘i RPC Provider Smart Contract:', err);
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
                      stepName: `Cháº·ng ${idx + 1}: ${actionText.slice(0, 35)}${actionText.length > 35 ? '...' : ''}`,
                      role: cp.role,
                      roleTitle: getRoleTitle(cp.role),
                      location: cp.location,
                      action: actionText,
                      timestamp: Number(cp.timestamp),
                      recorder: cp.recorder,
                      metadataURI: cp.metadataURI,
                      txHash: 'XÃ¡c thá»±c On-Chain Sepolia Block',
                      conditionNote: 'Dá»¯ liá»‡u Ä‘Æ°á»£c truy váº¥n trá»±c tiáº¿p tá»« Smart Contract qua Ethers.js RPC Provider.'
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
                      (cp.action && cp.action.toLowerCase().includes('niÃªm yáº¿t')) ||
                      (cp.action && cp.action.toLowerCase().includes('inretail'))
                  );

                  let onChainQuantity = '';
                  if (checkpoints.length > 0) {
                    const cp1Action = checkpoints[0].action;
                    const qtyMatch = cp1Action.match(/Sáº£n lÆ°á»£ng:\s*([^â€”\n]+)/i);
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
                      ? `Äáº¡t Chuáº©n OCOP ${starRating} Sao Tá»‰nh Thá»«a ThiÃªn Huáº¿`
                      : 'ChÆ°a Tháº©m Äá»‹nh OCOP',
                    certificationNo: `OCOP-HUE-2026-${cleanCode.slice(-3)}`,
                    quantity: onChainQuantity,
                    currentStage:
                      checkpoints.length > 0
                        ? checkpoints[checkpoints.length - 1].action
                        : isVerifiedOnChain
                        ? 'ÄÃ£ Ä‘áº¡t chuáº©n OCOP (Chá» Váº­n Chuyá»ƒn)'
                        : 'XÆ°á»Ÿng sáº£n xuáº¥t (Chá» Tháº©m Äá»‹nh OCOP)',
                    certificateURI: batchData.certificateURI || `ipfs://huelegend/cert/${cleanCode}`,
                    txHash: 'XÃ¡c nháº­n tá»« Smart Contract',
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
      } else addToast('Cáº§n MetaMask', 'Vui lÃ²ng cÃ i MetaMask Ä‘á»ƒ káº¿t ná»‘i vÃ­.', 'warning');
      return;
    }
    const toast = addToast('Äang Káº¿t Ná»‘i VÃ­', 'Chá»n tÃ i khoáº£n trÃªn MetaMask. Há»‡ thá»‘ng sáº½ kiá»ƒm tra quyá»n trÃªn Sepolia.', 'loading', 0);
    try {
      const verified = await wallet.connect(targetRole);
      if (verified.status === 'ready') {
        addToast(verified.notice ? 'ChÆ°a CÃ³ Quyá»n ÄÃ£ Chá»n' : 'Káº¿t Ná»‘i ThÃ nh CÃ´ng',
          verified.notice || `Khu vá»±c hiá»‡n táº¡i: ${ROLE_LABELS[verified.workspace]}.`, verified.notice ? 'warning' : 'success');
        if (verified.account) void fetchContractData(verified.account);
      } else if (verified.notice) addToast('ChÆ°a Thá»ƒ Má»Ÿ Chá»©c NÄƒng', verified.notice, 'warning');
    } catch (err: any) { addToast('Lá»—i Káº¿t Ná»‘i', err?.message || 'KhÃ´ng thá»ƒ káº¿t ná»‘i MetaMask.', 'error'); }
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
    addToast('ÄÃ£ Ngáº¯t Káº¿t Ná»‘i', 'Chá»‰ hiá»ƒn thá»‹ Tá»•ng quan há»‡ thá»‘ng vÃ  Cá»­a hÃ ng Ä‘áº·c sáº£n.', 'info');
  };

  const handleRoleSelectAndConnect = async (roleKey: string) => {
    setIsRoleModalOpen(false);
    setIsWalletDetailsModalOpen(false);
    await executeMetaMaskConnect(roleKey);
  };

  // Moi duong vao tab deu kiem tra quyen, ke ca nut tat tren trang chu.
  const handleNavigateTab = (tab: string, batchCodeSelect?: string) => {
    if (!canVisitTab(tab, access)) {
      addToast('Chá»©c NÄƒng ChÆ°a ÄÆ°á»£c Má»Ÿ', 'Káº¿t ná»‘i Ä‘Ãºng vÃ­ vÃ  chá»n vai trÃ² Ä‘Ã£ Ä‘Æ°á»£c cáº¥p quyá»n trÃªn há»£p Ä‘á»“ng.', 'warning');
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
      addToast('ChÆ°a Káº¿t Ná»‘i VÃ­', 'Vui lÃ²ng chá»n vai trÃ² & káº¿t ná»‘i vÃ­ MetaMask trÆ°á»›c khi khá»Ÿi táº¡o lÃ´ hÃ ng.', 'warning');
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

    const loadingToastId = addToast('YÃªu Cáº§u MetaMask', 'Vui lÃ²ng xÃ¡c nháº­n giao dá»‹ch createBatch() trÃªn MetaMask...', 'loading', 0);

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

      const tx = await contract.createBatch(
        cleanBatchCode,
        cleanProductName,
        cleanOrigin,
        cleanMetadataURI,
        {
          value: feeWei
        }
      );

      removeToast(loadingToastId);
      const waitToastId = addToast('Äang Chá» Khá»‘i Sepolia', `Giao dá»‹ch ${tx.hash.slice(0, 10)}... Ä‘ang chá» xÃ¡c nháº­n trÃªn Blockchain...`, 'loading', 0);

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
        ocopStandard: 'ChÆ°a Tháº©m Äá»‹nh OCOP',
        certificationNo: `OCOP-HUE-2026-${cleanBatchCode.slice(-3)}`,
        quantity: cleanQuantity,
        currentStage: 'XÆ°á»Ÿng sáº£n xuáº¥t (Chá» Tháº©m Äá»‹nh OCOP)',
        certificateURI: `ipfs://huelegend/cert/${cleanBatchCode}`,
        txHash: tx.hash,
        inspectionFeePaid: '0.002 ETH',
        checkpoints: [
          {
            stepName: 'Cháº·ng 1: Khai bÃ¡o sáº£n xuáº¥t ban Ä‘áº§u',
            role: ROLE_HASHES.ROLE_PRODUCER,
            roleTitle: 'CÆ¡ Sá»Ÿ Sáº£n Xuáº¥t',
            location: cleanOrigin,
            action: `Khá»Ÿi táº¡o lÃ´ hÃ ng on-chain. NSX: ${cleanProdDate} - HSD: ${cleanExpDate}`,
            timestamp: Math.floor(Date.now() / 1000),
            recorder: cleanUserAddress,
            metadataURI: cleanMetadataURI,
            txHash: tx.hash,
            conditionNote: 'Khá»Ÿi táº¡o lÃ´ hÃ ng thÃ nh cÃ´ng trÃªn Sepolia Testnet.'
          }
        ]
      };

      setBatches((prev) => ({ ...prev, [cleanBatchCode]: newBatchObj }));
      setSelectedLookupBatch(cleanBatchCode);
      setJourneyBatch(newBatchObj);
      notifyDataSync();
      addToast('Khá»Ÿi Táº¡o On-Chain ThÃ nh CÃ´ng!', `LÃ´ hÃ ng ${cleanBatchCode} Ä‘Ã£ Ä‘Æ°á»£c khá»Ÿi táº¡o vÃ  lÆ°u vÄ©nh viá»…n trÃªn Smart Contract (Tx: ${tx.hash.slice(0, 8)}...).`, 'success');
      handleNavigateTab('lookup', cleanBatchCode);

      // Äá»“ng bá»™ láº¡i dá»¯ liá»‡u trá»±c tiáº¿p tá»« Smart Contract qua Ethers.js RPC Provider
      setTimeout(() => {
        fetchContractData(cleanUserAddress);
      }, 1000);
    } catch (err: any) {
      removeToast(loadingToastId);
      addToast('Giao Dá»‹ch Tháº¥t Báº¡i', err?.reason || err?.message || 'KhÃ´ng thá»ƒ khá»Ÿi táº¡o lÃ´ hÃ ng trÃªn Sepolia.', 'error');
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
      addToast('ChÆ°a Káº¿t Ná»‘i VÃ­', 'Vui lÃ²ng chá»n vai trÃ² & káº¿t ná»‘i vÃ­ MetaMask trÆ°á»›c khi ghi cháº·ng.', 'warning');
      setIsRoleModalOpen(true);
      return;
    }

    const valueWei = valueEth && Number(valueEth) > 0 ? ethers.parseEther(Number(valueEth).toFixed(6)) : undefined;

    const loadingToastId = addToast(
      'YÃªu Cáº§u MetaMask',
      'Vui lÃ²ng xÃ¡c nháº­n giao dá»‹ch addCheckpoint() trÃªn MetaMask...',
      'loading',
      0
    );

    try {
      const actionRole = checkpointWorkspace(role);
      if (!actionRole) throw new Error('Vai trÃ² ghi cháº·ng khÃ´ng há»£p lá»‡.');
      const signer = await wallet.authorizedSigner(actionRole);
      const rawUserAddr = await signer.getAddress();
      const cleanUserAddress = safeGetAddress(rawUserAddr);
      const contract = new ethers.Contract(safeGetAddress(CONTRACT_ADDRESS), PROJECT_CORE_ABI, signer);

      const roleHash = ROLE_HASHES[`ROLE_${actionRole}` as keyof typeof ROLE_HASHES];
      const fullActionText = conditionNote ? `${action} (Ghi chÃº: ${conditionNote})` : action;

      const tx = await contract.addCheckpoint(batchCode, roleHash, location, fullActionText, metadataURI);

      removeToast(loadingToastId);
      const waitToastId = addToast('Äang Chá» Khá»‘i Sepolia', `Giao dá»‹ch ${tx.hash.slice(0, 10)}... Ä‘ang chá» xÃ¡c nháº­n...`, 'loading', 0);

      await tx.wait();
      removeToast(waitToastId);

      const newCheckpoint = {
        stepName: stepName || `Cháº·ng má»›i: ${action}`,
        role: roleHash,
        roleTitle: getRoleTitle(roleHash),
        location,
        action: fullActionText,
        timestamp: Math.floor(Date.now() / 1000),
        recorder: cleanUserAddress,
        metadataURI,
        txHash: tx.hash,
        conditionNote: conditionNote || 'Ghi cháº·ng má»›i thÃ nh cÃ´ng.'
      };

      const isListingAction =
        role === 'RETAILER' ||
        role === ROLE_HASHES.ROLE_RETAILER ||
        (stepName && stepName.toLowerCase().includes('niÃªm yáº¿t')) ||
        (action && action.toLowerCase().includes('niÃªm yáº¿t'));

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
        addToast('XÃ¡c Nháº­n NiÃªm Yáº¿t ThÃ nh CÃ´ng!', `LÃ´ hÃ ng ${batchCode} Ä‘Ã£ niÃªm yáº¿t bÃ¡n láº» thÃ nh cÃ´ng (Tx: ${tx.hash.slice(0, 8)}...).`, 'success');
      } else {
        addToast('Ghi Cháº·ng ThÃ nh CÃ´ng!', `Cháº·ng má»›i cá»§a lÃ´ ${batchCode} Ä‘Ã£ Ä‘Æ°á»£c lÆ°u vÄ©nh viá»…n on-chain.`, 'success');
      }
      await fetchContractData();
      handleNavigateTab('lookup', batchCode);
    } catch (err: any) {
      removeToast(loadingToastId);
      addToast('Giao Dá»‹ch Tháº¥t Báº¡i', err?.reason || err?.message || 'Lá»—i ghi cháº·ng lÃªn Blockchain.', 'error');
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
      addToast('ChÆ°a Káº¿t Ná»‘i VÃ­', 'Vui lÃ²ng káº¿t ná»‘i vÃ­ MetaMask vá»›i quyá»n ROLE_INSPECTOR.', 'warning');
      setIsRoleModalOpen(true);
      return;
    }

    const loadingToastId = addToast('YÃªu Cáº§u MetaMask', 'Vui lÃ²ng xÃ¡c nháº­n giao dá»‹ch verifyBatch() trÃªn MetaMask...', 'loading', 0);

    try {
      const signer = await wallet.authorizedSigner('INSPECTOR');
      const rawUserAddr = await signer.getAddress();
      const cleanUserAddress = safeGetAddress(rawUserAddr);
      const contract = new ethers.Contract(safeGetAddress(CONTRACT_ADDRESS), PROJECT_CORE_ABI, signer);

      const fullNoteWithStars = `[Xáº¿p háº¡ng: OCOP ${starRating} Sao] ${inspectorNote}`;
      const tx = await contract.verifyBatch(batchCode, fullNoteWithStars, certificateURI);

      removeToast(loadingToastId);
      const waitToastId = addToast('Äang Chá» Khá»‘i Sepolia', `Giao dá»‹ch ${tx.hash.slice(0, 10)}... Ä‘ang tháº©m Ä‘á»‹nh OCOP...`, 'loading', 0);

      await tx.wait();
      removeToast(waitToastId);

      // verifyBatch() da tu ghi checkpoint INSPECTOR trong ProjectCore.

      setBatches((prev) => {
        const target = prev[batchCode];
        if (!target) return prev;

        // Tao checkpoint dac thu cho Chang 2 Kiem dinh OCOP
        const inspectorCheckpoint = {
          stepName: 'Cháº·ng 2: Tháº©m Äá»‹nh & Cáº¥p Chá»©ng Nháº­n OCOP Thá»«a ThiÃªn Huáº¿',
          role: ROLE_HASHES.ROLE_INSPECTOR,
          roleTitle: 'Kiá»ƒm Äá»‹nh ViÃªn OCOP',
          location: 'Sá»Ÿ NÃ´ng Nghiá»‡p & PTNT Tá»‰nh Thá»«a ThiÃªn Huáº¿',
          action: `Há»™i Ä‘á»“ng tháº©m Ä‘á»‹nh OCOP Tá»‰nh Thá»«a ThiÃªn Huáº¿ Ä‘Ã£ duyá»‡t vÃ  cáº¥p chá»©ng nháº­n háº¡ng ${starRating} Sao. Ghi chÃº: ${inspectorNote || 'Äáº¡t tiÃªu chuáº©n an toÃ n thá»±c pháº©m vÃ  cháº¥t lÆ°á»£ng Ä‘áº·c sáº£n Thá»«a ThiÃªn Huáº¿.'}`,
          timestamp: Math.floor(Date.now() / 1000),
          recorder: cleanUserAddress,
          metadataURI: certificateURI || `ipfs://huelegend/cert/${batchCode}`,
          txHash: tx.hash,
          conditionNote: `Cáº¥p mÃ£ sá»‘ OCOP: ${target.certificationNo || 'OCOP-HUE-2026'}. ÄÃ£ xÃ¡c thá»±c phÃ­ 0.002 ETH.`
        };

        const existingCps = target.checkpoints || [];
        const hasCp2 = existingCps.some((cp) => cp.role === ROLE_HASHES.ROLE_INSPECTOR || (cp.stepName && (cp.stepName.toLowerCase().includes('cháº·ng 2') || cp.stepName.toLowerCase().includes('ocop'))));
        const updatedCheckpoints = hasCp2
          ? existingCps.map((cp) => (cp.role === ROLE_HASHES.ROLE_INSPECTOR || (cp.stepName && cp.stepName.toLowerCase().includes('cháº·ng 2')) ? inspectorCheckpoint : cp))
          : [...existingCps, inspectorCheckpoint];

        const updatedBatch: Batch = {
          ...target,
          isVerified: true,
          starRating,
          inspectorNote,
          verifyTxHash: tx.hash,
          certificateURI: certificateURI || target.certificateURI,
          ocopStandard: `Äáº¡t Chuáº©n OCOP ${starRating} Sao Tá»‰nh Thá»«a ThiÃªn Huáº¿`,
          currentStage: 'ÄÃ£ Ä‘áº¡t chuáº©n OCOP (Chá» Váº­n Chuyá»ƒn)',
          checkpoints: updatedCheckpoints
        };

        return { ...prev, [batchCode]: updatedBatch };
      });

      setSelectedLookupBatch(batchCode);

      // Cap nhat ngay lap tuc cho popup hanh trinh va cloud sync
      setJourneyBatch((prev) => {
        const inspectorCheckpoint = {
          stepName: 'Cháº·ng 2: Tháº©m Äá»‹nh & Cáº¥p Chá»©ng Nháº­n OCOP Thá»«a ThiÃªn Huáº¿',
          role: ROLE_HASHES.ROLE_INSPECTOR,
          roleTitle: 'Kiá»ƒm Äá»‹nh ViÃªn OCOP',
          location: 'Sá»Ÿ NÃ´ng Nghiá»‡p & PTNT Tá»‰nh Thá»«a ThiÃªn Huáº¿',
          action: `Há»™i Ä‘á»“ng tháº©m Ä‘á»‹nh OCOP Tá»‰nh Thá»«a ThiÃªn Huáº¿ Ä‘Ã£ duyá»‡t vÃ  cáº¥p chá»©ng nháº­n háº¡ng ${starRating} Sao. Ghi chÃº: ${inspectorNote || 'Äáº¡t tiÃªu chuáº©n an toÃ n thá»±c pháº©m vÃ  cháº¥t lÆ°á»£ng Ä‘áº·c sáº£n Thá»«a ThiÃªn Huáº¿.'}`,
          timestamp: Math.floor(Date.now() / 1000),
          recorder: cleanUserAddress,
          metadataURI: certificateURI || `ipfs://huelegend/cert/${batchCode}`,
          txHash: tx.hash,
          conditionNote: `Cáº¥p mÃ£ sá»‘ OCOP: OCOP-HUE-2026. ÄÃ£ xÃ¡c thá»±c phÃ­ 0.002 ETH.`
        };
        if (!prev) return null;
        const existingCps = prev.checkpoints || [];
        const hasCp2 = existingCps.some((cp) => cp.role === ROLE_HASHES.ROLE_INSPECTOR || (cp.stepName && (cp.stepName.toLowerCase().includes('cháº·ng 2') || cp.stepName.toLowerCase().includes('ocop'))));
        const updatedCheckpoints = hasCp2
          ? existingCps.map((cp) => (cp.role === ROLE_HASHES.ROLE_INSPECTOR || (cp.stepName && cp.stepName.toLowerCase().includes('cháº·ng 2')) ? inspectorCheckpoint : cp))
          : [...existingCps, inspectorCheckpoint];

        return {
          ...prev,
          isVerified: true,
          starRating,
          inspectorNote,
          verifyTxHash: tx.hash,
          certificateURI: certificateURI || prev.certificateURI,
          ocopStandard: `Äáº¡t Chuáº©n OCOP ${starRating} Sao Tá»‰nh Thá»«a ThiÃªn Huáº¿`,
          currentStage: 'ÄÃ£ Ä‘áº¡t chuáº©n OCOP (Chá» Váº­n Chuyá»ƒn)',
          checkpoints: updatedCheckpoints
        };
      });

      notifyDataSync();
      addToast('Chá»©ng Nháº­n OCOP ThÃ nh CÃ´ng!', `LÃ´ ${batchCode} Ä‘Ã£ Ä‘áº¡t chá»©ng nháº­n OCOP ${starRating} Sao vÃ  ghi nháº­n Cháº·ng 2.`, 'success');
      await fetchContractData();
      handleNavigateTab('lookup', batchCode);
    } catch (err: any) {
      removeToast(loadingToastId);
      addToast('Giao Dá»‹ch Tháº¥t Báº¡i', err?.reason || err?.message || 'Cáº§n vai trÃ² ROLE_INSPECTOR Ä‘á»ƒ thá»±c hiá»‡n.', 'error');
    }
  };

  // 4. Revoke Verification On-Chain
  const handleRevokeVerification = async (batchCode: string, reason: string) => {
    if (!currentAccount) {
      addToast('ChÆ°a Káº¿t Ná»‘i VÃ­', 'Vui lÃ²ng káº¿t ná»‘i vÃ­ MetaMask.', 'warning');
      setIsRoleModalOpen(true);
      return;
    }

    const loadingToastId = addToast('YÃªu Cáº§u MetaMask', 'Vui lÃ²ng xÃ¡c nháº­n revokeBatchVerification() trÃªn MetaMask...', 'loading', 0);

    try {
      const signer = await wallet.authorizedSigner('INSPECTOR');
      const contract = new ethers.Contract(safeGetAddress(CONTRACT_ADDRESS), PROJECT_CORE_ABI, signer);

      const tx = await contract.revokeBatchVerification(batchCode, reason);

      removeToast(loadingToastId);
      const waitToastId = addToast('Äang Chá» Khá»‘i Sepolia', `Giao dá»‹ch ${tx.hash.slice(0, 10)}... Ä‘ang thu há»“i...`, 'loading', 0);

      await tx.wait();
      removeToast(waitToastId);

      addToast('ÄÃ£ Thu Há»“i Chá»©ng Nháº­n', `LÃ´ ${batchCode} Ä‘Ã£ bá»‹ thu há»“i chá»©ng nháº­n OCOP on-chain.`, 'warning');
      await fetchContractData();
    } catch (err: any) {
      removeToast(loadingToastId);
      addToast('Lá»—i Thu Há»“i On-Chain', err?.reason || err?.message || 'KhÃ´ng thá»ƒ thu há»“i chá»©ng nháº­n.', 'error');
    }
  };

  // 5. Deposit Stake On-Chain
  const handleDepositStake = async (amountEth: string) => {
    if (!currentAccount) {
      addToast('ChÆ°a Káº¿t Ná»‘i VÃ­', 'Vui lÃ²ng káº¿t ná»‘i vÃ­ MetaMask.', 'warning');
      setIsRoleModalOpen(true);
      return;
    }

    const loadingToastId = addToast('YÃªu Cáº§u MetaMask', 'Vui lÃ²ng xÃ¡c nháº­n depositStake() trÃªn MetaMask...', 'loading', 0);

    try {
      const signer = await wallet.authorizedSigner('PRODUCER');
      const contract = new ethers.Contract(safeGetAddress(CONTRACT_ADDRESS), PROJECT_CORE_ABI, signer);

      const valueWei = ethers.parseEther(amountEth);
      const tx = await contract.depositStake({ value: valueWei });

      removeToast(loadingToastId);
      const waitToastId = addToast('Äang Chá» Khá»‘i Sepolia', `Giao dá»‹ch ${tx.hash.slice(0, 10)}... Ä‘ang kÃ½ quá»¹...`, 'loading', 0);

      await tx.wait();
      removeToast(waitToastId);

      addToast('Äáº·t Cá»c KÃ½ Quá»¹ ThÃ nh CÃ´ng!', `ÄÃ£ Ä‘áº·t cá»c ${amountEth} ETH báº£o Ä‘áº£m cháº¥t lÆ°á»£ng.`, 'success');
      await fetchContractData();
    } catch (err: any) {
      removeToast(loadingToastId);
      addToast('Lá»—i Äáº·t Cá»c', err?.reason || err?.message || 'Äáº·t cá»c kÃ½ quá»¹ tháº¥t báº¡i.', 'error');
    }
  };

  // 6. Withdraw Stake On-Chain
  const handleWithdrawStake = async () => {
    if (!currentAccount) {
      addToast('ChÆ°a Káº¿t Ná»‘i VÃ­', 'Vui lÃ²ng káº¿t ná»‘i vÃ­ MetaMask.', 'warning');
      setIsRoleModalOpen(true);
      return;
    }

    const loadingToastId = addToast('YÃªu Cáº§u MetaMask', 'Vui lÃ²ng xÃ¡c nháº­n withdrawStake() trÃªn MetaMask...', 'loading', 0);

    try {
      const signer = await wallet.authorizedSigner('PRODUCER');
      const contract = new ethers.Contract(safeGetAddress(CONTRACT_ADDRESS), PROJECT_CORE_ABI, signer);

      const tx = await contract.withdrawStake();

      removeToast(loadingToastId);
      const waitToastId = addToast('Äang Chá» Khá»‘i Sepolia', `Giao dá»‹ch ${tx.hash.slice(0, 10)}... Ä‘ang rÃºt tiá»n...`, 'loading', 0);

      await tx.wait();
      removeToast(waitToastId);

      addToast('RÃºt KÃ½ Quá»¹ ThÃ nh CÃ´ng!', 'Sá»‘ tiá»n kÃ½ quá»¹ Ä‘Ã£ Ä‘Æ°á»£c chuyá»ƒn vá» vÃ­ cá»§a báº¡n.', 'success');
      await fetchContractData();
    } catch (err: any) {
      removeToast(loadingToastId);
      addToast('Lá»—i RÃºt KÃ½ Quá»¹', err?.reason || err?.message || 'Tiá»n kÃ½ quá»¹ cÃ²n Ä‘ang trong thá»i gian khÃ³a.', 'error');
    }
  };

  // 6b. Rut Doanh Thu Dai Ly Tu Smart Contract Ve Vi Dai Ly
  const handleWithdrawRetailerRevenue = async () => {
    addToast('ChÆ°a Há»— Trá»£ On-Chain', 'ProjectCore hiá»‡n táº¡i chÆ°a cÃ³ cÆ¡ cháº¿ doanh thu bÃ¡n láº»/rÃºt doanh thu. KhÃ´ng cÃ³ giao dá»‹ch nÃ o Ä‘Æ°á»£c gá»­i.', 'info');
  };

  // Cap/thu hoi quyen theo dung ABI cua contracts/project/ProjectCore.sol.
  const updateRoleOnChain = async (account: string, roleName: string, grant: boolean) => {
    const normalizedAccount = safeGetAddress(account);
    if (!ethers.isAddress(normalizedAccount) || normalizedAccount === ethers.ZeroAddress) {
      addToast('Äá»‹a Chá»‰ KhÃ´ng Há»£p Lá»‡', 'Nháº­p Ä‘á»‹a chá»‰ vÃ­ há»£p lá»‡, khÃ´ng dÃ¹ng Ä‘á»‹a chá»‰ 0.', 'error');
      return;
    }
    const roleHash = ROLE_HASHES[roleName as keyof typeof ROLE_HASHES];
    if (!roleHash) { addToast('Vai TrÃ² KhÃ´ng Há»£p Lá»‡', 'Chá»n vai trÃ² Ä‘Æ°á»£c há»— trá»£.', 'error'); return; }
    const toast = addToast(grant ? 'Cáº¥p Quyá»n' : 'Thu Há»“i Quyá»n', 'Chá»‰ cáº­p nháº­t sau khi giao dá»‹ch Ä‘Æ°á»£c xÃ¡c nháº­n trÃªn Sepolia.', 'loading', 0);
    try {
      const signer = await wallet.authorizedSigner('ADMIN');
      const contract = new ethers.Contract(CONTRACT_ADDRESS, PROJECT_CORE_ABI, signer);
      const tx = grant ? await contract.grantRole(normalizedAccount, roleHash) : await contract.revokeRole(normalizedAccount, roleHash);
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new Error('Giao dá»‹ch chÆ°a Ä‘Æ°á»£c xÃ¡c nháº­n thÃ nh cÃ´ng.');
      const effective = await contract.hasRole(normalizedAccount, roleHash);
      if (effective !== grant) throw new Error('Quyá»n thá»±c táº¿ chÆ°a khá»›p. Owner luÃ´n cÃ³ quyá»n káº¿ thá»«a trong há»£p Ä‘á»“ng nÃ y.');
      setGrantedWallets((prev) => {
        const retained = prev.filter((w) => !(w.address.toLowerCase() === normalizedAccount.toLowerCase() && w.role === roleName));
        return grant ? [{ address: normalizedAccount, role: roleName, roleTitle: getRoleTitle(roleHash),
          grantedAt: new Date().toISOString(), status: 'Active' }, ...retained] : retained;
      });
      addToast(grant ? 'ÄÃ£ Cáº¥p Quyá»n TrÃªn Sepolia' : 'ÄÃ£ Thu Há»“i Quyá»n TrÃªn Sepolia', `${normalizedAccount} â€¢ ${roleName}`, 'success');
      await wallet.refresh();
    } catch (err: any) {
      addToast('Giao Dá»‹ch Quyá»n Tháº¥t Báº¡i', err?.reason || err?.message || 'KhÃ´ng thá»ƒ cáº­p nháº­t quyá»n; khÃ´ng thay Ä‘á»•i dá»¯ liá»‡u cá»¥c bá»™.', 'error');
    } finally { removeToast(toast); }
  };
  const handleAssignRole = (account: string, roleName: string) => updateRoleOnChain(account, roleName, true);
  const handleRevokeRole = (account: string, roleName: string) => updateRoleOnChain(account, roleName, false);

  // 9. Set Creation Fee On-Chain
  const handleSetBatchCreationFee = async (newFeeEth: string) => {
    if (!currentAccount) {
      addToast('ChÆ°a Káº¿t Ná»‘i VÃ­', 'Vui lÃ²ng káº¿t ná»‘i vÃ­ MetaMask.', 'warning');
      setIsRoleModalOpen(true);
      return;
    }

    const loadingToastId = addToast('YÃªu Cáº§u MetaMask', 'Vui lÃ²ng xÃ¡c nháº­n setBatchCreationFee() trÃªn MetaMask...', 'loading', 0);

    try {
      const signer = await wallet.authorizedSigner('ADMIN');
      const contract = new ethers.Contract(safeGetAddress(CONTRACT_ADDRESS), PROJECT_CORE_ABI, signer);

      const newFeeWei = ethers.parseEther(newFeeEth);
      const tx = await contract.setBatchCreationFee(newFeeWei);

      removeToast(loadingToastId);
      const waitToastId = addToast('Äang Chá» Khá»‘i Sepolia', `Giao dá»‹ch ${tx.hash.slice(0, 10)}... Ä‘ang cáº­p nháº­t phÃ­...`, 'loading', 0);

      await tx.wait();
      removeToast(waitToastId);

      addToast('Cáº­p Nháº­t Má»©c PhÃ­ ThÃ nh CÃ´ng!', `Má»©c phÃ­ táº¡o lÃ´ hÃ ng Ä‘Ã£ chuyá»ƒn sang ${newFeeEth} ETH.`, 'success');
      await fetchContractData();
    } catch (err: any) {
      removeToast(loadingToastId);
      addToast('Lá»—i Cáº­p Nháº­t PhÃ­', err?.reason || err?.message || 'Cáº§n vai trÃ² ROLE_ADMIN Ä‘á»ƒ Ä‘á»•i phÃ­.', 'error');
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

