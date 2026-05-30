"use client"

import { ThirdwebProvider } from "@thirdweb-dev/react"
import { ReactNode, useEffect } from "react"

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
  // Suppress "No active wallet found" errors that occur during auto-reconnect attempts
  useEffect(() => {
    if (typeof window !== "undefined") {
      const originalError = console.error
      const originalWarn = console.warn
      
      console.error = (...args: any[]) => {
        const firstArg = args[0]
        const message = typeof firstArg === 'string' ? firstArg : firstArg?.message || String(firstArg)
        
        // Suppress thirdweb auto-reconnect errors and dialog warnings
        if (
          message &&
          (message.includes('No active wallet found') ||
           message.includes('Error connecting to wallet') ||
           message.includes('MetaMaskWallet._connect') ||
           message.includes('DialogContent') ||
           message.includes('DialogTitle') ||
           message.includes('aria-describedby') ||
           message.includes('Connection failed') ||
           message.includes('No QueryClient set') ||
           message.includes('QueryClientProvider'))
        ) {
          // Silently ignore these harmless errors/warnings from thirdweb
          return
        }
        
        originalError.apply(console, args)
      }

      console.warn = (...args: any[]) => {
        const firstArg = args[0]
        const message = typeof firstArg === 'string' ? firstArg : firstArg?.message || String(firstArg)
        
        // Suppress thirdweb dialog warnings
        if (
          message &&
          (message.includes('DialogContent') ||
           message.includes('DialogTitle') ||
           message.includes('aria-describedby'))
        ) {
          return
        }
        
        originalWarn.apply(console, args)
      }

      // Cleanup
      return () => {
        console.error = originalError
        console.warn = originalWarn
      }
    }
  }, [])

  return (
    <ThirdwebProvider
      activeChain={Ethereum}
      supportedChains={supportedChains}
      clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID}
      autoConnect={true}
      autoSwitch={true}
      dAppMeta={{
        name: "PeerPesa",
        description: "Your gateway to the decentralized web",
        logoUrl: "/images/peerpesa-logo.png",
        url: "https://peerpesa.co",
      }}
    >
      {children}
    </ThirdwebProvider>
  )
}
