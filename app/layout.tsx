import type { Metadata } from "next";
import { Analytics } from '@vercel/analytics/next';
import GitHubCorner from "./components/GitHubCorner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Supplement Research | AI-Powered Deep Research",
  description: "Get comprehensive, evidence-based research on any supplement. Includes detailed reports, brand comparisons, and dosage recommendations from trusted sources.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <GitHubCorner />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
