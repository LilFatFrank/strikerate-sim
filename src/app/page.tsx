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

const getStatusBadge = (status: MatchStatus) => {
  switch (status) {
    case "UPCOMING":
      return "text-[#ffd400]";
    case "LOCKED":
      return "text-[#ff503b]";
    case "COMPLETED":
      return "text-[#3fe0aa]";
    default:
      return "text-[#f1f2f2]";
  }
};

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
      <h2 className="text-2xl font-semibold text-[#0d0019] mb-3">{title}</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full table-fixed">
          <thead>
            <tr className="bg-[#4f4395]">
              <th className="w-[35%] px-4 py-1 text-left text-sm font-medium text-[#fff]">
                Match
              </th>
              <th className="w-[10%] px-4 py-1 text-left text-sm font-medium text-[#fff]">
                Status
              </th>
              <th className="w-[15%] px-4 py-1 text-left text-sm font-medium text-[#fff]">
                Pool
              </th>
              <th className="w-[10%] px-4 py-1 text-left text-sm font-medium text-[#fff]">
                Predictions
              </th>
              <th className="w-[30%] px-4 py-1 text-left text-sm font-medium text-[#fff]">
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
                <td className="px-4 py-1">
                  <div className="flex flex-col">
                    <span className="text-[#0d0019] text-[14px] font-medium group-hover:text-[#4f4395] transition-colors">
                      {match.team1} vs {match.team2}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-1">
                  <span
                    className={`text-xs font-medium rounded-full ${getStatusBadge(
                      match.status
                    )}`}
                  >
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
                        {match.team1}: {match.finalScore.team1Score}/
                        {match.finalScore.team1Wickets}
                      </span>
                      <span className="text-[12px] text-[#0d0019]">
                        {match.team2}: {match.finalScore.team2Score}/
                        {match.finalScore.team2Wickets}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[#0d0019]/50">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-8">
      <h1 className="text-4xl font-bold text-[#0d0019] mb-8">Matches</h1>

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
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-[#0d0019]/70">No matches available.</p>
        </div>
      )}
    </div>
  );
}
