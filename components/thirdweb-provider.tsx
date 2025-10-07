"use client"

import { ThirdwebProvider } from "@thirdweb-dev/react"
import { ReactNode } from "react"

// Import the chains you want to support
import {
  Ethereum,
  Polygon,
  Arbitrum,
  Optimism,
  Base,
  Binance,
  Avalanche,
  Celo,
  Blast,
  Zksync,
} from "@thirdweb-dev/chains"

// Configure the chains
const supportedChains = [
  Ethereum,
  Polygon,
  Arbitrum,
  Optimism,
  Base,
  Binance,
  Avalanche,
  Celo,
  Blast,
  Zksync,
]

interface ThirdwebProviderWrapperProps {
  children: ReactNode
}

export function ThirdwebProviderWrapper({ children }: ThirdwebProviderWrapperProps) {
  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID
  
  // Don't render provider if no clientId is set
  if (!clientId) {
    console.warn("⚠️ NEXT_PUBLIC_THIRDWEB_CLIENT_ID is not set. Please add it to your .env.local file.")
    return <>{children}</>
  }

  return (
    <ThirdwebProvider
      activeChain={Ethereum}
      supportedChains={supportedChains}
      clientId={clientId}
      autoConnect={false}
      dAppMeta={{
        name: "PeerPesa Wallet",
        description: "Mobile crypto wallet for CELO and multi-currency transactions",
        logoUrl: "/images/peerpesa-logo.png",
        url: process.env.NEXT_PUBLIC_DOMAIN || "https://pay.peerpesa.co",
      }}
    >
      {children}
    </ThirdwebProvider>
  )
}
