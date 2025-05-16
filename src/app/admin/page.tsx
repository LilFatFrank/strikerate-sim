'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';

interface DashboardStats {
  matches: {
    total: number;
    upcoming: number;
    live: number;
    completed: number;
  };
  predictions: {
    total: number;
    totalAmount: number;
  };
  users: {
    total: number;
    active: number;
  };
  winnings: {
    total: number;
    totalClaims: number;
    pendingClaims: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    matches: {
      total: 0,
      upcoming: 0,
      live: 0,
      completed: 0
    },
    predictions: {
      total: 0,
      totalAmount: 0
    },
    users: {
      total: 0,
      active: 0
    },
    winnings: {
      total: 0,
      totalClaims: 0,
      pendingClaims: 0
    }
  });

  useEffect(() => {
    // Listen to stats document
    const statsRef = doc(db, 'stats', 'global');
    const unsubscribe = onSnapshot(statsRef, (doc) => {
      if (doc.exists()) {
        setStats(doc.data() as DashboardStats);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Matches</h3>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-gray-500">Total: {stats.matches.total}</p>
            <p className="text-sm text-gray-500">Upcoming: {stats.matches.upcoming}</p>
            <p className="text-sm text-gray-500">Live: {stats.matches.live}</p>
            <p className="text-sm text-gray-500">Completed: {stats.matches.completed}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Predictions</h3>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-gray-500">Total: {stats.predictions.total}</p>
            <p className="text-sm text-gray-500">Amount: {stats.predictions.totalAmount} SOL</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Users</h3>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-gray-500">Total: {stats.users.total}</p>
            <p className="text-sm text-gray-500">Active: {stats.users.active}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Winnings</h3>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-gray-500">Total: {stats.winnings.total} USDC</p>
            <p className="text-sm text-gray-500">Claims: {stats.winnings.totalClaims}</p>
            <p className="text-sm text-gray-500">Pending: {stats.winnings.pendingClaims} USDC</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Quick Links</h3>
          <div className="mt-4 space-y-2">
            <Link
              href="/matches"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
            >
              Matches
            </Link>
            <Link
              href="/predictions"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
            >
              Predictions
            </Link>
            <Link
              href="/users"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
            >
              Users
            </Link>
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