import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bizora — Move Your Business Forward",
  description: "AI-powered business intelligence and revenue recovery platform for retail and wholesale trade.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
