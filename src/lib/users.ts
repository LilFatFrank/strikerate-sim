import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

interface User {
  walletAddress: string;
  totalPredictions: number;
  totalWins: number;
  totalAmountWon: number;
  totalPoints: number;
  strikerate: number;
  createdAt: Date;
}

export const createUser = async (walletAddress: string) => {
  const userRef = adminDb.collection('users').doc(walletAddress);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    await userRef.set({
      walletAddress,
      totalPredictions: 0,
      totalWins: 0,
      totalAmountWon: 0,
      totalPoints: 0,
      strikerate: 0,
      createdAt: Timestamp.now()
    });
  }
};
