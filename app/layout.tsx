import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Metadata } from "next"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GitHub Star Tracker",
  description: "Track repositories with over 10,000 stars on GitHub",
  generator: 'v0.dev',
  applicationName: "GitHub Star Tracker",
  referrer: "origin-when-cross-origin",
  authors: [{ name: "GitHub Star Tracker Team" }],
  colorScheme: "dark light",
  creator: "GitHub Star Tracker Team",
  publisher: "GitHub Star Tracker",
  formatDetection: {
    email: false,
    telephone: false,
    address: false,
  },
  metadataBase: new URL("https://github-star-tracker.com"),
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}