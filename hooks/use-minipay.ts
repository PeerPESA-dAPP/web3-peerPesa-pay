"use client"

import { useState, useEffect } from 'react'

export function useMiniPay() {
  const [isMiniPay, setIsMiniPay] = useState(false)
  const [miniPayVersion, setMiniPayVersion] = useState<string | null>(null)
  const [miniPayCheckComplete, setMiniPayCheckComplete] = useState(false)

  useEffect(() => {
    const checkMiniPay = async () => {
      try {
        // Check if window.ethereum exists and has MiniPay properties
        if (typeof window === 'undefined') {
          setMiniPayCheckComplete(true)
          return
        }

        const ethereum = (window as any).ethereum
        
        // Method 1: Direct window.ethereum.isMiniPay check
        if (ethereum?.isMiniPay) {
          setIsMiniPay(true)
          setMiniPayVersion(ethereum.miniPayVersion || null)
          setMiniPayCheckComplete(true)
          return
        }

        // Method 2: Check if connected via WalletConnect (MiniPay uses WalletConnect)
        const connectorId = localStorage?.getItem('wagmi.connector') || ''
        const connectorName = localStorage?.getItem('wagmi.connectorName') || ''
        
        if (connectorId === 'walletConnect' || connectorName.includes('WalletConnect')) {
          // Additional check: WalletConnect with isMiniPay flag
          if (localStorage?.getItem('isMiniPay') === 'true') {
            setIsMiniPay(true)
            setMiniPayVersion(localStorage?.getItem('miniPayVersion') || null)
            setMiniPayCheckComplete(true)
            return
          }
        }

        // Method 3: Check userAgent for MiniPay
        const userAgent = navigator.userAgent
        if (userAgent.includes('Celo') || userAgent.includes('MiniPay')) {
          setIsMiniPay(true)
          setMiniPayCheckComplete(true)
          return
        }

        setIsMiniPay(false)
        setMiniPayVersion(null)
        setMiniPayCheckComplete(true)
        
      } catch (error) {
        console.error('[MiniPay] Error checking MiniPay:', error)
        setIsMiniPay(false)
        setMiniPayVersion(null)
        setMiniPayCheckComplete(true)
      }
    }

    // Small delay to ensure browser APIs are ready
    const timer = setTimeout(checkMiniPay, 100)
    return () => clearTimeout(timer)
  }, [])

  return { isMiniPay, miniPayVersion, miniPayCheckComplete }
}