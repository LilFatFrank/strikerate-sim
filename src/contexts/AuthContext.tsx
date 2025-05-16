'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import bs58 from 'bs58';

interface User {
  walletAddress: string;
  totalPredictions: number;
  totalWins: number;
  totalAmountWon: number;
  totalPoints: number;
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  disconnect: () => void;
  getSignature: (action: string, operation?: Record<string, any>) => Promise<{ signature: string; message: string; nonce: number }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { publicKey, signMessage, disconnect: walletDisconnect } = useWallet();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasAuthenticated = useRef(false);
  const isSettingUp = useRef(false);

  const getSignature = async (action: string, operation?: Record<string, any>) => {
    if (!publicKey || !signMessage) {
      throw new Error('Wallet not connected');
    }

    // Get nonce and message
    const response = await fetch('/api/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        walletAddress: publicKey.toString(),
        action,
        operation
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to prepare signature');
    }

    const { nonce, message } = await response.json();

    // Sign message
    const encodedMessage = new TextEncoder().encode(message);
    const signature = await signMessage(encodedMessage);

    return {
      signature: bs58.encode(signature),
      message,
      nonce
    };
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupAuth = async () => {
      if (isSettingUp.current) {
        return;
      }

      if (!publicKey || !signMessage) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      isSettingUp.current = true;

      try {
        // If we've already authenticated, just set up the listener
        if (hasAuthenticated.current) {
          const userRef = doc(db, 'users', publicKey.toString());
          unsubscribe = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
              const data = doc.data();
              setUser({
                walletAddress: data.walletAddress,
                totalPredictions: data.totalPredictions || 0,
                totalWins: data.totalWins || 0,
                totalAmountWon: data.totalAmountWon || 0,
                totalPoints: data.totalPoints || 0,
                createdAt: data.createdAt?.toDate()
              });
            } else {
              setUser(null);
            }
            setIsLoading(false);
          }, (error) => {
            console.error('Error listening to user updates:', error);
            setIsLoading(false);
          });
          isSettingUp.current = false;
          return;
        }

        // Get signature for sign in
        const { signature, message, nonce } = await getSignature('SIGN_IN', {
          timestamp: Date.now()
        });

        // Send to backend for verification
        const response = await fetch('/api/auth/sign-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: publicKey.toString(),
            signature,
            message,
            nonce
          })
        });

        if (!response.ok) {
          disconnect();
          throw new Error('Authentication failed');
        }

        // Check if user exists
        const userRef = doc(db, 'users', publicKey.toString());
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          // Register new user
          const registerResponse = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletAddress: publicKey.toBase58()
            })
          });

          if (!registerResponse.ok) {
            console.error('Registration failed');
            disconnect();
            return;
          }
        }

        // Set up real-time listener for user data
        unsubscribe = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            setUser({
              walletAddress: data.walletAddress,
              totalPredictions: data.totalPredictions || 0,
              totalWins: data.totalWins || 0,
              totalAmountWon: data.totalAmountWon || 0,
              totalPoints: data.totalPoints || 0,
              createdAt: data.createdAt?.toDate()
            });
          } else {
            setUser(null);
          }
          setIsLoading(false);
        }, (error) => {
          console.error('Error listening to user updates:', error);
          setIsLoading(false);
        });

        hasAuthenticated.current = true;
        console.log('Authentication completed successfully');
      } catch (error) {
        console.error('Authentication error:', error);
        disconnect();
      } finally {
        isSettingUp.current = false;
      }
    };

    setupAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [publicKey, signMessage]);

  const disconnect = () => {
    setUser(null);
    hasAuthenticated.current = false;
    isSettingUp.current = false;
    walletDisconnect();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, disconnect, getSignature }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
