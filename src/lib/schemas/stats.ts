import { z } from 'zod';
import { Timestamp as ClientTimestamp } from 'firebase/firestore';
import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';

// Base schema for stats
export const statsSchema = z.object({
  matches: z.object({
    total: z.number().min(0).default(0),
    upcoming: z.number().min(0).default(0),
    live: z.number().min(0).default(0),
    completed: z.number().min(0).default(0),
    abandoned: z.number().min(0).default(0),
  }),
  predictions: z.object({
    total: z.number().min(0).default(0),
    totalAmount: z.number().min(0).default(0), // Total USDC in predictions
  }),
  users: z.object({
    total: z.number().min(0).default(0),
  }),
  winnings: z.object({
    total: z.number().min(0).default(0), // Total USDC claimed
    totalClaims: z.number().min(0).default(0), // Number of successful claims
    pendingClaims: z.number().min(0).default(0), // Amount yet to be claimed
  }),
  lastUpdated: z.any().refine((val) => {
    // Check if it's a client Timestamp
    if (val instanceof ClientTimestamp) return true;
    // Check if it's an admin Timestamp
    if (val instanceof AdminTimestamp) return true;
    // Check if it's a plain object with seconds and nanoseconds
    if (val && typeof val === 'object' && 'seconds' in val && 'nanoseconds' in val) return true;
    return false;
  }, "Must be a valid Timestamp"),
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
    abandoned: 0,
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
  lastUpdated: ClientTimestamp.now(),
};

// Helper function to validate stats
export const validateStats = (stats: unknown): Stats => {
  console.log(stats);
  return statsSchema.parse(stats);
};
