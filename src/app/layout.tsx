import type { Metadata } from "next";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { Providers } from "@/components/providers";
import { AuthProvider } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: "strikerate",
  description: "win with Precision",
  icons: {
    icon: [
      {
        rel: "icon",
        url: "/assets/strikerate-logo.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        rel: "shortcut icon",
        url: "/assets/strikerate-logo.svg",
        type: "image/svg+xml",
      },
      {
        rel: "apple-touch-icon",
        url: "/assets/strikerate-logo.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: [
      {
        url: "/assets/strikerate-logo.svg",
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: "/assets/strikerate-logo.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/assets/strikerate-logo.svg",
      },
    ],
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`container mx-auto antialiased`}>
        <Providers>
          <AuthProvider>
              <Header />
              {children}
          </AuthProvider>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
