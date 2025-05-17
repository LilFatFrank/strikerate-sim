"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Timestamp } from "firebase/firestore";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
} from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { USDC_MINT } from "@/lib/constants";
import { CompleteMatchForm } from "@/components/admin/CompleteMatchForm";
import { toast } from "sonner";
import { LockMatchButton } from "@/components/admin/LockMatchButton";

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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params?.id as string;
  const { sendTransaction } = useWallet();
  const { user, getSignature } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMakingPrediction, setIsMakingPrediction] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [predictionForm, setPredictionForm] = useState({
    team1Score: "",
    team1Wickets: "",
    team2Score: "",
    team2Wickets: "",
  });

  useEffect(() => {
    // Subscribe to match updates
    const matchUnsubscribe = onSnapshot(doc(db, "matches", matchId), (doc) => {
      if (doc.exists()) {
        setMatch({ id: doc.id, ...doc.data() } as Match);
      }
      setIsLoading(false);
    });

    // Subscribe to predictions
    const predictionsQuery = query(
      collection(db, "predictions"),
      where("matchId", "==", matchId),
      orderBy("createdAt", "desc")
    );

    const predictionsUnsubscribe = onSnapshot(predictionsQuery, (snapshot) => {
      const predictionsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Prediction[];
      setPredictions(predictionsData);
    });

    return () => {
      matchUnsubscribe();
      predictionsUnsubscribe();
    };
  }, [matchId]);

  const handlePredictionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.walletAddress || !match) return;
    if (
      !predictionForm.team1Score ||
      !predictionForm.team1Wickets ||
      !predictionForm.team2Score ||
      !predictionForm.team2Wickets
    )
      return;

    setIsMakingPrediction(true);
    try {
      // Get signature
      const { signature, message, nonce } = await getSignature(
        "CREATE_PREDICTION",
        {
          matchId: match.id,
          team1Score: predictionForm.team1Score,
          team1Wickets: predictionForm.team1Wickets,
          team2Score: predictionForm.team2Score,
          team2Wickets: predictionForm.team2Wickets,
        }
      );

      // Get payment details
      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchId: match.id,
          walletAddress: user.walletAddress,
          signature,
          message,
          nonce,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create prediction");
      }

      const { requiresPayment, amount, recipient } = await response.json();

      if (requiresPayment) {
        const connection = new Connection(
          process.env.NEXT_PUBLIC_RPC || "https://api.mainnet-beta.solana.com"
        );
        const publicKey = new PublicKey(user.walletAddress);
        const toPubkey = new PublicKey(recipient);
        const mint = new PublicKey(USDC_MINT); // USDC mint

        // Create transaction
        const transaction = new Transaction();

        // Get token accounts
        const senderTokenAccount = getAssociatedTokenAddressSync(
          mint,
          publicKey
        );
        const recipientTokenAccount = getAssociatedTokenAddressSync(
          mint,
          toPubkey
        );

        // Add create token account instruction if needed
        transaction.add(
          createAssociatedTokenAccountIdempotentInstruction(
            publicKey,
            recipientTokenAccount,
            toPubkey,
            mint,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );

        // Add transfer instruction
        transaction.add(
          createTransferCheckedInstruction(
            senderTokenAccount,
            mint,
            recipientTokenAccount,
            publicKey,
            amount * 1e6, // Convert to USDC decimals
            6 // USDC decimals
          )
        );

        // Get latest blockhash
        const { blockhash } = await connection.getLatestBlockhash("finalized");
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        // Get wallet signer
        const wallet = window.solana;
        if (!wallet) throw new Error("Wallet not found");

        // Send transaction
        const tx = await sendTransaction(transaction, connection);

        // Wait for confirmation with timeout
        try {
          const confirmation = await connection.confirmTransaction(
            {
              signature: tx,
              blockhash,
              lastValidBlockHeight: (
                await connection.getLatestBlockhash()
              ).lastValidBlockHeight,
            },
            "confirmed"
          );

          if (confirmation.value.err) {
            throw new Error("Transaction failed to confirm");
          }

          // Confirm prediction after payment
          const confirmResponse = await fetch("/api/predictions/confirm", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              matchId: match.id,
              walletAddress: user.walletAddress,
              team1Score: predictionForm.team1Score,
              team1Wickets: predictionForm.team1Wickets,
              team2Score: predictionForm.team2Score,
              team2Wickets: predictionForm.team2Wickets,
              paymentSignature: tx,
            }),
          });

          if (!confirmResponse.ok) {
            const error = await confirmResponse.json();
            throw new Error(error.error || "Failed to confirm prediction");
          }

          // Reset form
          setPredictionForm({
            team1Score: "",
            team1Wickets: "",
            team2Score: "",
            team2Wickets: "",
          });
        } catch (error) {
          console.error("Transaction confirmation error:", error);
          throw new Error("Transaction failed to confirm. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error making prediction:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create prediction",
        {
          style: {
            background: "#ff503b",
            color: "white",
            border: "none",
          },
        }
      );
    } finally {
      setIsMakingPrediction(false);
    }
  };

  const handleClaim = async (
    matchId: string,
    predictionId: string,
    amountWon: number
  ) => {
    if (!user?.walletAddress) return;

    setIsClaiming(true);
    try {
      // Get signature
      const { signature, message, nonce } = await getSignature("CLAIM_PRIZE", {
        matchId,
        predictionId,
        amount: amountWon,
      });

      // Send claim request
      const response = await fetch("/api/predictions/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchId,
          predictionId,
          walletAddress: user.walletAddress,
          signature,
          message,
          nonce,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to claim prize");
      }

      const { txSignature } = await response.json();
      console.log("Prize claimed successfully! Transaction:", txSignature);
    } catch (error) {
      console.error("Error claiming prize:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create prize",
        {
          style: {
            background: "#ff503b",
            color: "white",
            border: "none",
          },
        }
      );
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4f4395] mx-auto"></div>
          <p className="mt-4 text-[#0d0019]/70">Loading match details...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-md w-full mx-4">
          <p className="text-[#0d0019]/70">Match not found</p>
        </div>
      </div>
    );
  }

  const isAdmin =
    user?.walletAddress === process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="flex w-full items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 cursor-pointer text-[#0d0019]/70 hover:text-[#0d0019] transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Back</span>
          </button>
          {isAdmin && match.status === "UPCOMING" && (
            <LockMatchButton matchId={match.id} />
          )}
          {isAdmin && match.status === "LOCKED" && (
            <button
              onClick={() => setSelectedMatch(match)}
              className="cursor-pointer font-medium bg-[#3fe0aa]/80 text-white px-2 py-[2px] rounded hover:bg-[#3fe0aa] transition-colors disabled:bg-[#3fe0aa]/50 disabled:cursor-not-allowed"
            >
              Complete
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Match Header */}
          <div className="bg-gradient-to-b from-[#9c53c7] to-[#6857c9] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 flex flex-col justify-between items-start w-full h-full">
              <div className="flex justify-between items-center mb-10 w-full">
                <div className="flex flex-col items-start justify-center gap-1 text-[#fff]">
                  {match.status === "COMPLETED" && match.finalScore ? (
                    <h1 className="text-3xl font-bold">
                      {match.finalScore.team1Score}/
                      {match.finalScore.team1Wickets}
                    </h1>
                  ) : null}
                  <h1
                    className={
                      match.status === "COMPLETED" && match.finalScore
                        ? "text-xl font-medium"
                        : "text-4xl font-bold"
                    }
                  >
                    {match.team1}
                  </h1>
                </div>
                <h1 className="text-xl font-bold text-[#fff]">vs</h1>
                <div className="flex flex-col items-end justify-center gap-1 text-[#fff]">
                  {match.status === "COMPLETED" && match.finalScore ? (
                    <h1 className="text-3xl font-bold">
                      {match.finalScore.team2Score}/
                      {match.finalScore.team2Wickets}
                    </h1>
                  ) : null}
                  <h1
                    className={
                      match.status === "COMPLETED" && match.finalScore
                        ? "text-xl font-medium"
                        : "text-4xl font-bold"
                    }
                  >
                    {match.team2}
                  </h1>
                </div>
              </div>
              <div className="mt-2 flex flex-col items-start gap-1">
                <p className="text-[#fff] flex items-center gap-1">
                  <span className="mr-1 font-semibold">Pool:</span>
                  {match.totalPool}
                  <img
                    src={"/assets/usdc-coin.svg"}
                    alt="usdc"
                    className="w-4 h-4"
                  />
                </p>
                <p className="text-[#fff]">
                  <span className="mr-1 font-semibold">Predictions:</span>
                  {match.totalPredictions}
                </p>
              </div>
            </div>
          </div>

          {/* Prediction Form */}
          {match.status === "UPCOMING" && user && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4">
                {predictions.some((p) => p.userId === user.walletAddress) ? (
                  <div className="text-center py-4">
                    <p className="text-[#0d0019]/70">
                      You have already made a prediction for this match
                    </p>
                  </div>
                ) : (
                  <>
                    <form
                      onSubmit={handlePredictionSubmit}
                      className="space-y-10 flex flex-col w-full h-full justify-between items-start"
                    >
                      <div className="w-full h-full space-y-3">
                        <h2 className="text-xl font-semibold text-[#0d0019]">
                          Make a Prediction
                        </h2>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-[#0d0019]/70 mb-2">
                              {match.team1}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={3}
                                placeholder="Score"
                                value={predictionForm.team1Score}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "" || /^\d{1,3}$/.test(value)) {
                                    setPredictionForm((prev) => ({
                                      ...prev,
                                      team1Score: value,
                                    }));
                                  }
                                }}
                                className="block w-full remove-arrow rounded-lg shadow-sm outline-none border-none py-1 px-4"
                              />
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={2}
                                placeholder="Wickets"
                                value={predictionForm.team1Wickets}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "") {
                                    setPredictionForm((prev) => ({
                                      ...prev,
                                      team1Wickets: value,
                                    }));
                                  } else if (/^\d{1,2}$/.test(value)) {
                                    const numValue = parseInt(value);
                                    setPredictionForm((prev) => ({
                                      ...prev,
                                      team1Wickets:
                                        numValue > 10 ? "10" : value,
                                    }));
                                  }
                                }}
                                className="block w-full remove-arrow rounded-lg shadow-sm outline-none border-none py-1 px-4"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#0d0019]/70 mb-2">
                              {match.team2}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={3}
                                placeholder="Score"
                                value={predictionForm.team2Score}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "" || /^\d{1,3}$/.test(value)) {
                                    setPredictionForm((prev) => ({
                                      ...prev,
                                      team2Score: value,
                                    }));
                                  }
                                }}
                                className="block w-full remove-arrow rounded-lg shadow-sm outline-none border-none py-1 px-4"
                              />
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={2}
                                placeholder="Wickets"
                                value={predictionForm.team2Wickets}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "") {
                                    setPredictionForm((prev) => ({
                                      ...prev,
                                      team2Wickets: value,
                                    }));
                                  } else if (/^\d{1,2}$/.test(value)) {
                                    const numValue = parseInt(value);
                                    setPredictionForm((prev) => ({
                                      ...prev,
                                      team2Wickets:
                                        numValue > 10 ? "10" : value,
                                    }));
                                  }
                                }}
                                className="block w-full remove-arrow rounded-lg shadow-sm outline-none border-none py-1 px-4"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isMakingPrediction}
                        className="cursor-pointer relative w-full bg-[#4f4395] text-white px-4 py-2 rounded-lg hover:bg-[#433a7d] transition-colors disabled:opacity-50"
                      >
                        {isMakingPrediction ? (
                          "Making Prediction..."
                        ) : (
                          <>
                            <span className="font-bold">Predict</span>
                            <span className="absolute right-4 flex items-center gap-1 top-1/2 -translate-y-1/2">
                              2{" "}
                              <img
                                src={"/assets/usdc-coin.svg"}
                                alt="usdc"
                                className="w-5 h-5"
                              />
                            </span>
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Predictions List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full table-fixed">
            <thead>
              <tr className="bg-[#4f4395]">
                <th
                  className="px-4 py-1 text-left text-sm font-medium text-[#fff]"
                  style={{ width: "25%" }}
                >
                  Prediction
                </th>
                <th
                  className="px-4 py-1 text-left text-sm font-medium text-[#fff]"
                  style={{ width: "25%" }}
                >
                  User
                </th>
                <th className="w-[15%] px-4 py-1 text-left text-sm font-medium text-[#fff]">
                  Status
                </th>
                <th className="w-[10%] px-4 py-1 text-left text-sm font-medium text-[#fff]">
                  Points
                </th>
                <th className="w-[10%] px-4 py-1 text-left text-sm font-medium text-[#fff]">
                  Prize
                </th>
                <th className="w-[15%] px-4 py-1 text-left text-sm font-medium text-[#fff]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#4f4395]/5">
              {predictions.map((prediction) => {
                const isUserPrediction =
                  prediction.userId === user?.walletAddress;
                const shouldBlur =
                  match.status === "UPCOMING" && !isUserPrediction;

                return (
                  <tr
                    key={prediction.id}
                    className={`group hover:bg-[#4f4395]/5 transition-colors cursor-pointer ${
                      isUserPrediction ? "bg-[#4f4395]/5" : ""
                    } ${prediction.isWinner ? "bg-[#3fe0aa]/5" : ""}`}
                    onClick={() => router.push(`/${prediction.userId}`)}
                  >
                    <td className="px-4 py-1">
                      {match.status === "UPCOMING" && !isUserPrediction ? (
                        <div className="text-[12px] text-[#0d0019]/50">
                          Hidden until match starts
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="text-[12px] text-[#0d0019]">
                            {match.team1}: {prediction.team1Score}/
                            {prediction.team1Wickets}
                          </span>
                          <span className="text-[12px] text-[#0d0019]">
                            {match.team2}: {prediction.team2Score}/
                            {prediction.team2Wickets}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-1">
                      {match.status === "UPCOMING" && !isUserPrediction ? (
                        <div className="text-[12px] text-[#0d0019]/50">
                          Hidden
                        </div>
                      ) : (
                        <span className="text-[12px] text-[#0d0019] font-mono group-hover:text-[#4f4395] transition-colors">
                          {prediction.userId.slice(0, 4)}...
                          {prediction.userId.slice(-4)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-1">
                      <div className="flex flex-col gap-1">
                        {isUserPrediction && (
                          <span className="text-xs font-medium text-[#4f4395]">
                            Your Prediction
                          </span>
                        )}
                        {prediction.isWinner && (
                          <span className="text-xs font-medium text-[#3fe0aa]">
                            Winner
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-1">
                      {match.status === "COMPLETED" && (
                        <span className="text-[#0d0019] text-[14px] font-medium">
                          {prediction.pointsEarned?.toFixed(3) || "0.000"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-1">
                      {prediction.isWinner && (
                        <span className="text-[#0d0019] text-[14px] font-medium flex items-center gap-1">
                          {prediction.amountWon}{" "}
                          <img
                            src={"/assets/usdc-coin.svg"}
                            alt="usdc"
                            className="w-4 h-4"
                          />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-1">
                      {prediction.isWinner &&
                        isUserPrediction &&
                        !prediction.hasClaimed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClaim(
                                match.id,
                                prediction.id,
                                prediction.amountWon!
                              );
                            }}
                            disabled={isClaiming}
                            className="px-3 py-1 text-sm font-medium text-white bg-[#3fe0aa] rounded-lg hover:bg-[#3fe0aa]/80 transition-colors disabled:opacity-50"
                          >
                            {isClaiming ? "Claiming..." : "Claim Prize"}
                          </button>
                        )}
                      {prediction.isWinner &&
                        isUserPrediction &&
                        prediction.hasClaimed && (
                          <span className="text-xs font-medium text-[#0d0019]/50">
                            Prize Claimed
                          </span>
                        )}
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

      {/* Complete Match Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-[#0d0019]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
            <div className="flex justify-end items-center mb-2">
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-[#0d0019]/50 hover:text-[#0d0019] transition-colors"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <CompleteMatchForm
              matchId={selectedMatch.id}
              team1={selectedMatch.team1}
              team2={selectedMatch.team2}
              onSuccess={() => {
                setSelectedMatch(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
