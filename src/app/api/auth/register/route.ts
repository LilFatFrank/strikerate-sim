import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { updateStats } from '@/lib/stats';

export async function POST(req: Request) {
  try {
    const { walletAddress } = await req.json();

    const userRef = adminDb.collection('users').doc(walletAddress);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // Create new user document only if doesn't exist
      await userRef.set({
        walletAddress,
        totalPredictions: 0,
        totalWins: 0,
        totalAmountWon: 0,
        totalPoints: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Update global stats
      await updateStats((current) => ({
        users: {
          ...current.users,
          total: current.users.total + 1
        }
      }));
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
} 
