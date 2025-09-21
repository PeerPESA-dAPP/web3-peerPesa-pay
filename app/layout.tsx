import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { WagmiWrapper } from "@/components/wagmi-wrapper"
import "./globals.css"

export const metadata: Metadata = {
  title: "PeerPesa Wallet",
  description: "Mobile crypto wallet for CELO and multi-currency transactions",
  generator: "v0.app",
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <WagmiWrapper>
          <Suspense fallback={null}>{children}</Suspense>
          <Analytics />
        </WagmiWrapper>
      </body>
    </html>
  )
}
