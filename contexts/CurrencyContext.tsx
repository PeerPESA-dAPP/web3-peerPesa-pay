'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { fetchSupportedCurrencies, getDefaultCurrencies, ApiError, fetchExchangeRates, ExchangeRate } from '@/utils/api'

// Re-export the utility function for convenience
export { getInitials } from '@/utils/string'

interface Currency {
  code: string
  name: string
  symbol: string
  rate: number
  isActive: boolean
}

interface CurrencyContextType {
  currencies: Currency[]
  selectedCurrency: string
  setSelectedCurrency: (currency: string) => void
  loading: boolean
  error: string | null
  refetch: () => void
  getCurrentCurrency: () => Currency
  convertAmount: (amount: number) => string
  exchangeRates: ExchangeRate[]
  exchangeRatesLoading: boolean
  exchangeRatesError: string | null
  refetchExchangeRates: () => void
}

// Default USD currency
const defaultUSD: Currency = {
  code: 'USD',
  name: 'US Dollar',
  symbol: 'USD',
  rate: 1,
  isActive: true
}

// Create default context value
const defaultCurrencyContext: CurrencyContextType = {
  currencies: [defaultUSD],
  selectedCurrency: 'USD',
  setSelectedCurrency: () => {},
  loading: false,
  error: null,
  refetch: () => {},
  getCurrentCurrency: () => defaultUSD,
  convertAmount: (amount: number) => amount.toFixed(2),
  exchangeRates: [],
  exchangeRatesLoading: false,
  exchangeRatesError: null,
  refetchExchangeRates: () => {}
}

const CurrencyContext = createContext<CurrencyContextType>(defaultCurrencyContext)

export const useCurrency = () => {
  const context = useContext(CurrencyContext)
  return context
}

// Standalone currency hook that works without provider
export const useStandaloneCurrency = () => {
  const [currencies, setCurrencies] = useState<Currency[]>([defaultUSD])
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([])
  const [exchangeRatesLoading, setExchangeRatesLoading] = useState(false)
  const [exchangeRatesError, setExchangeRatesError] = useState<string | null>(null)

  // Fetch currencies on component mount
  useEffect(() => {
    fetchSupportedCurrencies()
      .then((fetchedCurrencies) => {
        if (Array.isArray(fetchedCurrencies) && fetchedCurrencies.length > 0) {
          setCurrencies(fetchedCurrencies)
          console.log('Currencies fetched successfully:', fetchedCurrencies)
        }
      })
      .catch((err) => {
        console.error('Error fetching currencies:', err)
        setError(err instanceof ApiError ? err.message : 'Failed to fetch currencies')
        // Keep default USD currency on error
      })
  }, [])

  // Fetch exchange rates when selected currency changes
  useEffect(() => {
    if (selectedCurrency) {
      fetchExchangeRates(selectedCurrency)
        .then((response) => {
          if (response.rates && Array.isArray(response.rates)) {
            setExchangeRates(response.rates)
            console.log('Exchange rates fetched successfully:', response.rates)
          }
        })
        .catch((err) => {
          console.error('Error fetching exchange rates:', err)
          setExchangeRatesError(err instanceof ApiError ? err.message : 'Failed to fetch exchange rates')
        })
    }
  }, [selectedCurrency])

  const refetch = async () => {
    try {
      setLoading(true)
      setError(null)
      const fetchedCurrencies = await fetchSupportedCurrencies()
      if (Array.isArray(fetchedCurrencies) && fetchedCurrencies.length > 0) {
        setCurrencies(fetchedCurrencies)
      }
    } catch (err) {
      console.error('Error refetching currencies:', err)
      setError(err instanceof ApiError ? err.message : 'Failed to refetch currencies')
    } finally {
      setLoading(false)
    }
  }

  const refetchExchangeRates = async () => {
    if (!selectedCurrency) return
    
    try {
      setExchangeRatesLoading(true)
      setExchangeRatesError(null)
      const response = await fetchExchangeRates(selectedCurrency)
      if (response.rates && Array.isArray(response.rates)) {
        setExchangeRates(response.rates)
      }
    } catch (err) {
      console.error('Error refetching exchange rates:', err)
      setExchangeRatesError(err instanceof ApiError ? err.message : 'Failed to refetch exchange rates')
    } finally {
      setExchangeRatesLoading(false)
    }
  }

  const getCurrentCurrency = (): Currency => {
    return currencies.find(currency => currency.code === selectedCurrency) || currencies[0] || defaultUSD
  }

  const convertAmount = (amount: number): string => {
    const currency = getCurrentCurrency()
    if (!currency) return amount.toFixed(2)
    
    // Use exchange rate if available, otherwise use currency rate
    const exchangeRate = exchangeRates.find(rate => rate.currency === currency.code)
    const rate = exchangeRate ? exchangeRate.rate : currency.rate
    
    const convertedAmount: number = amount * rate
    return (parseFloat(convertedAmount.toString()) > 0) ? convertedAmount.toFixed(2) : '0.00'
  }

  return {
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    loading,
    error,
    refetch,
    getCurrentCurrency,
    convertAmount,
    exchangeRates,
    exchangeRatesLoading,
    exchangeRatesError,
    refetchExchangeRates
  }
}

