import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

// Base schema for stats
export const statsSchema = z.object({
  matches: z.object({
    total: z.number().min(0),
    upcoming: z.number().min(0),
    live: z.number().min(0),
    completed: z.number().min(0),
  }),
  predictions: z.object({
    total: z.number().min(0),
    totalAmount: z.number().min(0), // Total USDC in predictions
  }),
  users: z.object({
    total: z.number().min(0),
  }),
  winnings: z.object({
    total: z.number().min(0), // Total USDC claimed
    totalClaims: z.number().min(0), // Number of successful claims
    pendingClaims: z.number().min(0), // Amount yet to be claimed
  }),
  lastUpdated: z.instanceof(Timestamp),
});

// Type for the stats document
export type Stats = z.infer<typeof statsSchema>;

// Initial stats state
export const initialStats: Stats = {
  matches: {
    total: 0,
    upcoming: 0,
    live: 0,
    completed: 0,
  },
  predictions: {
    total: 0,
    totalAmount: 0,
  },
  users: {
    total: 0,
  },
  winnings: {
    total: 0,
    totalClaims: 0,
    pendingClaims: 0,
  },
  lastUpdated: Timestamp.now(),
};

// Helper function to validate stats
export const validateStats = (stats: unknown): Stats => {
  console.log(stats);
  return statsSchema.parse(stats);
};
