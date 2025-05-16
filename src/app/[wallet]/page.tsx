'use client';

import { useState, useEffect, use } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface Prediction {
  id: string;
  matchId: string;
  userId: string;
  team1Score: number;
  team1Wickets: number;
  team2Score: number;
  team2Wickets: number;
  amount: number;
  isWinner: boolean;
  amountWon?: number;
  hasClaimed: boolean;
  pointsEarned?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Match {
  id: string;
  team1: string;
  team2: string;
  status: 'upcoming' | 'live' | 'completed';
  team1Score?: number;
  team1Wickets?: number;
  team2Score?: number;
  team2Wickets?: number;
}

interface User {
  walletAddress: string;
  totalPredictions: number;
  totalWins: number;
  totalAmountWon: number;
  totalPoints: number;
  strikerate: number;
}

export default function UserProfilePage({ params }: { params: { wallet: string } }) {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [matches, setMatches] = useState<Record<string, Match>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get user data
    const userRef = doc(db, 'users', params.wallet);
    const unsubscribeUser = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUser({ walletAddress: doc.id, ...doc.data() } as User);
      }
    });

    // Get user's predictions
    const predictionsQuery = query(
      collection(db, 'predictions'),
      where('userId', '==', params.wallet),
      orderBy('createdAt', 'desc')
    );

    const unsubscribePredictions = onSnapshot(predictionsQuery, (snapshot) => {
      const predictionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Prediction[];
      setPredictions(predictionsData);

      // Get match details for each prediction
      const matchIds = [...new Set(predictionsData.map(p => p.matchId))];
      matchIds.forEach(matchId => {
        const matchRef = doc(db, 'matches', matchId);
        const unsubscribeMatch = onSnapshot(matchRef, (doc) => {
          if (doc.exists()) {
            setMatches(prev => ({
              ...prev,
              [matchId]: { id: matchId, ...doc.data() } as Match
            }));
          }
        });
        return unsubscribeMatch;
      });
    });

    setIsLoading(false);
    return () => {
      unsubscribeUser();
      unsubscribePredictions();
    };
  }, [params.wallet]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">User not found</p>
        </div>
      </div>
    );
  }

  const isCurrentUser = authUser?.walletAddress === params.wallet;

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* User Profile Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {isCurrentUser ? 'Your Profile' : 'User Profile'}
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Wallet Address</p>
              <p className="text-lg font-medium text-gray-900">
                {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Predictions</p>
              <p className="text-lg font-medium text-gray-900">{user.totalPredictions}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Wins</p>
              <p className="text-lg font-medium text-gray-900">{user.totalWins}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Winnings</p>
              <p className="text-lg font-medium text-gray-900">{user.totalAmountWon} USDC</p>
            </div>
          </div>
        </div>

        {/* Predictions History */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Prediction History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Match
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prediction
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Winnings
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {predictions.map((prediction) => {
                  const match = matches[prediction.matchId];
                  return (
                    <tr key={prediction.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {match ? (
                          <div className="text-sm text-gray-900">
                            {match.team1} vs {match.team2}
                            <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                              match.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
                              match.status === 'live' ? 'bg-red-100 text-red-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {match.status}
                            </span>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">Loading...</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {prediction.team1Score}/{prediction.team1Wickets} - {prediction.team2Score}/{prediction.team2Wickets}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {prediction.amount} USDC
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          prediction.isWinner ? 'bg-green-100 text-green-800' :
                          prediction.amountWon === undefined ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {prediction.isWinner ? 'won' :
                           prediction.amountWon === undefined ? 'pending' :
                           'lost'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {prediction.amountWon ? `${prediction.amountWon} USDC` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 