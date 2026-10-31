import {
  CHAIN_ROLES, ChainRole, WalletSession, WorkspaceRole, RolePermissions,
  SEPOLIA_CHAIN, canPerform, emptyPermissions, guestSession, hasWorkspacePermission,
  isAddress, normalizeChainId, normalizeWorkspace, sameAddress,
} from './access';

export interface WalletProvider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
  on?(event: string, listener: (...args: any[]) => void): void;
  removeListener?(event: string, listener: (...args: any[]) => void): void;
}
export interface AccessReader {
  permissions(account: string): Promise<RolePermissions>;
}
export class WalletAccessError extends Error {}

// Moi tac vu RPC co han cho; ket qua cu khong duoc khoi phuc quyen cua phien moi.
export async function withDeadline<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new WalletAccessError('QuÃ¡ thá»i gian xÃ¡c minh quyá»n trÃªn Sepolia. Vui lÃ²ng thá»­ láº¡i.')), ms);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}

export class WalletSessionController {
  private snapshot: WalletSession = guestSession();
  private generation = 0;
  private enabled = false;
  private connecting = false;
  private preferred: WorkspaceRole = 'CUSTOMER';
  private listeners = new Set<(session: WalletSession) => void>();
  private attached = false;
  constructor(public readonly provider: WalletProvider, private reader: AccessReader) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: (session: WalletSession) => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private publish(session: WalletSession) {
    this.snapshot = session;
    this.listeners.forEach((fn) => fn(session));
  }
  private clear(status: WalletSession['status'], account: string | null = null, notice = '', chainId: string | null = null) {
    this.publish({ ...guestSession(), status, account, chainId, notice });
  }
  private async identities() {
    const [chain, values] = await withDeadline(Promise.all([
      this.provider.request({ method: 'eth_chainId' }), this.provider.request({ method: 'eth_accounts' }),
    ]));
    const accounts = Array.isArray(values) ? values : [];
    return { chainId: normalizeChainId(chain), account: isAddress(accounts[0]) ? accounts[0] : null };
  }
  private async verify(token: number, background = false): Promise<WalletSession> {
    let account: string | null = null;
    try {
      const identity = await this.identities();
      if (token !== this.generation || !this.enabled) return this.snapshot;
      account = identity.account;
      if (!account) { this.disconnect(); return this.snapshot; }
      if (identity.chainId !== SEPOLIA_CHAIN) {
        this.clear('wrong-network', account, 'VÃ­ Ä‘ang á»Ÿ máº¡ng khÃ¡c. Chuyá»ƒn sang Sepolia Ä‘á»ƒ má»Ÿ chá»©c nÄƒng theo vai trÃ².', identity.chainId);
        return this.snapshot;
      }
      if (!background || !sameAddress(this.snapshot.account, account)) this.clear('checking', account, '', identity.chainId);
      const permissions = await withDeadline(this.reader.permissions(account));
      const after = await this.identities();
      if (token !== this.generation || !this.enabled) return this.snapshot;
      if (!sameAddress(account, after.account) || after.chainId !== SEPOLIA_CHAIN) {
        this.clear('error', after.account, 'TÃ i khoáº£n hoáº·c máº¡ng Ä‘Ã£ thay Ä‘á»•i. Vui lÃ²ng káº¿t ná»‘i láº¡i.', after.chainId);
        return this.snapshot;
      }
      const allowed = hasWorkspacePermission(permissions, this.preferred);
      this.publish({ account, chainId: SEPOLIA_CHAIN, status: 'ready', permissions,
        workspace: allowed ? this.preferred : 'CUSTOMER',
        notice: allowed ? '' : 'VÃ­ chÆ°a cÃ³ quyá»n cho vai trÃ² Ä‘Ã£ chá»n. Chá»‰ má»Ÿ chá»©c nÄƒng khÃ¡ch hÃ ng; cáº§n Owner cáº¥p quyá»n trÃªn há»£p Ä‘á»“ng.',
      });
    } catch {
      if (token === this.generation && this.enabled) this.clear('error', account,
        'KhÃ´ng xÃ¡c minh Ä‘Æ°á»£c quyá»n trÃªn há»£p Ä‘á»“ng Sepolia. Chá»©c nÄƒng nghiá»‡p vá»¥ Ä‘Ã£ khÃ³a; báº¥m Äá»“ng bá»™ Ä‘á»ƒ thá»­ láº¡i.', SEPOLIA_CHAIN);
    }
    return this.snapshot;
  }
  async connect(role?: string): Promise<WalletSession> {
    if (this.connecting) return this.snapshot;
    this.enabled = true;
    this.preferred = normalizeWorkspace(role);
    this.connecting = true;
    const token = ++this.generation;
    this.clear('connecting');
    try {
      await this.provider.request({ method: 'eth_requestAccounts' });
      if (token !== this.generation || !this.enabled) return this.snapshot;
      let chain = normalizeChainId(await this.provider.request({ method: 'eth_chainId' }));
      if (chain !== SEPOLIA_CHAIN) {
        try {
          await this.provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SEPOLIA_CHAIN }] });
        } catch (err: any) {
          if (Number(err?.code) !== 4902) throw err;
          await this.provider.request({ method: 'wallet_addEthereumChain', params: [{
            chainId: SEPOLIA_CHAIN, chainName: 'Sepolia Test Network',
            nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'], blockExplorerUrls: ['https://sepolia.etherscan.io'],
          }] });
          await this.provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SEPOLIA_CHAIN }] });
        }
      }
      if (token !== this.generation || !this.enabled) return this.snapshot;
      return await this.verify(token);
    } catch (err: any) {
      if (token === this.generation) {
        this.enabled = false;
        this.clear('guest', null, Number(err?.code) === 4001 ? 'Báº¡n Ä‘Ã£ tá»« chá»‘i káº¿t ná»‘i hoáº·c chuyá»ƒn máº¡ng trong MetaMask.' : 'KhÃ´ng thá»ƒ káº¿t ná»‘i vÃ­. HÃ£y kiá»ƒm tra MetaMask rá»“i thá»­ láº¡i.');
      }
      return this.snapshot;
    } finally { this.connecting = false; }
  }
  async refresh(background = false): Promise<WalletSession> {
    if (!this.enabled || this.connecting) return this.snapshot;
    const account = this.snapshot.account;
    const token = ++this.generation;
    if (!background) this.clear('checking', account);
    return this.verify(token, background);
  }
  disconnect = () => {
    this.enabled = false;
    ++this.generation;
    this.publish(guestSession());
  };
  private accountsChanged = (_accounts: string[]) => {
    if (!this.enabled || this.connecting) return;
    void this.refresh();
  };
  private chainChanged = (_chainId: string) => {
    if (!this.enabled || this.connecting) return;
    void this.refresh();
  };
  private disconnected = () => { this.disconnect(); };
  attach() {
    if (this.attached) return;
    this.provider.on?.('accountsChanged', this.accountsChanged);
    this.provider.on?.('chainChanged', this.chainChanged);
    this.provider.on?.('disconnect', this.disconnected);
    this.attached = true;
  }
  destroy() {
    this.disconnect();
    this.provider.removeListener?.('accountsChanged', this.accountsChanged);
    this.provider.removeListener?.('chainChanged', this.chainChanged);
    this.provider.removeListener?.('disconnect', this.disconnected);
    this.listeners.clear();
    this.attached = false;
  }
  // Xac minh lai ngay truoc giao dich; khong tin vao nut bam hay localStorage.
  async authorize(role: WorkspaceRole): Promise<string> {
    const before = this.snapshot;
    const token = this.generation;
    if (!canPerform(before, role) || !before.account) throw new WalletAccessError('VÃ­ chÆ°a cÃ³ quyá»n thá»±c hiá»‡n thao tÃ¡c nÃ y.');
    try {
      const identities = await this.identities();
      if (token !== this.generation || !sameAddress(before.account, identities.account) || identities.chainId !== SEPOLIA_CHAIN) {
        throw new WalletAccessError('VÃ­ hoáº·c máº¡ng Ä‘Ã£ thay Ä‘á»•i. HÃ£y káº¿t ná»‘i láº¡i trÆ°á»›c khi giao dá»‹ch.');
      }
      const permissions = await withDeadline(this.reader.permissions(before.account));
      const after = await this.identities();
      if (token !== this.generation || !sameAddress(before.account, after.account) || after.chainId !== SEPOLIA_CHAIN) {
        throw new WalletAccessError('PhiÃªn vÃ­ Ä‘Ã£ thay Ä‘á»•i. Giao dá»‹ch chÆ°a Ä‘Æ°á»£c gá»­i.');
      }
      if (!canPerform({ ...before, permissions }, role)) throw new WalletAccessError('Quyá»n trÃªn há»£p Ä‘á»“ng Ä‘Ã£ thay Ä‘á»•i hoáº·c Ä‘Ã£ bá»‹ thu há»“i.');
      this.publish({ ...before, permissions });
      return before.account;
    } catch (err) {
      if (token === this.generation) this.clear('error', before.account, 'KhÃ´ng xÃ¡c minh Ä‘Æ°á»£c quyá»n giao dá»‹ch. Vui lÃ²ng Ä‘á»“ng bá»™ láº¡i.', before.chainId);
      throw err;
    }
  }
}

