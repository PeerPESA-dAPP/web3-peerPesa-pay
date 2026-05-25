"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { fetchCountries, Country } from '@/utils/api'

interface SettingsContextType {
  countries: Country[]
  loading: boolean
  error: string | null
  refetchCountries: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

interface SettingsProviderProps {
  children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCountries = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const fetchedCountries = await fetchCountries()
      setCountries(fetchedCountries)
      
      if (fetchedCountries.length === 0) {
        console.warn('No countries fetched from API, phone input will use built-in list')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch countries'
      setError(errorMessage)
      console.error('Error fetching countries:', err)
      // Don't set empty array, let phone input use its default countries
      setCountries([])
    } finally {
      setLoading(false)
    }
  }

  const refetchCountries = async () => {
    await loadCountries()
  }

  useEffect(() => {
    loadCountries()
  }, [])

  const value: SettingsContextType = {
    countries,
    loading,
    error,
    refetchCountries,
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  
  return context
}

// Optional: Hook that doesn't throw error (returns default values)
export function useSettingsOptional() {
  const context = useContext(SettingsContext)
  
  if (context === undefined) {
    return {
      countries: [],
      loading: false,
      error: null,
      refetchCountries: async () => {},
    }
  }
  
  return context
}

