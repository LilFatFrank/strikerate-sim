'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Timestamp } from 'firebase/firestore';
import { 
  Connection, 
  PublicKey, 
  Transaction,
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction
} from '@solana/spl-token';
import { useWallet } from '@solana/wallet-adapter-react';
import { USDC_MINT } from '@/lib/constants';
import { LockMatchButton } from '@/components/admin/LockMatchButton';
import { CompleteMatchForm } from '@/components/admin/CompleteMatchForm';

interface Match {
  id: string;
  team1: string;
  team2: string;
  status: 'UPCOMING' | 'LOCKED' | 'COMPLETED';
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
  const matchId = params?.id as string;
  const { sendTransaction } = useWallet();
  const { user, getSignature } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMakingPrediction, setIsMakingPrediction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [predictionForm, setPredictionForm] = useState({
    team1Score: '',
    team1Wickets: '',
    team2Score: '',
    team2Wickets: ''
  });

  useEffect(() => {
    // Subscribe to match updates
    const matchUnsubscribe = onSnapshot(doc(db, 'matches', matchId), (doc) => {
      if (doc.exists()) {
        setMatch({ id: doc.id, ...doc.data() } as Match);
      }
      setIsLoading(false);
    });

    // Subscribe to predictions
    const predictionsQuery = query(
      collection(db, 'predictions'),
      where('matchId', '==', matchId),
      orderBy('createdAt', 'desc')
    );

    const predictionsUnsubscribe = onSnapshot(predictionsQuery, (snapshot) => {
      const predictionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
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

    setIsMakingPrediction(true);
    setError(null);
    try {
      // Get signature
      const { signature, message, nonce } = await getSignature('CREATE_PREDICTION', {
        matchId: match.id,
        team1Score: predictionForm.team1Score,
        team1Wickets: predictionForm.team1Wickets,
        team2Score: predictionForm.team2Score,
        team2Wickets: predictionForm.team2Wickets
      });

      // Get payment details
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId: match.id,
          walletAddress: user.walletAddress,
          signature,
          message,
          nonce
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create prediction');
      }

      const { requiresPayment, amount, recipient } = await response.json();

      if (requiresPayment) {
        const connection = new Connection(process.env.NEXT_PUBLIC_RPC || 'https://api.mainnet-beta.solana.com');
        const publicKey = new PublicKey(user.walletAddress);
        const toPubkey = new PublicKey(recipient);
        const mint = new PublicKey(USDC_MINT); // USDC mint

        // Create transaction
        const transaction = new Transaction();

        // Get token accounts
        const senderTokenAccount = getAssociatedTokenAddressSync(mint, publicKey);
        const recipientTokenAccount = getAssociatedTokenAddressSync(mint, toPubkey);

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
        const { blockhash } = await connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        // Get wallet signer
        const wallet = window.solana;
        if (!wallet) throw new Error('Wallet not found');

        // Send transaction
        const tx = await sendTransaction(transaction, connection);

        // Wait for confirmation with timeout
        try {
          const confirmation = await connection.confirmTransaction({
            signature: tx,
            blockhash,
            lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight
          }, 'confirmed');

          if (confirmation.value.err) {
            throw new Error('Transaction failed to confirm');
          }

          // Confirm prediction after payment
          const confirmResponse = await fetch('/api/predictions/confirm', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              matchId: match.id,
              walletAddress: user.walletAddress,
              team1Score: predictionForm.team1Score,
              team1Wickets: predictionForm.team1Wickets,
              team2Score: predictionForm.team2Score,
              team2Wickets: predictionForm.team2Wickets,
              paymentSignature: tx
            })
          });

          if (!confirmResponse.ok) {
            const error = await confirmResponse.json();
            throw new Error(error.error || 'Failed to confirm prediction');
          }

          // Reset form
          setPredictionForm({
            team1Score: '',
            team1Wickets: '',
            team2Score: '',
            team2Wickets: ''
          });
        } catch (error) {
          console.error('Transaction confirmation error:', error);
          throw new Error('Transaction failed to confirm. Please try again.');
        }
      }

    } catch (error) {
      console.error('Error making prediction:', error);
      setError(error instanceof Error ? error.message : 'Failed to create prediction');
    } finally {
      setIsMakingPrediction(false);
    }
  };

  const handleClaim = async (matchId: string, predictionId: string, amountWon: number) => {
    if (!user?.walletAddress) return;
    
    setIsClaiming(true);
    try {
      // Get signature
      const { signature, message, nonce } = await getSignature('CLAIM_PRIZE', {
        matchId,
        predictionId,
        amount: amountWon
      });

      // Send claim request
      const response = await fetch('/api/predictions/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId,
          predictionId,
          walletAddress: user.walletAddress,
          signature,
          message,
          nonce
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to claim prize');
      }

      const { txSignature } = await response.json();
      console.log('Prize claimed successfully! Transaction:', txSignature);

    } catch (error) {
      console.error('Error claiming prize:', error);
      setError(error instanceof Error ? error.message : 'Failed to claim prize');
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading match details...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Match not found</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.walletAddress === process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS;

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Match Header */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {match.team1} vs {match.team2}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Pool: {match.totalPool} USDC
                </p>
                <p className="text-sm text-gray-500">
                  Predictions: {match.totalPredictions}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  match.status === 'LOCKED' ? 'bg-red-100 text-red-800' : 
                  match.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {match.status}
                </span>
                {isAdmin && match.status === 'UPCOMING' && (
                  <LockMatchButton 
                    matchId={match.id}
                  />
                )}
                {isAdmin && match.status === 'LOCKED' && (
                  <button
                    onClick={() => setSelectedMatch(match)}
                    className="text-green-600 hover:text-green-900"
                  >
                    Complete Match
                  </button>
                )}
              </div>
            </div>

            {match.status === 'LOCKED' && match.finalScore && (
              <div className="mt-4 space-y-2">
                <p className="text-lg text-gray-900">
                  {match.team1}: {match.finalScore.team1Score}/{match.finalScore.team1Wickets}
                </p>
                <p className="text-lg text-gray-900">
                  {match.team2}: {match.finalScore.team2Score}/{match.finalScore.team2Wickets}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Prediction Form */}
        {match.status === 'UPCOMING' && user && (
          <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Make a Prediction</h2>
              <form onSubmit={handlePredictionSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{match.team1}</label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Score"
                        value={predictionForm.team1Score}
                        onChange={(e) => setPredictionForm(prev => ({ ...prev, team1Score: e.target.value }))}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        min="0"
                        max="10"
                        placeholder="Wickets"
                        value={predictionForm.team1Wickets}
                        onChange={(e) => setPredictionForm(prev => ({ ...prev, team1Wickets: e.target.value }))}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{match.team2}</label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Score"
                        value={predictionForm.team2Score}
                        onChange={(e) => setPredictionForm(prev => ({ ...prev, team2Score: e.target.value }))}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        min="0"
                        max="10"
                        placeholder="Wickets"
                        value={predictionForm.team2Wickets}
                        onChange={(e) => setPredictionForm(prev => ({ ...prev, team2Wickets: e.target.value }))}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isMakingPrediction}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                >
                  {isMakingPrediction ? 'Making Prediction...' : 'Predict (2 USDC)'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Predictions List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Predictions</h2>
            <div className="space-y-4">
              {predictions.map((prediction) => {
                const isUserPrediction = prediction.userId === user?.walletAddress;
                const shouldBlur = match.status === 'UPCOMING' && !isUserPrediction;

                return (
                  <div 
                    key={prediction.id} 
                    className={`p-4 rounded-lg border ${
                      isUserPrediction ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                    } ${prediction.isWinner ? 'border-green-200 bg-green-50' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className={`${shouldBlur ? 'blur-sm' : ''}`}>
                        <p className="text-sm text-gray-500">
                          {match.team1}: {prediction.team1Score}/{prediction.team1Wickets}
                        </p>
                        <p className="text-sm text-gray-500">
                          {match.team2}: {prediction.team2Score}/{prediction.team2Wickets}
                        </p>
                        {match.status === 'COMPLETED' && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700">
                              Points: {prediction.pointsEarned?.toFixed(3) || '0.000'}
                            </p>
                            {prediction.isWinner && (
                              <p className="text-sm font-medium text-green-600">
                                Winner! Prize: {prediction.amountWon} USDC
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {isUserPrediction && (
                          <span className="text-xs font-medium text-blue-600">Your Prediction</span>
                        )}
                        {prediction.isWinner && (
                          <span className="text-xs font-medium text-green-600">Winner</span>
                        )}
                        {prediction.isWinner && isUserPrediction && !prediction.hasClaimed && (
                          <button
                            onClick={() => handleClaim(match.id, prediction.id, prediction.amountWon!)}
                            disabled={isClaiming}
                            className="mt-2 px-3 py-1 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-green-300"
                          >
                            {isClaiming ? 'Claiming...' : 'Claim Prize'}
                          </button>
                        )}
                        {prediction.isWinner && isUserPrediction && prediction.hasClaimed && (
                          <span className="mt-2 text-xs font-medium text-gray-500">Prize Claimed</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {predictions.length === 0 && (
                <p className="text-gray-500 text-center py-4">No predictions yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Complete Match Modal */}
        {selectedMatch && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Complete Match: {selectedMatch.team1} vs {selectedMatch.team2}
                </h3>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
    </div>
  );
} 