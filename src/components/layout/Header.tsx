'use client';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/contexts/AuthContext';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

const HowItWorksModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#0d0019]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#0d0019]">How It Works</h2>
          <button
            onClick={onClose}
            className="cursor-pointer text-[#0d0019]/50 hover:text-[#0d0019] transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4f4395] text-white flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="font-medium text-[#0d0019] mb-1">Connect Your Wallet</h3>
              <p className="text-[#0d0019]/70 text-sm">Click the Connect button and sign in with your Solana wallet</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4f4395] text-white flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h3 className="font-medium text-[#0d0019] mb-1">Choose a Match</h3>
              <p className="text-[#0d0019]/70 text-sm">Browse upcoming matches and select one to make your prediction</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4f4395] text-white flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h3 className="font-medium text-[#0d0019] mb-1">Make Your Prediction</h3>
              <p className="text-[#0d0019]/70 text-sm">Predict the final score for both teams (runs and wickets)</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4f4395] text-white flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <h3 className="font-medium text-[#0d0019] mb-1">Place Your Bet</h3>
              <p className="text-[#0d0019]/70 text-sm">Stake 2 USDC on your prediction</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4f4395] text-white flex items-center justify-center font-bold">
              5
            </div>
            <div>
              <h3 className="font-medium text-[#0d0019] mb-1">Wait for Results</h3>
              <p className="text-[#0d0019]/70 text-sm">Once the match ends, winners are determined based on prediction accuracy</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4f4395] text-white flex items-center justify-center font-bold">
              6
            </div>
            <div>
              <h3 className="font-medium text-[#0d0019] mb-1">Claim Your Winnings</h3>
              <p className="text-[#0d0019]/70 text-sm">If you win, claim your USDC prize directly to your wallet</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export function Header() {
  const { publicKey } = useWallet();
  const { disconnect, user } = useAuth();
  const isAdmin = user?.walletAddress === process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) && 
          !(event.target as Element).closest('button[aria-label="Toggle mobile menu"]')) {
        setIsMobileMenuOpen(false);
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
    <header className="container mx-auto w-full py-4 px-4 lg:py-6 lg:px-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1">
          <img
            src="/assets/strikerate-logo.png"
            alt="Strikerate"
            className="h-[32px] w-[32px] lg:h-[40px] lg:w-[40px]"
          />
          <p className='text-[#4f4395] text-[24px] lg:text-[32px] font-semibold leading-[32px] lg:leading-[40px]'>strikerate</p>
        </Link>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-2 text-[#0d0019]/70 hover:text-[#0d0019] cursor-pointer"
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8">
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
          <button
            onClick={() => setIsHowItWorksOpen(true)}
            className="text-[#0d0019]/70 hover:text-[#0d0019] transition-colors font-medium"
          >
            How It Works
          </button>
          {isAdmin && (
            <Link 
              href="/admin" 
              className="text-[#0d0019]/70 hover:text-[#0d0019] transition-colors font-medium"
            >
              Admin
            </Link>
          )}
        </nav>

        {/* Desktop Wallet Section */}
        <div className="hidden lg:flex items-center gap-4">
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
      </div>

      {/* Mobile Menu */}
      <div 
        ref={mobileMenuRef}
        className={`lg:hidden fixed inset-x-0 top-[72px] bg-white border-t border-gray-100 shadow-lg z-40 transition-all duration-200 ${
          isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className="container mx-auto px-4 py-4 space-y-4">
          <Link 
            href="/matches" 
            className="block text-[#0d0019]/70 hover:text-[#0d0019] rounded-lg px-2 hover:bg-[#4f4395]/5 transition-colors font-medium py-2"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Matches
          </Link>
          <Link 
            href="/leaderboard" 
            className="block text-[#0d0019]/70 hover:text-[#0d0019] rounded-lg px-2 hover:bg-[#4f4395]/5 transition-colors font-medium py-2"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Leaderboard
          </Link>
          <button
            onClick={() => {
              setIsHowItWorksOpen(true);
              setIsMobileMenuOpen(false);
            }}
            className="block w-full text-left text-[#0d0019]/70 hover:text-[#0d0019] rounded-lg px-2 hover:bg-[#4f4395]/5 transition-colors font-medium py-2"
          >
            How It Works
          </button>
          {isAdmin && (
            <Link 
              href="/admin" 
              className="block text-[#0d0019]/70 hover:text-[#0d0019] rounded-lg px-2 hover:bg-[#4f4395]/5 transition-colors font-medium py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Admin
            </Link>
          )}
          {publicKey ? (
            <>
              <Link 
                href={`/${publicKey.toString()}`}
                className="block text-[#0d0019]/70 hover:text-[#0d0019] rounded-lg px-2 hover:bg-[#4f4395]/5 transition-colors font-medium py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Profile
              </Link>
              <button
                onClick={() => {
                  disconnect();
                  setIsMobileMenuOpen(false);
                }}
                className="cursor-pointer block w-full text-left text-[#ff503b]/80 rounded-lg px-2 hover:bg-[#4f4395]/5 hover:text-[#ff503b] transition-colors font-medium py-2"
              >
                Disconnect
              </button>
            </>
          ) : (
              <ConnectButton />
          )}
        </div>
      </div>

      <HowItWorksModal 
        isOpen={isHowItWorksOpen} 
        onClose={() => setIsHowItWorksOpen(false)} 
      />
    </header>
  );
}

const ConnectButton = () => (
  <WalletMultiButton
    style={{
      background: "#4f4395",
      cursor: "pointer",
      padding: "4px 16px",
      width: "100%",
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
      className="w-6 h-6"
    />
    <span className="text-[16px] text-[#FFFFFF] font-bold block whitespace-nowrap overflow-hidden text-ellipsis">
      Connect
    </span>
  </WalletMultiButton>
);