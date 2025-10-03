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
  return (
    <ThirdwebProvider
      activeChain={Ethereum}
      supportedChains={supportedChains}
      clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || ""}
      authConfig={{
        domain: process.env.NEXT_PUBLIC_DOMAIN || "localhost:3008",
      }}
    >
      {children}
    </ThirdwebProvider>
  )
}
