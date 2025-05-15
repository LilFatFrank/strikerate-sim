'use client';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/contexts/AuthContext';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function Header() {
  const { publicKey } = useWallet();
  const { disconnect } = useAuth();

  return (
    <header className="w-full py-4 px-6 flex justify-end">
      {publicKey ? (
        <button
          onClick={disconnect}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Disconnect Wallet
        </button>
      ) : (
        <WalletMultiButton />
      )}
    </header>
  );
} 