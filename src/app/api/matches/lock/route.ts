import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { PublicKey } from "@solana/web3.js";
import * as nacl from "tweetnacl";
import bs58 from "bs58";
import { updateStats } from "@/lib/stats";

export async function POST(req: Request) {
  try {
    const { matchId, walletAddress, signature, message, nonce } =
      await req.json();

    // Verify admin wallet
    if (walletAddress !== process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify nonce
    const nonceRef = adminDb.collection("nonces").doc(walletAddress);
    const nonceDoc = await nonceRef.get();

    if (!nonceDoc.exists || nonceDoc.data()?.nonce !== nonce) {
      return NextResponse.json({ error: "Invalid nonce" }, { status: 401 });
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
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Get match
    const matchRef = adminDb.collection("matches").doc(matchId);
    const matchDoc = await matchRef.get();

    if (!matchDoc.exists) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const match = matchDoc.data();
    if (match?.status !== "UPCOMING") {
      return NextResponse.json(
        { error: "Match is not in UPCOMING status" },
        { status: 400 }
      );
    }

    // Update match status to LOCKED
    await matchRef.update({
      status: "LOCKED",
      updatedAt: Timestamp.now(),
    });

    // Increment nonce
    await nonceRef.update({
      nonce: nonce + 1,
      lastUpdated: Timestamp.now(),
      lastActivity: "LOCK_MATCH",
    });

    await updateStats((current) => ({
      matches: {
        upcoming: current.matches.upcoming - 1,
        live: current.matches.live + 1,
      },
    }));

    return NextResponse.json({
      message: "Match locked successfully",
    });
  } catch (error) {
    console.error("Lock match error:", error);
    return NextResponse.json(
      { error: "Failed to lock match" },
      { status: 500 }
    );
  }
}
