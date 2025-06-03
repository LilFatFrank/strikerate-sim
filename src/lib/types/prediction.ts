import { Timestamp } from 'firebase/firestore';

interface ScorePayload {
  team1Score: number;
  team1Wickets: number;
  team2Score: number;
  team2Wickets: number;
}

export interface Prediction {
  id: string;
  matchId: string;
  userId: string;
  marketId?: string;
  marketType?: string;
  payload?: ScorePayload;
  amount: number;
  isWinner: boolean;
  amountWon?: number;
  hasClaimed: boolean;
  pointsEarned?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
} 