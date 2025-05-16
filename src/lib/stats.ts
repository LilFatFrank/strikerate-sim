import { db } from './firebase';
import { doc, runTransaction } from 'firebase/firestore';
import { Stats, validateStats } from './schemas/stats';
import { Timestamp } from 'firebase/firestore';

const STATS_DOC_ID = 'global';

type StatsUpdate = {
  matches?: {
    total?: number;
    upcoming?: number;
    live?: number;
    completed?: number;
  };
  predictions?: {
    total?: number;
    totalAmount?: number;
  };
  users?: {
    total?: number;
    active?: number;
  };
  winnings?: {
    total?: number;
    totalClaims?: number;
    pendingClaims?: number;
  };
};

export async function updateStats(updateFn: (stats: Stats) => StatsUpdate) {
  const statsRef = doc(db, 'stats', STATS_DOC_ID);

  try {
    await runTransaction(db, async (transaction) => {
      const statsDoc = await transaction.get(statsRef);
      const currentStats = statsDoc.exists() 
        ? validateStats(statsDoc.data())
        : {
            matches: { total: 0, upcoming: 0, live: 0, completed: 0 },
            predictions: { total: 0, totalAmount: 0 },
            users: { total: 0, active: 0 },
            winnings: { total: 0, totalClaims: 0, pendingClaims: 0 },
            lastUpdated: Timestamp.now()
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
        lastUpdated: Timestamp.now()
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
