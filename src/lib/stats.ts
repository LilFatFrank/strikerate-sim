import { db } from './firebase';
import { adminDb } from './firebase-admin';
import { doc, getDoc, Timestamp as ClientTimestamp } from 'firebase/firestore';
import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { Stats, validateStats } from './schemas/stats';

const STATS_DOC_ID = 'global';

type StatsUpdate = {
  matches?: {
    total?: number;
    upcoming?: number;
    live?: number;
    completed?: number;
    abandoned?: number;
  };
  predictions?: {
    total?: number;
    totalAmount?: number;
  };
  users?: {
    total?: number;
  };
  winnings?: {
    total?: number;
    totalClaims?: number;
    pendingClaims?: number;
  };
};

// For client-side reads
export const getStats = async () => {
  const statsRef = doc(db, 'stats', STATS_DOC_ID);
  const statsDoc = await getDoc(statsRef);
  if (!statsDoc.exists()) return null;
  
  const data = statsDoc.data();
  // Convert admin Timestamp to client Timestamp if needed
  if (data?.lastUpdated && !(data.lastUpdated instanceof ClientTimestamp)) {
    data.lastUpdated = new ClientTimestamp(
      data.lastUpdated.seconds,
      data.lastUpdated.nanoseconds
    );
  }
  return validateStats(data);
};

// For API routes
export async function updateStats(updateFn: (stats: Stats) => StatsUpdate) {
  const statsRef = adminDb.collection('stats').doc(STATS_DOC_ID);

  try {
    await adminDb.runTransaction(async (transaction) => {
      const statsDoc = await transaction.get(statsRef);
      const currentStats = statsDoc.exists 
        ? validateStats(statsDoc.data())
        : {
            matches: { total: 0, upcoming: 0, live: 0, completed: 0, abandoned: 0 },
            predictions: { total: 0, totalAmount: 0 },
            users: { total: 0, active: 0 },
            winnings: { total: 0, totalClaims: 0, pendingClaims: 0 },
            lastUpdated: AdminTimestamp.now()
          };

      const updates = updateFn(currentStats);
      
      // Deep merge the updates
      const newStats: Stats = {
        matches: {
          ...currentStats.matches,
          ...updates.matches
        },
        predictions: {
          ...currentStats.predictions,
          ...updates.predictions
        },
        users: {
          ...currentStats.users,
          ...updates.users
        },
        winnings: {
          ...currentStats.winnings,
          ...updates.winnings
        },
        lastUpdated: AdminTimestamp.now()
      };

      // Validate the new stats before saving
      validateStats(newStats);
      transaction.set(statsRef, newStats);
    });
  } catch (error) {
    console.error('Error updating stats:', error);
    throw error;
  }
}
