import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { USDC_MINT } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const {
      matchId,
      walletAddress,
      team1Score,
      team1Wickets,
      team2Score,
      team2Wickets,
      paymentSignature,
    } = await req.json();

    // Verify USDC payment
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com"
    );
    console.log(connection, paymentSignature);
    const tx = await connection.getTransaction(paymentSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    console.log(tx);

    if (!tx) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 400 }
      );
    }

    // Verify transaction is confirmed
    const confirmation = await connection.getSignatureStatus(paymentSignature);
    if (
      !confirmation.value?.confirmationStatus ||
      confirmation.value.confirmationStatus !== "confirmed"
    ) {
      return NextResponse.json(
        { error: "Transaction not confirmed" },
        { status: 400 }
      );
    }

    // Verify transaction amount and recipient
    const adminWallet = new PublicKey(process.env.ADMIN_WALLET_ADDRESS!);
    const userWallet = new PublicKey(walletAddress);
    const usdcMint = new PublicKey(
      USDC_MINT
    );

    // Get expected token accounts
    const expectedRecipientTokenAccount = getAssociatedTokenAddressSync(
      usdcMint,
      adminWallet
    );
    const expectedSenderTokenAccount = getAssociatedTokenAddressSync(
      usdcMint,
      userWallet
    );

    // Find transfer instruction
    const transferInstruction = tx.transaction.message.compiledInstructions.find(
      (ix: any) => {
        // Get program ID from static account keys
        const programId = new PublicKey(tx.transaction.message.staticAccountKeys[ix.programIdIndex]);
        return programId.equals(TOKEN_PROGRAM_ID);
      }
    );

    if (!transferInstruction) {
      return NextResponse.json(
        { error: 'Invalid transaction: no transfer instruction found' },
        { status: 400 }
      );
    }

    // Verify accounts in transfer instruction
    const accounts = transferInstruction.accountKeyIndexes.map((idx: number) => 
      new PublicKey(tx.transaction.message.staticAccountKeys[idx])
    );

    // In transfer instruction, accounts are ordered as:
    // 0: source token account (sender)
    // 1: mint
    // 2: destination token account (recipient)
    // 3: owner (sender)
    if (
      !accounts[0].equals(expectedSenderTokenAccount) ||
      !accounts[1].equals(usdcMint) ||
      !accounts[2].equals(expectedRecipientTokenAccount) ||
      !accounts[3].equals(userWallet)
    ) {
      return NextResponse.json(
        { error: "Invalid transaction: wrong token accounts" },
        { status: 400 }
      );
    }

    // Create prediction
    const predictionRef = adminDb.collection("predictions").doc();
    await predictionRef.set({
      matchId,
      userId: walletAddress,
      team1Score: Number(team1Score),
      team1Wickets: Number(team1Wickets),
      team2Score: Number(team2Score),
      team2Wickets: Number(team2Wickets),
      amount: 2,
      isWinner: false,
      hasClaimed: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Update match
    const matchRef = adminDb.collection("matches").doc(matchId);
    await matchRef.update({
      totalPool: FieldValue.increment(2),
      totalPredictions: FieldValue.increment(1),
      updatedAt: Timestamp.now(),
    });

    // Update user
    const userRef = adminDb.collection("users").doc(walletAddress);
    await userRef.set(
      {
        totalPredictions: FieldValue.increment(1),
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    // Update nonce
    const nonceRef = adminDb.collection("nonces").doc(walletAddress);
    await nonceRef.update({
      nonce: FieldValue.increment(1),
      lastUpdated: Timestamp.now(),
      lastActivity: "CREATE_PREDICTION",
    });

    return NextResponse.json({
      id: predictionRef.id,
      message: "Prediction created successfully",
    });
  } catch (error) {
    console.error("Confirm prediction error:", error);
    return NextResponse.json(
      { error: "Failed to confirm prediction" },
      { status: 500 }
    );
  }
}
