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
    const statsRef = doc(db, 'stats', 'global');
    const unsubscribe = onSnapshot(statsRef, (doc) => {
      if (doc.exists()) {
        setStats(doc.data() as DashboardStats);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-6 py-4 md:py-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-4">
        <h1 className="text-2xl md:text-4xl font-bold text-[#0d0019]">Admin Dashboard</h1>
        <div className="text-xs md:text-sm text-[#0d0019]/70">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-base md:text-lg font-semibold text-[#0d0019] mb-3 md:mb-4">Matches</h3>
          <div className="space-y-2 md:space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm md:text-base text-[#0d0019]/70">Total</span>
              <span className="text-sm md:text-base text-[#0d0019] font-medium">{stats.matches.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm md:text-base text-[#0d0019]/70">Upcoming</span>
              <span className="text-sm md:text-base text-[#ffd400] font-medium">{stats.matches.upcoming}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm md:text-base text-[#0d0019]/70">Live</span>
              <span className="text-sm md:text-base text-[#ff503b] font-medium">{stats.matches.live}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm md:text-base text-[#0d0019]/70">Completed</span>
              <span className="text-sm md:text-base text-[#3fe0aa] font-medium">{stats.matches.completed}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-base md:text-lg font-semibold text-[#0d0019] mb-3 md:mb-4">Predictions</h3>
          <div className="space-y-2 md:space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm md:text-base text-[#0d0019]/70">Total</span>
              <span className="text-sm md:text-base text-[#0d0019] font-medium">{stats.predictions.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm md:text-base text-[#0d0019]/70">Amount</span>
              <span className="text-sm md:text-base text-[#0d0019] font-medium flex items-center gap-1">
                {stats.predictions.totalAmount}{" "}
                <img
                  src={"/assets/usdc-coin.svg"}
                  alt="usdc"
                  className="w-3 h-3 md:w-4 md:h-4"
                />
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-base md:text-lg font-semibold text-[#0d0019] mb-3 md:mb-4">Users</h3>
          <div className="space-y-2 md:space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm md:text-base text-[#0d0019]/70">Total</span>
              <span className="text-sm md:text-base text-[#0d0019] font-medium">{stats.users.total}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-base md:text-lg font-semibold text-[#0d0019] mb-3 md:mb-4">Winnings</h3>
          <div className="space-y-2 md:space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm md:text-base text-[#0d0019]/70">Total</span>
              <span className="text-sm md:text-base text-[#0d0019] font-medium flex items-center gap-1">
                {stats.winnings.total}{" "}
                <img
                  src={"/assets/usdc-coin.svg"}
                  alt="usdc"
                  className="w-3 h-3 md:w-4 md:h-4"
                />
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm md:text-base text-[#0d0019]/70">Claims</span>
              <span className="text-sm md:text-base text-[#0d0019] font-medium">{stats.winnings.totalClaims}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm md:text-base text-[#0d0019]/70">Pending</span>
              <span className="text-sm md:text-base text-[#0d0019] font-medium flex items-center gap-1">
                {stats.winnings.pendingClaims}{" "}
                <img
                  src={"/assets/usdc-coin.svg"}
                  alt="usdc"
                  className="w-3 h-3 md:w-4 md:h-4"
                />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1">
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-base md:text-lg font-semibold text-[#0d0019] mb-3 md:mb-4">Quick Links</h3>
          <div className="space-y-1 md:space-y-2">
            <Link
              href="/matches"
              className="flex items-center justify-between px-3 md:px-4 py-2 md:py-1 text-sm md:text-base text-[#0d0019] hover:bg-[#4f4395]/5 rounded-lg transition-colors"
            >
              <span>Matches</span>
              <svg className="w-3 h-3 md:w-4 md:h-4 text-[#0d0019]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/leaderboard"
              className="flex items-center justify-between px-3 md:px-4 py-2 md:py-1 text-sm md:text-base text-[#0d0019] hover:bg-[#4f4395]/5 rounded-lg transition-colors"
            >
              <span>Users</span>
              <svg className="w-3 h-3 md:w-4 md:h-4 text-[#0d0019]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 