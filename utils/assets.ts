/**
 * Asset management utilities for wallet integration
 */

export interface WalletAsset {
  symbol: string
  name: string
  balance: number
  network: string
  contractAddress?: string
  decimals: number
  icon?: string
  type: 'native' | 'token' | 'stellar'
}

export interface EnabledAsset {
  symbol: string
  name: string
  network: string
  contractAddress?: string
  decimals: number
  icon?: string
  type: 'native' | 'token' | 'stellar'
  isEnabled: boolean
}

// Currency from API (existing format)
export interface CurrencyFromAPI {
  token_name_: string
  token_name: string
  symbol: string
  rate: number
  status: boolean
  token_type: string
  icon?: string
  network?: string
  contract_address?: string
  decimals?: number
}

// Currency from CurrencyContext (existing format)
export interface CurrencyFromContext {
  code: string
  name: string
  symbol: string
  rate: number
  isActive: boolean
}

// Union type for both currency formats
export type CurrencyData = CurrencyFromAPI | CurrencyFromContext

/**
 * Convert API currency to EnabledAsset format
 * @param currency - Currency from API
 * @returns EnabledAsset object
 */
export const convertApiCurrencyToEnabledAsset = (currency: CurrencyFromAPI): EnabledAsset => {
  return {
    symbol: currency.symbol,
    name: currency.token_name,
    network: currency.network || 'Unknown',
    contractAddress: currency.contract_address,
    decimals: currency.decimals || 18,
    icon: currency.icon,
    type: currency.token_type === 'Native' ? 'native' : 'token',
    isEnabled: currency.status
  }
}

/**
 * Get enabled assets from API currencies
 * @param currencies - Array of currencies from API
 * @returns Array of enabled assets
 */
export const getEnabledAssetsFromApi = (currencies: CurrencyFromAPI[]): EnabledAsset[] => {
  return currencies
    .filter(currency => currency.status) // Only enabled currencies
    .map(convertApiCurrencyToEnabledAsset)
}

/**
 * Convert CurrencyContext currency to EnabledAsset format
 * @param currency - Currency from CurrencyContext
 * @returns EnabledAsset object
 */
export const convertContextCurrencyToEnabledAsset = (currency: CurrencyFromContext): EnabledAsset => {
  return {
    symbol: currency.symbol,
    name: currency.name,
    network: 'Unknown', // CurrencyContext doesn't have network info
    decimals: 18, // Default decimals
    icon: undefined,
    type: 'native', // Assume native for CurrencyContext
    isEnabled: currency.isActive
  }
}

/**
 * Get enabled assets from CurrencyContext currencies
 * @param currencies - Array of currencies from CurrencyContext
 * @returns Array of enabled assets
 */
export const getEnabledAssetsFromContext = (currencies: CurrencyFromContext[]): EnabledAsset[] => {
  return currencies
    .filter(currency => currency.isActive) // Only active currencies
    .map(convertContextCurrencyToEnabledAsset)
}

/**
 * Get enabled assets from any currency format
 * @param currencies - Array of currencies (API or Context format)
 * @returns Array of enabled assets
 */
export const getEnabledAssetsFromAny = (currencies: CurrencyData[]): EnabledAsset[] => {
  return currencies
    .filter(currency => {
      // Check if it's API format
      if ('status' in currency) {
        return currency.status
      }
      // Check if it's Context format
      if ('isActive' in currency) {
        return currency.isActive
      }
      return false
    })
    .map(currency => {
      // Convert based on format
      if ('status' in currency) {
        return convertApiCurrencyToEnabledAsset(currency as CurrencyFromAPI)
      }
      return convertContextCurrencyToEnabledAsset(currency as CurrencyFromContext)
    })
}

/**
 * Get Native assets from API currencies
 * @param currencies - Array of currencies from API
 * @returns Array of enabled Native assets
 */
export const getNativeAssetsFromApi = (currencies: CurrencyFromAPI[]): EnabledAsset[] => {
  return currencies
    .filter(currency => currency.status && currency.token_type === 'Native')
    .map(convertApiCurrencyToEnabledAsset)
}

/**
 * Check if a wallet has a specific asset by symbol
 * @param walletAssets - Array of assets in the wallet
 * @param symbol - Asset symbol to check for
 * @returns boolean indicating if the asset exists
 */
export const hasAsset = (walletAssets: WalletAsset[], symbol: string): boolean => {
  return walletAssets.some(asset => asset.symbol.toUpperCase() === symbol.toUpperCase())
}

/**
 * Check if a wallet has a specific Native currency by symbol
 * @param walletAssets - Array of assets in the wallet
 * @param symbol - Native currency symbol to check for (e.g., 'ETH', 'CELO', 'XLM')
 * @returns boolean indicating if the Native asset exists
 */
export const hasNativeAsset = (walletAssets: WalletAsset[], symbol: string): boolean => {
  return walletAssets.some(asset => 
    asset.symbol.toUpperCase() === symbol.toUpperCase() && 
    asset.type === 'native'
  )
}

/**
 * Get all Native assets from wallet
 * @param walletAssets - Array of assets in the wallet
 * @returns Array of Native assets only
 */
export const getNativeAssets = (walletAssets: WalletAsset[]): WalletAsset[] => {
  return walletAssets.filter(asset => asset.type === 'native')
}

/**
 * Check if wallet has any Native assets
 * @param walletAssets - Array of assets in the wallet
 * @returns boolean indicating if wallet has any Native assets
 */
export const hasAnyNativeAssets = (walletAssets: WalletAsset[]): boolean => {
  return walletAssets.some(asset => asset.type === 'native')
}

