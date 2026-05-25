/**
 * Channel interfaces
 */
export interface Channel {
  id?: string
  name: string
  network: string
  rampType: string // 'withdraw', etc.
  channelType: string // 'bank', 'mobile', etc.
  currency: string
  status: string | boolean
  minAmount?: number
  maxAmount?: number
  [key: string]: any
}

export interface ChannelsResponse {
  data?: Channel[]
  channels?: Channel[]
  success?: boolean
  message?: string
}

/**
 * Fetch withdraw channels based on filter and currency
 * @param rampType - Ramp type ('withdraw')
 * @param channelType - Channel type ('bank' | 'mobile')
 * @param currency - Currency code (e.g., 'UGX', 'KES')
 * @param status - Channel status ('active')
 * @returns Promise with channels array
 */
export async function fetchWithdrawChannels({
  rampType = 'withdraw',
  channelType = '',
  currency = '',
  status = 'active',
}: {
  rampType?: string
  channelType?: string
  currency?: string
  status?: string
}): Promise<Channel[]> {
  try {
    const params: Record<string, string> = {
      rampType,
      channelType,
      currency,
      status,
    }
    // Remove empty params
    Object.keys(params).forEach((k) => {
      if (!params[k]) delete params[k]
    })
    const response = await apiGet<ChannelsResponse>('/dapp/system/withdraw/channels', params)
    if (Array.isArray(response)) {
      return response
    } else if (response.data && Array.isArray(response.data)) {
      return response.data
    } else if (response.channels && Array.isArray(response.channels)) {
      return response.channels
    } else {
      console.warn('Unexpected channels response format:', response)
      return []
    }
  } catch (error) {
    console.error('Error fetching withdraw channels:', error)
    return []
  }
}
/**
 * API utility functions for PeerPesa
 * Centralized API calls with base URL configuration
 */
import { encryptPayLoad } from "@/services/encryption"

// Base URL for PeerPesa API
// export const API_BASE_URL = 'https://api.peerpesa.co'
export const API_BASE_URL = "http://localhost:3111"

// API endpoints
export const API_ENDPOINTS = {
  SUPPORTED_CURRENCIES: '/dapp/supported/currencies',
  EXCHANGE_RATES: '/dapp/system/withdraw/rates',
  GENERAL_EXCHANGE_RATES: '/currencies/quote',
  COUNTRIES: '/settings/countries',
  WITHDRAW_CHANNELS: '/dapp/system/withdraw/channels',
  WITHDRAW_NETWORKS: '/dapp/system/withdraw/networks',
  COIN_RATE: '/rates',
} as const

// Coin rate response shape from GET /rates/:base_coin/:quote_coin
export interface CoinRateData {
  id?: string
  token_name?: string
  symbol?: string
  icon?: string
  price: {
    base_coin: string
    quote_coin: string
    amount: number
    rate: {
      buy_rate: number
      sale_rate: number
      exchange_rate: number
    }
  }
}

export interface CoinRateResponse {
  status: boolean
  message?: string
  data?: CoinRateData
}

/**
 * Fetch the exchange rate between two coins/currencies.
 * GET /rates/:base_coin/:quote_coin
 * Returns price.rate.sale_rate as the exchange rate.
 */
export async function fetchCoinRate(
  baseCoin: string,
  quoteCoin: string
): Promise<CoinRateData | null> {
  if (!baseCoin || !quoteCoin) return null
  try {
    const response = await apiRequest<CoinRateResponse>(
      `${API_ENDPOINTS.COIN_RATE}/${encodeURIComponent(baseCoin)}/${encodeURIComponent(quoteCoin)}`
    )
    return response?.data ?? null
  } catch (error) {
    console.error(`Error fetching coin rate ${baseCoin}/${quoteCoin}:`, error)
    return null
  }
}

// HTTP methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

// API response wrapper
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// API error class
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: Response
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Generic API request function
 * @param endpoint - API endpoint path
 * @param options - Fetch options
 * @returns Promise with API response
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    ...options,
  }

  try {
    const response = await fetch(url, defaultOptions)

    if (!response.ok) {
      throw new ApiError(
        `HTTP error! status: ${response.status}`,
        response.status,
        response
      )
    }

    const data = await response.json()
    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    
    // Handle network errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error occurred',
      0
    )
  }
}

