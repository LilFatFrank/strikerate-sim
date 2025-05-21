"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAuth } from "@/contexts/AuthContext";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getUSDCBalance } from "@/lib/usdc";

const WalletModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { publicKey } = useWallet();
  const { disconnect } = useAuth();
  const { connection } = useConnection();
  const [solBalance, setSolBalance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);

  useEffect(() => {
    if (isOpen && publicKey) {
      // Fetch SOL balance
      connection.getBalance(publicKey).then((balance) => {
        setSolBalance(balance / LAMPORTS_PER_SOL);
      });

      // Fetch USDC balance
      getUSDCBalance(publicKey).then((balance) => {
        setUsdcBalance(balance);
      });
    }
  }, [isOpen, publicKey, connection]);

  if (!isOpen) return null;

  const copyToClipboard = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toString());
      toast.success("Address copied to clipboard", {
        style: {
          background: "#4f4395",
          color: "white",
          border: "none",
        },
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0d0019]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#0d0019]">Wallet</h2>
          <button
            onClick={onClose}
            className="cursor-pointer text-[#0d0019]/50 hover:text-[#0d0019] transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Address Section */}
          <div className="bg-[#4f4395]/5 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#0d0019]/70">Address</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className="cursor-pointer text-[#4f4395] hover:text-[#433a7d] transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                </button>
                <a
                  href={`https://solscan.io/account/${publicKey?.toString()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4f4395] hover:text-[#433a7d] transition-colors flex items-center gap-1"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            </div>
            <p className="mt-2 text-[#0d0019] font-medium break-all">
              {publicKey?.toString()}
            </p>
          </div>

          {/* Balances Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#4f4395]/5 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#0d0019]/70">
                  <b>SOL</b> Balance
                </span>
              </div>
              <p className="mt-2 flex items-center gap-2 text-[#0d0019] font-medium">
                {solBalance.toFixed(4)}
                <img src="/assets/sol-coin.svg" alt="SOL" className="w-5 h-5" />
              </p>
            </div>
            <div className="bg-[#4f4395]/5 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#0d0019]/70">
                  <b>USDC</b> Balance
                </span>
              </div>
              <p className="mt-2 flex items-center gap-2 text-[#0d0019] font-medium">
                {usdcBalance.toFixed(2)}
                <img
                  src="/assets/usdc-coin.svg"
                  alt="USDC"
                  className="w-5 h-5"
                />
              </p>
            </div>
          </div>

          {/* Disconnect Button */}
          <button
            onClick={() => {
              disconnect();
              onClose();
            }}
            className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#ff503b]/10 text-[#ff503b] rounded-lg hover:bg-[#ff503b]/20 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="font-medium">Disconnect</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export function Header() {
  const { publicKey } = useWallet();
  const { user } = useAuth();
  const isAdmin =
    user?.walletAddress === process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest(
          'button[aria-label="Toggle mobile menu"]'
        )
      ) {
        setIsMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="container mx-auto w-full py-4 px-4 lg:py-6 lg:px-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1">
          <img
            src="/assets/strikerate-logo.png"
            alt="Strikerate"
            className="h-[32px] w-[32px] lg:h-[40px] lg:w-[40px]"
          />
          <p className="text-[#4f4395] text-[24px] lg:text-[32px] font-semibold leading-[32px] lg:leading-[40px]">
            strikerate
          </p>
        </Link>

        {/* Mobile Menu Button */}
        <div className="lg:hidden flex items-center gap-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-[#0d0019]/70 hover:text-[#0d0019] cursor-pointer"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
          {publicKey ? (
            <button
              onClick={() => setIsWalletModalOpen(true)}
              className="px-3 py-2 bg-[#4f4395]/10 text-[#4f4395] rounded-lg hover:bg-[#4f4395]/20 transition-colors"
            >
              <img src={`/assets/wallet-icon.svg`} alt='wallet' className="w-5 h-5" />
            </button>
          ) : (
            <ConnectButton />
          )}
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8">
          <Link
            href="/leaderboard"
            className="text-[#0d0019]/70 hover:text-[#0d0019] transition-colors font-medium"
          >
            Leaderboard
          </Link>
          <Link
            href="/how-it-works"
            className="text-[#0d0019]/70 hover:text-[#0d0019] transition-colors font-medium"
          >
            How It Works
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
              <button
                onClick={() => setIsWalletModalOpen(true)}
                className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-[#4f4395] text-white rounded-lg hover:bg-[#433a7d] transition-colors"
              >
                <span className="font-medium text-white">
                  {publicKey.toString().slice(0, 4)}...
                  {publicKey.toString().slice(-4)}
                </span>
              </button>
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
          isMobileMenuOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="container mx-auto px-4 py-4 space-y-4">
          <Link
            href="/leaderboard"
            className="block text-[#0d0019]/70 hover:text-[#0d0019] rounded-lg px-2 hover:bg-[#4f4395]/5 transition-colors font-medium py-2"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Leaderboard
          </Link>
          <Link
            href="/how-it-works"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block w-full text-left text-[#0d0019]/70 hover:text-[#0d0019] rounded-lg px-2 hover:bg-[#4f4395]/5 transition-colors font-medium py-2"
          >
            How It Works
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="block text-[#0d0019]/70 hover:text-[#0d0019] rounded-lg px-2 hover:bg-[#4f4395]/5 transition-colors font-medium py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Admin
            </Link>
          )}
          {publicKey && (
            <>
              <Link
                href={`/${publicKey.toString()}`}
                className="block text-[#0d0019]/70 hover:text-[#0d0019] rounded-lg px-2 hover:bg-[#4f4395]/5 transition-colors font-medium py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Profile
              </Link>
            </>
          )}
        </div>
      </div>

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </header>
  );
}

const ConnectButton = () => (
  <WalletMultiButton
    style={{
      background: "#4f4395",
      cursor: "pointer",
      padding: "8px",
      width: "auto",
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      fontWeight: 800,
      height: "40px",
    }}
  >
    <img src="/assets/solana-white-icon.svg" alt="solana" className="w-6 h-6" />
    <span className="hidden sm:block text-[16px] text-[#FFFFFF] font-bold whitespace-nowrap overflow-hidden text-ellipsis">
      Connect
    </span>
  </WalletMultiButton>
);
