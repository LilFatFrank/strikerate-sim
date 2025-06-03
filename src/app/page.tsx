"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  limit,
  startAfter,
  getDocs,
  where,
} from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { getStatusBadge } from "@/lib/status";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Suspense } from "react";
import { MatchSport } from "@/lib/types";

type MatchStatus = "UPCOMING" | "LOCKED" | "COMPLETED";
type MatchType = "T20" | "ODI";

interface Match {
  id: string;
  team1: string;
  team2: string;
  status: MatchStatus;
  matchType: MatchType;
  tournament: string;
  stadium: string;
  matchTime: string;
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

interface MatchSection {
  matches: Match[];
  hasMore: boolean;
  lastDoc: any;
  isLoading: boolean;
}

function HomeContent() {
  const { push } = useRouter();
  const { user, getSignature } = useAuth();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<MatchStatus>(() => {
    const tab = searchParams.get("tab") as MatchStatus;
    return tab && ["UPCOMING", "LOCKED", "COMPLETED"].includes(tab)
      ? tab
      : "UPCOMING";
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [matchSections, setMatchSections] = useState<
    Record<MatchStatus, MatchSection>
  >({
    UPCOMING: { matches: [], hasMore: true, lastDoc: null, isLoading: true },
    LOCKED: { matches: [], hasMore: true, lastDoc: null, isLoading: true },
    COMPLETED: { matches: [], hasMore: true, lastDoc: null, isLoading: true },
  });
  const [formData, setFormData] = useState({
    team1: "",
    team2: "",
    matchType: "T20" as MatchType,
    tournament: "",
    stadium: "",
    matchTime: "",
  });
  const MATCHES_PER_PAGE = 5;
  const isAdmin =
    user?.walletAddress === process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS;

  // Function to update URL with active tab
  const updateUrlWithTab = (tab: MatchStatus) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.pushState({}, "", url);
  };

  // Function to find the first tab with matches
  const findFirstTabWithMatches = () => {
    if (matchSections.UPCOMING.matches.length > 0) return "UPCOMING";
    if (matchSections.LOCKED.matches.length > 0) return "LOCKED";
    if (matchSections.COMPLETED.matches.length > 0) return "COMPLETED";
    return "UPCOMING"; // Default to UPCOMING if no matches found
  };

  useEffect(() => {
    // Load initial data for active tab
    const loadInitialMatches = async (status: MatchStatus) => {
      if (!matchSections[status].isLoading) return;

      try {
        const matchesQuery = query(
          collection(db, "matches"),
          where("status", "==", status),
          orderBy("createdAt", "desc"),
          limit(MATCHES_PER_PAGE)
        );

        const snapshot = await getDocs(matchesQuery);
        const matchesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Match[];

        setMatchSections((prev) => ({
          ...prev,
          [status]: {
            matches: matchesData,
            hasMore: matchesData.length === MATCHES_PER_PAGE,
            lastDoc: snapshot.docs[snapshot.docs.length - 1],
            isLoading: false,
          },
        }));

        // If this is the first load and there are no matches, try the next tab
        if (status === activeTab && matchesData.length === 0) {
          const nextTab = status === "UPCOMING" ? "LOCKED" : "COMPLETED";
          if (nextTab !== status) {
            setActiveTab(nextTab);
            updateUrlWithTab(nextTab);
          }
        }
      } catch (error) {
        console.error(
          `Error loading initial ${status.toLowerCase()} matches:`,
          error
        );
        setMatchSections((prev) => ({
          ...prev,
          [status]: { ...prev[status], isLoading: false },
        }));
      }
    };

    // Load all sections initially
    loadInitialMatches("UPCOMING");
    loadInitialMatches("LOCKED");
    loadInitialMatches("COMPLETED");

    // Set up real-time listeners for each section
    const unsubscribes = (["UPCOMING", "LOCKED", "COMPLETED"] as const).map(
      (status) => {
        const matchesQuery = query(
          collection(db, "matches"),
          where("status", "==", status),
          orderBy("createdAt", "desc"),
          limit(MATCHES_PER_PAGE)
        );

        return onSnapshot(matchesQuery, (snapshot) => {
          const newMatches = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Match[];

          setMatchSections((prev) => ({
            ...prev,
            [status]: {
              matches: newMatches,
              hasMore: newMatches.length === MATCHES_PER_PAGE,
              lastDoc: snapshot.docs[snapshot.docs.length - 1],
              isLoading: false,
            },
          }));

          // If current tab has no matches, switch to first available tab
          if (status === activeTab && newMatches.length === 0) {
            const firstTabWithMatches = findFirstTabWithMatches();
            if (firstTabWithMatches !== activeTab) {
              setActiveTab(firstTabWithMatches);
              updateUrlWithTab(firstTabWithMatches);
            }
          }
        });
      }
    );

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, []);

  const loadMore = async () => {
    const section = matchSections[activeTab];
    if (!section.hasMore || !section.lastDoc) return;

    try {
      const nextQuery = query(
        collection(db, "matches"),
        where("status", "==", activeTab),
        orderBy("createdAt", "desc"),
        startAfter(section.lastDoc),
        limit(MATCHES_PER_PAGE)
      );

      const snapshot = await getDocs(nextQuery);
      const newMatches = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Match[];

      setMatchSections((prev) => ({
        ...prev,
        [activeTab]: {
          matches: [...prev[activeTab].matches, ...newMatches],
          hasMore: newMatches.length === MATCHES_PER_PAGE,
          lastDoc: snapshot.docs[snapshot.docs.length - 1],
          isLoading: false,
        },
      }));
    } catch (error) {
      console.error(
        `Error loading more ${activeTab.toLowerCase()} matches:`,
        error
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!user?.walletAddress) {
        throw new Error("Wallet not connected");
      }

      const { signature, message, nonce } = await getSignature("CREATE_MATCH", {
        team1: formData.team1.trim(),
        team2: formData.team2.trim(),
        matchType: formData.matchType,
        tournament: formData.tournament.trim(),
        stadium: formData.stadium.trim(),
        matchTime: formData.matchTime.trim(),
      });

      const response = await fetch("/api/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          team1: formData.team1.trim(),
          team2: formData.team2.trim(),
          matchType: formData.matchType,
          tournament: formData.tournament.trim(),
          stadium: formData.stadium.trim(),
          matchTime: formData.matchTime.trim(),
          walletAddress: user.walletAddress,
          matchSport: MatchSport.CRICKET,
          signature,
          message,
          nonce,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create match");
      }

      // Show success message
      toast.success("Match created successfully", {
        style: {
          background: "#4f4395",
          color: "white",
          border: "none",
        },
      });

      // Reset form and close modal
      setFormData({
        team1: "",
        team2: "",
        matchType: "T20",
        tournament: "",
        stadium: "",
        matchTime: "",
      });
      setIsCreating(false);
    } catch (error) {
      console.error("Error creating match:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create match",
        {
          style: {
            background: "#ff503b",
            color: "white",
            border: "none",
          },
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: MatchStatus) => {
    setActiveTab(tab);
    updateUrlWithTab(tab);
  };

  const MatchTable = () => {
    const observerTarget = useRef<HTMLDivElement>(null);
    const section = matchSections[activeTab];

    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && section.hasMore) {
            loadMore();
          }
        },
        { threshold: 0.1 }
      );

      if (observerTarget.current) {
        observer.observe(observerTarget.current);
      }

      return () => observer.disconnect();
    }, [section.hasMore]);

    if (section.isLoading) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f4395] mx-auto"></div>
        </div>
      );
    }

    if (section.matches.length === 0) {
      return (
        <div className="text-center py-8 md:py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-[#0d0019]/70 text-sm md:text-base">
            No matches available.
          </p>
        </div>
      );
    }

    return (
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
              {section.matches.map((match) => (
                <tr
                  key={match.id}
                  className="group hover:bg-[#4f4395]/5 transition-colors cursor-pointer"
                  onClick={() => push(`/matches/${match.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <span className="text-[13px] md:text-[14px] font-medium text-[#0d0019] group-hover:text-[#4f4395] transition-colors leading-tight">
                        {match.team1} vs {match.team2}
                      </span>
                      {match?.matchType ? (
                        <span className="ml-2 inline-block text-xs py-[2px] px-1 rounded-[2px] bg-[#4f4395]/5 text-[#4f4395] font-medium">
                          {match?.matchType}
                        </span>
                      ) : null}
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
                      <span className="text-[#0d0019]/50 text-[13px] md:text-[14px] leading-tight">
                        -
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {section.hasMore && (
          <div ref={observerTarget} className="py-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#4f4395] mx-auto"></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen py-6 md:py-8 px-4 md:px-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-4xl font-bold text-[#0d0019] leading-tight">
          Matches
        </h1>
        {isAdmin && (
          <button
            onClick={() => setIsCreating(true)}
            className="bg-[#4f4395] text-white font-semibold cursor-pointer px-4 py-2 rounded-lg hover:bg-[#433a7d] transition-colors w-full md:w-auto"
          >
            Create Match
          </button>
        )}
      </div>

      {isCreating ? (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <h2 className="text-xl md:text-2xl font-semibold text-[#0d0019] mb-4">
            Create Match
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0d0019]/70">
                  Team 1
                </label>
                <input
                  type="text"
                  placeholder="India"
                  value={formData.team1}
                  onChange={(e) =>
                    setFormData({ ...formData, team1: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg shadow-sm outline-none border-none py-2 px-4 bg-gray-50"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0d0019]/70">
                  Team 2
                </label>
                <input
                  type="text"
                  placeholder="England"
                  value={formData.team2}
                  onChange={(e) =>
                    setFormData({ ...formData, team2: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg shadow-sm outline-none border-none py-2 px-4 bg-gray-50"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0d0019]/70">
                  Match Type
                </label>
                <select
                  value={formData.matchType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      matchType: e.target.value as MatchType,
                    })
                  }
                  className="mt-1 block w-full rounded-lg shadow-sm outline-none border-none py-2 px-4 bg-gray-50"
                  required
                  disabled={isLoading}
                >
                  <option value="T20">T20</option>
                  <option value="ODI">ODI</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0d0019]/70">
                  Tournament
                </label>
                <input
                  type="text"
                  placeholder="IPL 2024"
                  value={formData.tournament}
                  onChange={(e) =>
                    setFormData({ ...formData, tournament: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg shadow-sm outline-none border-none py-2 px-4 bg-gray-50"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0d0019]/70">
                  Stadium
                </label>
                <input
                  type="text"
                  placeholder="Wankhede Stadium"
                  value={formData.stadium}
                  onChange={(e) =>
                    setFormData({ ...formData, stadium: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg shadow-sm outline-none border-none py-2 px-4 bg-gray-50"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0d0019]/70">
                  Match Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.matchTime}
                  onChange={(e) =>
                    setFormData({ ...formData, matchTime: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg shadow-sm outline-none border-none py-2 px-4 bg-gray-50"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setFormData({
                    team1: "",
                    team2: "",
                    matchType: "T20",
                    tournament: "",
                    stadium: "",
                    matchTime: "",
                  });
                }}
                className="w-full md:w-auto px-4 py-2 border border-gray-200 font-semibold rounded-lg text-[#0d0019]/70 hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full md:w-auto px-4 py-2 bg-[#4f4395] text-white font-bold rounded-lg hover:bg-[#433a7d] transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="mb-6">
        <div className="flex gap-2 border-b border-gray-200">
          {(["UPCOMING", "LOCKED", "COMPLETED"] as const).map((status) => (
            <button
              key={status}
              onClick={() => handleTabChange(status)}
              className={`cursor-pointer px-4 py-2 text-sm md:text-base font-medium transition-colors ${
                activeTab === status
                  ? "text-[#4f4395] border-b-2 border-[#4f4395]"
                  : "text-[#0d0019]/50 hover:text-[#0d0019]"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <MatchTable />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4f4395] mx-auto"></div>
          <p className="mt-4 text-[#0d0019]/70">Loading...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
