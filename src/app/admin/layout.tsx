"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [isAuthLoading]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4f4395] mx-auto"></div>
          <p className="mt-4 text-[#0d0019]/70">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-md w-full mx-4">
          <h2 className="text-2xl font-bold text-[#0d0019] mb-4">Connect Wallet</h2>
          <p className="text-[#0d0019]/70">Please connect your wallet to access the admin area.</p>
        </div>
      </div>
    );
  }

  if (user.walletAddress !== process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-md w-full mx-4">
          <h2 className="text-2xl font-bold text-[#0d0019] mb-4">Access Denied</h2>
          <p className="text-[#0d0019]/70">This area is restricted to admin users only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {children}
      </div>
    </div>
  );
}
