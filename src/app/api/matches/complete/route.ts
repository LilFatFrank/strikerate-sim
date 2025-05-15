import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { PublicKey } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';
import { calculateMatchScore } from '@/lib/scoring';

interface Prediction {
  team1Score: number;
  team1Wickets: number;
  team2Score: number;
  team2Wickets: number;
  userId: string;
  amount: number;
}

export async function POST(req: Request) {
  try {
    const { 
      matchId, 
      walletAddress, 
      signature, 
      message, 
      nonce,
      team1Score,
      team1Wickets,
      team2Score,
      team2Wickets
    } = await req.json();

    // Validate required fields
    if (!matchId || !walletAddress || !signature || !message || !nonce) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate scores and wickets
    const scores = [team1Score, team2Score].map(Number);
    const wickets = [team1Wickets, team2Wickets].map(Number);

    if (scores.some(isNaN) || wickets.some(isNaN)) {
      return NextResponse.json(
        { error: 'Invalid scores or wickets' },
        { status: 400 }
      );
    }

    if (wickets.some(w => w < 0 || w > 10)) {
      return NextResponse.json(
        { error: 'Wickets must be between 0 and 10' },
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

    // Get all predictions for this match
    const predictionsSnapshot = await adminDb
      .collection('predictions')
      .where('matchId', '==', matchId)
      .get();

    if (predictionsSnapshot.empty) {
      return NextResponse.json(
        { error: 'No predictions found for this match' },
        { status: 400 }
      );
    }

    const finalScore = {
      team1Score: Number(team1Score),
      team1Wickets: Number(team1Wickets),
      team2Score: Number(team2Score),
      team2Wickets: Number(team2Wickets)
    };

    // Calculate scores for all predictions
    const batch = adminDb.batch();
    const userPoints: { [userId: string]: number } = {};
    const predictionsWithScores: { 
      doc: FirebaseFirestore.QueryDocumentSnapshot;
      score: number;
      prediction: Prediction;
    }[] = [];

    for (const predictionDoc of predictionsSnapshot.docs) {
      const prediction = predictionDoc.data() as Prediction;
      
      // Calculate score
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
    
    // Calculate prize pool (90% of total pool)
    const totalPool = match.totalPool;
    const prizePool = totalPool * 0.9;
    const prizePerWinner = prizePool / winners.length;

    // Update predictions with scores and prizes
    for (const { doc, score, prediction } of predictionsWithScores) {
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

    // Update match status and final score
    batch.update(matchRef, {
      status: 'COMPLETED',
      finalScore,
      updatedAt: Timestamp.now()
    });

    // Update user total points
    for (const [userId, points] of Object.entries(userPoints)) {
      const userRef = adminDb.collection('users').doc(userId);
      batch.update(userRef, {
        totalPoints: FieldValue.increment(points),
        updatedAt: Timestamp.now()
      });
    }

    // Increment nonce
    batch.update(nonceRef, {
      nonce: nonce + 1,
      lastUpdated: Timestamp.now(),
      lastActivity: 'COMPLETE_MATCH'
    });

    // Commit all updates
    await batch.commit();

    return NextResponse.json({
      message: 'Match completed successfully',
      winners: winners.length,
      prizePerWinner,
      highestScore
    });

  } catch (error) {
    console.error('Complete match error:', error);
    return NextResponse.json(
      { error: 'Failed to complete match' },
      { status: 500 }
    );
  }
}
