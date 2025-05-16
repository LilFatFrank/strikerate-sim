import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { PublicKey, Keypair } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';
import { 
  Connection, 
  Transaction,
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction
} from '@solana/spl-token';
import { USDC_MINT } from '@/lib/constants';
import { updateStats } from '@/lib/stats';

export async function POST(req: Request) {
  try {
    const { 
      matchId,
      predictionId,
      walletAddress,
      signature,
      message,
      nonce
    } = await req.json();

    // Get prediction
    const predictionRef = adminDb.collection('predictions').doc(predictionId);
    const predictionDoc = await predictionRef.get();

    if (!predictionDoc.exists) {
      return NextResponse.json(
        { error: 'Prediction not found' },
        { status: 404 }
      );
    }

    const prediction = predictionDoc.data();
    if (!prediction) {
      return NextResponse.json(
        { error: 'Prediction data not found' },
        { status: 404 }
      );
    }

    // Verify wallet address matches prediction owner
    if (prediction.userId !== walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address does not match prediction owner' },
        { status: 401 }
      );
    }

    // Verify nonce
    const nonceRef = adminDb.collection('nonces').doc(walletAddress);
    const nonceDoc = await nonceRef.get();

    if (!nonceDoc.exists || nonceDoc.data()?.nonce !== nonce) {
      return NextResponse.json(
        { error: 'Invalid nonce' },
        { status: 401 }
      );
    }

    // Verify signature
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

    if (!prediction.isWinner || prediction.hasClaimed) {
      return NextResponse.json(
        { error: 'Prize already claimed or not a winner' },
        { status: 400 }
      );
    }

    // Get match
    const matchRef = adminDb.collection('matches').doc(matchId);
    const matchDoc = await matchRef.get();

    if (!matchDoc.exists || matchDoc.data()?.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Match not found or not completed' },
        { status: 400 }
      );
    }

    // Initialize Solana connection
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    
    // Get admin wallet keypair
    const adminPrivateKey = process.env.SOLANA_WALLET_PRIVATE_KEY;
    if (!adminPrivateKey) {
      throw new Error('Admin wallet private key not configured');
    }

    // Parse private key from string array
    const privateKeyArray = JSON.parse(adminPrivateKey);
    if (!Array.isArray(privateKeyArray)) {
      throw new Error('Invalid private key format');
    }
    const privateKeyBytes = new Uint8Array(privateKeyArray);
    
    const adminKeypair = Keypair.fromSecretKey(privateKeyBytes);
    const adminWallet = adminKeypair.publicKey;
    const userWallet = new PublicKey(walletAddress);
    const mint = new PublicKey(USDC_MINT);

    // Create transaction
    const transaction = new Transaction();

    // Get token accounts
    const adminTokenAccount = getAssociatedTokenAddressSync(mint, adminWallet);
    const userTokenAccount = getAssociatedTokenAddressSync(mint, userWallet);

    // Add create token account instruction if needed
    transaction.add(
      createAssociatedTokenAccountIdempotentInstruction(
        adminWallet,
        userTokenAccount,
        userWallet,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    // Add transfer instruction
    transaction.add(
      createTransferCheckedInstruction(
        adminTokenAccount,
        mint,
        userTokenAccount,
        adminWallet,
        prediction.amountWon * 1e6, // Convert to USDC decimals
        6 // USDC decimals
      )
    );

    // Get latest blockhash
    const { blockhash } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = adminWallet;

    // Sign and send transaction
    const tx = await connection.sendTransaction(transaction, [adminKeypair]);
    
    // Wait for confirmation
    const confirmation = await connection.confirmTransaction({
      signature: tx,
      blockhash,
      lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight
    }, 'confirmed');

    if (confirmation.value.err) {
      throw new Error('Transaction failed to confirm');
    }

    // Update prediction
    await predictionRef.update({
      hasClaimed: true,
      updatedAt: Timestamp.now()
    });

    // Update stats
    await updateStats((current) => ({
      winnings: {
        total: current.winnings.total + prediction.amountWon,
        totalClaims: current.winnings.totalClaims + 1,
        pendingClaims: current.winnings.pendingClaims - prediction.amountWon
      }
    }));

    // Increment nonce
    await nonceRef.update({
      nonce: nonce + 1,
      lastUpdated: Timestamp.now(),
      lastActivity: 'CLAIM_PRIZE'
    });

    return NextResponse.json({
      message: 'Prize claimed successfully',
      txSignature: tx
    });

  } catch (error) {
    console.error('Claim prize error:', error);
    return NextResponse.json(
      { error: 'Failed to claim prize' },
      { status: 500 }
    );
  }
}
