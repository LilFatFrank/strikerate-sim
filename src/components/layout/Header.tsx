'use client';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/contexts/AuthContext';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

export function Header() {
  const { publicKey } = useWallet();
  const { disconnect, user } = useAuth();
  const isAdmin = user?.walletAddress === process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyToClipboard = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toString());
      toast.success('Address copied to clipboard', {
        style: {
          background: '#4f4395',
          color: 'white',
          border: 'none'
        }
      });
      setIsDropdownOpen(false);
    }
  };

  return (
    <header className="container mx-auto w-full py-6 flex items-center justify-between">
      <div className="flex items-center gap-12">
        <Link href="/" className="flex items-center gap-1">
          <img
            src="/assets/strikerate-logo.png"
            alt="Strikerate"
            className="h-[40px] w-[40px]"
          />
          <p className='text-[#4f4395] text-[32px] font-semibold leading-[40px]'>strikerate</p>
        </Link>
        <nav className="flex items-center gap-8">
          <Link 
            href="/matches" 
            className="text-[#0d0019]/70 hover:text-[#0d0019] transition-colors font-medium"
          >
            Matches
          </Link>
          <Link 
            href="/leaderboard" 
            className="text-[#0d0019]/70 hover:text-[#0d0019] transition-colors font-medium"
          >
            Leaderboard
          </Link>
          {isAdmin && (
            <Link 
              href="/admin" 
              className="text-[#0d0019]/70 hover:text-[#0d0019] transition-colors font-medium"
            >
              Admin
            </Link>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {publicKey ? (
          <>
            <Link 
              href={`/${publicKey.toString()}`}
              className="text-[#0d0019]/70 hover:text-[#0d0019] transition-colors font-medium"
            >
              Profile
            </Link>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-[#4f4395] text-white rounded-lg hover:bg-[#433a7d] transition-colors"
              >
                <span className="font-medium text-white">
                  {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                </span>
                <svg 
                  className={`w-4 h-4 text-white transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div 
                className={`absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 transition-all duration-200 origin-top-right ${
                  isDropdownOpen 
                    ? 'opacity-100 scale-100' 
                    : 'opacity-0 scale-95 pointer-events-none'
                }`}
              >
                <button
                  onClick={copyToClipboard}
                  className="cursor-pointer w-full px-4 py-2 text-left text-sm text-[#0d0019] hover:bg-[#4f4395]/5 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy Address
                </button>
                <button
                  onClick={disconnect}
                  className="cursor-pointer w-full px-4 py-2 text-left text-sm text-[#ff503b] hover:bg-[#4f4395]/5 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Disconnect
                </button>
              </div>
            </div>
          </>
        ) : (
          <ConnectButton />
        )}
      </div>
    </header>
  );
}

const ConnectButton = () => (
  <>
    <WalletMultiButton
      style={{
        background: "#4f4395",
        cursor: "pointer",
        padding: "4px 16px",
        width: "fit",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        fontWeight: 800,
        height: "40px",
      }}
    >
      <img
        src="/assets/solana-white-icon.svg"
        alt="solana"
        className={"w-6 h-6"}
      />
      <span
        className={`text-[16px] text-[#FFFFFF] font-bold block whitespace-nowrap w-full overflow-hidden text-ellipsis`}
      >
        Connect
      </span>
    </WalletMultiButton>
  </>
);