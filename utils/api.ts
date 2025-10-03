/**
 * API utility functions for PeerPesa
 * Centralized API calls with base URL configuration
 */

// Base URL for PeerPesa API
export const API_BASE_URL = 'https://api.peerpesa.co'

// API endpoints
export const API_ENDPOINTS = {
  SUPPORTED_CURRENCIES: '/dapp/supported/currencies',
  EXCHANGE_RATES: '/dapp/system/withdraw/rates',
  // Add more endpoints as needed
  // USER_PROFILE: '/user/profile',
  // TRANSACTIONS: '/user/transactions',
  // BALANCE: '/user/balance',
} as const

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
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
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
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
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

// Exchange Rate Types
export interface ExchangeRate {
  currency: string
  rate: number
  symbol: string
  name: string
}

export interface ExchangeRatesResponse {
  rates: ExchangeRate[]
  baseCurrency: string
  timestamp: number
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
