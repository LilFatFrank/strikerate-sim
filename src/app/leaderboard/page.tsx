'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, startAfter, getDocs } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  walletAddress: string;
  totalPredictions: number;
  totalWins: number;
  totalAmountWon: number;
  totalPoints: number;
  createdAt: Date;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const USERS_PER_PAGE = 5;

  useEffect(() => {
    // Initial load of users
    const loadInitialUsers = async () => {
      try {
        const usersQuery = query(
          collection(db, "users"),
          orderBy("totalPoints", "desc"),
          limit(USERS_PER_PAGE)
        );

        const snapshot = await getDocs(usersQuery);
        const usersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as User[];

        setUsers(usersData);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === USERS_PER_PAGE);
      } catch (error) {
        console.error("Error loading initial users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialUsers();

    // Set up real-time listener for new users
    const usersQuery = query(
      collection(db, "users"),
      orderBy("totalPoints", "desc"),
      limit(USERS_PER_PAGE)
    );

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const newUsers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];

      // Only update if we're on the first page
      if (!lastDoc) {
        setUsers(newUsers);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === USERS_PER_PAGE);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadMore = async () => {
    if (!hasMore || !lastDoc) return;

    try {
      const nextQuery = query(
        collection(db, "users"),
        orderBy("totalPoints", "desc"),
        startAfter(lastDoc),
        limit(USERS_PER_PAGE)
      );

      const snapshot = await getDocs(nextQuery);
      const newUsers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];

      setUsers(prev => [...prev, ...newUsers]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === USERS_PER_PAGE);
    } catch (error) {
      console.error("Error loading more users:", error);
    }
  };

  // Add intersection observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, lastDoc]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4f4395] mx-auto"></div>
          <p className="mt-4 text-[#0d0019]/70">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 md:py-8 px-4 md:px-6">
      <div className="container mx-auto">
        <h1 className="text-2xl md:text-4xl font-bold text-[#0d0019] mb-4 md:mb-6">Leaderboard</h1>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] table-fixed">
              <thead>
                <tr className="bg-[#4f4395]">
                  <th className="w-[35%] px-4 py-3 text-left text-xs md:text-sm font-medium text-[#fff]">
                    User
                  </th>
                  <th className="w-[12%] px-4 py-3 text-left text-xs md:text-sm font-medium text-[#fff]">
                    Wins
                  </th>
                  <th className="w-[12%] px-4 py-3 text-left text-xs md:text-sm font-medium text-[#fff]">
                    Predictions
                  </th>
                  <th className="w-[12%] px-4 py-3 text-left text-xs md:text-sm font-medium text-[#fff]">
                    Winnings
                  </th>
                  <th className="w-[12%] px-4 py-3 text-left text-xs md:text-sm font-medium text-[#fff]">
                    Points
                  </th>
                  <th className="w-[17%] px-4 py-3 text-left text-xs md:text-sm font-bold text-[#fff]">
                    strikerate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#4f4395]/5">
                {users.map((user, index) => (
                  <tr 
                    key={user.id}
                    className={`group hover:bg-[#4f4395]/5 transition-colors cursor-pointer ${
                      user.walletAddress === authUser?.walletAddress ? 'bg-[#4f4395]/5' : ''
                    }`}
                    onClick={() => router.push(`/${user.walletAddress}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] md:text-[14px] font-medium w-6">
                          {index === 0 ? '👑' : <>&nbsp;</>}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[#0d0019] text-[13px] md:text-[14px] font-medium group-hover:text-[#4f4395] transition-colors leading-tight">
                            {user.walletAddress.slice(0, 4)}...{user.walletAddress.slice(-4)}
                          </span>
                          {user.walletAddress === authUser?.walletAddress && (
                            <span className="px-2 py-1 text-[11px] md:text-[12px] font-medium text-white bg-[#4f4395] rounded">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#0d0019] text-[13px] md:text-[14px] font-medium leading-tight">
                        {user.totalWins}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#0d0019] text-[13px] md:text-[14px] leading-tight">
                        {user.totalPredictions}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#0d0019] text-[13px] md:text-[14px] font-medium flex items-center gap-1 leading-tight">
                        {user.totalAmountWon}{" "}
                        <img
                          src={"/assets/usdc-coin.svg"}
                          alt="usdc"
                          className="w-3 h-3 md:w-4 md:h-4"
                        />
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#0d0019] text-[13px] md:text-[14px] font-medium leading-tight">
                        {user.totalPoints.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#0d0019] text-[13px] md:text-[14px] font-bold leading-tight">
                        {user.totalPredictions > 0 
                          ? (user.totalPoints / user.totalPredictions).toFixed(2)
                          : '0.00'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {users.length === 0 && !isLoading && (
          <div className="text-center py-8 md:py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <p className="text-[#0d0019]/70 text-sm md:text-base">No users found.</p>
          </div>
        )}

        {hasMore && (
          <div ref={observerTarget} className="py-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#4f4395] mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  );
} 