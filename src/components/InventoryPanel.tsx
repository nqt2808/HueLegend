import React, { useMemo, useState } from 'react';
import { Batch } from '../types';
import { ROLE_HASHES } from '../constants';
import { encodeStockMovement, inventoryForBatch, parseQuantity } from '../../api/supply-ledger-core.js';

interface InventoryPanelProps {
  batches: Record<string, Batch>;
  account: string | null;
  role: 'PRODUCER' | 'RETAILER';
  onAddCheckpoint: (code: string, role: string, location: string, action: string,
    metadataURI: string, stepName: string, conditionNote: string) => Promise<void>;
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({ batches, account, role, onAddCheckpoint }) => {
  const [batchCode, setBatchCode] = useState('');
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [amount, setAmount] = useState('');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const roleHash = ROLE_HASHES[`ROLE_${role}`];
  const candidates = useMemo(() => Object.values(batches).filter(batch => role === 'PRODUCER'
    ? batch.producer.toLowerCase() === account?.toLowerCase()
    : batch.isVerified), [batches, role, account]);
  const selected = batches[batchCode];
  const ledger = selected ? inventoryForBatch(selected, account, roleHash, role === 'PRODUCER' && selected.producer.toLowerCase() === account?.toLowerCase()) : null;
  const fallback = selected ? parseQuantity(selected.quantity) : null;
  const unit = ledger?.unit || (role === 'RETAILER' ? fallback?.unit : null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!account || !selected || !candidates.some(batch => batch.batchCode === selected.batchCode)) return setError('Vui lòng kết nối đúng ví và chọn lô được phép.');
    if (!unit) return setError('Lô chưa có đơn vị tính hợp lệ. Cần metadata sản lượng dạng "500 Hộp".');
    const count = Number(amount);
    if (!Number.isSafeInteger(count) || count <= 0) return setError('Số lượng phải là số nguyên dương.');
    if (direction === 'OUT' && count > (ledger?.balance || 0)) return setError('Số lượng xuất vượt số dư sổ kho của ví hiện tại.');
    if (!place.trim()) return setError('Cần ghi địa điểm kho.');
    try {
      setSaving(true);
      const action = encodeStockMovement({ direction, amount: count, unit, note });
      await onAddCheckpoint(selected.batchCode, `ROLE_${role}`, place.trim(), action,
        selected.batchMetadataURI || '', 'Sổ kho On-Chain', '');
      setAmount('');
      setNote('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể ghi kho lên Sepolia.');
    } finally { setSaving(false); }
  };

  return (
    <section className="rounded-2xl bg-white p-5 border border-[#E6E1D7] space-y-4" data-testid={`inventory-${role.toLowerCase()}`}>
      <div>
        <h2 className="text-xl font-serif font-bold text-[#264939]">Sổ tồn kho {role === 'PRODUCER' ? 'cơ sở sản xuất' : 'đại lý'} (Sepolia)</h2>
        <p className="text-xs text-[#5E7166] mt-1">Mỗi lần nhập/xuất tạo checkpoint trên Blockchain; tồn kho tính riêng theo ví và đơn vị hàng. Không tự trừ tồn khi niêm yết hay khách xem hàng.</p>
      </div>
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs font-bold">Lô hàng
          <select className="w-full rounded-xl border p-2 mt-1" required value={batchCode} onChange={e => setBatchCode(e.target.value)}>
            <option value="">Chọn lô</option>
            {candidates.map(batch => <option value={batch.batchCode} key={batch.batchCode}>{batch.batchCode} — {batch.productName}</option>)}
          </select>
        </label>
        <div className="rounded-xl p-3 bg-emerald-50 text-xs">
          <div className="text-[#5E7166]">Tồn ghi nhận của ví đang kết nối</div>
          <div className="font-extrabold text-2xl text-[#264939]">{ledger?.unit ? `${ledger.balance} ${ledger.unit}` : 'Chưa có dữ liệu'}</div>
          <p className="text-[11px] text-[#5E7166]">{ledger?.movements.length || 0} biến động có checkpoint; {role === 'PRODUCER' ? 'cộng số lượng ban đầu nếu IPFS đã xác minh.' : 'đại lý bắt đầu từ 0, cần ghi nhập kho thực tế.'}</p>
        </div>
        <label className="text-xs font-bold">Loại biến động
          <select className="w-full rounded-xl border p-2 mt-1" value={direction} onChange={e => setDirection(e.target.value as 'IN' | 'OUT')}>
            <option value="IN">Nhập kho (+)</option><option value="OUT">Xuất kho (-)</option>
          </select>
        </label>
        <label className="text-xs font-bold">Số lượng {unit ? `(${unit})` : ''}
          <input className="w-full rounded-xl border p-2 mt-1" type="number" min="1" step="1" required value={amount} onChange={e => setAmount(e.target.value)} />
        </label>
        <label className="text-xs font-bold">Địa điểm kho
          <input className="w-full rounded-xl border p-2 mt-1" required maxLength={90} value={place} onChange={e => setPlace(e.target.value)} placeholder="Kho / địa chỉ thực tế" />
        </label>
        <label className="text-xs font-bold">Ghi chú
          <input className="w-full rounded-xl border p-2 mt-1" maxLength={160} value={note} onChange={e => setNote(e.target.value)} placeholder="Lý do nhập / xuất" />
        </label>
        {error && <p className="text-sm text-red-700 sm:col-span-2" role="alert">{error}</p>}
        <button type="submit" disabled={saving || !account || !unit} className="bg-[#264939] text-white rounded-xl px-4 py-2 font-bold text-sm disabled:opacity-50 sm:col-span-2">
          {saving ? 'Đang chờ MetaMask...' : 'Xác nhận biến động kho trên Sepolia (trả gas)'}
        </button>
      </form>
      {ledger && ledger.movements.length > 0 && <div className="space-y-2 text-xs">
        <h3 className="font-bold">Lịch sử kho của ví</h3>
        {ledger.movements.slice().reverse().map((item, i) => <div key={i} className="rounded-lg bg-[#FAF9F5] border p-2">
          <strong className={item.direction === 'IN' ? 'text-emerald-700' : 'text-amber-700'}>{item.direction === 'IN' ? '+' : '-'}{item.amount} {item.unit}</strong>
          <span className="ml-3">{new Date(item.timestamp * 1000).toLocaleString('vi-VN')} — {item.note || 'Không có ghi chú'}</span>
        </div>)}
      </div>}
    </section>
  );
};
