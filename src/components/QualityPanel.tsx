import React, { useCallback, useEffect, useState } from 'react';
import { Batch } from '../types';
import { QualityReport } from '../../api/quality-core.js';

type SavedReport = QualityReport & { cid: string; createdAt: string };
interface QualityPanelProps {
  batches: Record<string, Batch>;
  initialCode?: string;
  account: string | null;
  onSignAndSubmit: (report: QualityReport) => Promise<void>;
  onConnect: () => void;
}

const LABELS: Record<QualityReport['type'], string> = {
  QUALITY: 'Chất lượng sản phẩm', PACKAGING: 'Bao bì / niêm phong',
  EXPIRED: 'Hạn sử dụng', COUNTERFEIT: 'Nghi ngờ hàng giả', OTHER: 'Khác',
};

export const QualityPanel: React.FC<QualityPanelProps> = ({ batches, account, initialCode, onSignAndSubmit, onConnect }) => {
  const [code, setCode] = useState(initialCode || '');
  const [type, setType] = useState<QualityReport['type']>('QUALITY');
  const [details, setDetails] = useState('');
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (batchCode: string, pageToken?: string) => {
    if (!batchCode) return;
    setLoading(true);
    try {
      const query = new URLSearchParams({ code: batchCode });
      if (pageToken) query.set('pageToken', pageToken);
      const response = await fetch(`/api/quality-reports?${query}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Không tải được danh sách phản ánh.');
      setReports(prev => pageToken ? [...prev, ...payload.reports] : payload.reports);
      setNextPage(payload.nextPageToken || null);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không truy vấn được phản ánh.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (initialCode) setCode(initialCode); }, [initialCode]);

  useEffect(() => {
    if (!code) { setReports([]); setNextPage(null); return; }
    setReports([]); setNextPage(null);
    void load(code);
  }, [code, load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!account) return onConnect();
    if (!batches[code]) return setError('Chọn lô có thật trên Sepolia.');
    if (details.trim().length < 10) return setError('Mô tả tối thiểu 10 ký tự.');
    setSaving(true); setError('');
    try {
      await onSignAndSubmit({ schemaVersion: 1, batchCode: code, reporter: account.toLowerCase(), type, details: details.trim() });
      setDetails('');
      await load(code);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không gửi được phản ánh.');
    } finally { setSaving(false); }
  };

  return <section className="bg-white border border-[#E6E1D7] rounded-2xl p-5 space-y-4" data-testid="quality-feedback">
    <div>
      <h2 className="font-serif font-extrabold text-xl text-[#264939]">Phản ánh chất lượng đặc sản Huế</h2>
      <p className="text-xs text-[#5E7166] mt-1">Nội dung công khai trên IPFS, gắn chữ ký ví gửi phản ánh. Đây là phản ánh của người dùng, chưa phải kết luận kiểm định OCOP và không được ghi lên Blockchain.</p>
    </div>
    <form onSubmit={submit} className="space-y-3">
      <label className="text-xs font-bold block">Lô hàng
        <select className="w-full border rounded-xl p-2 mt-1" value={code} required onChange={e => setCode(e.target.value)}>
          <option value="">Chọn lô sản phẩm</option>
          {Object.values(batches).map(batch => <option key={batch.batchCode} value={batch.batchCode}>{batch.batchCode} — {batch.productName}</option>)}
        </select>
      </label>
      <label className="text-xs font-bold block">Vấn đề
        <select className="w-full border rounded-xl p-2 mt-1" value={type} onChange={e => setType(e.target.value as QualityReport['type'])}>
          {Object.entries(LABELS).map(([value, title]) => <option key={value} value={value}>{title}</option>)}
        </select>
      </label>
      <label className="text-xs font-bold block">Mô tả cụ thể
        <textarea className="w-full border rounded-xl p-2 mt-1" rows={3} minLength={10} maxLength={1200} required value={details} onChange={e => setDetails(e.target.value)} placeholder="Ví dụ: Bao bì bị rách khi nhận, thời điểm nhận hàng... Không gửi số điện thoại hay dữ liệu riêng tư." />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type={account ? 'submit' : 'button'} onClick={!account ? onConnect : undefined} disabled={saving || !code} className="bg-[#264939] text-white px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50">
        {saving ? 'Đang ký và lưu IPFS...' : account ? 'Ký ví và gửi phản ánh' : 'Kết nối ví để phản ánh'}
      </button>
    </form>
    <div className="border-t pt-4 space-y-2">
      <h3 className="font-bold text-[#264939] text-sm">Phản ánh công khai {code && `cho lô ${code}`} ({reports.length})</h3>
      {loading && <p className="text-xs">Đang đọc IPFS...</p>}
      {!loading && code && reports.length === 0 && <p className="text-xs text-[#5E7166]">Chưa có phản ánh được xác minh chữ ký trong trang hiện tại.</p>}
      {reports.map(item => <div key={item.cid} className="p-3 rounded-xl border bg-[#FAF9F5] text-xs space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2"><strong>{LABELS[item.type]}</strong><span>{new Date(item.createdAt).toLocaleString('vi-VN')}</span></div>
        <p className="whitespace-pre-wrap break-words">{item.details}</p>
        <p className="font-mono text-[#5E7166] break-all">Ví ký: {item.reporter}</p>
        <a className="underline text-[#264939]" href={`https://dweb.link/ipfs/${item.cid}`} rel="noopener noreferrer" target="_blank">Xem bản IPFS / CID</a>
      </div>)}
      {nextPage && <button className="text-xs underline text-[#264939]" disabled={loading} onClick={() => load(code, nextPage)}>Xem thêm phản ánh</button>}
    </div>
  </section>;
};