/**
 * Check if wallet has specific enabled Native currencies
 * @param walletAssets - Array of assets in the wallet
 * @param enabledAssets - Array of enabled assets to check against
 * @returns Array of enabled Native assets that the wallet has
 */
export const getWalletEnabledNativeAssets = (walletAssets: WalletAsset[], enabledAssets: EnabledAsset[]): WalletAsset[] => {
  return walletAssets.filter(walletAsset => 
    walletAsset.type === 'native' &&
    enabledAssets.some(enabledAsset => 
      enabledAsset.symbol.toUpperCase() === walletAsset.symbol.toUpperCase() && 
      enabledAsset.isEnabled &&
      enabledAsset.type === 'native'
    )
  )
}

/**
 * Check for specific Native currency symbols in wallet
 * @param walletAssets - Array of assets in the wallet
 * @param symbols - Array of Native currency symbols to check for
 * @returns Object with symbol as key and boolean as value
 */
export const checkNativeCurrencySymbols = (walletAssets: WalletAsset[], symbols: string[]): Record<string, boolean> => {
  const result: Record<string, boolean> = {}
  
  symbols.forEach(symbol => {
    result[symbol] = hasNativeAsset(walletAssets, symbol)
  })
  
  return result
}

/**
 * Get a specific asset from wallet assets by symbol
 * @param walletAssets - Array of assets in the wallet
 * @param symbol - Asset symbol to find
 * @returns WalletAsset or undefined if not found
 */
export const getAssetBySymbol = (walletAssets: WalletAsset[], symbol: string): WalletAsset | undefined => {
  return walletAssets.find(asset => asset.symbol.toUpperCase() === symbol.toUpperCase())
}

/**
 * Check if wallet has any of the enabled assets
 * @param walletAssets - Array of assets in the wallet
 * @param enabledAssets - Array of enabled assets to check against
 * @returns Array of enabled assets that the wallet has
 */
export const getWalletEnabledAssets = (walletAssets: WalletAsset[], enabledAssets: EnabledAsset[]): WalletAsset[] => {
  return walletAssets.filter(walletAsset => 
    enabledAssets.some(enabledAsset => 
      enabledAsset.symbol.toUpperCase() === walletAsset.symbol.toUpperCase() && 
      enabledAsset.isEnabled
    )
  )
}

/**
 * Get missing enabled assets that the wallet doesn't have
 * @param walletAssets - Array of assets in the wallet
 * @param enabledAssets - Array of enabled assets to check against
 * @returns Array of enabled assets that the wallet is missing
 */
export const getMissingEnabledAssets = (walletAssets: WalletAsset[], enabledAssets: EnabledAsset[]): EnabledAsset[] => {
  return enabledAssets.filter(enabledAsset => 
    enabledAsset.isEnabled && 
    !walletAssets.some(walletAsset => 
      walletAsset.symbol.toUpperCase() === enabledAsset.symbol.toUpperCase()
    )
  )
}

/**
 * Check if wallet has assets for specific networks
 * @param walletAssets - Array of assets in the wallet
 * @param networks - Array of network names to check
 * @returns Object with network names as keys and boolean values
 */
export const getNetworkAssetStatus = (walletAssets: WalletAsset[], networks: string[]): Record<string, boolean> => {
  const status: Record<string, boolean> = {}
  
  networks.forEach(network => {
    status[network] = walletAssets.some(asset => asset.network === network)
  })
  
  return status
}

/**
 * Format asset balance for display
 * @param balance - Raw balance number
 * @param decimals - Number of decimal places
 * @param symbol - Asset symbol
 * @returns Formatted balance string
 */
export const formatAssetBalance = (balance: number, decimals: number, symbol: string): string => {
  const formattedBalance = (balance / Math.pow(10, decimals)).toFixed(decimals > 6 ? 6 : decimals)
  return `${formattedBalance} ${symbol}`
}

/**
 * Convert asset balance to USD value
 * @param balance - Raw balance number
 * @param decimals - Number of decimal places
 * @param priceUSD - Price per unit in USD
 * @returns USD value
 */
export const convertAssetToUSD = (balance: number, decimals: number, priceUSD: number): number => {
  const formattedBalance = balance / Math.pow(10, decimals)
  return formattedBalance * priceUSD
}

/**
 * Fetch wallet assets from connected wallet (real implementation)
 * @param walletType - Type of wallet ('evm' | 'stellar')
 * @param address - Wallet address
 * @returns Promise<WalletAsset[]>
 */
export const fetchWalletAssets = async (walletType: 'evm' | 'stellar', address: string): Promise<WalletAsset[]> => {
  // This function should be implemented with real wallet integration
  // For now, return empty array - will be populated by actual wallet balance fetching
  console.log(`Fetching assets for ${walletType} wallet: ${address}`)
  
  // TODO: Implement real wallet asset fetching
  // - For EVM: Use Web3 to fetch native token balance and ERC-20 token balances
  // - For Stellar: Use Horizon API to fetch account balances
  
  return []
}

/**
 * Check if wallet has specific Native currency symbols from API currencies
 * @param walletAssets - Array of assets in the wallet
 * @param apiCurrencies - Array of currencies from API
 * @returns Object with Native currency symbols and their availability status
 */
export const checkNativeCurrenciesFromApi = (walletAssets: WalletAsset[], apiCurrencies: CurrencyFromAPI[]): Record<string, boolean> => {
  const nativeCurrencies = getNativeAssetsFromApi(apiCurrencies)
  const result: Record<string, boolean> = {}
  
  nativeCurrencies.forEach(currency => {
    result[currency.symbol] = hasNativeAsset(walletAssets, currency.symbol)
  })
  
  return result
}
