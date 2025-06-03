import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { PublicKey } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';
import { updateStats } from '@/lib/stats';
import { MatchSport, MarketType } from '@/lib/types/enums';

type MatchType = 'T20' | 'ODI';

interface CreateMatchRequest {
  team1: string;
  team2: string;
  matchType: MatchType;
  tournament: string;
  stadium: string;
  matchTime: string;
  walletAddress: string;
  signature: string;
  message: string;
  nonce: number;
  matchSport: MatchSport;
}

export async function POST(req: Request) {
  try {
    const { 
      team1, 
      team2, 
      matchType,
      tournament,
      stadium,
      matchTime,
      walletAddress, 
      signature, 
      message, 
      matchSport,
      nonce 
    } = await req.json() as CreateMatchRequest;

    // Verify admin wallet
    if (walletAddress !== process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 1. Get current nonce
    const nonceRef = adminDb.collection('nonces').doc(walletAddress);
    const nonceDoc = await nonceRef.get();

    if (!nonceDoc.exists) {
      return NextResponse.json(
        { error: 'Invalid nonce' },
        { status: 401 }
      );
    }

    const currentNonce = nonceDoc.data()?.nonce;
    
    // Verify nonce
    if (nonce !== currentNonce) {
      return NextResponse.json(
        { error: 'Invalid nonce' },
        { status: 401 }
      );
    }

    // 2. Verify signature
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKey = new PublicKey(walletAddress);

    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // 3. Increment nonce
    await nonceRef.update({
      nonce: nonce + 1,
      lastUpdated: Timestamp.now(),
      lastActivity: 'CREATE_MATCH'
    });

    // Validate input
    if (!team1 || !team2 || !matchType || !tournament || !stadium || !matchTime || !matchSport) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Create match document
    const matchRef = adminDb.collection('matches').doc();
    const now = Timestamp.now();

    const matchData = {
      id: matchRef.id,
      team1,
      team2,
      matchType,
      matchSport,
      tournament,
      stadium,
      matchTime,
      status: 'UPCOMING' as const,
      totalPool: 0,
      totalPredictions: 0,
      createdAt: now,
      updatedAt: now
    };

    // Update stats
    await updateStats((current) => ({
      matches: {
        ...current.matches,
        total: current.matches.total + 1,
        upcoming: current.matches.upcoming + 1
      }
    }));

    // Create match
    await matchRef.set(matchData);

    // Create market using the market API
    const marketResponse = await fetch(`${req.headers.get('origin')}/api/markets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        matchId: matchRef.id,
        marketType: MarketType.SCORE,
        matchSport: MatchSport.CRICKET,
      })
    });

    if (!marketResponse.ok) {
      // If market creation fails, delete the match
      await matchRef.delete();
      const error = await marketResponse.json();
      throw new Error(error.error || 'Failed to create market');
    }

    const marketData = await marketResponse.json();

    return NextResponse.json({
      ...matchData,
      market: marketData
    });

  } catch (error) {
    console.error('Match creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create match' },
      { status: 500 }
    );
  }
}
