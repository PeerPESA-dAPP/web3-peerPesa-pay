"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { fetchWithdrawNetworks, Network } from '@/utils/api'

interface TransactionContextType {
  // Bank networks
  bankNetworks: Network[]
  bankNetworksLoading: boolean
  fetchBankNetworks: (currency: string) => Promise<void>
  
  // Mobile networks
  mobileNetworks: Network[]
  mobileNetworksLoading: boolean
  fetchMobileNetworks: (currency: string) => Promise<void>
  
  // Generic networks fetch
  fetchNetworks: (filter: string, currency: string, sort?: string) => Promise<Network[]>
  
  // Error states
  error: string | null
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined)

interface TransactionProviderProps {
  children: ReactNode
}

export function TransactionProvider({ children }: TransactionProviderProps) {
  const [bankNetworks, setBankNetworks] = useState<Network[]>([])
  const [bankNetworksLoading, setBankNetworksLoading] = useState(false)
  
  const [mobileNetworks, setMobileNetworks] = useState<Network[]>([])
  const [mobileNetworksLoading, setMobileNetworksLoading] = useState(false)
  
  const [error, setError] = useState<string | null>(null)

  // Fetch bank networks for a specific currency
  const fetchBankNetworks = useCallback(async (currency: string) => {
    setBankNetworksLoading(true)
    setError(null)
    
    try {
      const networks = await fetchWithdrawNetworks('bank', currency)
      setBankNetworks(networks)
      
      if (networks.length === 0) {
        console.warn(`No bank networks found for currency: ${currency}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bank networks'
      setError(errorMessage)
      console.error('Error fetching bank networks:', err)
      setBankNetworks([])
    } finally {
      setBankNetworksLoading(false)
    }
  }, [])

  // Fetch mobile networks for a specific currency
  const fetchMobileNetworks = useCallback(async (currency: string) => {
    setMobileNetworksLoading(true)
    setError(null)
    
    try {
      const networks = await fetchWithdrawNetworks('mobile', currency)
      setMobileNetworks(networks)
      
      if (networks.length === 0) {
        console.warn(`No mobile networks found for currency: ${currency}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch mobile networks'
      setError(errorMessage)
      console.error('Error fetching mobile networks:', err)
      setMobileNetworks([])
    } finally {
      setMobileNetworksLoading(false)
    }
  }, [])

  // Generic fetch networks function
  const fetchNetworks = useCallback(async (
    filter: string,
    currency: string,
    sort: string = ''
  ): Promise<Network[]> => {
    try {
      const networks = await fetchWithdrawNetworks(filter, currency, sort)
      return networks
    } catch (err) {
      console.error('Error fetching networks:', err)
      return []
    }
  }, [])

  const value: TransactionContextType = {
    bankNetworks,
    bankNetworksLoading,
    fetchBankNetworks,
    mobileNetworks,
    mobileNetworksLoading,
    fetchMobileNetworks,
    fetchNetworks,
    error,
  }

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  )
}

export function useTransaction() {
  const context = useContext(TransactionContext)
  
  if (context === undefined) {
    throw new Error('useTransaction must be used within a TransactionProvider')
  }
  
  return context
}

// Optional: Hook that doesn't throw error (returns default values)
export function useTransactionOptional() {
  const context = useContext(TransactionContext)
  
  if (context === undefined) {
    return {
      bankNetworks: [],
      bankNetworksLoading: false,
      fetchBankNetworks: async () => {},
      mobileNetworks: [],
      mobileNetworksLoading: false,
      fetchMobileNetworks: async () => {},
      fetchNetworks: async () => [],
      error: null,
    }
  }
  
  return context
}