/**
 * GET request helper
 * @param endpoint - API endpoint path
 * @param params - Query parameters
 * @returns Promise with API response
 */
export async function apiGet<T = any>(
  endpoint: string,
  params?: Record<string, string | number | boolean>
): Promise<T> {
  let url = endpoint
  
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value))
    })
    url += `?${searchParams.toString()}`
  }

  return apiRequest<T>(url, {
    method: 'GET',
  })
}

/**
 * POST request helper
 * @param endpoint - API endpoint path
 * @param data - Request body data
 * @returns Promise with API response
 */
export async function apiPost<T = any>(
  endpoint: string,
  data?: any
): Promise<T> {
  let body: string | undefined
  if (data) {
    const encrypted = await encryptPayLoad(data)
    body = JSON.stringify(encrypted)
  }
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body,
  })
}

/**
 * PUT request helper
 * @param endpoint - API endpoint path
 * @param data - Request body data
 * @returns Promise with API response
 */
export async function apiPut<T = any>(
  endpoint: string,
  data?: any
): Promise<T> {
  let body: string | undefined
  if (data) {
    const encrypted = await encryptPayLoad(data)
    body = JSON.stringify(encrypted)
  }
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body,
  })
}

/**
 * DELETE request helper
 * @param endpoint - API endpoint path
 * @returns Promise with API response
 */
export async function apiDelete<T = any>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'DELETE',
  })
}

// Specific API functions

/**
 * Fetch supported currencies from API
 * @returns Promise with currencies array
 */
export async function fetchSupportedCurrencies(): Promise<any[]> {
  try {
    const response = await apiGet(API_ENDPOINTS.SUPPORTED_CURRENCIES)
  
    // Handle different possible response formats
    if (Array.isArray(response)) {
      return response
    } else if (response.currencies && Array.isArray(response.currencies)) {
      return response.currencies
    } else if (response.data && Array.isArray(response.data)) {
      return response.data
    } else {
      throw new ApiError('Invalid response format', 200)
    }
  } catch (error) {
    console.error('Error fetching supported currencies:', error)
    throw error
  }
}

/**
 * Get default currencies as fallback
 * @returns Array of default currencies
 */
export async function getDefaultCurrencies() {
  try{
  
      const supportedCurrencies: any = await fetchSupportedCurrencies();
      return supportedCurrencies?.data || []
  }catch(e: any | ApiError){
    return []
  }    
}

// Example usage functions (uncomment and modify as needed):

// /**
//  * Fetch user profile
//  * @param userId - User ID
//  * @returns Promise with user profile data
//  */
// export async function fetchUserProfile(userId: string): Promise<any> {
//   return apiGet(`/user/${userId}/profile`)
// }

// /**
//  * Fetch user transactions
//  * @param userId - User ID
//  * @param limit - Number of transactions to fetch
//  * @param offset - Offset for pagination
//  * @returns Promise with transactions array
//  */
// export async function fetchUserTransactions(
//   userId: string,
//   limit: number = 10,
//   offset: number = 0
// ): Promise<any[]> {
//   return apiGet('/user/transactions', { userId, limit, offset })
// }

// /**
//  * Create a new transaction
//  * @param transactionData - Transaction data
//  * @returns Promise with created transaction
//  */
// export async function createTransaction(transactionData: any): Promise<any> {
//   return apiPost('/transactions', transactionData)
// }

// /**
//  * Update user profile
//  * @param userId - User ID
//  * @param profileData - Profile data to update
//  * @returns Promise with updated profile
//  */
// export async function updateUserProfile(
//   userId: string,
//   profileData: any
// ): Promise<any> {
//   return apiPut(`/user/${userId}/profile`, profileData)
// }

// Currency price rate structure embedded in supported-currencies response
export interface CurrencyPriceRate {
  buy_rate: number
  sale_rate: number
  exchange_rate: number
}

export interface CurrencyPrice {
  id?: string
  base_coin: string
  quote_coin: string
  amount?: number
  rate: CurrencyPriceRate
  market_details?: {
    usd24hVolume?: number
    usd24hChange?: number
    usdMarketCap?: number
  }
  provider?: { sell?: string; buy?: string }
  source?: string
  status?: string
  marketcap_amount?: number | Record<string, any>
}

