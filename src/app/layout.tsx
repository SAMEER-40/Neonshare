import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeonShare - Private Photo Sharing",
  description: "Share photos with friends securely.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
