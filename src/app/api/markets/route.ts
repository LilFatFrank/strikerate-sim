import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { MarketType, MatchSport } from '@/lib/types/enums';

interface CreateMarketRequest {
  matchId: string;
  marketType: MarketType;
  matchSport: MatchSport;
}

export async function POST(req: Request) {
  try {
    const { matchId, marketType, matchSport } = await req.json() as CreateMarketRequest;

    // Validate input
    if (!matchId || !marketType || !matchSport) {
      return NextResponse.json(
        { error: 'Match ID, Match Sport and market type are required' },
        { status: 400 }
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

    // Create market
    const marketRef = adminDb.collection('markets').doc();
    const now = Timestamp.now();

    const marketData = {
      id: marketRef.id,
      matchId,
      marketType,
      matchSport,
      totalPool: 0,
      totalPredictions: 0,
      createdAt: now,
      updatedAt: now
    };

    await marketRef.set(marketData);

    return NextResponse.json(marketData);

  } catch (error) {
    console.error('Market creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create market' },
      { status: 500 }
    );
  }
}