/**
 * Get the sale exchange rate for a currency by filtering supported currencies by symbol.
 * Returns `currency.price.rate.sale_rate` (rate quoted in USD by default).
 *
 * @param currencies - Array of supported currency objects from the API
 * @param symbol     - Token symbol to look up (e.g. "XLM", "USDC")
 * @returns The sale_rate number, or null if not found
 */
export function getCurrencyRate(currencies: any[], symbol: string): number | null {
  const coin = currencies.find(
    (c) => String(c?.symbol || '').toUpperCase() === symbol.toUpperCase()
  )
  const rate = coin?.price?.rate?.sale_rate
  return typeof rate === 'number' && Number.isFinite(rate) ? rate : null
}

// Exchange Rate Types
export interface ExchangeRate {
  currency: string
  rate: number
  symbol: string
  name: string
}

export interface ExchangeRatesResponse {
  data?: {
    rates: ExchangeRate[]
    baseCurrency: string
    timestamp: number
  }
  rates?: ExchangeRate[]
  baseCurrency?: string
  timestamp?: number
}

/**
 * Fetch exchange rates for a specific currency
 * @param currency - Base currency code (e.g., 'USD')
 * @returns Promise with exchange rates
 */
export async function fetchExchangeRates(currency: string = 'USD'): Promise<ExchangeRatesResponse> {
  try {
    const response = await apiGet(`${API_ENDPOINTS.EXCHANGE_RATES}?currency=${currency}`)
    return response
  } catch (error) {
    console.error('Error fetching exchange rates:', error)
    throw error
  }
}

// General exchange rate interfaces
export interface GeneralExchangeRate {
  currency: string
  rate: number
  timestamp: number
  source?: string
  price?: {
    base_coin?: string
    quote_coin?: string
    marketcap_amount?: number | string
    [key: string]: any
  }
}

export interface GeneralExchangeRatesResponse {
  data?: {
    rates: GeneralExchangeRate[]
    base_currency: string
    quote_currency: string
    timestamp: number
  }
  rates?: GeneralExchangeRate[]
  base_currency?: string
  quote_currency?: string
  timestamp?: number
}

/**
 * Fetch general exchange rates for a specific quote currency
 * @param quoteCurrency - Quote currency code (e.g., 'USD', 'EUR')
 * @returns Promise with general exchange rates
 */
export async function fetchGeneralExchangeRates(quoteCurrency: string = 'USD'): Promise<GeneralExchangeRatesResponse> {
  try {
    const response = await apiGet(`${API_ENDPOINTS.GENERAL_EXCHANGE_RATES}/${quoteCurrency}`)
    return response
  } catch (error) {
    console.error('Error fetching general exchange rates:', error)
    throw error
  }
}

// Country interfaces
export interface Country {
  id?: string | number
  code?: string
  name?: string
  country_name?: string  // Alternative name field from API
  alpha_3_code?: string  // ISO 3166-1 alpha-3 code
  alpha_2_code?: string  // ISO 3166-1 alpha-2 code
  dialCode?: string
  dial_code?: string     // Alternative dial code field from API
  flag?: string
  emoji_flag?: string    // Alternative flag field from API
  isActive?: boolean
  is_active?: boolean    // Alternative active field from API
  currency?: string
  currency_code?: string // Alternative currency field from API
  [key: string]: any     // Allow additional fields from API
}

export interface CountriesResponse {
  data?: Country[]
  countries?: Country[]
  success?: boolean
  message?: string
}

/**
 * Fetch countries list from API
 * @returns Promise with countries array
 */
export async function fetchCountries(): Promise<Country[]> {
  try {
    const response = await apiGet<CountriesResponse>(API_ENDPOINTS.COUNTRIES)
    
    // Handle different possible response formats
    if (Array.isArray(response)) {
      return response
    } else if (response.data && Array.isArray(response.data)) {
      return response.data
    } else if (response.countries && Array.isArray(response.countries)) {
      return response.countries
    } else {
      console.warn('Unexpected countries response format:', response)
      return []
    }
  } catch (error) {
    console.error('Error fetching countries:', error)
    // Return empty array on error so the app continues to work
    return []
  }
}

/**
 * Get countries with fallback to default list
 * @returns Promise with countries array
 */
