import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { PublicKey } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  try {
    const { walletAddress, signature, message, nonce } = await req.json();

    // 1. Get current nonce
    const nonceRef = adminDb.collection('nonces').doc(walletAddress);
    const nonceDoc = await nonceRef.get();

    if (!nonceDoc.exists) {
      // Initialize nonce for new wallet
      await nonceRef.set({
        walletAddress,
        nonce: 0,
        lastUpdated: Timestamp.now(),
        lastActivity: 'SIGN_IN'
      });
    } else {
      const currentNonce = nonceDoc.data()?.nonce;
      
      // Verify nonce
      if (nonce !== currentNonce) {
        return NextResponse.json(
          { error: 'Invalid nonce' },
          { status: 401 }
        );
      }
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
      lastActivity: 'SIGN_IN'
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Sign in error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
