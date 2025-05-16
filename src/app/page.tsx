'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

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

const getStatusBadge = (status: MatchStatus) => {
  switch (status) {
    case 'UPCOMING':
      return 'bg-yellow-100 text-yellow-800';
    case 'LOCKED':
      return 'bg-red-100 text-red-800';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function Home() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Query all matches
    const q = query(
      collection(db, 'matches'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Match[];
      setMatches(matchesData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Group matches by status
  const upcomingMatches = matches.filter(m => m.status === 'UPCOMING');
  const liveMatches = matches.filter(m => m.status === 'LOCKED');
  const completedMatches = matches.filter(m => m.status === 'COMPLETED');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading matches...</p>
        </div>
      </div>
    );
  }

  const MatchCard = ({ match }: { match: Match }) => (
    <Link 
      key={match.id} 
      href={`/matches/${match.id}`}
      className="block bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {match.team1} vs {match.team2}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Pool: {match.totalPool} USDC
            </p>
            <p className="text-sm text-gray-500">
              Predictions: {match.totalPredictions}
            </p>
          </div>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(match.status)}`}>
            {match.status}
          </span>
        </div>

        {match.status === 'LOCKED' && match.finalScore && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600">
              {match.team1}: {match.finalScore.team1Score}/{match.finalScore.team1Wickets}
            </p>
            <p className="text-sm text-gray-600">
              {match.team2}: {match.finalScore.team2Score}/{match.finalScore.team2Wickets}
            </p>
          </div>
        )}

        {match.status === 'COMPLETED' && match.finalScore && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-900">Final Score</p>
            <p className="text-sm text-gray-600">
              {match.team1}: {match.finalScore.team1Score}/{match.finalScore.team1Wickets}
            </p>
            <p className="text-sm text-gray-600">
              {match.team2}: {match.finalScore.team2Score}/{match.finalScore.team2Wickets}
            </p>
          </div>
        )}

        {match.status === 'UPCOMING' && user && (
          <div className="mt-4">
            <span className="text-sm text-blue-600">Click to make prediction</span>
          </div>
        )}
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Matches</h1>
        
        {/* Upcoming Matches */}
        {upcomingMatches.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Matches</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        )}

        {/* Live Matches */}
        {liveMatches.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Live Matches</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {liveMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        )}

        {/* Completed Matches */}
        {completedMatches.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Completed Matches</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {completedMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        )}

        {matches.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No matches available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
