import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  try {
    const { 
      matchId, 
      walletAddress,
      signature,
      message,
      nonce
    } = await req.json();

    // Get match
    const matchRef = adminDb.collection('matches').doc(matchId);
    const matchDoc = await matchRef.get();

    if (!matchDoc.exists) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    const match = matchDoc.data();
    if (match?.status !== 'UPCOMING') {
      return NextResponse.json(
        { error: 'Match is not accepting predictions' },
        { status: 400 }
      );
    }

    // Verify signature
    const nonceRef = adminDb.collection('nonces').doc(walletAddress);
    const nonceDoc = await nonceRef.get();

    if (!nonceDoc.exists || nonceDoc.data()?.nonce !== nonce) {
      return NextResponse.json(
        { error: 'Invalid nonce' },
        { status: 400 }
      );
    }

    // Verify the signature
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
        { status: 400 }
      );
    }
    
    // 3. Increment nonce
    await nonceRef.update({
        nonce: nonce + 1,
        lastUpdated: Timestamp.now(),
        lastActivity: 'SETUP_PREDICTION'
      });

    // Return payment details for client to handle
    return NextResponse.json({
      requiresPayment: true,
      amount: 2,
      recipient: process.env.ADMIN_WALLET_ADDRESS,
    });

  } catch (error) {
    console.error('Create prediction error:', error);
    return NextResponse.json(
      { error: 'Failed to create prediction' },
      { status: 500 }
    );
  }
} 