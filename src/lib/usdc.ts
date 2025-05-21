import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// USDC mint address on mainnet
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

export async function getUSDCBalance(publicKey: PublicKey): Promise<number> {
  try {
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC || 'https://api.mainnet-beta.solana.com');
    
    // Get all token accounts for the user
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      { programId: TOKEN_PROGRAM_ID }
    );

    // Find USDC account
    const usdcAccount = tokenAccounts.value.find(
      account => account.account.data.parsed.info.mint === USDC_MINT.toString()
    );

    if (!usdcAccount) return 0;

    // Get balance and convert from raw amount to USDC (6 decimals)
    const balance = usdcAccount.account.data.parsed.info.tokenAmount.uiAmount;
    return balance;
  } catch (error) {
    console.error('Error fetching USDC balance:', error);
    return 0;
  }
}
