import React, { useState } from 'react';
import { Batch } from '../types';
import { Truck, PlusCircle, CheckCircle2, ShieldCheck, MapPin, AlertTriangle, Lock, Wallet } from 'lucide-react';

interface CheckpointTabProps {
  batches: Record<string, Batch>;
  isLogisticsRole?: boolean;
  allowedRoles?: readonly string[];
  currentAccount?: string | null;
  onConnectWallet?: () => void;
  onAddCheckpoint: (
    batchCode: string,
    role: string,
    location: string,
    action: string,
    metadataURI: string,
    stepName: string,
    conditionNote: string
  ) => Promise<void>;
}

export const CheckpointTab: React.FC<CheckpointTabProps> = ({
  batches,
  isLogisticsRole = false,
  allowedRoles = ['ROLE_LOGISTICS'],
  currentAccount,
  onConnectWallet,
  onAddCheckpoint
}) => {
  // Chi loc cac lo hang DA DUOC KIEM DINH OCOP
  const verifiedBatches = Object.values(batches).filter((b) => b.isVerified);
  const verifiedBatchCodes = verifiedBatches.map((b) => b.batchCode);

  const [selectedBatchCode, setSelectedBatchCode] = useState('');
  const [role, setRole] = useState('ROLE_LOGISTICS');
  const [stepName, setStepName] = useState('');
  const [location, setLocation] = useState('');
  const [action, setAction] = useState('');
  const [conditionNote, setConditionNote] = useState('');
  const [metadataURI, setMetadataURI] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentBatch = batches[selectedBatchCode];

  // Ham xu ly submit form ghi chang van chuyen
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount) {
      if (onConnectWallet) onConnectWallet();
      return;
    }
    if (!selectedBatchCode || !location || !action) return;

    setIsSubmitting(true);
    try {
      // Tu dong tao metadata URI cho chang van chuyen neu chua co
      const finalMetadataURI = metadataURI || `ipfs://huelegend/logistics/${selectedBatchCode}/${Date.now()}`;
      await onAddCheckpoint(selectedBatchCode, role, location, action, finalMetadataURI, stepName, conditionNote);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preset chang van chuyen nhanh - Chuyen chang 2 thanh Chang 3 theo quy dinh
  const applyPreset = (presetType: 'COLD_CHAIN' | 'EXPRESS_POST') => {
    if (presetType === 'COLD_CHAIN') {
      setStepName('Cháº·ng 3: Tiáº¿p nháº­n kho láº¡nh & NiÃªm phong xe thÃ¹ng xá»‘p báº£o Ã´n');
      setLocation('Kho Váº­n Láº¡nh BÆ°u ChÃ­nh Huáº¿ - 16 LÃ½ ThÆ°á»ng Kiá»‡t, TP.Huáº¿');
      setAction('Kiá»ƒm tra tem niÃªm phong QR, xáº¿p lÃ´ hÃ ng vÃ o xe táº£i láº¡nh báº£o Ã´n, theo dÃµi nhiá»‡t Ä‘á»™ tá»± Ä‘á»™ng.');
      setConditionNote('Nhiá»‡t Ä‘á»™ báº£o quáº£n láº¡nh 15Â°C - 18Â°C, Ä‘á»™ áº©m 45%, chÃ¬ niÃªm phong sá»‘ #HL-LOG-9921.');
      setMetadataURI('ipfs://QmHueColdChainLogisticsReceipt2026');
    } else {
      setStepName('Cháº·ng 3: Váº­n chuyá»ƒn Chuyá»ƒn PhÃ¡t Nhanh Quá»‘c Táº¿ & LiÃªn Tá»‰nh');
      setLocation('SÃ¢n Bay Quá»‘c Táº¿ PhÃº BÃ i / Ga Huáº¿ - Thá»«a ThiÃªn Huáº¿');
      setAction('BÃ n giao cho Ä‘Æ¡n vá»‹ váº­n chuyá»ƒn hÃ ng khÃ´ng / Ä‘Æ°á»ng sáº¯t, dÃ¡n mÃ£ tem QR theo dÃµi thá»i gian thá»±c.');
      setConditionNote('Váº­n chuyá»ƒn hÃ ng khÃ´ng 24h, nhiá»‡t Ä‘á»™ mÃ´i trÆ°á»ng mÃ¡t 22Â°C, Ä‘Ã³ng thÃ¹ng carton gia cá»‘.');
      setMetadataURI('ipfs://QmHueExpressTransportWaybill2026');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Step Indicator Banner */}
      <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#E6E1D7] flex flex-wrap items-center justify-between gap-2 text-xs font-sans">
        <span className="font-bold text-[#264939] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Truck className="w-4 h-4 text-[#C29B38]" />
          Quy TrÃ¬nh Chuá»—i Cung á»¨ng On-Chain:
        </span>
        <div className="flex items-center gap-1.5 sm:gap-3 text-[11px] font-bold">
          <span className="text-[#5E7166]">1. Khai BÃ¡o LÃ´</span>
          <span className="text-[#8A9D92]">â†’</span>
          <span className="text-[#5E7166]">2. Tháº©m Äá»‹nh OCOP</span>
          <span className="text-[#8A9D92]">â†’</span>
          <span className="px-2.5 py-1 rounded-lg bg-[#264939] text-white shadow-2xs">3. Váº­n Chuyá»ƒn</span>
          <span className="text-[#8A9D92]">â†’</span>
          <span className="text-[#5E7166]">4. Quáº£n LÃ½ NiÃªm Yáº¿t</span>
        </div>
      </div>

      {/* Warning banner neu vi chua duoc Admin cap quyen LOGISTICS */}
      {!isLogisticsRole && currentAccount && (
        <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl flex items-center gap-3 text-xs text-amber-950 shadow-2xs font-sans">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold block text-sm font-serif text-amber-950">Quyá»n Truy Cáº­p Bá»‹ KhÃ³a (Cáº§n Admin Cáº¥p Quyá»n)</span>
            <span className="text-amber-900 font-medium">VÃ­ hiá»‡n táº¡i ({currentAccount.slice(0, 8)}...) chÆ°a Ä‘Æ°á»£c Admin cáº¥p quyá»n ÄÆ¡n Vá»‹ Váº­n Chuyá»ƒn (ROLE_LOGISTICS). Vui lÃ²ng dÃ¹ng vÃ­ Admin cáº¥p quyá»n Ä‘á»ƒ truy cáº­p chá»©c nÄƒng ghi cháº·ng.</span>
          </div>
        </div>
      )}

      {/* Banner yeu cau ket noi vi neu chua login */}
      {!currentAccount && (
        <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs font-sans">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold block text-sm font-serif text-amber-950">Vui lÃ²ng káº¿t ná»‘i vÃ­ ÄÆ¡n vá»‹ váº­n chuyá»ƒn</span>
              <span className="text-amber-900 font-medium">Káº¿t ná»‘i vÃ­ Ä‘Ã£ Ä‘Æ°á»£c Admin phÃ¢n quyá»n ROLE_LOGISTICS Ä‘á»ƒ ghi cháº·ng váº­n chuyá»ƒn On-Chain.</span>
            </div>
          </div>
          {onConnectWallet && (
            <button
              type="button"
              onClick={onConnectWallet}
              className="px-4 py-2 bg-[#264939] text-white font-bold text-xs rounded-xl hover:bg-[#1c372b] transition-all shadow-2xs shrink-0 flex items-center gap-1.5"
            >
              <Wallet className="w-4 h-4 text-[#C29B38]" />
              <span>Káº¿t Ná»‘i VÃ­</span>
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      {/* Left 2 Cols: Logistics Form */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-[#E6E1D7] shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#EDE9E0]">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#264939]/10 text-[#264939] text-[11px] font-bold mb-1">
                <Truck className="w-3.5 h-3.5 text-[#264939]" />
                <span>NHáº¬T KÃ CHáº¶NG Váº¬N CHUYá»‚N ON-CHAIN</span>
              </div>
              <h2 className="text-xl font-serif font-extrabold text-[#264939]">
                Khai BÃ¡o & Ghi Nháº­t KÃ½ Váº­n Chuyá»ƒn / Kho Váº­n
              </h2>
            </div>
            <span className="px-3 py-1 bg-[#E0ECE4] text-[#264939] rounded-full text-xs font-bold border border-[#CCD8CF]">
              âš¡ Miá»…n PhÃ­ (0 ETH)
            </span>
          </div>

          {/* Fee Notice: Producer paid upfront */}
          <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#E6E1D7] text-xs text-[#264939] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#264939] shrink-0" />
            <span><strong>Tráº¡ng thÃ¡i phÃ­:</strong> Miá»…n phÃ­ cho ÄÆ¡n vá»‹ váº­n chuyá»ƒn (0 ETH). PhÃ­ váº­n chuyá»ƒn 0.002 ETH Ä‘Ã£ do CÆ¡ sá»Ÿ sáº£n xuáº¥t chi tráº£ gá»™p khi khá»Ÿi táº¡o lÃ´ hÃ ng.</span>
          </div>

          {/* Quick Preset Buttons */}
          <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E6E1D7] space-y-2">
            <span className="text-xs font-bold text-[#1A2820] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#C29B38]" />
              Gá»£i Ã½ cháº·ng váº­n chuyá»ƒn nhanh (Cháº·ng 3):
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('COLD_CHAIN')}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#CCD8CF] hover:border-[#264939] text-xs font-bold text-[#264939] hover:bg-[#E0ECE4] transition-all"
              >
                ðŸšš Cháº·ng 3: Kho Láº¡nh Báº£o Ã”n
              </button>
              <button
                type="button"
                onClick={() => applyPreset('EXPRESS_POST')}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#CCD8CF] hover:border-[#264939] text-xs font-bold text-[#264939] hover:bg-[#E0ECE4] transition-all"
              >
                âœˆï¸ Cháº·ng 3: Chuyá»ƒn PhÃ¡t Nhanh / HÃ ng KhÃ´ng
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 font-sans">
            <div>
              <label className="block text-xs font-bold text-[#1A2820] mb-1">
                Chá»n LÃ´ HÃ ng ÄÃ£ Tháº©m Äá»‹nh OCOP *
              </label>
              <select
                value={selectedBatchCode}
                onChange={(e) => setSelectedBatchCode(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E6E1D7] text-xs font-mono font-bold focus:outline-none focus:border-[#264939] bg-[#FAF9F5]"
              >
                <option value="">-- Chá»n LÃ´ HÃ ng ÄÃ£ Tháº©m Äá»‹nh OCOP --</option>
                {verifiedBatches.length > 0 &&
                  verifiedBatches.map((batch) => (
                    <option key={batch.batchCode} value={batch.batchCode}>
                      {batch.batchCode} â€” {batch.productName} (ÄÃ£ Tháº©m Äá»‹nh OCOP)
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1A2820] mb-1">
                  TÃªn Cháº·ng Váº­n Chuyá»ƒn *
                </label>
                <input
                  type="text"
                  required
                  value={stepName}
                  onChange={(e) => setStepName(e.target.value)}
                  placeholder="VÃ­ dá»¥: Cháº·ng 3: Váº­n chuyá»ƒn kho láº¡nh báº£o Ã´n..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E6E1D7] text-xs font-bold focus:outline-none focus:border-[#264939]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A2820] mb-1">
                  Vai TrÃ² ÄÆ¡n Vá»‹ (RBAC) *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E6E1D7] text-xs font-bold focus:outline-none focus:border-[#264939]"
                >
                  <option value="ROLE_LOGISTICS">ÄÆ¡n Vá»‹ Váº­n Chuyá»ƒn / Kho Váº­n (Logistics)</option>
                  {allowedRoles.includes('ROLE_PRODUCER') && <option value="ROLE_PRODUCER">CÆ¡ Sá»Ÿ Sáº£n Xuáº¥t (Producer)</option>}
                  {allowedRoles.includes('ROLE_RETAILER') && <option value="ROLE_RETAILER">Äáº¡i LÃ½ PhÃ¢n Phá»‘i (Retailer)</option>}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A2820] mb-1">
                Äá»‹a Äiá»ƒm / Tuyáº¿n ÄÆ°á»ng Váº­n Chuyá»ƒn *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="VÃ­ dá»¥: BÆ°u chÃ­nh Quá»‘c Táº¿ Huáº¿ - Ga Huáº¿ & SÃ¢n Bay PhÃº BÃ i..."
                className="w-full px-3.5 py-2 rounded-xl border border-[#E6E1D7] text-xs focus:outline-none focus:border-[#264939]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A2820] mb-1">
                Chi Tiáº¿t Hoáº¡t Äá»™ng Váº­n Chuyá»ƒn *
              </label>
              <textarea
                required
                rows={3}
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="VÃ­ dá»¥: Kiá»ƒm tra tem mÃ£ QR niÃªm phong, Ä‘Ã³ng gÃ³i thÃ¹ng xá»‘p báº£o Ã´n, theo dÃµi cáº£m biáº¿n..."
                className="w-full px-3.5 py-2 rounded-xl border border-[#E6E1D7] text-xs focus:outline-none focus:border-[#264939]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A2820] mb-1">
                Ghi ChÃº Äiá»u Kiá»‡n Báº£o Quáº£n & ChÃ¬ NiÃªm Phong
              </label>
              <input
                type="text"
                value={conditionNote}
                onChange={(e) => setConditionNote(e.target.value)}
                placeholder="VÃ­ dá»¥: Nhiá»‡t Ä‘á»™ báº£o quáº£n láº¡nh 15Â°C - 18Â°C, Ä‘á»™ áº©m 45%..."
                className="w-full px-3.5 py-2 rounded-xl border border-[#E6E1D7] text-xs focus:outline-none focus:border-[#264939]"
              />
            </div>


            <div className="pt-3 border-t border-[#EDE9E0] flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || verifiedBatches.length === 0 || (!isLogisticsRole && Boolean(currentAccount))}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#264939] text-white font-sans font-bold text-xs hover:bg-[#1c372b] transition-all shadow-2xs disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Ghi Cháº·ng Váº­n Chuyá»ƒn On-Chain (0 ETH)</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Col: Batch Preview Card */}
      <div className="space-y-6 font-sans">
        {currentBatch ? (
          <div className="bg-white p-5 rounded-2xl border border-[#E6E1D7] shadow-2xs space-y-3">
            <div className="pb-3 border-b border-[#EDE9E0]">
              <span className="text-[10px] font-bold text-[#8A9D92] uppercase">LÃ´ Äang Chá»n</span>
              <div className="font-mono text-sm font-extrabold text-[#264939]">
                {currentBatch.batchCode}
              </div>
              <h3 className="font-serif font-bold text-base text-[#1A2820] mt-1">{currentBatch.productName}</h3>
            </div>

            <div className="space-y-2 text-xs text-[#5E7166]">
              <div><span className="font-bold text-[#1A2820]">Nguá»“n gá»‘c:</span> {currentBatch.origin}</div>
              <div><span className="font-bold text-[#1A2820]">Chá»©ng nháº­n OCOP:</span> {currentBatch.ocopStandard}</div>
              <div><span className="font-bold text-[#1A2820]">Sá»‘ cháº·ng Ä‘Ã£ ghi:</span> {currentBatch.checkpoints?.length || 0} cháº·ng</div>
            </div>

            <div className="pt-3 border-t border-[#EDE9E0] space-y-2">
              <span className="text-[11px] font-bold text-[#264939] uppercase tracking-wider block">
                Tiáº¿n TrÃ¬nh Cháº·ng
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {currentBatch.checkpoints?.map((cp, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-[#FAF9F5] border border-[#E6E1D7] text-[11px]">
                    <div className="font-bold text-[#1A2820] flex items-center justify-between">
                      <span>Cháº·ng {idx + 1}</span>
                      <span className="text-[10px] font-mono text-[#8A9D92]">
                        {new Date((cp.timestamp || 0) * 1000).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <div className="text-[#5E7166] truncate mt-0.5">{cp.action}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl border border-[#E6E1D7] text-center text-xs text-gray-400 font-sans">
            ChÆ°a cÃ³ lÃ´ hÃ ng nÃ o Ä‘á»ƒ chá»n.
          </div>
        )}
      </div>
    </div>
  </div>
);
};


