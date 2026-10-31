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
      timer = setTimeout(() => reject(new WalletAccessError('Quá thời gian xác minh quyền trên Sepolia. Vui lòng thử lại.')), ms);
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
        this.clear('wrong-network', account, 'Ví đang ở mạng khác. Chuyển sang Sepolia để mở chức năng theo vai trò.', identity.chainId);
        return this.snapshot;
      }
      if (!background || !sameAddress(this.snapshot.account, account)) this.clear('checking', account, '', identity.chainId);
      const permissions = await withDeadline(this.reader.permissions(account));
      const after = await this.identities();
      if (token !== this.generation || !this.enabled) return this.snapshot;
      if (!sameAddress(account, after.account) || after.chainId !== SEPOLIA_CHAIN) {
        this.clear('error', after.account, 'Tài khoản hoặc mạng đã thay đổi. Vui lòng kết nối lại.', after.chainId);
        return this.snapshot;
      }
      const allowed = hasWorkspacePermission(permissions, this.preferred);
      this.publish({ account, chainId: SEPOLIA_CHAIN, status: 'ready', permissions,
        workspace: allowed ? this.preferred : 'CUSTOMER',
        notice: allowed ? '' : 'Ví chưa có quyền cho vai trò đã chọn. Chỉ mở chức năng khách hàng; cần Owner cấp quyền trên hợp đồng.',
      });
    } catch {
      if (token === this.generation && this.enabled) this.clear('error', account,
        'Không xác minh được quyền trên hợp đồng Sepolia. Chức năng nghiệp vụ đã khóa; bấm Đồng bộ để thử lại.', SEPOLIA_CHAIN);
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
        this.clear('guest', null, Number(err?.code) === 4001 ? 'Bạn đã từ chối kết nối hoặc chuyển mạng trong MetaMask.' : 'Không thể kết nối ví. Hãy kiểm tra MetaMask rồi thử lại.');
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
    if (!canPerform(before, role) || !before.account) throw new WalletAccessError('Ví chưa có quyền thực hiện thao tác này.');
    try {
      const identities = await this.identities();
      if (token !== this.generation || !sameAddress(before.account, identities.account) || identities.chainId !== SEPOLIA_CHAIN) {
        throw new WalletAccessError('Ví hoặc mạng đã thay đổi. Hãy kết nối lại trước khi giao dịch.');
      }
      const permissions = await withDeadline(this.reader.permissions(before.account));
      const after = await this.identities();
      if (token !== this.generation || !sameAddress(before.account, after.account) || after.chainId !== SEPOLIA_CHAIN) {
        throw new WalletAccessError('Phiên ví đã thay đổi. Giao dịch chưa được gửi.');
      }
      if (!canPerform({ ...before, permissions }, role)) throw new WalletAccessError('Quyền trên hợp đồng đã thay đổi hoặc đã bị thu hồi.');
      this.publish({ ...before, permissions });
      return before.account;
    } catch (err) {
      if (token === this.generation) this.clear('error', before.account, 'Không xác minh được quyền giao dịch. Vui lòng đồng bộ lại.', before.chainId);
      throw err;
    }
  }
}
