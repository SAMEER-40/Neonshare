import type { Metadata } from "next";
import { AuthProvider } from "@/lib/AuthProvider";
import { ToastProvider } from "@/components/ToastManager";
import OfflineIndicator from "@/components/OfflineIndicator";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeonShare - Photo Sharing",
  description: "Share your moments with friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <AuthProvider>
            <ToastProvider>
              <OfflineIndicator />
              <div className="page-transition">
                {children}
              </div>
            </ToastProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
