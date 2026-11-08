import React, { useMemo, useState } from 'react';
import {
  Activity, ArrowRight, Boxes, CheckCheck, ChevronDown, Clock3,
  Compass, PackageCheck, ShieldCheck, Wallet,
} from 'lucide-react';
import { Batch, SPECIALTY_CATEGORIES } from '../types';
import { WorkspaceRole } from '../lib/access';
import { ROLE_HASHES } from '../constants';
import { getExpiryState } from '../lib/batchMetadata';
import { inventoryForBatch, readGps } from '../../api/supply-ledger-core.js';

interface RoleDashboardProps {
  batches: Record<string, Batch>;
  account: string | null;
  role: WorkspaceRole;
  onNavigateTab?: (tab: string) => void;
}

function categoryOf(batch: Batch): string {
  if (batch.category && SPECIALTY_CATEGORIES.some(value => value === batch.category)) return batch.category;
  for (const checkpoint of batch.checkpoints || []) {
    const match = (checkpoint.action || '').match(/\[Danh mục:\s*([^\]]+)\]/i);
    if (match && SPECIALTY_CATEGORIES.some(value => value === match[1])) return match[1];
  }
  return 'Chưa phân loại';
}

const roleDetails = {
  ADMIN: {
    label: 'Quản trị hệ thống',
    description: 'Theo dõi hoạt động toàn hệ thống và kiểm soát dữ liệu truy xuất nguồn gốc.',
    action: 'Quản lý phân quyền',
    tab: 'admin',
  },
  PRODUCER: {
    label: 'Cơ sở sản xuất',
    description: 'Quản lý lô đặc sản của cơ sở và theo dõi tiến độ xác minh.',
    action: 'Tạo lô hàng',
    tab: 'create-batch',
  },
  RETAILER: {
    label: 'Đại lý phân phối',
    description: 'Nắm tình trạng các lô hàng liên quan đến ví phân phối của bạn.',
    action: 'Quản lý đại lý',
    tab: 'retailer',
  },
  INSPECTOR: {
    label: 'Kiểm định viên OCOP',
    description: 'Xem các lô hàng đang ghi nhận và kiểm tra trạng thái xác minh chất lượng.',
    action: 'Mở khu vực kiểm định',
    tab: 'inspector',
  },
  LOGISTICS: {
    label: 'Đơn vị vận chuyển',
    description: 'Theo dõi những lô hàng có chặng vận chuyển do ví của bạn ghi nhận.',
    action: 'Cập nhật hành trình',
    tab: 'checkpoint',
  },
} as const;

