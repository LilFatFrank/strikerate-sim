import { Timestamp } from 'firebase/firestore';
import { MatchType, MatchStatus, MatchSport } from './enums';

export interface Match {
  id: string;
  team1: string;
  team2: string;
  status: MatchStatus;
  matchType: MatchType;
  matchSport: MatchSport;
  matchTime: string;
  stadium?: string;
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
