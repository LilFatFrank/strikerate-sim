import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const { walletAddress, action, operation } = await req.json();

    // Get or create nonce
    const nonceRef = adminDb.collection("nonces").doc(walletAddress);
    const nonceDoc = await nonceRef.get();

    let nonce = 0;
    if (nonceDoc.exists) {
      nonce = nonceDoc.data()?.nonce;
    } else {
      await nonceRef.set({
        walletAddress,
        nonce: 0,
        lastUpdated: Timestamp.now(),
        lastActivity: action,
      });
    }

    // Create message based on action and operation
    let message = "";
    switch (action) {
      case "SIGN_IN":
        message = `Strikerate Sign In
Timestamp: ${operation?.timestamp || Date.now()}
Nonce: ${nonce}`;
        break;
      case "CREATE_MATCH":
        message = `Create Match
Teams: ${operation?.team1} vs ${operation?.team2}
Match Type: ${operation?.matchType}
Stadium: ${operation?.stadium}
Match Time: ${operation?.matchTime}
Nonce: ${nonce}`;
        break;
      case "LOCK_MATCH":
        message = `Lock Match
Match ID: ${operation?.matchId}
Nonce: ${nonce}`;
        break;
      case "COMPLETE_MATCH":
        message = `Complete Match
Match ID: ${operation?.matchId}
Score: ${operation?.team1Score}/${operation?.team1Wickets} vs ${operation?.team2Score}/${operation?.team2Wickets}
Nonce: ${nonce}`;
        break;
      case "CREATE_PREDICTION":
        message = `Create Prediction
Team1: ${operation?.team1Score}-${operation?.team1Wickets} vs
Team2: ${operation?.team2Score}-${operation?.team2Wickets}
Nonce: ${nonce}`;
        break;
      case "CLAIM_PRIZE":
        message = `Claim Prize
Match ID: ${operation?.matchId}
Prediction ID: ${operation?.predictionId}
Amount: ${operation?.amount} USDC
Nonce: ${nonce}`;
        break;
      default:
        message = `${action} (nonce: ${nonce})`;
    }

    return NextResponse.json({ nonce, message });
  } catch (error) {
    console.error("Prepare match error:", error);
    return NextResponse.json(
      { error: "Failed to prepare match creation" },
      { status: 500 }
    );
  }
}
