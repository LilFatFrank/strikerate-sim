'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { LockMatchButton } from '@/components/admin/LockMatchButton';
import { CompleteMatchForm } from '@/components/admin/CompleteMatchForm';

type MatchStatus = 'UPCOMING' | 'LOCKED' | 'COMPLETED';

interface Match {
  id: string;
  team1: string;
  team2: string;
  status: MatchStatus;
  totalPool: number;
  totalPredictions: number;
  finalScore?: {
    team1Score: number;
    team1Wickets: number;
    team2Score: number;
    team2Wickets: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export default function MatchesPage() {
  const router = useRouter();
  const { user, getSignature } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [formData, setFormData] = useState({
    team1: '',
    team2: ''
  });

  const isAdmin = user?.walletAddress === process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS;

  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Match[];

      // Sort matches by status
      const sortedMatches = matchesData.sort((a, b) => {
        const statusOrder = {
          'UPCOMING': 0,
          'LOCKED': 1,
          'COMPLETED': 2
        };
        return statusOrder[a.status] - statusOrder[b.status];
      });

      setMatches(sortedMatches);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      if (!user?.walletAddress) {
        throw new Error('Wallet not connected');
      }

      // Get signature
      const { signature, message, nonce } = await getSignature('CREATE_MATCH', {
        team1: formData.team1,
        team2: formData.team2
      });

      // Create match
      const response = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          walletAddress: user.walletAddress,
          signature,
          message,
          nonce
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create match');
      }

      // Reset form
      setFormData({
        team1: '',
        team2: ''
      });
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating match:', error);
      setError(error instanceof Error ? error.message : 'Failed to create match');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Matches</h1>
          {isAdmin && (
            <button
              onClick={() => setIsCreating(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Create Match
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {isCreating && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">Create Match</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Team 1</label>
                  <input
                    type="text"
                    value={formData.team1}
                    onChange={(e) => setFormData({ ...formData, team1: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Team 2</label>
                  <input
                    type="text"
                    value={formData.team2}
                    onChange={(e) => setFormData({ ...formData, team2: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setFormData({
                      team1: '',
                      team2: ''
                    });
                    setError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Match
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pool
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Predictions
                </th>
                {isAdmin && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {matches.map((match) => (
                <tr key={match.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => router.push(`/matches/${match.id}`)}
                      className="text-left text-sm font-medium text-gray-900 hover:text-blue-600"
                    >
                      {match.team1} vs {match.team2}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      match.status === 'UPCOMING' ? 'bg-yellow-100 text-yellow-800' :
                      match.status === 'LOCKED' ? 'bg-red-100 text-red-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {match.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {match.status === 'COMPLETED' && match.finalScore ? (
                      `${match.finalScore.team1Score}/${match.finalScore.team1Wickets} - ${match.finalScore.team2Score}/${match.finalScore.team2Wickets}`
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {match.totalPool} USDC
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {match.totalPredictions}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {match.status === 'UPCOMING' && (
                        <LockMatchButton 
                          matchId={match.id}
                          onSuccess={() => {
                            // Optionally refresh the page or update UI
                          }}
                        />
                      )}
                      {match.status === 'LOCKED' && (
                        <button
                          onClick={() => setSelectedMatch(match)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Complete Match
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {matches.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No matches found.</p>
          </div>
        )}
      </div>

      {/* Complete Match Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Complete Match: {selectedMatch.team1} vs {selectedMatch.team2}
              </h3>
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <CompleteMatchForm
              matchId={selectedMatch.id}
              team1={selectedMatch.team1}
              team2={selectedMatch.team2}
              onSuccess={() => {
                setSelectedMatch(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
