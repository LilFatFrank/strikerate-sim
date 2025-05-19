"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { getStatusBadge } from "@/lib/status";

type MatchStatus = "UPCOMING" | "LOCKED" | "COMPLETED";

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

export default function Home() {
  const { push } = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "matches"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const matchesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Match[];
      setMatches(matchesData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const upcomingMatches = matches.filter((m) => m.status === "UPCOMING");
  const liveMatches = matches.filter((m) => m.status === "LOCKED");
  const completedMatches = matches.filter((m) => m.status === "COMPLETED");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4f4395] mx-auto"></div>
          <p className="mt-4 text-[#0d0019]/70">Loading matches...</p>
        </div>
      </div>
    );
  }

  const MatchTable = ({
    matches,
    title,
  }: {
    matches: Match[];
    title: string;
  }) => (
    <div className="mb-8">
      <h2 className="text-xl md:text-2xl font-semibold text-[#0d0019] mb-3">{title}</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] table-fixed">
            <thead>
              <tr className="bg-[#4f4395]">
                <th className="w-[35%] px-4 py-3 text-left text-xs md:text-sm font-medium text-[#fff]">
                  Match
                </th>
                <th className="w-[15%] px-4 py-3 text-left text-xs md:text-sm font-medium text-[#fff]">
                  Status
                </th>
                <th className="w-[15%] px-4 py-3 text-left text-xs md:text-sm font-medium text-[#fff]">
                  Pool
                </th>
                <th className="w-[15%] px-4 py-3 text-left text-xs md:text-sm font-medium text-[#fff]">
                  Predictions
                </th>
                <th className="w-[20%] px-4 py-3 text-left text-xs md:text-sm font-medium text-[#fff]">
                  Score
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#4f4395]/5">
              {matches.map((match) => (
                <tr
                  key={match.id}
                  className="group hover:bg-[#4f4395]/5 transition-colors cursor-pointer"
                  onClick={() => push(`/matches/${match.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-[13px] md:text-[14px] font-medium text-[#0d0019] group-hover:text-[#4f4395] transition-colors leading-tight">
                        {match.team1} vs {match.team2}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] md:text-xs font-medium rounded-full ${getStatusBadge(
                        match.status
                      )}`}
                    >
                      {match.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] md:text-[14px] font-medium text-[#0d0019] flex items-center gap-1 leading-tight">
                      {match.totalPool}{" "}
                      <img
                        src={"/assets/usdc-coin.svg"}
                        alt="usdc"
                        className="w-3 h-3 md:w-4 md:h-4"
                      />
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] md:text-[14px] text-[#0d0019] leading-tight">
                      {match.totalPredictions}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {match.finalScore ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] md:text-[12px] text-[#0d0019] leading-tight">
                          {match.team1}: {match.finalScore.team1Score}/
                          {match.finalScore.team1Wickets}
                        </span>
                        <span className="text-[11px] md:text-[12px] text-[#0d0019] leading-tight">
                          {match.team2}: {match.finalScore.team2Score}/
                          {match.finalScore.team2Wickets}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[#0d0019]/50 text-[13px] md:text-[14px] leading-tight">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-6 md:py-8 px-4 md:px-6">
      <h1 className="text-2xl md:text-4xl font-bold text-[#0d0019] mb-6 md:mb-8 leading-tight">Matches</h1>

      {upcomingMatches.length > 0 && (
        <MatchTable matches={upcomingMatches} title="Upcoming" />
      )}

      {liveMatches.length > 0 && (
        <MatchTable matches={liveMatches} title="Live" />
      )}

      {completedMatches.length > 0 && (
        <MatchTable matches={completedMatches} title="Completed" />
      )}

      {matches.length === 0 && (
        <div className="text-center py-8 md:py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-[#0d0019]/70 text-sm md:text-base">No matches available.</p>
        </div>
      )}
    </div>
  );
}
