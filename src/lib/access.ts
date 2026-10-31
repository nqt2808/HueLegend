export const TAB_IDS = ['overview', 'lookup', 'store', 'create-batch', 'inspector', 'checkpoint', 'retailer', 'admin'] as const;
export type TabId = typeof TAB_IDS[number];
export type WorkspaceRole = 'GUEST' | 'CUSTOMER' | 'ADMIN' | 'PRODUCER' | 'INSPECTOR' | 'LOGISTICS' | 'RETAILER';
export type ChainRole = 'ROLE_ADMIN' | 'ROLE_PRODUCER' | 'ROLE_INSPECTOR' | 'ROLE_LOGISTICS' | 'ROLE_RETAILER';
export type WalletStatus = 'guest' | 'connecting' | 'checking' | 'ready' | 'wrong-network' | 'error';
export type RolePermissions = Record<ChainRole, boolean> & { owner: boolean };
export interface WalletSession {
  account: string | null;
  chainId: string | null;
  status: WalletStatus;
  workspace: WorkspaceRole;
  permissions: RolePermissions;
  notice: string;
}
export const SEPOLIA_CHAIN = '0xaa36a7';
export const CHAIN_ROLES: ChainRole[] = ['ROLE_ADMIN', 'ROLE_PRODUCER', 'ROLE_INSPECTOR', 'ROLE_LOGISTICS', 'ROLE_RETAILER'];
export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  GUEST: 'Khách chưa kết nối', CUSTOMER: 'Khách hàng / Du khách', ADMIN: 'Quản trị hệ thống (Owner)',
  PRODUCER: 'Cơ sở sản xuất', INSPECTOR: 'Kiểm định viên OCOP', LOGISTICS: 'Đơn vị vận chuyển', RETAILER: 'Đại lý bán lẻ',
};
export function emptyPermissions(): RolePermissions {
  return { owner: false, ROLE_ADMIN: false, ROLE_PRODUCER: false, ROLE_INSPECTOR: false, ROLE_LOGISTICS: false, ROLE_RETAILER: false };
}
export function guestSession(): WalletSession {
  return { account: null, chainId: null, status: 'guest', workspace: 'GUEST', permissions: emptyPermissions(), notice: '' };
}
export function normalizeWorkspace(role?: string): WorkspaceRole {
  if (role === 'SUPPLY_CHAIN') return 'PRODUCER';
  if (role === 'COMMERCE') return 'RETAILER';
  return ['CUSTOMER', 'ADMIN', 'PRODUCER', 'INSPECTOR', 'LOGISTICS', 'RETAILER'].includes(role || '') ? role as WorkspaceRole : 'CUSTOMER';
}
export function normalizeChainId(value: unknown): string | null {
  try { return typeof value === 'string' || typeof value === 'number' ? '0x' + BigInt(value).toString(16) : null; }
  catch { return null; }
}
export function isAddress(value: unknown): value is string {
  return typeof value === 'string' && /^0x[0-9a-f]{40}$/i.test(value);
}
export function sameAddress(a: unknown, b: unknown): boolean {
  return isAddress(a) && isAddress(b) && a.toLowerCase() === b.toLowerCase();
}
export function isVerifiedSession(session: WalletSession): boolean {
  return !!session.account && session.status === 'ready' && session.chainId === SEPOLIA_CHAIN;
}
export function hasWorkspacePermission(permissions: RolePermissions, role: WorkspaceRole): boolean {
  if (role === 'GUEST') return false;
  if (role === 'CUSTOMER') return true;
  // Cac ham quan tri trong ProjectCore dung onlyOwner, khong chi ROLE_ADMIN.
  if (role === 'ADMIN') return permissions.owner;
  return permissions.owner || permissions[`ROLE_${role}` as ChainRole] === true;
}
const roleTabs: Record<WorkspaceRole, readonly TabId[]> = {
  GUEST: ['overview', 'store'],
  CUSTOMER: ['overview', 'lookup', 'store'],
  PRODUCER: ['overview', 'lookup', 'store', 'create-batch'],
  INSPECTOR: ['overview', 'lookup', 'store', 'inspector'],
  LOGISTICS: ['overview', 'lookup', 'store', 'checkpoint'],
  RETAILER: ['overview', 'lookup', 'store', 'retailer'],
  ADMIN: TAB_IDS,
};
export function visibleTabs(session: WalletSession): readonly TabId[] {
  if (!isVerifiedSession(session) || !hasWorkspacePermission(session.permissions, session.workspace)) return roleTabs.GUEST;
  return roleTabs[session.workspace];
}
export function canVisitTab(tab: string, session: WalletSession): boolean {
  // Ho so nguon goc va lien ket QR la du lieu doc cong khai; khong hien thanh menu cua khach.
  return tab === 'lookup' || visibleTabs(session).includes(tab as TabId);
}
export function canPerform(session: WalletSession, role: WorkspaceRole): boolean {
  if (!isVerifiedSession(session) || role === 'GUEST') return false;
  if (role === 'CUSTOMER') return true;
  return hasWorkspacePermission(session.permissions, role) && (session.workspace === 'ADMIN' || session.workspace === role);
}
export function checkpointWorkspace(role: string): WorkspaceRole | null {
  const key = role.replace(/^ROLE_/, '');
  return ['PRODUCER', 'LOGISTICS', 'RETAILER', 'INSPECTOR'].includes(key) ? key as WorkspaceRole : null;
}
