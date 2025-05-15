import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface LockMatchButtonProps {
  matchId: string;
  onSuccess?: () => void;
}

export function LockMatchButton({ matchId, onSuccess }: LockMatchButtonProps) {
  const { getSignature } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLockMatch = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get signature
      const { signature, message, nonce } = await getSignature('LOCK_MATCH', {
        matchId
      });

      // Lock match
      const response = await fetch('/api/matches/lock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId,
          walletAddress: process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS,
          signature,
          message,
          nonce
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to lock match');
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error locking match:', error);
      setError(error instanceof Error ? error.message : 'Failed to lock match');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleLockMatch}
        disabled={isLoading}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors disabled:bg-red-300"
      >
        {isLoading ? 'Locking Match...' : 'Lock Match'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
