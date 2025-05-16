import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CompleteMatchFormProps {
  matchId: string;
  team1: string;
  team2: string;
  onSuccess?: () => void;
}

export function CompleteMatchForm({ matchId, team1, team2, onSuccess }: CompleteMatchFormProps) {
  const { getSignature } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    team1Score: '',
    team1Wickets: '',
    team2Score: '',
    team2Wickets: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Get signature
      const { signature, message, nonce } = await getSignature('COMPLETE_MATCH', {
        matchId,
        team1Score: formData.team1Score,
        team1Wickets: formData.team1Wickets,
        team2Score: formData.team2Score,
        team2Wickets: formData.team2Wickets
      });

      // Complete match
      const response = await fetch('/api/matches/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId,
          walletAddress: process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS,
          signature,
          message,
          nonce,
          ...formData
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete match');
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error completing match:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create match', {
        style: {
          background: '#ff503b',
          color: 'white',
          border: 'none'
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10 flex flex-col w-full h-full justify-between items-start">
      <div className="w-full h-full space-y-3">
        <h2 className="text-xl font-semibold text-[#0d0019]">Complete Match</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-[#0d0019]/70 mb-2">
              {team1}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                placeholder="Score"
                value={formData.team1Score}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || /^\d{1,3}$/.test(value)) {
                    setFormData(prev => ({ ...prev, team1Score: value }));
                  }
                }}
                className="block w-full remove-arrow rounded-lg shadow-sm outline-none border-none py-1 px-4"
                required
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                placeholder="Wickets"
                value={formData.team1Wickets}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    setFormData(prev => ({ ...prev, team1Wickets: value }));
                  } else if (/^\d{1,2}$/.test(value)) {
                    const numValue = parseInt(value);
                    setFormData(prev => ({
                      ...prev,
                      team1Wickets: numValue > 10 ? "10" : value
                    }));
                  }
                }}
                className="block w-full remove-arrow rounded-lg shadow-sm outline-none border-none py-1 px-4"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0d0019]/70 mb-2">
              {team2}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                placeholder="Score"
                value={formData.team2Score}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || /^\d{1,3}$/.test(value)) {
                    setFormData(prev => ({ ...prev, team2Score: value }));
                  }
                }}
                className="block w-full remove-arrow rounded-lg shadow-sm outline-none border-none py-1 px-4"
                required
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                placeholder="Wickets"
                value={formData.team2Wickets}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    setFormData(prev => ({ ...prev, team2Wickets: value }));
                  } else if (/^\d{1,2}$/.test(value)) {
                    const numValue = parseInt(value);
                    setFormData(prev => ({
                      ...prev,
                      team2Wickets: numValue > 10 ? "10" : value
                    }));
                  }
                }}
                className="block w-full remove-arrow rounded-lg shadow-sm outline-none border-none py-1 px-4"
                required
              />
            </div>
          </div>
        </div>
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="cursor-pointer font-bold relative w-full bg-[#3fe0aa] text-white px-4 py-2 rounded-lg hover:bg-[#3fe0aa]/80 transition-colors disabled:opacity-50"
      >
        {isLoading ? 'Completing Match...' : 'Complete Match'}
      </button>
      {error && (
        <p className="text-sm text-[#ff503b]">{error}</p>
      )}
    </form>
  );
} 