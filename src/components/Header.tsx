import React from 'react';
import { Wallet, ShieldCheck, Menu, RefreshCw } from 'lucide-react';
import { ROLE_LABELS, WalletSession } from '../lib/access';

interface HeaderProps {
  currentAccount: string | null;
  session: WalletSession;
  onConnectWallet: (e?: React.MouseEvent) => void;
  onToggleMobileMenu?: () => void;
  onManualSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentAccount,
  session,
  onConnectWallet,
  onToggleMobileMenu,
  onManualSync,
}) => {
  const shortAddress = currentAccount
    ? `${currentAccount.substring(0, 6)}...${currentAccount.substring(currentAccount.length - 4)}`
    : 'ChÆ°a káº¿t ná»‘i vÃ­';

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#E6E1D7] px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 font-sans">
      {/* Mobile Brand Logo & Hamburger button */}
      <div className="flex items-center gap-2.5">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl bg-white border border-[#E6E1D7] text-[#264939] hover:bg-[#EFF3EF] active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Má»Ÿ Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="md:hidden flex items-center">
          <img
            src="/assets/aistudio/logo-1_df0d933f.png"
            alt="HueLegend Logo"
            className="h-8 w-auto object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/aistudio/logo_98ef48b3.png';
            }}
          />
        </div>

        {/* Network Status Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#E0ECE4] text-[#1c372b] border border-[#CCD8CF]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{session.status === 'wrong-network' ? 'VÃ­ Ä‘ang sai máº¡ng' : 'Sepolia Testnet'}</span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-xs text-[#5E7166]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#C29B38]" />
          <span className="font-mono text-[11px] font-bold">
            {currentAccount
              ? `${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}`
              : 'Chưa kết nối ví'}
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Nut Dong bo cloud thoi gian thuc thu cong */}
        {onManualSync && (
          <button
            onClick={onManualSync}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#E0ECE4] text-[#264939] hover:bg-[#d0e2d5] text-xs font-bold transition-all border border-[#CCD8CF] min-h-[40px]"
            title="Äá»c láº¡i lÃ´ hÃ ng vÃ  kiá»ƒm tra quyá»n trÃªn Sepolia"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#264939]" />
            <span className="hidden sm:inline">Äá»“ng Bá»™ Ngay</span>
          </button>
        )}

        {session.status === 'ready' && (
          <span className="hidden lg:inline text-xs text-[#264939] font-bold" data-testid="active-role">{ROLE_LABELS[session.workspace]}</span>
        )}
        {/* Ket noi vi */}
        <button
          onClick={(e) => onConnectWallet(e)}
          disabled={session.status === 'connecting' || session.status === 'checking'}
          data-testid="wallet-connect"
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs min-h-[40px] cursor-pointer ${
            currentAccount
              ? 'bg-[#264939] text-white hover:bg-[#1c372b]'
              : 'bg-[#C29B38] text-white hover:bg-[#8C6D1F]'
          }`}
        >
          <Wallet className="w-3.5 h-3.5 shrink-0" />
          <span>{session.status === 'connecting' || session.status === 'checking' ? 'Äang xÃ¡c minh vÃ­...' : shortAddress}</span>
        </button>
      </div>
    </header>
  );
};



