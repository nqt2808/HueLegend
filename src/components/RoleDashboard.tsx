import React, { useMemo, useState } from 'react';
import { Batch, SPECIALTY_CATEGORIES } from '../types';
import { WorkspaceRole } from '../lib/access';
import { ROLE_HASHES } from '../constants';
import { getExpiryState } from '../lib/batchMetadata';
import { inventoryForBatch, readGps } from '../../api/supply-ledger-core.js';

interface RoleDashboardProps {
  batches: Record<string, Batch>;
  account: string | null;
  role: WorkspaceRole;
}

function categoryOf(batch: Batch): string {
  if (batch.category && SPECIALTY_CATEGORIES.some(value => value === batch.category)) return batch.category;
  for (const cp of batch.checkpoints || []) {
    const match = cp.action.match(/\[Danh mục:\s*([^\]]+)\]/i);
    if (match && SPECIALTY_CATEGORIES.some(value => value === match[1])) return match[1];
  }
  return 'Chưa phân loại';
}

export const RoleDashboard: React.FC<RoleDashboardProps> = ({ batches, account, role }) => {
  const [category, setCategory] = useState('ALL');
  const scope = useMemo(() => Object.values(batches).filter(batch => {
    if (role === 'ADMIN') return true;
    if (role === 'PRODUCER') return batch.producer.toLowerCase() === account?.toLowerCase();
    if (role === 'RETAILER') return batch.checkpoints.some(cp => cp.role === ROLE_HASHES.ROLE_RETAILER && cp.recorder.toLowerCase() === account?.toLowerCase());
    return false;
  }), [batches, account, role]);
  if (!['ADMIN', 'PRODUCER', 'RETAILER'].includes(role) || !account) return null;
  const filtered = scope.filter(batch => category === 'ALL' || categoryOf(batch) === category);
  const expiring = filtered.filter(batch => ['EXPIRING', 'EXPIRED'].includes(getExpiryState(batch.expiryDate, Boolean(batch.metadataVerified)))).length;
  const withGps = filtered.filter(batch => batch.checkpoints.some(cp => readGps(cp.location))).length;
  const stockEntries = filtered.map(batch => {
    if (role === 'ADMIN') return null;
    return inventoryForBatch(batch, account, role === 'PRODUCER' ? ROLE_HASHES.ROLE_PRODUCER : ROLE_HASHES.ROLE_RETAILER,
      role === 'PRODUCER' && batch.producer.toLowerCase() === account.toLowerCase());
  }).filter(value => value !== null);
  const totalMovements = stockEntries.reduce((sum, entry) => sum + entry.movements.length, 0);
  const groups = [...SPECIALTY_CATEGORIES, 'Chưa phân loại'];
  const roleLabel = role === 'ADMIN' ? 'Quản trị viên' : role === 'PRODUCER' ? 'Cơ sở sản xuất' : 'Đại lý bán lẻ';

  return <section className="bg-white rounded-2xl border border-[#E6E1D7] p-5 space-y-4" data-testid="role-dashboard">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="font-serif text-xl font-extrabold text-[#264939]">Dashboard {roleLabel}</h2>
        <p className="text-xs text-[#5E7166]">Chỉ thống kê lô liên quan tới ví/vai trò đang chọn; bộ lọc loại sản phẩm nằm trong dashboard này.</p>
      </div>
      <label className="text-xs font-bold">Loại đặc sản
        <select aria-label="Loại đặc sản trong dashboard" className="border rounded-xl p-2 block mt-1 max-w-72" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="ALL">Tất cả loại sản phẩm</option>
          {groups.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[
        ['Lô thuộc phạm vi', filtered.length], ['Đã đạt OCOP', filtered.filter(item => item.isVerified).length],
        ['HSD sắp hết / đã hết', expiring], [role === 'ADMIN' ? 'Lô có GPS' : 'Lần nhập/xuất kho', role === 'ADMIN' ? withGps : totalMovements],
      ].map(([title, number]) => <div key={title} className="bg-[#FAF9F5] rounded-xl border p-3"><p className="text-xs text-[#5E7166]">{title}</p><p className="text-2xl font-extrabold text-[#264939]">{number}</p></div>)}
    </div>
    <div className="space-y-2">
      <h3 className="font-bold text-sm text-[#264939]">Phân bố loại đặc sản {category !== 'ALL' ? '(đã lọc)' : ''}</h3>
      {groups.filter(value => category === 'ALL' || category === value).map(value => {
        const count = filtered.filter(batch => categoryOf(batch) === value).length;
        const percent = filtered.length ? count / filtered.length * 100 : 0;
        return <div key={value} className="grid grid-cols-[minmax(0,1fr)_100px_25px] gap-2 items-center text-xs">
          <span className="truncate" title={value}>{value}</span><div className="h-2 bg-[#E0ECE4] rounded-full overflow-hidden"><div className="bg-[#C29B38] h-full" style={{ width: `${percent}%` }} /></div><strong className="text-right">{count}</strong>
        </div>;
      })}
    </div>
    <p className="text-[11px] text-[#5E7166]">Lô cũ chưa lưu danh mục chuẩn sẽ nằm ở “Chưa phân loại”; thống kê chưa được dùng để suy ra doanh thu hay lượng hàng bán thực tế.</p>
  </section>;
};
