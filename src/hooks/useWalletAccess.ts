import { useCallback, useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, PROJECT_CORE_ABI, ROLE_HASHES } from '../constants';
import { CHAIN_ROLES, WorkspaceRole, WalletSession, emptyPermissions, guestSession, sameAddress, SEPOLIA_CHAIN, normalizeChainId, canPerform } from '../lib/access';
import { WalletSessionController, WalletProvider } from '../lib/walletSession';

function injectedWallet(): WalletProvider | null {
  const ethereum = (window as any).ethereum;
  return ethereum?.providers?.find((p: any) => p.isMetaMask) || ethereum || null;
}

export function useWalletAccess() {
  const [session, setSession] = useState<WalletSession>(guestSession);
  const controller = useRef<WalletSessionController | null>(null);
  const unsubscribe = useRef<(() => void) | null>(null);
  const ensureController = useCallback(() => {
    const injected = injectedWallet();
    if (!injected) throw new Error('Vui lòng mở MetaMask hoặc cài ví để kết nối.');
    const existing = controller.current;
    if (existing && existing.provider === injected) return existing;
    unsubscribe.current?.();
    controller.current?.destroy();
    const next = new WalletSessionController(injected, {
      async permissions(account) {
        const provider = new ethers.BrowserProvider(injected as any);
        try {
          const blockTag = await provider.getBlockNumber();
          const code = await provider.getCode(CONTRACT_ADDRESS, blockTag);
          if (code === '0x') throw new Error('Không có smart contract tại địa chỉ cấu hình.');
          const contract = new ethers.Contract(CONTRACT_ADDRESS, PROJECT_CORE_ABI, provider);
          const [owner, ...values] = await Promise.all([
            contract.owner({ blockTag }),
            ...CHAIN_ROLES.map((role) => contract.hasRole(account, ROLE_HASHES[role], { blockTag })),
          ]);
          const permissions = emptyPermissions();
          permissions.owner = sameAddress(owner, account);
          CHAIN_ROLES.forEach((role, index) => { permissions[role] = values[index] === true; });
          return permissions;
        } finally { provider.destroy(); }
      },
    });
    controller.current = next;
    unsubscribe.current = next.subscribe(setSession);
    next.attach();
    return next;
  }, []);
  useEffect(() => {
    // Xoa nhan dang phien cu; khong khoi phuc quyen tu bo nho hay cloud sync.
    try { ['hl_user_role', 'hl_connected_account', 'hl_active_tab'].forEach((key) => localStorage.removeItem(key)); } catch {}
    return () => { unsubscribe.current?.(); controller.current?.destroy(); controller.current = null; };
  }, []);
  useEffect(() => {
    const recheck = () => { if (document.visibilityState === 'visible') void controller.current?.refresh(true); };
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void controller.current?.refresh(true); }, 60000);
    document.addEventListener('visibilitychange', recheck);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', recheck); };
  }, []);
  const connect = useCallback((role?: string) => ensureController().connect(role), [ensureController]);
  const disconnect = useCallback(() => { controller.current?.disconnect(); setSession(guestSession()); }, []);
  const refresh = useCallback(async () => controller.current?.refresh(true), []);
  const authorizedSigner = useCallback(async (role: WorkspaceRole) => {
    const active = controller.current;
    if (!active) throw new Error('Vui lòng kết nối ví trước.');
    const account = await active.authorize(role);
    const provider = new ethers.BrowserProvider(active.provider as any);
    try {
      const signer = await provider.getSigner(account);
      const chain = await active.provider.request({ method: 'eth_chainId' });
      if (!sameAddress(await signer.getAddress(), account) || normalizeChainId(chain) !== SEPOLIA_CHAIN ||
        !canPerform(active.getSnapshot(), role) || !sameAddress(active.getSnapshot().account, account)) {
        throw new Error('Tài khoản hoặc mạng đã thay đổi. Giao dịch chưa được gửi.');
      }
      return signer;
    } catch (err) { provider.destroy(); throw err; }
  }, []);
  return { session, connect, disconnect, refresh, authorizedSigner };
}
