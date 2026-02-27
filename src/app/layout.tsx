import type { Metadata } from "next";
import { AuthProvider } from "@/lib/AuthProvider";
import { ToastProvider } from "@/components/ToastManager";
import OfflineIndicator from "@/components/OfflineIndicator";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeonShare - Photo Sharing",
  description: "Share your moments with friends",
  manifest: "/manifest.json",
  themeColor: "#e8a87c",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NeonShare",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
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
              <ServiceWorkerRegistration />
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
