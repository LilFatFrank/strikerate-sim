"use client";

import { useState, useEffect, use } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getStatusBadge } from "@/lib/status";

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
  status: "UPCOMING" | "LOCKED" | "COMPLETED";
  totalPool: number;
  totalPredictions: number;
  finalScore?: {
    team1Score: number;
    team1Wickets: number;
    team2Score: number;
    team2Wickets: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface User {
  walletAddress: string;
  totalPredictions: number;
  totalWins: number;
  totalAmountWon: number;
  totalPoints: number;
  strikerate: number;
}

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ wallet: string }>;
}) {
  const { wallet } = use(params);
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [matches, setMatches] = useState<Record<string, Match>>({});
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get user data
    const userRef = doc(db, "users", wallet);
    const unsubscribeUser = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUser({ walletAddress: doc.id, ...doc.data() } as User);
      }
    });

    // Get user's predictions
    const predictionsQuery = query(
      collection(db, "predictions"),
      where("userId", "==", wallet),
      orderBy("createdAt", "desc")
    );

    const unsubscribePredictions = onSnapshot(predictionsQuery, (snapshot) => {
      const predictionsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Prediction[];
      setPredictions(predictionsData);

      // Get match details for each prediction
      const matchIds = [...new Set(predictionsData.map((p) => p.matchId))];
      matchIds.forEach((matchId) => {
        const matchRef = doc(db, "matches", matchId);
        const unsubscribeMatch = onSnapshot(matchRef, (doc) => {
          if (doc.exists()) {
            setMatches((prev) => {
              const newMatches = {
                ...prev,
                [matchId]: { id: matchId, ...doc.data() } as Match,
              };
              
              // Sort predictions after we have the match data
              const sortedPredictions = predictionsData.sort((a, b) => {
                const matchA = newMatches[a.matchId];
                const matchB = newMatches[b.matchId];
                if (!matchA || !matchB) return 0;
                
                const statusOrder = {
                  'UPCOMING': 0,
                  'LOCKED': 1,
                  'COMPLETED': 2
                };
                return statusOrder[matchA.status] - statusOrder[matchB.status];
              });
              
              setPredictions(sortedPredictions);
              return newMatches;
            });
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
  }, [wallet]);

  const copyWalletAddress = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.walletAddress);
    toast.success("Wallet address copied to clipboard", {
      style: {
        background: "#3fe0aa",
        color: "white",
        border: "none",
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4f4395] mx-auto"></div>
          <p className="mt-4 text-[#0d0019]/70">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-md w-full mx-4">
          <p className="text-[#0d0019]/70">User not found</p>
        </div>
      </div>
    );
  }

  const isCurrentUser = authUser?.walletAddress === wallet;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* User Profile Section */}
        <div className="bg-gradient-to-b from-[#9c53c7] to-[#6857c9] rounded-xl shadow-sm p-4 mb-8">
          <h1 className="text-2xl font-bold text-[#fff] mb-6">
            {isCurrentUser ? "Your Profile" : "User Profile"}
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div>
              <p className="text-sm text-[#fff]/70">Wallet Address</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-medium text-[#fff] font-mono">
                  {user.walletAddress.slice(0, 4)}...
                  {user.walletAddress.slice(-4)}
                </p>
                <button
                  onClick={copyWalletAddress}
                  className="p-1 text-white/70 cursor-pointer hover:text-white rounded-lg transition-colors"
                  title="Copy wallet address"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div>
              <p className="text-sm text-[#fff]/70">Total Predictions</p>
              <p className="text-lg font-medium text-[#fff]">
                {user.totalPredictions}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#fff]/70">Total Wins</p>
              <p className="text-lg font-medium text-[#fff]">
                {user.totalWins}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#fff]/70">Total Winnings</p>
              <p className="text-lg font-medium text-[#fff] flex items-center gap-1">
                {user.totalAmountWon}{" "}
                <img
                  src="/assets/usdc-coin.svg"
                  alt="usdc"
                  className="w-5 h-5"
                />
              </p>
            </div>
            <div>
              <p className="text-sm text-[#fff]/70 font-bold">strikerate</p>
              <p className="text-lg font-bold text-[#fff]">
                {(user.totalPoints / user.totalPredictions).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Predictions History */}
        <div className="rounded-xl shadow-sm bg-white border-gray-100 overflow-hidden">
          <table className="w-full table-fixed">
            <thead>
              <tr className="bg-[#4f4395]">
                <th
                  className="px-4 py-1 text-left text-sm font-medium text-[#fff]"
                  style={{ width: "25%" }}
                >
                  Match
                </th>
                <th
                  className="px-4 py-1 text-left text-sm font-medium text-[#fff]"
                  style={{ width: "25%" }}
                >
                  Prediction
                </th>
                <th className="w-[15%] px-4 py-1 text-left text-sm font-medium text-[#fff]">
                  Amount
                </th>
                <th className="w-[15%] px-4 py-1 text-left text-sm font-medium text-[#fff]">
                  Status
                </th>
                <th className="w-[20%] px-4 py-1 text-left text-sm font-medium text-[#fff]">
                  Winnings
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#4f4395]/5">
              {predictions.map((prediction) => {
                const match = matches[prediction.matchId];
                return (
                  <tr
                    key={prediction.id}
                    className="group hover:bg-[#4f4395]/5 transition-colors cursor-pointer"
                    onClick={() =>
                      router.push(`/matches/${prediction.matchId}`)
                    }
                  >
                    <td className="px-4 py-1">
                      {match ? (
                        <div className="text-[12px] text-[#0d0019]">
                          {match.team1} vs {match.team2}
                          <span
                            className={`ml-2 text-xs font-medium rounded-full ${getStatusBadge(match.status)}`}
                          >
                            {match.status}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[12px] text-[#0d0019]/50">
                          Loading...
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-1">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`text-[12px] ${
                            match?.status === "UPCOMING"
                              ? "text-[#0d0019]/50"
                              : "text-[#0d0019]"
                          }`}
                        >
                          {match?.status === "UPCOMING" ? (
                            <>Hidden</>
                          ) : (
                            <>
                              {match?.team1}: {prediction.team1Score}/
                              {prediction.team1Wickets}
                            </>
                          )}
                        </span>
                        <span
                          className={`text-[12px] ${
                            match?.status === "UPCOMING"
                              ? "text-[#0d0019]/50"
                              : "text-[#0d0019]"
                          }`}
                        >
                          {match?.status === "UPCOMING" ? (
                            <>Hidden</>
                          ) : (
                            <>
                              {match?.team2}: {prediction.team2Score}/
                              {prediction.team2Wickets}
                            </>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-1">
                      <span className="text-[#0d0019] text-[14px] font-medium flex items-center gap-1">
                        {prediction.amount}{" "}
                        <img
                          src="/assets/usdc-coin.svg"
                          alt="usdc"
                          className="w-4 h-4"
                        />
                      </span>
                    </td>
                    <td className="px-4 py-1">
                      <span
                        className={`text-xs font-medium rounded-full ${
                          prediction.isWinner
                            ? "text-[#3fe0aa]"
                            : prediction.amountWon === undefined
                            ? "text-[#ffd400]"
                            : "text-[#ff503b]"
                        }`}
                      >
                        {prediction.isWinner
                          ? "won"
                          : prediction.amountWon === undefined
                          ? "-"
                          : "lost"}
                      </span>
                    </td>
                    <td className="px-4 py-1">
                      <span className="text-[#0d0019] text-[14px] font-medium flex items-center gap-1">
                        {prediction.amountWon ? (
                          <>
                            {prediction.amountWon}{" "}
                            <img
                              src="/assets/usdc-coin.svg"
                              alt="usdc"
                              className="w-4 h-4"
                            />
                          </>
                        ) : (
                          "-"
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {predictions.length === 0 && (
            <div className="text-center py-12 bg-white">
              <p className="text-[#0d0019]/70">No predictions yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