export const RoleDashboard: React.FC<RoleDashboardProps> = ({ batches, account, role, onNavigateTab }) => {
  const [category, setCategory] = useState('ALL');
  const details = role === 'ADMIN' || role === 'PRODUCER' || role === 'RETAILER' || role === 'INSPECTOR' || role === 'LOGISTICS' ? roleDetails[role] : null;

  const scopedBatches = useMemo(() => Object.values(batches).filter(batch => {
    if (!account) return false;
    if (role === 'ADMIN' || role === 'INSPECTOR') return true;
    if (role === 'PRODUCER') return batch.producer.toLowerCase() === account.toLowerCase();
    if (role === 'RETAILER') return (batch.checkpoints || []).some(checkpoint =>
      checkpoint.role === ROLE_HASHES.ROLE_RETAILER && checkpoint.recorder.toLowerCase() === account.toLowerCase());
    if (role === 'LOGISTICS') return (batch.checkpoints || []).some(checkpoint =>
      checkpoint.role === ROLE_HASHES.ROLE_LOGISTICS && checkpoint.recorder.toLowerCase() === account.toLowerCase());
    return false;
  }), [batches, account, role]);

  if (!details || !account) return null;

  const filtered = scopedBatches.filter(batch => category === 'ALL' || categoryOf(batch) === category);
  const verified = filtered.filter(batch => batch.isVerified).length;
  const expiring = filtered.filter(batch => ['EXPIRING', 'EXPIRED'].includes(
    getExpiryState(batch.expiryDate, Boolean(batch.metadataVerified)))).length;
  const withGps = filtered.filter(batch => (batch.checkpoints || []).some(cp => readGps(cp.location))).length;
  const useGpsMetric = role !== 'PRODUCER' && role !== 'RETAILER';
  const movements = useGpsMetric ? 0 : filtered.reduce((sum, batch) => {
    const ledger = inventoryForBatch(
      batch,
      account,
      role === 'PRODUCER' ? ROLE_HASHES.ROLE_PRODUCER : ROLE_HASHES.ROLE_RETAILER,
      role === 'PRODUCER' && batch.producer.toLowerCase() === account.toLowerCase(),
    );
    return sum + ledger.movements.length;
  }, 0);
  const verifiedPercent = filtered.length ? Math.round(verified * 100 / filtered.length) : 0;
  const categories = [...SPECIALTY_CATEGORIES, 'Chưa phân loại'];
  const categoryStats = categories
    .map(name => ({ name, count: filtered.filter(batch => categoryOf(batch) === name).length }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);
  const cards = [
    { label: 'Lô hàng đang theo dõi', value: filtered.length, note: 'Theo phạm vi ví đang chọn', Icon: Boxes, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Đã xác minh OCOP', value: verified, note: `${verifiedPercent}% tổng số lô trong bộ lọc`, Icon: CheckCheck, tone: 'bg-teal-50 text-teal-700' },
    { label: 'Cần chú ý hạn sử dụng', value: expiring, note: 'Sắp hết hoặc đã hết hạn', Icon: Clock3, tone: 'bg-amber-50 text-amber-700' },
    { label: useGpsMetric ? 'Lô có thông tin GPS' : 'Lượt nhập / xuất kho', value: useGpsMetric ? withGps : movements,
      note: useGpsMetric ? 'Có tọa độ trong hành trình' : 'Đã ghi nhận theo vai trò', Icon: Activity, tone: 'bg-blue-50 text-blue-700' },
  ];

  return (
    <section className="space-y-5 font-sans" data-testid="role-dashboard" data-dashboard-role={role}>
      <div className="relative overflow-hidden rounded-[28px] bg-[#173F32] text-white shadow-[0_16px_42px_-28px_rgba(12,57,40,.8)]">
        <div className="pointer-events-none absolute -top-32 -right-16 h-72 w-72 rounded-full border-[52px] border-white/[0.045]" />
        <div className="pointer-events-none absolute bottom-[-120px] right-[28%] h-64 w-64 rounded-full bg-[#D3B56D]/[0.07] blur-3xl" />
        <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[660px]">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#D7CA9D]">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white/10"><Compass className="h-3.5 w-3.5" /></span>
              Không gian làm việc <span className="text-white/40">/</span> Ethereum Sepolia
            </div>
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-[30px]">{details.label}</h1>
            <p className="mt-2 max-w-[560px] text-sm leading-6 text-white/75">{details.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/20 bg-emerald-100/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-100">
                <ShieldCheck className="h-3.5 w-3.5" /> Quyền đã xác minh
              </span>
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] text-white/85">
                <Wallet className="h-3.5 w-3.5 shrink-0" />
                <span className="font-mono">{account.slice(0, 6)}...{account.slice(-4)}</span>
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
            {onNavigateTab && (
              <button type="button" onClick={() => onNavigateTab(details.tab)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#E1BE77] px-5 py-2.5 text-xs font-extrabold text-[#233B30] shadow-sm transition hover:bg-[#F0D49A]">
                {details.action}<ArrowRight className="h-4 w-4" />
              </button>
            )}
            <label className="relative block text-[11px] font-semibold text-white/70">
              Lọc theo nhóm đặc sản
              <select aria-label="Loại đặc sản trong dashboard" value={category} onChange={event => setCategory(event.target.value)}
                className="mt-1.5 w-full min-w-[215px] appearance-none rounded-xl border border-white/20 bg-[#2C5547] px-3.5 py-2.5 pr-9 text-xs font-semibold text-white outline-none transition focus:border-[#E1BE77]">
                <option value="ALL">Tất cả nhóm đặc sản</option>
                {categories.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute bottom-3 right-3 h-3.5 w-3.5 text-white/75" />
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 lg:gap-4">
        {cards.map(({ label, value, note, Icon, tone }) => (
          <div key={label} className="min-w-0 rounded-2xl border border-[#E6E8E1] bg-white p-4 shadow-[0_5px_22px_-18px_rgba(20,51,37,.25)] sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-2">
              <p className="max-w-[180px] text-xs font-semibold leading-5 text-[#53685C]">{label}</p>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-[18px] w-[18px]" /></span>
            </div>
            <div className="text-[28px] font-extrabold leading-none tracking-tight text-[#1C3D2F] sm:text-[32px]">{value}</div>
            <p className="mt-2 min-h-[30px] text-[11px] leading-[15px] text-[#829085]">{note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(270px,1fr)]">
        <div className="rounded-2xl border border-[#E6E8E1] bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#254636]">Phân bố nhóm đặc sản</h2>
              <p className="mt-1 text-xs text-[#829085]">Dữ liệu lô hàng theo bộ lọc hiện tại</p>
            </div>
            <span className="rounded-lg bg-[#EDF4EE] px-2.5 py-1 text-[11px] font-bold text-[#3F6D53]">{filtered.length} lô</span>
          </div>
          {categoryStats.length === 0 ? (
            <div className="mt-5 flex min-h-[90px] items-center justify-center gap-2 rounded-xl bg-[#F7F8F5] text-xs text-[#7A897F]">
              <PackageCheck className="h-4 w-4" /> Chưa có dữ liệu trong nhóm này
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {categoryStats.map(({ name, count }) => (
                <div key={name} className="grid grid-cols-[minmax(105px,1fr)_minmax(65px,1.5fr)_30px] items-center gap-3 text-xs sm:grid-cols-[minmax(140px,1fr)_minmax(80px,2fr)_35px]">
                  <span className="truncate font-semibold text-[#40564A]" title={name}>{name}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-[#EDF1EB]">
                    <div className="h-full rounded-full bg-[#4D8466]" style={{ width: `${filtered.length ? count / filtered.length * 100 : 0}%` }} />
                  </div>
                  <span className="text-right font-bold tabular-nums text-[#254636]">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <aside className="flex flex-col justify-between rounded-2xl border border-[#E6E8E1] bg-[#F9FAF6] p-5 sm:p-6">
          <div>
            <h2 className="text-sm font-bold text-[#254636]">Tình trạng xác minh</h2>
            <p className="mt-1 text-xs text-[#829085]">Tỷ lệ lô được xác nhận OCOP</p>
            <div className="mt-5 flex items-end gap-2">
              <span className="text-[36px] font-extrabold leading-none tracking-tight text-[#1C3D2F]">{verifiedPercent}%</span>
              <span className="pb-1 text-xs text-[#7A897F]">đã xác minh</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#DDE7DC]">
              <div className="h-full rounded-full bg-[#4D8466]" style={{ width: `${verifiedPercent}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-[#617769]">{verified} / {filtered.length} lô đã đạt trạng thái xác minh.</p>
          </div>
          <p className="mt-5 border-t border-[#E4E9E1] pt-3 text-[11px] leading-[17px] text-[#89968C]">
            Số liệu lấy từ lô hàng hiện có; không đại diện cho doanh thu hoặc lượng bán thực tế.
          </p>
        </aside>
      </div>
    </section>
  );
};
