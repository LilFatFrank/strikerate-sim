'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { LockMatchButton } from '@/components/admin/LockMatchButton';
import { CompleteMatchForm } from '@/components/admin/CompleteMatchForm';
import { toast } from 'sonner';
import { getStatusBadge } from '@/lib/status';

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
    setIsLoading(true);
    
    try {
      if (!user?.walletAddress) {
        throw new Error('Wallet not connected');
      }

      const { signature, message, nonce } = await getSignature('CREATE_MATCH', {
        team1: formData.team1.trim(),
        team2: formData.team2.trim()
      });

      const response = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team1: formData.team1.trim(),
          team2: formData.team2.trim(),
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

      // Show success message
      toast.success('Match created successfully', {
        style: {
          background: '#4f4395',
          color: 'white',
          border: 'none'
        }
      });

      // Reset form and close modal
      setFormData({
        team1: '',
        team2: ''
      });
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating match:', error);
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
    <div className="min-h-screen py-8">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-4xl font-bold text-[#0d0019]">Matches</h1>
          {isAdmin && (
            <button
              onClick={() => setIsCreating(true)}
              className="bg-[#4f4395] text-white font-semibold cursor-pointer px-4 py-2 rounded-lg hover:bg-[#433a7d] transition-colors"
            >
              Create Match
            </button>
          )}
        </div>

        {isCreating ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <h2 className="text-2xl font-semibold text-[#0d0019] mb-4">Create Match</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0d0019]/70">Team 1</label>
                  <input
                    type="text"
                    placeholder='India'
                    value={formData.team1}
                    onChange={(e) => setFormData({ ...formData, team1: e.target.value })}
                    className="mt-1 block w-full rounded-lg shadow-sm  outline-none border-none py-1 px-4"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0d0019]/70">Team 2</label>
                  <input
                    type="text"
                    placeholder='England'
                    value={formData.team2}
                    onChange={(e) => setFormData({ ...formData, team2: e.target.value })}
                    className="mt-1 block w-full rounded-lg shadow-sm  outline-none border-none py-1 px-4"
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
                  }}
                  className="px-4 py-2 border border-gray-200 font-semibold rounded-lg text-[#0d0019]/70 hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4f4395] text-white font-bold rounded-lg hover:bg-[#433a7d] transition-colors disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full table-fixed">
            <thead>
              <tr className="bg-[#4f4395]">
                <th className="px-4 py-1 text-left text-sm font-medium text-[#fff]" style={{ width: isAdmin ? '30%' : '35%' }}>
                  Match
                </th>
                <th className="w-[10%] px-4 py-1 text-left text-sm font-medium text-[#fff]">
                  Status
                </th>
                <th className="px-4 py-1 text-left text-sm font-medium text-[#fff]" style={{ width: isAdmin ? '10%' : '15%' }}>
                  Pool
                </th>
                <th className="w-[10%] px-4 py-1 text-left text-sm font-medium text-[#fff]">
                  Predictions
                </th>
                <th className="w-[20%] px-4 py-1 text-left text-sm font-medium text-[#fff]">
                  Score
                </th>
                {isAdmin && (
                  <th className="w-[10%] px-4 py-1 text-left text-sm font-medium text-[#fff]">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#4f4395]/5">
              {matches.map((match) => (
                <tr 
                  key={match.id}
                  className="group hover:bg-[#4f4395]/5 transition-colors cursor-pointer"
                  onClick={() => router.push(`/matches/${match.id}`)}
                >
                  <td className="px-4 py-1">
                    <span className="text-[#0d0019] text-[14px] font-medium group-hover:text-[#4f4395] transition-colors">
                      {match.team1} vs {match.team2}
                    </span>
                  </td>
                  <td className="px-4 py-1">
                    <span className={`text-xs font-medium ${getStatusBadge(match.status)}`}>
                      {match.status}
                    </span>
                  </td>
                  <td className="px-4 py-1">
                    <span className="text-[#0d0019] text-[14px] font-medium flex items-center gap-1">
                      {match.totalPool}{" "}
                      <img
                        src={"/assets/usdc-coin.svg"}
                        alt="usdc"
                        className="w-4 h-4"
                      />
                    </span>
                  </td>
                  <td className="px-4 py-1">
                    <span className="text-[#0d0019] text-[14px]">
                      {match.totalPredictions}
                    </span>
                  </td>
                  <td className="px-4 py-1">
                    {match.finalScore ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-[12px] text-[#0d0019]">
                          {match.team1}: {match.finalScore.team1Score}/{match.finalScore.team1Wickets}
                        </span>
                        <span className="text-[12px] text-[#0d0019]">
                          {match.team2}: {match.finalScore.team2Score}/{match.finalScore.team2Wickets}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[#0d0019]/50">-</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-1">
                      {match.status === 'UPCOMING' && (
                        <LockMatchButton 
                          matchId={match.id}
                          onSuccess={() => {}}
                        />
                      )}
                      {match.status === 'LOCKED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMatch(match);
                          }}
                          className="cursor-pointer font-medium bg-[#3fe0aa]/80 text-white px-2 py-[2px] rounded hover:bg-[#3fe0aa] transition-colors disabled:bg-[#3fe0aa]/50 disabled:cursor-not-allowed"
                        >
                          Complete
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
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <p className="text-[#0d0019]/70">No matches available.</p>
          </div>
        )}
      </div>

      {selectedMatch && (
        <div className="fixed inset-0 bg-[#0d0019]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
            <div className="flex justify-end items-center mb-2">
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-[#0d0019]/50 hover:text-[#0d0019] transition-colors"
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
