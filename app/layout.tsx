import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitHub Treemap — 60k+ Repos",
  description: "Interactive treemap visualization of 60,000+ GitHub repositories by language",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0c0c0c] text-white">{children}</body>
    </html>
  );
}
