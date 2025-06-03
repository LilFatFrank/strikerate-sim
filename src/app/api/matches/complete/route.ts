import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { PublicKey } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';
import { calculateMatchScore } from '@/lib/scoring';
import { updateStats } from '@/lib/stats';
import { Prediction } from '@/lib/types/prediction';
import { MarketType } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const { 
      matchId, 
      walletAddress, 
      signature, 
      message, 
      nonce,
      payload
    } = await req.json();

    console.log(payload);

    // Validate required fields
    if (!matchId || !walletAddress || !signature || !message || !nonce) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify admin wallet
    if (walletAddress !== process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify nonce
    const nonceRef = adminDb.collection('nonces').doc(walletAddress);
    const nonceDoc = await nonceRef.get();

    if (!nonceDoc.exists || nonceDoc.data()?.nonce !== nonce) {
      return NextResponse.json(
        { error: 'Invalid nonce' },
        { status: 401 }
      );
    }

    // Verify signature
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKey = new PublicKey(walletAddress);

    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Get match
    const matchRef = adminDb.collection('matches').doc(matchId);
    const matchDoc = await matchRef.get();

    if (!matchDoc.exists) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    const match = matchDoc.data();
    if (match?.status !== 'LOCKED') {
      return NextResponse.json(
        { error: 'Match is not in LOCKED status' },
        { status: 400 }
      );
    }

    // Get all markets for this match
    const marketsSnapshot = await adminDb
      .collection('markets')
      .where('matchId', '==', matchId)
      .get();

    if (marketsSnapshot.empty) {
      return NextResponse.json(
        { error: 'No markets found for this match' },
        { status: 404 }
      );
    }

    const finalScore = {
      team1Score: Number(payload.team1Score),
      team1Wickets: Number(payload.team1Wickets),
      team2Score: Number(payload.team2Score),
      team2Wickets: Number(payload.team2Wickets)
    };

    // Process each market
    const userPoints: { [userId: string]: number } = {};
    let totalWinners = 0;
    let totalPrizePool = 0;
    const marketResults: { marketId: string; status: 'success' | 'error'; error?: string }[] = [];

    for (const marketDoc of marketsSnapshot.docs) {
      try {
        const market = marketDoc.data();
        const marketId = marketDoc.id;
        console.log(marketId);

        // Get predictions for this market
        const predictionsSnapshot = await adminDb
          .collection('predictions')
          .where('marketId', '==', marketId)
          .get();

        console.log(predictionsSnapshot);

        if (predictionsSnapshot.empty) {
          marketResults.push({ marketId, status: 'success' });
          continue;
        }

        const predictionsWithScores: { 
          doc: FirebaseFirestore.QueryDocumentSnapshot;
          score: number;
          prediction: Prediction;
        }[] = [];

        // Calculate scores based on market type
        if (market.marketType === MarketType.SCORE) {
          for (const predictionDoc of predictionsSnapshot.docs) {
            const prediction = predictionDoc.data() as Prediction;
            const score = calculateMatchScore(prediction, finalScore);
            predictionsWithScores.push({ doc: predictionDoc, score, prediction });
            
            // Track user points
            const userId = prediction.userId;
            userPoints[userId] = (userPoints[userId] || 0) + score;
          }

          // Find highest score
          const highestScore = Math.max(...predictionsWithScores.map(p => p.score));
          
          // Find winners (predictions with highest score)
          const winners = predictionsWithScores.filter(p => p.score === highestScore);
          
          // Calculate prize pool (90% of market's total pool)
          const prizePool = market.totalPool * 0.9;
          const prizePerWinner = prizePool / winners.length;

          totalWinners += winners.length;
          totalPrizePool += prizePool;

          // Process predictions in smaller batches
          const BATCH_SIZE = 400; // Firestore batch limit is 500
          for (let i = 0; i < predictionsWithScores.length; i += BATCH_SIZE) {
            const batch = adminDb.batch();
            const chunk = predictionsWithScores.slice(i, i + BATCH_SIZE);

            for (const { doc, score, prediction } of chunk) {
              const isWinner = score === highestScore;
              const amountWon = isWinner ? prizePerWinner : 0;

              batch.update(doc.ref, {
                pointsEarned: score,
                isWinner,
                amountWon,
                hasClaimed: false,
                updatedAt: Timestamp.now()
              });

              // If winner, update user's total wins and amount won
              if (isWinner) {
                const userRef = adminDb.collection('users').doc(prediction.userId);
                batch.update(userRef, {
                  totalWins: FieldValue.increment(1),
                  totalAmountWon: FieldValue.increment(amountWon),
                  updatedAt: Timestamp.now()
                });
              }
            }

            await batch.commit();
          }
        }
        // Add other market types here when needed

        marketResults.push({ marketId, status: 'success' });
      } catch (error) {
        console.error(`Error processing market ${marketDoc.id}:`, error);
        marketResults.push({ 
          marketId: marketDoc.id, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    // Update match status and final score
    const finalBatch = adminDb.batch();
    finalBatch.update(matchRef, {
      status: 'COMPLETED',
      finalScore,
      updatedAt: Timestamp.now()
    });

    // Update user total points in smaller batches
    const userIds = Object.keys(userPoints);
    for (let i = 0; i < userIds.length; i += 400) {
      const batch = adminDb.batch();
      const chunk = userIds.slice(i, i + 400);

      for (const userId of chunk) {
        const userRef = adminDb.collection('users').doc(userId);
        batch.update(userRef, {
          totalPoints: FieldValue.increment(userPoints[userId]),
          updatedAt: Timestamp.now()
        });
      }

      await batch.commit();
    }

    // Increment nonce
    finalBatch.update(nonceRef, {
      nonce: nonce + 1,
      lastUpdated: Timestamp.now(),
      lastActivity: 'COMPLETE_MATCH'
    });

    // Update stats
    await updateStats((current) => {
      const newLive = Math.max(0, current.matches.live - 1);
      return {
        matches: {
          ...current.matches,
          live: newLive,
          completed: current.matches.completed + 1,
        },
        winnings: {
          ...current.winnings,
          pendingClaims: current.winnings.pendingClaims + totalPrizePool
        }
      };
    });

    // Commit final updates
    await finalBatch.commit();

    return NextResponse.json({
      message: 'Match completed successfully',
      totalWinners,
      totalPrizePool,
      marketResults
    });

  } catch (error) {
    console.error('Complete match error:', error);
    return NextResponse.json(
      { error: 'Failed to complete match' },
      { status: 500 }
    );
  }
}
