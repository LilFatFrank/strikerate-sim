import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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
      setError(error instanceof Error ? error.message : 'Failed to complete match');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">{team1}</label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <input
              type="number"
              min="0"
              placeholder="Score"
              value={formData.team1Score}
              onChange={(e) => setFormData(prev => ({ ...prev, team1Score: e.target.value }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
            <input
              type="number"
              min="0"
              max="10"
              placeholder="Wickets"
              value={formData.team1Wickets}
              onChange={(e) => setFormData(prev => ({ ...prev, team1Wickets: e.target.value }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{team2}</label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <input
              type="number"
              min="0"
              placeholder="Score"
              value={formData.team2Score}
              onChange={(e) => setFormData(prev => ({ ...prev, team2Score: e.target.value }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
            <input
              type="number"
              min="0"
              max="10"
              placeholder="Wickets"
              value={formData.team2Wickets}
              onChange={(e) => setFormData(prev => ({ ...prev, team2Wickets: e.target.value }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
        </div>
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors disabled:bg-green-300"
      >
        {isLoading ? 'Completing Match...' : 'Complete Match'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </form>
  );
} 