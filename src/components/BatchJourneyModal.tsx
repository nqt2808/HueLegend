import React, { useState } from 'react';
import { Batch } from '../types';
import {
  X,
  ShieldCheck,
  Award,
  GripHorizontal,
  MapPin,
  CheckCircle2,
  ExternalLink,
  Clock,
  Star,
  UserCheck,
  Building2,
  Package,
  Calendar,
  Thermometer,
  FileCheck,
  Copy,
  Check
} from 'lucide-react';
import { useDraggable } from '../hooks/useDraggable';
import { ETHERSCAN_BASE_URL } from '../constants';
import { getEnrichedCheckpoints } from './LookupTab';

interface BatchJourneyModalProps {
  batch: Batch | null;
  onClose: () => void;
}

export const BatchJourneyModal: React.FC<BatchJourneyModalProps> = ({ batch, onClose }) => {
  const { position, isDragging, dragHeaderProps } = useDraggable(Boolean(batch));
  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  if (!batch) return null;

  const handleCopyText = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedTx(text);
      setTimeout(() => setCopiedTx(null), 2000);
    }
  };

  const enrichedCheckpoints = getEnrichedCheckpoints(batch);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in font-sans overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.05s ease-out',
        }}
        className="bg-white rounded-3xl border border-[#E6E1D7] max-w-3xl w-full max-h-[88vh] p-5 sm:p-6 space-y-5 shadow-2xl relative overflow-y-auto my-auto"
      >
        {/* Top Header with Drag Handle */}
        <div
          {...dragHeaderProps}
          className="flex items-center justify-between pb-4 border-b border-[#EDE9E0] select-none touch-none"
          title="Nắm giữ và kéo để di chuyển popup"
        >
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-[#FAF9F5] border border-[#E6E1D7] text-[#8A9D92] hover:text-[#264939] transition-colors">
              <GripHorizontal className="w-4 h-4" />
            </div>
            <Award className="w-5 h-5 text-[#C29B38] pointer-events-none" />
            <h3 className="font-serif font-extrabold text-lg sm:text-xl text-[#264939] pointer-events-none">
              Nhật Ký Hành Trình Supply Chain On-Chain Chi Tiết
            </h3>
          </div>
          <button
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded-xl bg-[#FAF9F5] hover:bg-[#E0ECE4] text-gray-500 hover:text-[#264939] transition-colors border border-[#EDE9E0]"
            title="Đóng popup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Identity Summary Card */}
        <div className="bg-gradient-to-r from-[#FAF9F5] via-white to-[#E0ECE4]/30 p-5 rounded-2xl border border-[#E6E1D7] space-y-4 shadow-2xs">
          <div className="flex items-start gap-4">
            <img
              src={batch.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600'}
              alt={batch.productName}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-[#EDE9E0] shadow-2xs shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600';
              }}
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs font-extrabold text-[#264939] bg-[#E0ECE4] px-2.5 py-0.5 rounded-lg border border-[#CCD8CF]">
                  {batch.batchCode}
                </span>

                {batch.isVerified ? (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-[#8C6D1F] border border-amber-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#C29B38]" />
                    <span>OCOP {batch.starRating || '4'} SAO</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Chờ Thẩm Định</span>
                  </span>
                )}
              </div>

              <h4 className="font-serif font-extrabold text-lg sm:text-xl text-[#1A2820] leading-snug">
                {batch.productName}
              </h4>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5E7166]">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#C29B38]" />
                  <span>{batch.origin || 'Thừa Thiên Huế'}</span>
                </span>

                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#264939] bg-white px-2 py-0.5 rounded border border-[#EDE9E0]">
                  <Calendar className="w-3 h-3 text-[#264939]" />
                  <span>NSX: {batch.productionDate || new Date(batch.createdAt * 1000).toLocaleDateString('vi-VN')}</span>
                </span>

                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#8C6D1F] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <Clock className="w-3 h-3 text-[#C29B38]" />
                  <span>HSD: {batch.expiryDate || new Date((batch.createdAt + 180 * 86400) * 1000).toLocaleDateString('vi-VN')}</span>
                </span>

                {batch.isVerified && batch.certificationNo && (
                  <span className="inline-flex items-center gap-1 font-semibold text-[#264939]">
                    <Building2 className="w-3.5 h-3.5 text-[#264939]" />
                    <span>Số: {batch.certificationNo}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* OCOP Certification Star Note if verified */}
          {batch.isVerified && (
            <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 text-xs space-y-1">
              <div className="flex items-center gap-1 text-[#8C6D1F] font-bold">
                {Array.from({ length: Number(batch.starRating || '4') }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-[#C29B38] text-[#C29B38]" />
                ))}
                <span>Đạt Chứng Nhận OCOP {batch.starRating || '4'} Sao Tỉnh Thừa Thiên Huế</span>
              </div>
              {batch.inspectorNote && (
                <p className="text-[#1A2820] italic font-serif text-[11px]">
                  "{batch.inspectorNote}"
                </p>
              )}
            </div>
          )}
        </div>


        {/* Detailed Timeline Checklist */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#EDE9E0]">
            <h4 className="font-serif font-extrabold text-base text-[#264939] flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#C29B38]" />
              <span>Chi Tiết Nhật Ký 4 Chặng Supply Chain On-Chain</span>
            </h4>
            <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#E0ECE4] text-[#264939] border border-[#CCD8CF]">
              {enrichedCheckpoints.filter(c => c.isCompleted).length}/{enrichedCheckpoints.length} Chặng Xác Thực
            </span>
          </div>

          {/* Vertical Timeline Node List */}
          <div className="relative pl-7 space-y-5 before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#CCD8CF]">
            {enrichedCheckpoints.map((cp, idx) => {
              const StageIconComponent = cp.stageIcon || CheckCircle2;
              const dateStr = cp.timestamp
                ? new Date(cp.timestamp * 1000).toLocaleString('vi-VN')
                : 'Vừa khởi tạo';

              return (
                <div key={idx} className="relative group font-sans">
                  {/* Circle Node Indicator */}
                  <div className={`absolute -left-7 top-1 w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold font-mono transition-transform group-hover:scale-110 ${
                    cp.isCompleted ? 'bg-[#264939]' : 'bg-gray-400'
                  }`}>
                    {idx + 1}
                  </div>

                  <div className={`p-4 rounded-2xl border transition-all shadow-2xs space-y-3 ${
                    cp.isCompleted ? 'bg-[#FAF9F5] border-[#E6E1D7] hover:border-[#264939]' : 'bg-gray-50/70 border-gray-200 opacity-80'
                  }`}>
                    <div className="flex flex-wrap items-start justify-between gap-2 pb-2 border-b border-[#EDE9E0]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${cp.stageBadgeColor}`}>
                            {cp.roleTitle || cp.role}
                          </span>
                          {cp.isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Xác Thực On-Chain</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span>Đang Chờ</span>
                            </span>
                          )}
                        </div>
                        <h5 className="font-serif font-extrabold text-sm sm:text-base text-[#1A2820] mt-1 flex items-center gap-1.5">
                          <StageIconComponent className="w-4 h-4 text-[#C29B38] shrink-0" />
                          <span>{cp.stepName}</span>
                        </h5>
                      </div>
                      <span className="text-[11px] font-mono font-medium text-[#8A9D92] bg-white px-2.5 py-0.5 rounded-lg border border-[#EDE9E0]">
                        {dateStr}
                      </span>
                    </div>

                    {/* Location & Detailed Action */}
                    <div className="space-y-2 text-xs text-[#3B4D43]">
                      <div className="flex items-center gap-1.5 text-[#264939] font-bold">
                        <MapPin className="w-3.5 h-3.5 text-[#C29B38] shrink-0" />
                        <span>Địa Điểm: {cp.location}</span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-[#EDE9E0] space-y-1">
                        <span className="text-[10px] font-bold text-[#8A9D92] uppercase block">Thao Tác Thực Hiện:</span>
                        <p className="leading-relaxed text-[#1A2820]">
                          {cp.action}
                        </p>
                      </div>

                      {cp.envNote && (
                        <div className="flex items-center gap-2 bg-emerald-50/70 p-2 rounded-xl border border-emerald-200 text-[11px] text-[#264939]">
                          <Thermometer className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span><strong>Thông Số Cảm Biến:</strong> {cp.envNote}</span>
                        </div>
                      )}

                      {cp.conditionNote && (
                        <div className="text-[11px] text-[#264939] flex items-center gap-1.5 bg-[#E0ECE4]/60 p-2 rounded-lg border border-[#CCD8CF]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#264939] shrink-0" />
                          <span><strong>Ghi Chú Niêm Phong:</strong> {cp.conditionNote}</span>
                        </div>
                      )}
                    </div>

                    {/* On-Chain Verification Footer with Etherscan Link */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8A9D92] border-t border-[#EDE9E0]">
                      <div className="font-mono text-[#1A2820] flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-[#264939]" />
                        <span>Ví Ghi: {cp.recorder ? `${cp.recorder.slice(0, 8)}...${cp.recorder.slice(-4)}` : '0x...'}</span>
                        {cp.recorder && (
                          <button
                            onClick={() => handleCopyText(cp.recorder)}
                            className="text-gray-400 hover:text-[#264939]"
                            title="Sao chép ví"
                          >
                            {copiedTx === cp.recorder ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>

                      {(cp.txHash || batch.txHash) && (
                        <a
                          href={`${ETHERSCAN_BASE_URL}/tx/${cp.txHash || batch.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#264939] font-bold hover:underline bg-[#E0ECE4] px-2.5 py-1 rounded-lg border border-[#CCD8CF]"
                        >
                          <span>Xem Khối Sepolia</span>
                          <ExternalLink className="w-3 h-3 text-[#C29B38]" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="pt-3 border-t border-[#EDE9E0] flex justify-end font-sans">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#264939] text-white text-xs font-bold hover:bg-[#1c372b] transition-all shadow-md"
          >
            Đóng Cửa Sổ
          </button>
        </div>
      </div>
    </div>
  );
};

