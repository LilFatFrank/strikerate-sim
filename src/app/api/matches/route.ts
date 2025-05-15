import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { PublicKey } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

interface CreateMatchRequest {
  team1: string;
  team2: string;
  walletAddress: string;
  signature: string;
  message: string;
  nonce: number;
}

export async function POST(req: Request) {
  try {
    const { team1, team2, walletAddress, signature, message, nonce } = await req.json() as CreateMatchRequest;

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
    if (!team1 || !team2) {
      return NextResponse.json(
        { error: 'Both team names are required' },
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
      status: 'UPCOMING' as const,
      totalPool: 0,
      totalPredictions: 0,
      createdAt: now,
      updatedAt: now
    };

    await matchRef.set(matchData);

    return NextResponse.json(matchData);

  } catch (error) {
    console.error('Match creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create match' },
      { status: 500 }
    );
  }
}
