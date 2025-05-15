import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';

export const connection = new Connection(
  process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta')
);

// Load wallet from environment variable
const loadWallet = () => {
  const privateKey = process.env.SOLANA_WALLET_PRIVATE_KEY;
  if (!privateKey) throw new Error('Backend wallet private key not found');
  
  const secretKey = Uint8Array.from(JSON.parse(privateKey));
  return Keypair.fromSecretKey(secretKey);
};

export const wallet = loadWallet(); 
