import { Timestamp } from 'firebase/firestore';
import { MarketType, MatchSport } from './enums';

export interface Market {
  id: string;
  matchId: string;
  marketType: MarketType;
  matchSport: MatchSport;
  totalPool: number;
  totalPredictions: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
