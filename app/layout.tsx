import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { ThirdwebProviderWrapper } from "@/components/thirdweb-provider"
import { GlobalErrorHandler } from "@/components/global-error-handler"
import { SettingsProvider } from "@/contexts/SettingsContext"
import { TransactionProvider } from "@/contexts/TransactionContext"
import { CurrencyProvider } from "@/contexts/CurrencyContext"
import "./globals.css"

export const metadata: Metadata = {
  title: "PeerPesa Pay",
  description: "Instant, low cost, borderless payments across Africa",
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
        <GlobalErrorHandler>
          <ThirdwebProviderWrapper>
            <SettingsProvider>
              <CurrencyProvider>
                <TransactionProvider>
                  <Suspense fallback={null}>{children}</Suspense>
                  <Analytics />
                </TransactionProvider>
              </CurrencyProvider>
            </SettingsProvider>
          </ThirdwebProviderWrapper>
        </GlobalErrorHandler>
      </body>
    </html>
  )
}