interface CurrencyProviderProps {
  children: ReactNode
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const [currencies, setCurrencies] = useState<Currency[]>([defaultUSD])
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([])
  const [exchangeRatesLoading, setExchangeRatesLoading] = useState(false)
  const [exchangeRatesError, setExchangeRatesError] = useState<string | null>(null)

  // Fetch currencies on page load
  useEffect(() => {
    fetchSupportedCurrencies()
      .then((fetchedCurrencies) => {
        if (Array.isArray(fetchedCurrencies) && fetchedCurrencies.length > 0) {
          setCurrencies(fetchedCurrencies)
          console.log('Currencies fetched successfully:', fetchedCurrencies)
        }
      })
      .catch((err) => {
        console.error('Error fetching currencies:', err)
        setError(err instanceof ApiError ? err.message : 'Failed to fetch currencies')
        // Keep default USD currency on error
      })
  }, [])

  // Fetch exchange rates when selected currency changes
  useEffect(() => {
    if (selectedCurrency) {
      fetchExchangeRates(selectedCurrency)
        .then((response) => {
          if (response.rates && Array.isArray(response.rates)) {
            setExchangeRates(response.rates)
            console.log('Exchange rates fetched successfully:', response.rates)
          }
        })
        .catch((err) => {
          console.error('Error fetching exchange rates:', err)
          setExchangeRatesError(err instanceof ApiError ? err.message : 'Failed to fetch exchange rates')
        })
    }
  }, [selectedCurrency])

  const refetch = async () => {
    try {
      setLoading(true)
      setError(null)
      const fetchedCurrencies = await fetchSupportedCurrencies()
      if (Array.isArray(fetchedCurrencies) && fetchedCurrencies.length > 0) {
        setCurrencies(fetchedCurrencies)
      }
    } catch (err) {
      console.error('Error refetching currencies:', err)
      setError(err instanceof ApiError ? err.message : 'Failed to refetch currencies')
    } finally {
      setLoading(false)
    }
  }

  const refetchExchangeRates = async () => {
    if (!selectedCurrency) return
    
    try {
      setExchangeRatesLoading(true)
      setExchangeRatesError(null)
      const response = await fetchExchangeRates(selectedCurrency)
      if (response.rates && Array.isArray(response.rates)) {
        setExchangeRates(response.rates)
      }
    } catch (err) {
      console.error('Error refetching exchange rates:', err)
      setExchangeRatesError(err instanceof ApiError ? err.message : 'Failed to refetch exchange rates')
    } finally {
      setExchangeRatesLoading(false)
    }
  }

  const getCurrentCurrency = (): Currency => {
    return currencies.find(currency => currency.code === selectedCurrency) || currencies[0] || defaultUSD
  }

  const convertAmount = (amount: number): string => {
    const currency = getCurrentCurrency()
    if (!currency) return amount.toFixed(2)
    
    // Use exchange rate if available, otherwise use currency rate
    const exchangeRate = exchangeRates.find(rate => rate.currency === currency.code)
    const rate = exchangeRate ? exchangeRate.rate : currency.rate
    
    const convertedAmount: number = amount * rate
    return (parseFloat(convertedAmount.toString()) > 0) ? convertedAmount.toFixed(2) : '0.00'
  }

  const value: CurrencyContextType = {
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    loading,
    error,
    refetch,
    getCurrentCurrency,
    convertAmount,
    exchangeRates,
    exchangeRatesLoading,
    exchangeRatesError,
    refetchExchangeRates
  }

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  )
}