export async function getCountriesWithFallback(): Promise<Country[]> {
  try {
    const countries = await fetchCountries()
    
    // If we got countries from API, return them
    if (countries && countries.length > 0) {
      return countries
    }
    
    // Return empty array as fallback
    // The phone input component will use its built-in country list
    return []
  } catch (error) {
    console.error('Error fetching countries with fallback:', error)
    return []
  }
}

// Network interfaces
export interface Network {
  id?: string
  name: string
  code?: string
  type?: string
  channelType?: string
  channelIds?: string[]
  status?: string
  country?: string
  isActive?: boolean
  currency?: string
  fees?: number
  processingTime?: string
  [key: string]: any
}

export interface NetworksResponse {
  data?: Network[]
  networks?: Network[]
  success?: boolean
  message?: string
}

/**
 * Fetch withdraw networks based on filter and currency
 * @param filter - Network filter type ('bank' | 'mobile' | 'crypto')
 * @param currency - Currency code (e.g., 'UGX', 'KES')
 * @param sort - Sort parameter
 * @returns Promise with networks array
 */
// Transaction fees interfaces
export interface TransactionFeesPayload {
  from_currency: string
  to_currency: string
  process: string // 'withdraw' | 'send' | 'buy' | 'swap' | 'bulk_send'
  network: string // network ID (UUID) of the sell currency's blockchain
  amount: number
}

export interface TransactionFeeResult {
  fee: number
  feeCurrency: string
  feePercentage?: number
}

export interface TransactionFeesResponse {
  status?: boolean
  message?: string
  data?: {
    fee?: number
    fee_amount?: number
    fees?: number
    amount?: number
    fee_percentage?: number
    fee_currency?: string
    [key: string]: any
  }
}

/**
 * Fetch transaction fees for a transfer
 * POST /currencies/transaction/fees
 */
export async function fetchTransactionFees(
  payload: TransactionFeesPayload
): Promise<TransactionFeeResult | null> {
  try {
    const response = await apiPost<TransactionFeesResponse>(
      '/currencies/transaction/fees',
      payload
    )
    const d = response?.data
    if (!d) return null
    const fee = d.fee ?? d.fee_amount ?? d.fees ?? d.amount
    if (typeof fee !== 'number') return null
    return {
      fee,
      feeCurrency: d.fee_currency || payload.from_currency,
      feePercentage: d.fee_percentage,
    }
  } catch (error) {
    console.error('Error fetching transaction fees:', error)
    return null
  }
}

/**
 * Fetch networks that support a set of channel IDs
 * @param channelIds - Array of channel IDs to filter by
 * @returns Promise with networks array
 */
export async function fetchNetworksByChannelIds(channelIds: string[]): Promise<Network[]> {
  if (!channelIds.length) return []
  try {
    const params: Record<string, string> = {
      channelIds: channelIds.join(','),
    }
    const response = await apiGet<NetworksResponse>(API_ENDPOINTS.WITHDRAW_NETWORKS, params)
    if (Array.isArray(response)) return response
    if (response.data && Array.isArray(response.data)) return response.data
    if (response.networks && Array.isArray(response.networks)) return response.networks
    console.warn('Unexpected networks-by-channelIds response format:', response)
    return []
  } catch (error) {
    console.error('Error fetching networks by channelIds:', error)
    return []
  }
}

export async function fetchWithdrawNetworks(
  filter: string = 'bank',
  currency: string = 'USD',
  sort: string = ''
): Promise<Network[]> {
  try {
    const channelType = filter === 'mobile' ? 'momo' : 'bank'
    const params: Record<string, string> = {
      channelType,
      currency,
    }

    if (sort) {
      params.sort = sort
    }

    const response = await apiGet<NetworksResponse>(API_ENDPOINTS.WITHDRAW_NETWORKS, params)
    
    // Handle different possible response formats
    if (Array.isArray(response)) {
      return response
    } else if (response.data && Array.isArray(response.data)) {
      return response.data
    } else if (response.networks && Array.isArray(response.networks)) {
      return response.networks
    } else {
      console.warn('Unexpected networks response format:', response)
      return []
    }
  } catch (error) {
    console.error('Error fetching withdraw networks:', error)
    // Return empty array on error so the app continues to work
    return []
  }
}
