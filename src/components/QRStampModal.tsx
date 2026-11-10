import React from 'react';
import { Batch } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, ShieldCheck, Award, GripHorizontal } from 'lucide-react';
import { useDraggable } from '../hooks/useDraggable';

interface QRStampModalProps {
  batch: Batch | null;
  onClose: () => void;
}

export const QRStampModal: React.FC<QRStampModalProps> = ({ batch, onClose }) => {
  const { position, isDragging, dragHeaderProps } = useDraggable(Boolean(batch));

  if (!batch) return null;

  const handlePrint = () => {
    window.print();
  };

  const cleanBaseUrl = window.location.origin + window.location.pathname;

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
        className="bg-white rounded-3xl border border-[#E6E1D7] max-w-md w-full max-h-[88vh] p-5 sm:p-6 space-y-5 shadow-2xl relative overflow-y-auto my-auto"
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
            <h3 className="font-serif font-extrabold text-lg text-[#264939] pointer-events-none">
              Tem Mã QR Niêm Phong Đặc Sản
            </h3>
          </div>
          <button
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Stamp Badge Box */}
        <div
          id="printable-stamp"
          className="p-6 bg-gradient-to-b from-[#FAF9F5] to-white rounded-2xl border-2 border-[#C29B38] text-center space-y-4 relative shadow-inner"
        >
          {/* Top Royal Header */}
          <div className="space-y-1">
            <div className="text-[10px] font-sans font-extrabold tracking-widest text-[#C29B38] uppercase">
              UỶ BAN NHÂN DÂN TỈNH THỪA THIÊN HUẾ
            </div>
            <div className="text-xs font-sans font-bold text-[#264939]">
              TEM CHỨNG NHẬN TRUY XUẤT NGUỒN GỐC BLOCKCHAIN
            </div>
          </div>

          {/* QR Code Container */}
          <div className="p-3 bg-white rounded-xl border border-[#CCD8CF] inline-block shadow-2xs">
            <QRCodeSVG
              value={`${cleanBaseUrl}?batch=${batch.batchCode}`}
              size={150}
              level="H"
              includeMargin={true}
            />
          </div>

          <div>
            <span className="font-mono text-xs font-extrabold text-[#264939] bg-[#E0ECE4] px-3 py-1 rounded-lg border border-[#CCD8CF]">
              {batch.batchCode}
            </span>
            <h4 className="font-serif font-extrabold text-xl text-[#1A2820] mt-2">
              {batch.productName}
            </h4>
            <p className="text-xs font-sans text-[#5E7166] mt-1">{batch.origin}</p>
          </div>

          <div className="pt-2 border-t border-[#EDE9E0] flex items-center justify-center gap-1.5 text-xs font-sans font-bold text-[#8C6D1F]">
            <ShieldCheck className="w-4 h-4 text-[#C29B38]" />
            <span>{batch.ocopStandard || 'Xác thực OCOP Cố Đô Huế'}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 font-sans">
          <button
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#264939] text-white font-bold text-xs hover:bg-[#1c372b] transition-all shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>In Tem Niêm Phong</span>
          </button>
        </div>
      </div>
    </div>
  );
};
