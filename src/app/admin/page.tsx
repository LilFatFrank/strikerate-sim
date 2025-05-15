'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, } from 'firebase/firestore';

interface DashboardStats {
  totalMatches: number;
  upcomingMatches: number;
  liveMatches: number;
  completedMatches: number;
  totalPredictions: number;
  totalUsers: number;
  totalWinnings: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMatches: 0,
    upcomingMatches: 0,
    liveMatches: 0,
    completedMatches: 0,
    totalPredictions: 0,
    totalUsers: 0,
    totalWinnings: 0
  });

  useEffect(() => {
    // Listen to matches
    const matchesQuery = query(collection(db, 'matches'));
    const matchesUnsubscribe = onSnapshot(matchesQuery, (snapshot) => {
      const matches = snapshot.docs.map(doc => doc.data());
      setStats(prev => ({
        ...prev,
        totalMatches: matches.length,
        upcomingMatches: matches.filter(m => m.status === 'upcoming').length,
        liveMatches: matches.filter(m => m.status === 'live').length,
        completedMatches: matches.filter(m => m.status === 'completed').length
      }));
    });

    // Get total predictions
    const predictionsQuery = query(collection(db, 'predictions'));
    const predictionsUnsubscribe = onSnapshot(predictionsQuery, (snapshot) => {
      setStats(prev => ({
        ...prev,
        totalPredictions: snapshot.size
      }));
    });

    // Get total users and winnings
    const usersQuery = query(collection(db, 'users'));
    const usersUnsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data());
      const totalWinnings = users.reduce((sum, user) => sum + (user.totalAmountWon || 0), 0);
      setStats(prev => ({
        ...prev,
        totalUsers: users.length,
        totalWinnings
      }));
    });

    return () => {
      matchesUnsubscribe();
      predictionsUnsubscribe();
      usersUnsubscribe();
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Matches</h3>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-gray-500">Total: {stats.totalMatches}</p>
            <p className="text-sm text-gray-500">Upcoming: {stats.upcomingMatches}</p>
            <p className="text-sm text-gray-500">Live: {stats.liveMatches}</p>
            <p className="text-sm text-gray-500">Completed: {stats.completedMatches}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Predictions</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalPredictions}</p>
          <p className="text-sm text-gray-500">Total predictions made</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Users</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalUsers}</p>
          <p className="text-sm text-gray-500">Total registered users</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Total Winnings</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalWinnings} SOL</p>
          <p className="text-sm text-gray-500">Total amount won by users</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Quick Links</h3>
          <div className="mt-4 space-y-2">
            <a
              href="/admin/matches"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
            >
              Manage Matches
            </a>
            <a
              href="/admin/predictions"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
            >
              View Predictions
            </a>
            <a
              href="/admin/users"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
            >
              Manage Users
            </a>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-500">Coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
} 