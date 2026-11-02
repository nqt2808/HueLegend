import React from 'react';
import { Wallet, ShieldCheck, Menu } from 'lucide-react';
import { CONTRACT_ADDRESS } from '../constants';

interface HeaderProps {
  currentAccount: string | null;
  isDemoMode: boolean;
  simulatedRole: string;
  onConnectWallet: (e?: React.MouseEvent) => void;
  onToggleDemoMode: () => void;
  onSimulatedRoleChange: (role: string) => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentAccount,
  isDemoMode,
  simulatedRole,
  onConnectWallet,
  onToggleDemoMode,
  onSimulatedRoleChange,
  onToggleMobileMenu,
}) => {
  const shortAddress = currentAccount
    ? `${currentAccount.substring(0, 6)}...${currentAccount.substring(currentAccount.length - 4)}`
    : 'Chưa kết nối ví';

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#E6E1D7] px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 font-sans">
      {/* Mobile Brand Logo & Hamburger button */}
      <div className="flex items-center gap-2.5">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl bg-white border border-[#E6E1D7] text-[#264939] hover:bg-[#EFF3EF] active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Mở Menu"
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
          <span>{isDemoMode ? 'Chế độ Xem Trước' : 'Sepolia Testnet'}</span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-xs text-[#5E7166]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#C29B38]" />
          <span className="font-mono text-[11px] font-bold">
            {CONTRACT_ADDRESS ? `${CONTRACT_ADDRESS.slice(0, 6)}...${CONTRACT_ADDRESS.slice(-4)}` : '0xfe7B...f5C5'}
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Connect Wallet Button */}
        <button
          onClick={(e) => onConnectWallet(e)}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs min-h-[40px] cursor-pointer ${
            currentAccount
              ? 'bg-[#264939] text-white hover:bg-[#1c372b]'
              : 'bg-[#C29B38] text-white hover:bg-[#8C6D1F]'
          }`}
        >
          <Wallet className="w-3.5 h-3.5 shrink-0" />
          <span>{shortAddress}</span>
        </button>
      </div>
    </header>
  );
};

