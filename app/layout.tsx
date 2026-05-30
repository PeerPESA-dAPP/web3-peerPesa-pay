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
import { ChannelProvider } from "@/contexts/ChannelContext"
import "./globals.css"

export const metadata: Metadata = {
  title: "Peerpesa Pay",
  description:
    "Send, Buy & Swap Celo (CELO) and Stellar (XLM) Instantly | Fast crypto transactions with low fees. Secure platform for buying, selling, and swapping CELO, XLM & more.",
  generator: "v0.app",
  icons: {
    icon: "/images/peerpesa-web3.png",
    shortcut: "/images/peerpesa-web3.png",
    apple: "/images/peerpesa-web3.png",
  },
  openGraph: {
    title: "Peerpesa Pay",
    description:
      "Send, Buy & Swap Celo (CELO) and Stellar (XLM) Instantly | Fast crypto transactions with low fees. Secure platform for buying, selling, and swapping CELO, XLM & more.",
    images: [{ url: "/images/peerpesa-web3.png" }],
  },
  twitter: {
    card: "summary",
    title: "Peerpesa Pay",
    description:
      "Send, Buy & Swap Celo (CELO) and Stellar (XLM) Instantly | Fast crypto transactions with low fees. Secure platform for buying, selling, and swapping CELO, XLM & more.",
    images: ["/images/peerpesa-web3.png"],
  },
  other: {
    "talentapp:project_verification":
      "080fbcdcb42a53a34390bc68a88a3fcb6bc0e49dd3cb1c4de1cb60cc726aa179da17a2a7bea44f04dcad973aaa5a7d8b49948ee3cbee74b93fd0d3b2cd181429",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <GlobalErrorHandler>
          <ThirdwebProviderWrapper>
            <SettingsProvider>
              <CurrencyProvider>
                <TransactionProvider>
                  <ChannelProvider>
                    <Suspense fallback={null}>{children}</Suspense>
                    <Analytics />
                  </ChannelProvider>
                </TransactionProvider>
              </CurrencyProvider>
            </SettingsProvider>
          </ThirdwebProviderWrapper>
        </GlobalErrorHandler>
      </body>
    </html>
  )
}
