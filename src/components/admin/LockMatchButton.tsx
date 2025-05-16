import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface LockMatchButtonProps {
  matchId: string;
  onSuccess?: () => void;
}

export function LockMatchButton({ matchId, onSuccess }: LockMatchButtonProps) {
  const { getSignature } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLockMatch = async () => {
    setIsLoading(true);

    try {
      // Get signature
      const { signature, message, nonce } = await getSignature("LOCK_MATCH", {
        matchId,
      });

      // Lock match
      const response = await fetch("/api/matches/lock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchId,
          walletAddress: process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS,
          signature,
          message,
          nonce,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to lock match");
      }

      onSuccess?.();
    } catch (error) {
      console.error("Error locking match:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to lock match",
        {
          style: {
            background: "#ff503b",
            color: "white",
            border: "none",
          },
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleLockMatch();
        }}
        disabled={isLoading}
        className="cursor-pointer font-medium bg-[#ff503b]/80 text-white px-2 py-[2px] rounded hover:bg-[#ff503b] transition-colors disabled:bg-[#ff503b]/50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Locking..." : "Lock"}
      </button>
    </div>
  );
}
