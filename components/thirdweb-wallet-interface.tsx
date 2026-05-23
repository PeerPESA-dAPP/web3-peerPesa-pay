"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { createPublicClient, http, formatUnits } from 'viem'
import { celo, mainnet, polygon, arbitrum, optimism, base, bsc, avalanche, alephZeroTestnet } from 'viem/chains'
import { 
  ConnectWallet,
  useAddress,
  useDisconnect,
  useChain,
  useSwitchChain,
  useConnectionStatus,
  useTokenBalance,
  useBalance,
  useConnect,
  metamaskWallet,
  coinbaseWallet,
  walletConnect,
  rainbowWallet,
  trustWallet,
} from "@thirdweb-dev/react"
import { 
  StellarWalletsKit, 
  FreighterModule, 
  AlbedoModule, 
  xBullModule,
  RabetModule,
  WalletNetwork
} from "@creit.tech/stellar-wallets-kit"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TransactionForms } from "./transaction-forms"
import { useCurrency } from "@/contexts/CurrencyContext"
import { 
  WalletAsset, 
  EnabledAsset, 
  CurrencyFromAPI,
  CurrencyFromContext,
  CurrencyData,
  convertApiCurrencyToEnabledAsset,
  getEnabledAssetsFromApi,
  getEnabledAssetsFromContext,
  getEnabledAssetsFromAny,
  getNativeAssetsFromApi,
  hasNativeAsset,
  getNativeAssets,
  getWalletEnabledNativeAssets,
  checkNativeCurrencySymbols,
  checkNativeCurrenciesFromApi,
  fetchWalletAssets,
  formatAssetBalance,
  compareNativeCurrenciesWithWallet,
  getAllSupportedCurrenciesForNetwork,
  type MatchedCurrency,
} from "@/utils/assets"
import { 
  WalletIcon, 
  UserIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline"
import {
  ArrowUpIcon,
  ArrowDownIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  BitcoinIcon,
  LinkIcon,
  SendIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  HomeIcon,
  BellIcon,
  GlobeIcon,
  XIcon,
  ShieldAlertIcon,
  TagIcon,
  CheckCircleIcon,
  ZapIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useMiniPay } from "@/hooks/use-minipay"
import { WalletNotifications, useHasActiveNotifications, NotificationsPanel, useRecordToastNotifications } from "@/components/wallet-notifications"
import {
  parseSwapUrlParams,
  isSwapModeFromUrl,
  normalizeChainParam,
  normalizeTokenParam,
} from "@/lib/swap-url-params"
import { getCurrencyRate } from "@/utils/api"

interface Transaction {
  id: string
  type: "buy" | "sell" | "receive" | "send"
  amount: number
  currency: string
  fiatAmount: number
  date: string
  status: "completed" | "pending" | "failed"
}

interface WalletActivityItem {
  id: string
  hash: string
  type: "transfer" | "swap"
  direction: "out" | "in"
  amount: number
  asset: string
  timestamp: string
  status: "completed" | "failed"
  network: string
  counterparty?: string
}

interface ActivityFetchResult {
  items: WalletActivityItem[]
  hasMore: boolean
  nextCursor?: string | null
  nextBlock?: number | null
  mode: "stellar" | "evm-explorer" | "evm-rpc"
}

export function ThirdwebWalletInterface() {
  const searchParams = useSearchParams()
  const hasActiveNotifications = useHasActiveNotifications()
  useRecordToastNotifications()
  const { isMiniPay, miniPayVersion, miniPayCheckComplete } = useMiniPay()
  const [activeTab, setActiveTab] = useState("overview")
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false)
  
  // Parse swap URL params (rhino.fi style: ?mode=pay&chainIn=ETHEREUM&chainOut=ARBITRUM&token=USDT&tokenOut=USDC)
  const urlSwapParams = (() => {
    const params = parseSwapUrlParams(searchParams)
    if (!isSwapModeFromUrl(params) && !params.token && !params.chainIn) return null
    return {
      chainIn: params.chainIn ? normalizeChainParam(params.chainIn) : undefined,
      chainOut: params.chainOut ? normalizeChainParam(params.chainOut) : undefined,
      token: params.token ? normalizeTokenParam(params.token) : undefined,
      tokenOut: params.tokenOut ? normalizeTokenParam(params.tokenOut) : undefined,
    }
  })()

  // Auto-open swap form when URL has swap/bridge params (rhino.fi style)
  const hasUrlSwapParams = Boolean(
    urlSwapParams?.chainIn || urlSwapParams?.chainOut || urlSwapParams?.token || urlSwapParams?.tokenOut
  )
  useEffect(() => {
    if (hasUrlSwapParams) {
      setTransactionType("swap")
      setShowTransactionForms(true)
    }
  }, [hasUrlSwapParams])



  // Show MiniPay connection status toast
  useEffect(() => {
    if (miniPayCheckComplete) {
      if (isMiniPay) {
        // toast({
        //   title: "✅ MiniPay Connected",
        //   description: `Connected to MiniPay${miniPayVersion ? ` (v${miniPayVersion})` : ''}`,
        //   variant: "default",
        // })
      } else {
        // title: "ℹ️ Regular Wallet Mode",
      }
    }
  }, [miniPayCheckComplete, isMiniPay, miniPayVersion])


  // Use standalone currency hook
  const { 
    selectedCurrency,   
    setSelectedCurrency, 
    getCurrentCurrency, 
    exchangeRates,
    generalExchangeRates,
    convertAmount,
    currencies,
    loading: currencyLoading,
    error: currencyError,
    refetch: refetchCurrencies
  } = useCurrency()

  const [showTransactionForms, setShowTransactionForms] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [notificationLimit, setNotificationLimit] = useState(8)
  const [activeFormService, setActiveFormService] = useState("send")
  const [transactionType, setTransactionType] = useState<"send" | "buy" | "swap">("send")
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)

  const connectWalletRef = useRef<HTMLDivElement>(null)
  const [usdValue, setUsdValue] = useState(0.00)
  const [totalBalanceValue, setTotalBalanceValue] = useState(0.00)
  const [currencyFetching, setCurrencyFetching] = useState(false)

  // Supported tokens state
  const [supportedTokens, setSupportedTokens] = useState<any[]>([])
  const [supportedSendTokens, setSupportedSendTokens] = useState<any[]>([])
  const [supportedSendFiat, setSupportedSendFiat] = useState<any[]>([])
  const [supportedTokensLoading, setSupportedTokensLoading] = useState(false)
  
  const [stellarAddress, setStellarAddress] = useState<string | null>(null)
  const [walletType, setWalletType] = useState<'evm' | 'stellar' | null>(null)
  const [stellarBalance, setStellarBalance] = useState<number>(0)
  const [usdcStellarBalance, setUsdcStellarBalance] = useState<number>(0)
  const [stellarKit, setStellarKit] = useState<StellarWalletsKit | null>(null)
  const stellarKitRef = useRef<HTMLDivElement>(null)
  const currencyDropdownRef = useRef<HTMLDivElement>(null)
  const initialCurrenciesFetchedRef = useRef(false)
  const transactionsLoadMoreRef = useRef<HTMLDivElement>(null)
  const overviewTxLoadMoreRef = useRef<HTMLDivElement>(null)
  const [overviewTxVisible, setOverviewTxVisible] = useState(5)
  const [txTabVisible, setTxTabVisible] = useState(5)

  // Wallet asset management
  const [walletAssets, setWalletAssets] = useState<any[]>([])
  const [enabledAssets, setEnabledAssets] = useState<EnabledAsset[]>([])
  const [assetLoading, setAssetLoading] = useState(false)
  const [walletActivity, setWalletActivity] = useState<WalletActivityItem[]>([])
  const [walletActivityLoading, setWalletActivityLoading] = useState(false)
  const [walletActivityLoadingMore, setWalletActivityLoadingMore] = useState(false)
  const [walletActivityError, setWalletActivityError] = useState<string | null>(null)
  const [walletActivityHasMore, setWalletActivityHasMore] = useState(false)
  const [walletActivityMode, setWalletActivityMode] = useState<"stellar" | "evm-explorer" | "evm-rpc" | null>(null)
  const [stellarActivityCursor, setStellarActivityCursor] = useState<string | null>(null)
  const [evmActivityPage, setEvmActivityPage] = useState(1)
  const [evmRpcNextBlock, setEvmRpcNextBlock] = useState<number | null>(null)


  useEffect(() => {
    if (initialCurrenciesFetchedRef.current) return
    initialCurrenciesFetchedRef.current = true
    refetchCurrencies()
  }, [refetchCurrencies])

  // Convert API currencies to enabled assets when currencies are loaded
  useEffect(() => {
    if (currencies && currencies.length > 0) {
      const enabledAssetsFromCurrencies = getEnabledAssetsFromAny(currencies as CurrencyData[])
      setEnabledAssets(enabledAssetsFromCurrencies)
    }
  }, [currencies])

  // Thirdweb hooks
  const address = useAddress()
  const disconnect = useDisconnect()
  const chain = useChain()
  const switchChain = useSwitchChain()

  // Token balance hooks
  const { data: nativeBalance } = useBalance()

  // ERC-20 token balances: symbol -> balance number
  const [tokenBalances, setTokenBalances] = useState<Record<string, number>>({})
  const [tokenBalancesLoading, setTokenBalancesLoading] = useState(false)


  // ERC-20 balanceOf ABI fragment
  const erc20Abi = [
    {
      inputs: [{ name: 'account', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'decimals',
      outputs: [{ name: '', type: 'uint8' }],
      stateMutability: 'view',
      type: 'function',
    },
  ] as const

  // Map chain ID to viem chain object for public client
  const getViemChain = useCallback((chainId: number) => {
    const chainMap: Record<number, any> = {
      1: mainnet, 137: polygon, 42161: arbitrum, 10: optimism,
      8453: base, 56: bsc, 43114: avalanche, 42220: celo,
    }
    return chainMap[chainId] || celo
  }, [])

  // Well-known ERC-20 contract addresses as fallbacks when API doesn't provide them
  // chainId -> symbol -> contractAddress
  const KNOWN_TOKEN_CONTRACTS: Record<number, Record<string, string>> = {
    42220: { // Celo
      CUSD:  '0x765DE816845861e75A25fCA122bb6898B8B1282a',
      CEUR:  '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73',
      CREAL: '0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787',
      USDC:  '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
      USDT:  '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
    },
    1: { // Ethereum mainnet
      USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      DAI:  '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    },
    137: { // Polygon
      USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    },
    42161: { // Arbitrum
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    },
    10: { // Optimism
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    },
    8453: { // Base
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    },
    56: { // BNB Chain
      USDT: '0x55d398326f99059fF775485246999027B3197955',
      USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    },
    43114: { // Avalanche
      USDT: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
      USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    },
  }

  // Helper: extract contract address from API coin, with fallbacks for well-known tokens
  const getTokenContractForNetwork = useCallback((coin: any, networkName: string, chainId?: number): string | null => {
    const sym = (coin?.symbol || '').toUpperCase()

    // 1. Try API-provided contract address from the matching network entry
    try {
      const nets = typeof coin?.networks === 'string' ? JSON.parse(coin.networks || '[]') : (coin?.networks || [])
      if (Array.isArray(nets)) {
        const normTarget = networkName.toLowerCase().replace(/[\s_-]/g, '')
        for (const net of nets) {
          if (net.status !== 'active') continue
          const netName = (net.network || net.label || '').toLowerCase().replace(/[\s_-]/g, '')
          if (netName.includes(normTarget) || normTarget.includes(netName) || netName === normTarget) {
            const addr = net.contract_address || net.contractAddress || net.token_address || net.address || null
            if (addr && typeof addr === 'string' && addr.startsWith('0x') && addr.length === 42) return addr
          }
        }
      }
      // Top-level contract_address fallback
      const topAddr = coin?.contract_address
      if (topAddr && typeof topAddr === 'string' && topAddr.startsWith('0x') && topAddr.length === 42) return topAddr
    } catch { }

    // 2. Fall back to well-known hardcoded addresses by chainId
    if (chainId && KNOWN_TOKEN_CONTRACTS[chainId]?.[sym]) {
      return KNOWN_TOKEN_CONTRACTS[chainId][sym]
    }

    return null
  }, [])

  // Known explorer API URLs for token balance discovery
  const getExplorerApiUrl = useCallback((chainId: number): string | null => {
    const knownExplorers: Record<number, string> = {
      42220: 'https://api.celoscan.io/api',
      1: 'https://api.etherscan.io/api',
      137: 'https://api.polygonscan.com/api',
      42161: 'https://api.arbiscan.io/api',
      10: 'https://api-optimistic.etherscan.io/api',
      8453: 'https://api.basescan.org/api',
      56: 'https://api.bscscan.com/api',
      43114: 'https://api.snowtrace.io/api',
    }
    return knownExplorers[chainId] || null
  }, [])

  // Fetch all ERC-20 token balances for the connected EVM wallet using explorer tokenlist API
  const fetchWalletTokenBalances = useCallback(async (walletAddress: string, chainId: number) => {
    const explorerUrl = getExplorerApiUrl(chainId)
    if (!explorerUrl) return null

    try {
 

      const response = await fetch(
        `${explorerUrl}?module=account&action=tokenlist&address=${walletAddress}`
      )
      if (!response.ok) return null

      const data = await response.json()
      const tokens = Array.isArray(data?.result) ? data.result : []

      // Filter tokens with balance > 0 and map to a usable format
      const balances: Record<string, number> = {}
      const tokenDetails: Array<{
        symbol: string
        name: string
        balance: number
        contractAddress: string
        decimals: number
      }> = []


      console.log("11111 tokens", tokens)

      for (const token of tokens) {

        const rawBalance = token?.balance || '0'
        const decimals = Number(token?.decimals || 18)
        const balance = parseFloat(formatUnits(BigInt(rawBalance), decimals))

        if (balance > 0) {
          const symbol = (token?.symbol || '').toUpperCase()
          balances[symbol] = balance
          tokenDetails.push({
            symbol,
            name: token?.name || symbol,
            balance,
            contractAddress: token?.contractAddress || '',
            decimals,
          })
        }
      }

      console.log(`[fetchWalletTokenBalances] Explorer API returned ${tokenDetails.length} tokens with balance > 0 for ${walletAddress} on chain ${chainId}`, balances, tokenDetails)
      return { balances, tokenDetails }      
    } catch (error) {
      console.warn('[fetchWalletTokenBalances] Explorer tokenlist failed:', error)
      return null
    }
  }, [getExplorerApiUrl])

  // Fetch ERC-20 token balances when wallet is connected
  useEffect(() => {
    if (!address || !chain || walletType === 'stellar') return

    const currentChainId = chain.chainId as number
    const viemChain = getViemChain(currentChainId)
    const networkName = getNetworkName(currentChainId)
    const nativeSymbol = getNativeSymbolForChain(currentChainId)

    const loadBalances = async () => {
      setTokenBalancesLoading(true)

      // 1. Try explorer tokenlist API first (discovers ALL tokens with balance > 0)
      const explorerResult = await fetchWalletTokenBalances(address, currentChainId)
      if (explorerResult && Object.keys(explorerResult.balances).length > 0) {
        console.log(`[tokenBalances] Explorer discovered ${Object.keys(explorerResult.balances).length} tokens with balance:`, explorerResult.balances)
        setTokenBalances(explorerResult.balances)
        setTokenBalancesLoading(false)
        return
      }

      // 2. Fallback: manually read balances for known API currencies
      const tokensToCheck = (currencies || []).filter((coin: any) => {
        const type = String(coin?.token_type || '').toLowerCase()
        const active = coin?.coin_status === 'active' || coin?.status === 'active' || coin?.status === true
        if (!active || (type !== 'native')) return false
        if (coin.symbol?.toUpperCase() === nativeSymbol?.toUpperCase()) return false
        return getTokenContractForNetwork(coin, networkName, currentChainId) !== null
      })

      if (tokensToCheck.length === 0) {
        setTokenBalances({})
        setTokenBalancesLoading(false)
        return
      }

      const balances: Record<string, number> = {}
      const client = createPublicClient({
        chain: viemChain,
        transport: http(),
      })

      await Promise.all(tokensToCheck.map(async (coin: any) => {
        const sym = (coin.symbol || '').toUpperCase()
        const contractAddr = getTokenContractForNetwork(coin, networkName, currentChainId)
        if (!contractAddr) return

        try {
          const [rawBalance, decimals] = await Promise.all([
            client.readContract({
              address: contractAddr as `0x${string}`,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [address as `0x${string}`],
            }),
            client.readContract({
              address: contractAddr as `0x${string}`,
              abi: erc20Abi,
              functionName: 'decimals',
            }),
          ])
          balances[sym] = parseFloat(formatUnits(rawBalance as bigint, decimals as number))
        } catch (err) {
          console.warn(`[thirdweb] Failed to read balance for ${sym} at ${contractAddr}:`, err)
          balances[sym] = 0
        }
      }))

      setTokenBalances(balances)
      setTokenBalancesLoading(false)
    }

    loadBalances()
  }, [address, chain?.chainId, walletType, currencies, getViemChain, getTokenContractForNetwork, fetchWalletTokenBalances])

  // Keep native EVM token balance in sync with tokenBalances so getBalanceForSymbol works correctly
  useEffect(() => {
    if (!nativeBalance || !chain) return
    const nativeSymbol = getNativeSymbolForChain(chain.chainId as number)
    if (!nativeSymbol) return
    const nativeBal = Number(nativeBalance.displayValue) || 0
    setTokenBalances(prev => ({ ...prev, [nativeSymbol.toUpperCase()]: nativeBal }))
  }, [nativeBalance, chain?.chainId])

  // Sync Stellar balances into tokenBalances so getBalanceForSymbol works for Stellar wallets
  useEffect(() => {
    if (walletType !== 'stellar') return
    setTokenBalances(prev => ({
      ...prev,
      XLM: stellarBalance,
      USDC: usdcStellarBalance,
    }))
  }, [walletType, stellarBalance, usdcStellarBalance])

  // Function to check if wallet is available
  const isWalletAvailable = (walletName: string) => {
    if (typeof window === 'undefined') return false
    
    const ethereum = (window as any).ethereum
    if (!ethereum) return false
    
    switch (walletName.toLowerCase()) {
      case 'metamask':
        // Check for MetaMask specifically
        return ethereum.isMetaMask && !ethereum.isBraveWallet && !ethereum.isCoinbaseWallet
      case 'coinbase':
        return ethereum.isCoinbaseWallet
      case 'rainbow':
        return ethereum.isRainbow
      case 'trust':
        return ethereum.isTrust
      default:
        return true // For WalletConnect and others
    }
  }

  // Function to open ConnectWallet modal programmatically
  const openConnectWalletModal = async () => {
    try {
      console.log('Attempting to open ConnectWallet modal...')
      
      // Wait a bit for the DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // First try using the ref
      if (connectWalletRef.current) {
        const button = connectWalletRef.current.querySelector('button')
        if (button) {
          // console.log('Found ConnectWallet button via ref, clicking...')
          (button as HTMLButtonElement).click()
          return
        } else {
          console.log('No button found in ref container')
        }
      } else {
        console.log('ConnectWallet ref is null')
      }
      
      // Try multiple selectors to find the ConnectWallet button
      const selectors = [
        '[data-thirdweb-connect-wallet] button',
        '[data-testid*="connect-wallet"]',
        '[data-testid*="connect"]',
        'button[aria-label*="connect"]',
        'button:contains("Connect")',
      ]
      
      for (const selector of selectors) {
        const button = document.querySelector(selector)
        if (button) {
          // console.log(`Found ConnectWallet button with selector: ${selector}`)
          (button as HTMLButtonElement).click()
          return
        }
      }
      
      // Try to find any button with "Connect" text
      const allButtons = document.querySelectorAll('button')
      for (const button of allButtons) {
        if (button.textContent?.includes('Connect') || button.textContent?.includes('connect')) {
          // console.log('Found button with Connect text:', button.textContent)
          (button as HTMLButtonElement).click()
          return
        }
      }
      
      // If no button found, try to trigger via events
      console.log('No ConnectWallet button found, trying to trigger via events...')
      
      // Try multiple event approaches
      const events = [
        new CustomEvent('thirdweb:open-modal'),
        new CustomEvent('connect-wallet'),
        new Event('click', { bubbles: true }),
      ]
      
      for (const event of events) {
        window.dispatchEvent(event)
        document.dispatchEvent(event)
      }
      
      console.log('ConnectWallet modal should be opening...')
      
    } catch (error) {
      console.error('Failed to open ConnectWallet modal:', error)
    }
  }





  
  // Function to open the Thirdweb ConnectWallet modal for wallet selection
  const openConnectWallet = async () => {
    console.log('Opening ConnectWallet modal for wallet selection...')
    await openConnectWalletModal()
  }



  // Function to connect to Albedo wallet using albedo-intent
  const connecttoAlbedo = async () => {
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        toast({
          title: "Environment Error",
          description: "Wallet connection requires browser environment",
          variant: "destructive",
        })
        return
      }

      // Show loading state
      toast({
        title: "Connecting...",
        description: "Attempting to connect to Albedo wallet",
        variant: "default",
      })

      // Check if Albedo is available in the browser
      if (!(window as any).albedo) {
        // If Albedo extension is not installed, use albedo-intent flow
        const albedoUrl = 'https://albedo.link/intent/stellar-public-key'
        const intentParams = {
          message: 'Connect to PeerPesa Wallet',
          pubkey: '',
          callback: `${window.location.origin}/albedo-callback`,
          signature: '',
          callbackTemplate: '',
          callbackMessage: '',
          passphrase: '',
          pubkeyOnly: true
        }

        // Prepare the intent URL with parameters
        const intentUrl = `${albedoUrl}?${new URLSearchParams({
          message: intentParams.message,
          pubkeyOnly: 'true'
        })}`

        // Open Albedo Intent in new window
        const intentWindow = window.open(
          intentUrl,
          'albedo-intent',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        )

        // Listen for the callback
        const messageListener = (event: MessageEvent) => {
          if (event.origin !== 'https://albedo.link') return

          if (event.data.type === 'albedo-response') {
            try {
              const response = event.data.response
              if (response && response.pubkey) {
                // Set wallet data
                setStellarAddress(response.pubkey)
                setWalletType('stellar')
                
                // Fetch wallet balance
                fetchStellarBalance(response.pubkey)
                
                // Store in localStorage for persistence
                localStorage.setItem('peerpesa_wallet_type', 'stellar')
                localStorage.setItem('peerpesa_stellar_address', response.pubkey)
                
                toast({
                  title: "✅ Connected to Albedo",
                  description: `Wallet address: ${response.pubkey.slice(0, 8)}...${response.pubkey.slice(-8)}`,
                  variant: "default",
                })
                setShowWalletModal(false)
              } else {
                throw new Error('No public key received')
              }
            } catch (error) {
              console.error("Albedo intent response error:", error)
              toast({
                title: "Connection Failed",
                description: "Failed to process Albedo wallet response",
                variant: "destructive",
              })
            } finally {
              window.removeEventListener('message', messageListener)
              if (intentWindow) intentWindow.close()
            }
          }
        }

        window.addEventListener('message', messageListener)

        // Check if user closed the window without connecting
        const checkClosed = setInterval(() => {
          if (intentWindow?.closed) {
            clearInterval(checkClosed)
            window.removeEventListener('message', messageListener)
            toast({
              title: "Connection Cancelled",
              description: "Albedo wallet connection was cancelled",
              variant: "default",
            })
          }
        }, 1000)

      } else {
        // Direct browser extension connection
        const publicKey = await (window as any).albedo.publicKey({
          path: "m/44'/148'/0'",
          showSecret: false,
        })
        
        if (publicKey && publicKey.pubkey) {
          // Set wallet data
          setStellarAddress(publicKey.pubkey)
          setWalletType('stellar')
          
          // Fetch wallet balance
          fetchStellarBalance(publicKey.pubkey)
          
          // Store in localStorage for persistence
          localStorage.setItem('peerpesa_wallet_type', 'stellar')
          localStorage.setItem('peerpesa_stellar_address', publicKey.pubkey)
          
          toast({
            title: "✅ Connected to Albedo Extension",
            description: `Wallet address: ${publicKey.pubkey.slice(0, 8)}...${publicKey.pubkey.slice(-8)}`,
            variant: "default",
          })
          setShowWalletModal(false)
        }
      }

      // Log connection attempt for analytics
      console.log('Albedo wallet connection attempted:', {
        timestamp: new Date().toISOString(),
        hasExtension: !!(window as any).albedo,
        userAgent: navigator.userAgent
      })

    } catch (error) {
      console.error("Albedo connection error:", error)
      toast({
        title: "Connection Failed",
        description: `Failed to connect to Albedo wallet: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
      
      // Reset wallet state on failure
      setWalletType(null)
      setStellarAddress(null)
    }
  }




  // Function to fetch Stellar wallet balance
  const fetchStellarBalance = async (address: string) => {
    try {
      // Using Stellar Horizon API to fetch account info (mainnet)
      const response = await fetch(`https://horizon.stellar.org/accounts/${address}`)
      
      if (response.ok) {


        const accountData = await response.json()
        
        // Find XLM balance
        const xlmBalance = accountData.balances.find((balance: any) => balance.asset_type === 'native')
        if (xlmBalance) {
          setStellarBalance(parseFloat(xlmBalance.balance))
        }

        const usdcBalance = accountData.balances.find(
          (balance: any) => balance.asset_code === 'USDC'
        )
        if (usdcBalance) {
          setUsdcStellarBalance(parseFloat(usdcBalance.balance))
        }


      } else {
        console.warn('Failed to fetch Stellar balance:', response.status)
      }
    } catch (error) {


      console.error('Error fetching Stellar balance:', error)
      setStellarBalance(0)
    }
  }

  // Function to get current network name
  const getCurrentNetwork = (): string => {
    if (walletType === 'stellar') {
      return 'Stellar'
    }
    if (chain) {
      return getNetworkName(chain.chainId as number)
    }
    return 'Ethereum' // Default
  }

  // Function to filter assets by current network
  const getAssetsForCurrentNetwork = (): EnabledAsset[] => {
    const currentNetwork = getCurrentNetwork()
    return enabledAssets.filter(asset => asset.network === currentNetwork)
  }

  // Function to get Native assets for current network
  const getNativeAssetsForCurrentNetwork = (): EnabledAsset[] => {
    const currentNetwork = getCurrentNetwork()
    return enabledAssets.filter(asset => 
      asset.network === currentNetwork && 
      asset.type === 'native' && 
      asset.isEnabled
    )
  }

  // Function to check if wallet has specific Native currency from API
  const checkWalletNativeCurrency = (symbol: string): boolean => {
    return hasNativeAsset(walletAssets, symbol)
  }

  // Function to check multiple Native currencies from API currencies
  const checkNativeCurrenciesFromApiData = (): Record<string, boolean> => {
    if (!currencies || currencies.length === 0) return {}
    
    // Check if currencies are in API format
    const hasApiFormat = currencies.some(currency => 'isActive' in currency)
    
    if (hasApiFormat) {
      const apiCurrencies = currencies.filter(currency => 'isActive' in currency) as unknown as CurrencyFromAPI[]
      return checkNativeCurrenciesFromApi(walletAssets, apiCurrencies)
    }
    
    // For CurrencyContext format, just check symbols
    const result: Record<string, boolean> = {}
    currencies.forEach(currency => {
      if ('status' in currency && currency.status === "active") {
        result[currency.symbol] = hasNativeAsset(walletAssets, currency.symbol)
      }
    })
    
    return result
  }

  // Function to get Native assets that are enabled from API
  const getEnabledNativeAssetsFromApi = (): EnabledAsset[] => {
    if (!currencies || currencies.length === 0) return []

    // Check if currencies are in API format
    const hasApiFormat = currencies.some(currency => 'isActive' in currency)

    if (hasApiFormat) {
      const apiCurrencies = currencies.filter(currency => 'isActive' in currency) as unknown as CurrencyFromAPI[]
      return getNativeAssetsFromApi(apiCurrencies)
    }
    
    // For CurrencyContext format, return all enabled assets as native
    return enabledAssets.filter(asset => asset.isEnabled)
  }

  // Function to check if wallet has any of the enabled Native currencies
  const getWalletEnabledNativeAssetsData = (): WalletAsset[] => {

    return getWalletEnabledNativeAssets(walletAssets, enabledAssets)
  }



  // Function to disconnect from Stellar wallet
  const disconnectStellarWallet = () => {
    setStellarAddress(null)
    setWalletType(null)
    setStellarBalance(0)
    setUsdcStellarBalance(0)
    
    // Clear localStorage
    localStorage.removeItem('peerpesa_wallet_type')
    localStorage.removeItem('peerpesa_stellar_address')
    
    toast({
      title: "Wallet Disconnected",
      description: "Stellar wallet has been disconnected",
      variant: "default",
    })
  }

  // Initialize StellarWalletsKit
  useEffect(() => {
    const initializeKit = async () => {
      if (typeof window !== 'undefined') {
        try {
          const kit = new StellarWalletsKit({
            network: WalletNetwork.PUBLIC,
            modules: [
              new FreighterModule(),
              new AlbedoModule(),
              new xBullModule(),
              new RabetModule()
            ]
          })
          setStellarKit(kit)
        } catch (error) {
          console.error('Failed to initialize StellarWalletsKit:', error)
        }
      }
    }
    initializeKit()
  }, [])

  // Load saved wallet data on component mount
  useEffect(() => {
    const savedWalletType = localStorage.getItem('peerpesa_wallet_type')
    const savedStellarAddress = localStorage.getItem('peerpesa_stellar_address')
    
    if (savedWalletType === 'stellar' && savedStellarAddress) {
      setWalletType('stellar')
      setStellarAddress(savedStellarAddress)
      fetchStellarBalance(savedStellarAddress)
    }
  }, [])
  const connectionStatus = useConnectionStatus()

  // Connect hook for direct wallet connection
  const connect = useConnect()

  const isConnected = connectionStatus === "connected"

  // Prevent hydration mismatch: thirdweb/Stellar restore wallet state from
  // localStorage synchronously on the client, so the first client render can
  // differ from the server-rendered HTML. Defer wallet-dependent UI until after mount.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Sync EVM connection status — reset token balances when wallet disconnects
  useEffect(() => {
    if (isConnected && address) {
      if (!(walletType === 'stellar' && stellarAddress)) {
        setWalletType('evm')
      }

      toast({
        title: "Wallet Connected",
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
        variant: "default",
      })
    } else if (!isConnected && !address && !stellarAddress) {
      // Reset balances when no wallet is connected (neither EVM nor Stellar)
      setTokenBalances({})
      setUsdValue(0.00)
    }
  }, [isConnected, address, stellarAddress, walletType])

  // Handle Stellar wallet balance updates
  useEffect(() => {
    if (walletType === 'stellar' && stellarAddress) {
      fetchStellarBalance(stellarAddress)
    }
  }, [walletType, stellarAddress])

  // Fetch supported tokens when wallet connects or token balances change
  useEffect(() => {
    
    if (isConnected && address && chain) {
      fetchSupportedTokens()
    } else {
      setSupportedTokens(currencies)
    }
    setSupportedSendFiat(currencies.filter((currency: any) => currency.token_type?.toLowerCase() === "fiat" && (currency.coin_status === "active" || currency.status === "active")));

  }, [isConnected, address, chain, nativeBalance, currencies])

  // Handle click outside currency dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target as Node)) {
        setShowCurrencyDropdown(false)
      }
    }

    if (showCurrencyDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCurrencyDropdown])

  

  const handleDisconnect = async () => {
    try {
      await disconnect()

      // Clear wallet type if Stellar is not connected.
      if (!stellarAddress) {
        setWalletType(null)
      }
      
      // Reset balances on EVM disconnect
      setTokenBalances({})
      
      toast({
        title: "Wallet Disconnected",
        description: "You have been disconnected from your wallet.",
        variant: "default",
      })
    } catch (error) {
      console.error("Disconnect failed:", error)
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect wallet. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSwitchChain = async (chainId: number) => {
    try {
      await switchChain(chainId)
      toast({
        title: "Chain Switched",
        description: "Network changed successfully",
        variant: "default",
      })
    } catch (error) {
      console.error("Chain switch failed:", error)
      toast({
        title: "Chain Switch Failed",
        description: "Failed to switch network. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const getNetworkName = (chainId?: number) => {
    if (!chainId) return "Ethereum"
    const networks: { [key: number]: string } = {
      1: "Ethereum",
      137: "Polygon",
      42161: "Arbitrum",
      10: "Optimism",
      8453: "Base",
      56: "BSC",
      81457: "Blast",
      43114: "Avalanche",
      42220: "Celo",
      324: "zkSync Era",
    }
    return networks[chainId] || "Ethereum"
  }

  // Native token symbol per chain (for balance resolution)
  const getNativeSymbolForChain = (chainId?: number) => {
    if (!chainId) return "ETH"
    const symbols: { [key: number]: string } = {
      1: "ETH",
      137: "MATIC",
      42161: "ETH",
      10: "ETH",
      8453: "ETH",
      56: "BNB",
      81457: "ETH",
      43114: "AVAX",
      42220: "CELO",
      324: "ETH",
    }
    return symbols[chainId] ?? "ETH"
  }

  // Function to fetch supported tokens for the connected wallet
  const fetchSupportedTokens = async () => {
    if (!address || !chain) return
    
    try {
      setSupportedTokensLoading(true)
      setSupportedTokens(currencies)
    } catch (error) {
      console.error('Error fetching supported tokens:', error)
    } finally {
      setSupportedTokensLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  // Currency icon from public/flag (e.g. USD.png, usdc.png, ugx.png)
  const getCurrencyFlagIcon = (symbol: string) => {
    if (!symbol) return null
    const filename = symbol.toUpperCase() === "USD" ? "USD" : symbol.toLowerCase()
    return `/flag/${filename}.png`
  }

  const getAssetIconFallback = (asset: any): string | null => {
    if (!asset?.icon || typeof asset.icon !== "string") return null
    if (asset.icon.startsWith("http") || asset.icon.startsWith("/")) return asset.icon
    return null
  }

  const exchangeAmount = (amount: string, symbol: string, currency: string) => {
    try {
      // Prefer sale_rate embedded in the supported-currencies list
      const saleRate = getCurrencyRate(currencies, symbol)
      if (saleRate !== null && saleRate > 0) {
        return (saleRate * Number(amount)).toFixed(2)
      }
      // Fallback: generalExchangeRates (quote-currency specific)
      const rateEntry = generalExchangeRates.find(
        (rate: any) => rate.price?.base_coin === symbol && rate.price?.quote_coin === currency
      )
      if (rateEntry) {
        return (Number(rateEntry.price?.marketcap_amount) * Number(amount)).toFixed(2)
      }
      return (0).toFixed(2)
    } catch {
      return (0).toFixed(2)
    }
  }

  const formatFiatExchangeRate = (value: number): string => {
    if (!Number.isFinite(value)) return "0.00"
    const decimals = Math.abs(value) >= 1 ? 2 : 4
    return value.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  // Calculate total balance in selected fiat currency as the sum of all supported assets
  useEffect(() => {
    let totalValue = 0
    const quoteCurrency = selectedCurrency || "USD"

    const getQuoteRate = (symbol: string) => {
      // Prefer sale_rate from the supported-currencies list
      const saleRate = getCurrencyRate(currencies, symbol)
      if (saleRate !== null && saleRate > 0) return saleRate
      // Fallback: generalExchangeRates
      const r = generalExchangeRates.find(
        (rate: any) => rate.price?.base_coin === symbol && rate.price?.quote_coin === quoteCurrency
      )
      return r ? Number(r.price?.marketcap_amount) : 0
    }

    if (walletType === "stellar") {
      totalValue += stellarBalance * getQuoteRate("XLM")
      totalValue += usdcStellarBalance * getQuoteRate("USDC")
      setSupportedSendTokens(supportedTokens.filter((t: any) => t.symbol === "XLM" || t.symbol === "USDC"))
    } else if (generalExchangeRates.length > 0) {
      const nativeSymbol = getNativeSymbolForChain(chain ? (chain.chainId as number) : undefined)
      const activeSupportedAssets = (supportedTokens || [])
        .filter((asset: any) => {
          const type = String(asset?.token_type || "").toLowerCase()
          const active = asset?.coin_status === "active" || asset?.status === "active" || asset?.status === true || asset?.isActive === true
          return active && type !== "fiat"
        })
        .reduce((acc: any[], asset: any) => {
          const symbol = String(asset?.symbol || "").toUpperCase()
          if (!symbol) return acc
          if (acc.some((a) => String(a?.symbol || "").toUpperCase() === symbol)) return acc
          acc.push(asset)
          return acc
        }, [])

      activeSupportedAssets.forEach((asset: any) => {
        const assetSymbol = String(asset?.symbol || "")
        const sym = assetSymbol.toUpperCase()
        const isNative = sym === nativeSymbol?.toUpperCase()
        const balance = isNative && nativeBalance?.displayValue != null
          ? Number(nativeBalance.displayValue)
          : (sym in tokenBalances ? tokenBalances[sym] : Number(asset?.balanceFormatted ?? asset?.balance ?? 0))
        const quoteRate = getQuoteRate(assetSymbol)
        if (quoteRate > 0 && balance > 0) totalValue += balance * quoteRate
      })
      setSupportedSendTokens(supportedTokens)
    }

    setSupportedSendFiat(currencies.filter((c: any) => c.token_type?.toLowerCase() === "fiat" && (c.coin_status === "active" || c.status === "active")))
    setTotalBalanceValue(totalValue)
  }, [
    supportedTokens,
    generalExchangeRates,
    selectedCurrency,
    walletType,
    stellarBalance,
    usdcStellarBalance,
    chain,
    nativeBalance?.displayValue,
    currencies,
    tokenBalances,
  ])


  const getTransactionIcon = (type: string) => {
    const iconClass = "h-4 w-4"
    switch (type) {
      case "buy":
        return (
          <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
            <ArrowUpIcon className={iconClass + " text-green-600"} />
          </div>
        )
      case "sell":
        return (
          <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
            <ArrowDownIcon className={iconClass + " text-red-600"} />
          </div>
        )
      case "receive":
        return (
          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
            <ArrowDownIcon className={iconClass + " text-blue-600"} />
          </div>
        )
      case "send":
        return (
          <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
            <ArrowUpIcon className={iconClass + " text-orange-600"} />
          </div>
        )
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">Completed</Badge>
      case "pending":
        return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">Pending</Badge>
      case "failed":
        return <Badge className="bg-red-50 text-red-700 border-red-200 text-xs">Failed</Badge>
      default:
        return null
    }
  }

  const formatHash = (hash: string) => {
    if (!hash) return "-"
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`
  }

  const resolveRpcUrl = (rawUrl?: string) => {
    if (!rawUrl) return null
    const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || ""
    return rawUrl.replace(/\$\{THIRDWEB_API_KEY\}|\{THIRDWEB_API_KEY\}/g, clientId)
  }

  const fetchStellarActivity = async (walletAddress: string, cursor?: string | null): Promise<ActivityFetchResult> => {
    const params = new URLSearchParams({ order: "desc", limit: "25" })
    if (cursor) params.set("cursor", cursor)
    const response = await fetch(`https://horizon.stellar.org/accounts/${walletAddress}/payments?${params.toString()}`)
    if (!response.ok) throw new Error("Failed to fetch Stellar activity")
    const data = await response.json()
    const records = data?._embedded?.records || []
    const lowerAddress = walletAddress.toLowerCase()

    const items = records
      .map((record: any) => {
        const from = String(record?.from || "").toLowerCase()
        const to = String(record?.to || "").toLowerCase()
        const amount = Number(record?.amount || 0)
        if (!Number.isFinite(amount) || amount <= 0) return null

        const isOut = from === lowerAddress
        const asset = record?.asset_type === "native" ? "XLM" : (record?.asset_code || "ASSET")

        return {
          id: String(record?.id || record?.paging_token || record?.transaction_hash || crypto.randomUUID()),
          hash: String(record?.transaction_hash || ""),
          type: "transfer",
          direction: isOut ? "out" : "in",
          amount,
          asset,
          timestamp: String(record?.created_at || new Date().toISOString()),
          status: "completed",
          network: "Stellar",
          counterparty: isOut ? to : from,
        } as WalletActivityItem
      })
      .filter((item: WalletActivityItem | null): item is WalletActivityItem => Boolean(item))

    const nextCursor = records.length > 0 ? String(records[records.length - 1]?.paging_token || "") : null
    return { items, hasMore: records.length >= 25, nextCursor, mode: "stellar" }
  }

  const fetchEvmActivity = async (
    walletAddress: string,
    page: number,
  ): Promise<ActivityFetchResult> => {
    const chainId = chain ? (chain.chainId as number) : 0
    const networkName = getNetworkName(chainId)
    const nativeSym = getNativeSymbolForChain(chainId)
    const lowerAddress = walletAddress.toLowerCase()

    const knownExplorers: Record<number, string> = {
      42220: 'https://api.celoscan.io/api',
      1: 'https://api.etherscan.io/api',
      137: 'https://api.polygonscan.com/api',
      42161: 'https://api.arbiscan.io/api',
      10: 'https://api-optimistic.etherscan.io/api',
      8453: 'https://api.basescan.org/api',
      56: 'https://api.bscscan.com/api',
      43114: 'https://api.snowtrace.io/api',
    }
    const explorerApiUrl =
      (chain as any)?.blockExplorers?.default?.apiUrl ||
      knownExplorers[chainId] ||
      null

    if (!explorerApiUrl) return { items: [], hasMore: false, mode: "evm-explorer" }

    const base = `${explorerApiUrl}?address=${walletAddress}&sort=desc&page=${page}&offset=25`

    // Fetch normal txns (native transfers + contract calls) and ERC-20 transfers in parallel
    const [normalRes, tokenRes] = await Promise.allSettled([
      fetch(`${base}&module=account&action=txlist`).then(r => r.json()),
      fetch(`${base}&module=account&action=tokentx`).then(r => r.json()),
    ])

    const normalTxs: any[] = (normalRes.status === 'fulfilled' && Array.isArray(normalRes.value?.result))
      ? normalRes.value.result : []
    const tokenTxs: any[] = (tokenRes.status === 'fulfilled' && Array.isArray(tokenRes.value?.result))
      ? tokenRes.value.result : []

    const items: WalletActivityItem[] = []
    const seen = new Set<string>()

    // ERC-20 token transfers → "transfer"
    for (const tx of tokenTxs) {
      const key = `${tx.hash}_tok_${tx.tokenSymbol}_${tx.value}`
      if (seen.has(key)) continue
      seen.add(key)

      const from = String(tx.from || '').toLowerCase()
      const isOut = from === lowerAddress
      const rawAmt = BigInt(tx.value || '0')
      const decimals = Number(tx.tokenDecimal || 18)
      const amount = Number(formatUnits(rawAmt, decimals))
      if (amount <= 0) continue

      items.push({
        id: key,
        hash: String(tx.hash || ''),
        type: 'transfer',
        direction: isOut ? 'out' : 'in',
        amount,
        asset: tx.tokenSymbol || 'TOKEN',
        timestamp: tx.timeStamp ? new Date(Number(tx.timeStamp) * 1000).toISOString() : new Date().toISOString(),
        status: 'completed',
        network: networkName,
        counterparty: isOut ? String(tx.to || '').toLowerCase() : from,
      })
    }

    // Build a set of hashes that already have token transfers (likely swaps)
    const hashesWithTokens = new Set(tokenTxs.map((t: any) => String(t.hash || '')))

    // Normal txns: swap (has input data) or native transfer (value > 0, no input)
    for (const tx of normalTxs) {
      const hash = String(tx.hash || '')
      const hasInput = tx.input && tx.input !== '0x'
      const wei = BigInt(tx.value || '0')
      const amount = Number(formatUnits(wei, 18))
      const failed = tx.isError === '1' || tx.txreceipt_status === '0'
      const from = String(tx.from || '').toLowerCase()
      const isOut = from === lowerAddress

      if (hasInput && hashesWithTokens.has(hash)) {
        // Contract interaction that moved tokens → swap
        const key = `${hash}_swap`
        if (!seen.has(key)) {
          seen.add(key)
          items.push({
            id: key,
            hash,
            type: 'swap',
            direction: isOut ? 'out' : 'in',
            amount,
            asset: nativeSym,
            timestamp: tx.timeStamp ? new Date(Number(tx.timeStamp) * 1000).toISOString() : new Date().toISOString(),
            status: failed ? 'failed' : 'completed',
            network: networkName,
            counterparty: String(tx.to || '').toLowerCase(),
          })
        }
      } else if (!hasInput && amount > 0) {
        // Plain native transfer
        const key = `${hash}_nat`
        if (!seen.has(key)) {
          seen.add(key)
          items.push({
            id: key,
            hash,
            type: 'transfer',
            direction: isOut ? 'out' : 'in',
            amount,
            asset: nativeSym,
            timestamp: tx.timeStamp ? new Date(Number(tx.timeStamp) * 1000).toISOString() : new Date().toISOString(),
            status: failed ? 'failed' : 'completed',
            network: networkName,
            counterparty: isOut ? String(tx.to || '').toLowerCase() : from,
          })
        }
      }
    }

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const hasMore = normalTxs.length >= 25 || tokenTxs.length >= 25
    return { items, hasMore, mode: "evm-explorer" }
  }

  const loadInitialWalletActivity = async () => {
    const hasStellar = walletType === "stellar" && Boolean(stellarAddress)
    const hasEvm = Boolean(isConnected && address)

    if (!hasStellar && !hasEvm) {
      setWalletActivity([])
      setWalletActivityError(null)
      setWalletActivityHasMore(false)
      setWalletActivityMode(null)
      return
    }

    setWalletActivityLoading(true)
    setWalletActivityError(null)
    setWalletActivityHasMore(false)
    setStellarActivityCursor(null)
    setEvmActivityPage(1)
    setEvmRpcNextBlock(null)

    try {
      if (hasStellar && stellarAddress) {
        const result = await fetchStellarActivity(stellarAddress, null)
        setWalletActivity(result.items)
        setWalletActivityHasMore(result.hasMore)
        setStellarActivityCursor(result.nextCursor || null)
        setWalletActivityMode(result.mode)
      } else if (hasEvm && address) {
        const result = await fetchEvmActivity(address, 1)
        setWalletActivity(result.items)
        setWalletActivityHasMore(result.hasMore)
        setWalletActivityMode(result.mode)
        setEvmActivityPage(2)
      }
    } catch (error: any) {
      setWalletActivity([])
      setWalletActivityError(error?.message || "Failed to load wallet activity")
      setWalletActivityHasMore(false)
    } finally {
      setWalletActivityLoading(false)
    }
  }

  const loadMoreWalletActivity = async () => {
    if (walletActivityLoadingMore || !walletActivityHasMore) return
    setWalletActivityLoadingMore(true)
    setWalletActivityError(null)
    try {
      if (walletActivityMode === "stellar" && stellarAddress) {
        const result = await fetchStellarActivity(stellarAddress, stellarActivityCursor)
        setWalletActivity((prev) => [...prev, ...result.items])
        setWalletActivityHasMore(result.hasMore)
        setStellarActivityCursor(result.nextCursor || null)
      } else if ((walletActivityMode === "evm-explorer" || walletActivityMode === "evm-rpc") && address) {
        const result = await fetchEvmActivity(address, evmActivityPage)
        setWalletActivity((prev) => [...prev, ...result.items])
        setWalletActivityHasMore(result.hasMore)
        setWalletActivityMode(result.mode)
        setEvmActivityPage((prev) => prev + 1)
      }
    } catch (error: any) {
      setWalletActivityError(error?.message || "Failed to load more activity")
    } finally {
      setWalletActivityLoadingMore(false)
    }
  }

  // Transactions tab: show more local items on scroll, then fetch more from chain
  useEffect(() => {
    if (activeTab !== "transactions") return
    const hasMoreLocal = walletActivity.length > txTabVisible
    if (!hasMoreLocal && !walletActivityHasMore) return
    const sentinel = transactionsLoadMoreRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting && !walletActivityLoading && !walletActivityLoadingMore) {
          if (walletActivity.length > txTabVisible) {
            setTxTabVisible((prev) => prev + 5)
          } else {
            loadMoreWalletActivity()
          }
        }
      },
      { root: null, rootMargin: "220px", threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [activeTab, walletActivityHasMore, walletActivityLoading, walletActivityLoadingMore, walletActivity.length, txTabVisible])

  // Overview recent transactions: show more on scroll
  useEffect(() => {
    if (activeTab !== "overview") return
    if (walletActivity.length <= overviewTxVisible) return
    const sentinel = overviewTxLoadMoreRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setOverviewTxVisible((prev) => prev + 5)
        }
      },
      { root: null, rootMargin: "220px", threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [activeTab, walletActivity.length, overviewTxVisible])

  useEffect(() => {
    if (activeTab === "overview" || activeTab === "transactions" || activeTab === "notifications" || showNotifications) {
      loadInitialWalletActivity()
    }
  }, [activeTab, showNotifications, walletType, stellarAddress, isConnected, address, chain?.chainId])

  const totalSentActivity = walletActivity
    .filter((item) => item.direction === "out")
    .reduce((sum, item) => sum + item.amount, 0)

  const totalReceivedActivity = walletActivity
    .filter((item) => item.direction === "in")
    .reduce((sum, item) => sum + item.amount, 0)

  const averageActivity = walletActivity.length > 0
    ? walletActivity.reduce((sum, item) => sum + item.amount, 0) / walletActivity.length
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Thirdweb Header - KEEP THIS */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-md mx-auto px-6">
          <div className="flex justify-between items-center h-16">

            <div className="flex items-center">
              <div className="flex items-center" style={{ cursor: "pointer" }} onClick={() => setActiveTab("overview")}>
                <img src="/images/peerpesa-logo.png" alt="PeerPesa" className="h-10 object-contain" />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Show connected wallet info based on wallet type.
                  `mounted` guard prevents server/client HTML mismatch — thirdweb
                  restores wallet from localStorage synchronously before hydration. */}
              {mounted && ((isConnected && address) || (walletType === 'stellar' && stellarAddress) || (isMiniPay && address)) ? (
                <div className="flex items-center space-x-2">
                  {walletType === 'stellar' && stellarAddress ? (
                    // Stellar wallet connected
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={disconnectStellarWallet}
                        className="flex items-center space-x-2"
                      >
                        <UserIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">{stellarAddress.slice(0, 6)}...{stellarAddress.slice(-4)}</span>
                      </Button>
                    </>
                  ) : isMiniPay && address ? (
                    // MiniPay wallet connected
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnect}
                        className="flex items-center space-x-2 border-[#19B17A] text-[#19B17A]"
                      >
                        <UserIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">{formatAddress(address)}</span>
                      </Button>
                    </>
                  ) : (
                    // EVM wallet connected
                    <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    className="flex items-center space-x-2"
                  >
                    <UserIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">{address ? formatAddress(address) : 'Unknown'}</span>
                      </Button>
                    </>
                  )}
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                      className="flex items-center"
                    >
                      <Cog6ToothIcon className="w-4 h-4" />
                    </Button>
                    
                    {/* Settings Dropdown */}
                    {showSettingsDropdown && (
                      <div className="fixed left-1/2 transform -translate-x-1/2 mt-2 w-[90%] max-w-[calc(28rem*0.9)] bg-white rounded-lg shadow-xl border border-gray-200 z-50 flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {isMiniPay && address ? 'MiniPay Wallet' : walletType === 'stellar' ? 'Stellar Wallet' : 'EVM Wallet'}
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setShowSettingsDropdown(false)}
                          >
                            <XIcon className="h-4 w-4" />
                  </Button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <LinkIcon className={`h-4 w-4 ${isMiniPay && address ? 'text-[#19B17A]' : walletType === 'stellar' ? 'text-blue-500' : 'text-green-500'}`} />
                                <div>
                                  <p className="font-medium text-gray-900">Wallet Connected</p>
                                  <p className="text-sm text-gray-600">
                                    {isMiniPay && address
                                      ? `${address.slice(0, 6)}...${address.slice(-4)}`
                                      : walletType === 'stellar' && stellarAddress 
                                      ? `${stellarAddress.slice(0, 6)}...${stellarAddress.slice(-4)}`
                                      : address 
                                        ? `${address.slice(0, 6)}...${address.slice(-4)}`
                                        : "Not connected"
                                    }
                                  </p>
                                </div>
                              </div>
                              <Badge className={`${isMiniPay && address ? 'bg-green-50 text-[#19B17A] border-[#19B17A]' : walletType === 'stellar' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                Active
                              </Badge>
                            </div>

                            {/* Network/Balance Information */}
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <GlobeIcon className={`h-4 w-4 ${isMiniPay && address ? 'text-[#19B17A]' : walletType === 'stellar' ? 'text-blue-500' : 'text-purple-500'}`} />
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {isMiniPay && address ? 'Network' : walletType === 'stellar' ? 'Balance' : 'Network'}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {isMiniPay && address 
                                        ? 'Celo Mainnet'
                                        : walletType === 'stellar' 
                                        ? `${stellarBalance} XLM`
                                        : getNetworkName(chain ? (chain.chainId as number) : undefined)
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {walletType !== 'stellar' && !isMiniPay && (
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => {
                                      handleSwitchChain(1)
                                      setShowSettingsDropdown(false)
                                    }}
                                    className={`px-3 py-2 text-xs rounded-md border ${
                                      chain?.chainId === 1
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                    }`}
                                  >
                                    Ethereum
                                  </button>
                                <button
                                  onClick={() => {
                                    handleSwitchChain(137)
                                    setShowSettingsDropdown(false)
                                  }}
                                  className={`px-3 py-2 text-xs rounded-md border ${
                                    chain?.chainId === 137
                                      ? "bg-purple-50 text-purple-700 border-purple-200"
                                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                  }`}
                                >
                                  Polygon
                                </button>
                                <button
                                  onClick={() => {
                                    handleSwitchChain(42161)
                                    setShowSettingsDropdown(false)
                                  }}
                                  className={`px-3 py-2 text-xs rounded-md border ${
                                    chain?.chainId === 42161
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                  }`}
                                >
                                  Arbitrum
                                </button>
                                <button
                                  onClick={() => {
                                    handleSwitchChain(10)
                                    setShowSettingsDropdown(false)
                                  }}
                                  className={`px-3 py-2 text-xs rounded-md border ${
                                    chain?.chainId === 10
                                      ? "bg-red-50 text-red-700 border-red-200"
                                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                  }`}
                                >
                                  OP Mainnet
                                </button>
                                <button
                                  onClick={() => {
                                    handleSwitchChain(8453)
                                    setShowSettingsDropdown(false)
                                  }}
                                  className={`px-3 py-2 text-xs rounded-md border ${
                                    chain?.chainId === 8453
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                  }`}
                                >
                                  Base
                                </button>
                                <button
                                  onClick={() => {
                                    handleSwitchChain(56)
                                    setShowSettingsDropdown(false)
                                  }}
                                  className={`px-3 py-2 text-xs rounded-md border ${
                                    chain?.chainId === 56
                                      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                  }`}
                                >
                                  BNB Chain
                                </button>
                                <button
                                  onClick={() => {
                                    handleSwitchChain(81457)
                                    setShowSettingsDropdown(false)
                                  }}
                                  className={`px-3 py-2 text-xs rounded-md border ${
                                    chain?.chainId === 81457
                                      ? "bg-orange-50 text-orange-700 border-orange-200"
                                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                  }`}
                                >
                                  Blast
                                </button>
                                <button
                                  onClick={() => {
                                    handleSwitchChain(43114)
                                    setShowSettingsDropdown(false)
                                  }}
                                  className={`px-3 py-2 text-xs rounded-md border ${
                                    chain?.chainId === 43114
                                      ? "bg-red-50 text-red-700 border-red-200"
                                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                  }`}
                                >
                                  Avalanche
                                </button>
                                <button
                                  onClick={() => {
                                    handleSwitchChain(42220)
                                    setShowSettingsDropdown(false)
                                  }}
                                  className={`px-3 py-2 text-xs rounded-md border ${
                                    chain?.chainId === 42220
                                      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                  }`}
                                >
                                  Celo
                                </button>
                                <button
                                  onClick={() => {
                                    handleSwitchChain(324)
                                    setShowSettingsDropdown(false)
                                  }}
                                  className={`px-3 py-2 text-xs rounded-md border ${
                                    chain?.chainId === 324
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                  }`}
                                >
                                  zkSync Era
                                </button>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <TrendingUpIcon className="h-4 w-4 text-blue-500" />
                                <div>
                                  <p className="font-medium text-gray-900">Portfolio Performance</p>
                                  <p className="text-sm text-gray-600">+12.5% this month</p>
                                </div>
                              </div>
                              <Badge className="bg-blue-50 text-blue-700 border-blue-200">Tracking</Badge>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <RefreshCwIcon className="h-4 w-4 text-orange-500" />
                                <div>
                                  <p className="font-medium text-gray-900">Auto-Sync</p>
                                  <p className="text-sm text-gray-600">Last synced 2 min ago</p>
                                </div>
                              </div>
                              <Badge className="bg-orange-50 text-orange-700 border-orange-200">Enabled</Badge>
                            </div>
                          </div>
                        </div>
                        {/* Disconnect Button - Fixed at bottom */}
                        <div className="p-4 border-t border-gray-200 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-red-200 text-red-600 hover:bg-red-50"
                              onClick={async () => {
                                if (walletType === 'stellar') {
                                  disconnectStellarWallet()
                                } else if (isConnected) {
                                  await handleDisconnect()
                                }
                                setShowSettingsDropdown(false)
                              }}
                            >
                              Disconnect Wallet
                            </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : !isMiniPay ? (


                <div className="flex gap-2">
                 {/* ConnectWallet button - accessible for programmatic clicks */}
                 <div 
                   ref={connectWalletRef}
                   data-thirdweb-connect-wallet 
                   style={{ 
                     position: 'absolute', 
                     left: '-9999px', 
                     width: '1px', 
                     height: '1px', 
                     overflow: 'hidden',
                     visibility: 'hidden',
                     pointerEvents: 'auto',
                     zIndex: 9999
                   }}
                 >
                  <ConnectWallet
                    theme="light"
                    modalSize="compact"
                    welcomeScreen={{
                      title: "Connect to PeerPesa",
                      subtitle: "Your gateway to the decentralized web",
                    }}
                    modalTitleIconUrl="/images/peerpesa-logo.png"
                    btnTitle="Connect Wallet"
                    /> 
                 </div>
                 <Button
                    onClick={() => setShowWalletModal(true)}
                    variant="outline"
                    className="border-[#19B17A] text-[#19B17A] hover:bg-[#19B17A] hover:text-white"
                  >
                    <WalletIcon className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Wallet </span>Connect
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>



      {/* Old UI Body */}
      <div className="max-w-md mx-auto min-h-screen bg-white pb-20">
        {/* Balance Card */}
        {!showNotifications && !showTerms && !showPrivacy && <div className="px-6 pt-8">
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 relative">
            <CardContent className="pt-[10px] pb-[10px] px-4 text-center">
              
              {mounted && ((isConnected && address) || (walletType === 'stellar' && stellarAddress) || (isMiniPay && address)) && (
                <div className="mb-2 flex items-center justify-center">
                  {isMiniPay && address ? (
                    <Badge variant="outline" className="text-[#19B17A] border-[#19B17A]">
                      <div className="w-2 h-2 bg-[#19B17A] rounded-full mr-2"></div>
                      Celo Mainnet
                    </Badge>
                  ) : walletType === 'stellar' ? (
                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      Mainnet
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      {getNetworkName(chain ? (chain.chainId as number) : undefined)}
                    </Badge>
                  )}
                </div>
              )}

              {/* Wallet Address with Copy Icon */}
              {mounted && ((isConnected && address) || (walletType === 'stellar' && stellarAddress) || (isMiniPay && address)) && (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <p className="text-xs text-gray-600 font-mono">
                    {isMiniPay && address
                      ? `${address.slice(0, 6)}...${address.slice(-6)}`
                      : walletType === 'stellar' && stellarAddress
                      ? `${stellarAddress.slice(0, 6)}...${stellarAddress.slice(-6)}`
                      : address
                      ? `${address.slice(0, 6)}...${address.slice(-6)}`
                      : ''
                    }
                  </p>
                  <button
                    onClick={() => {
                      const addressToCopy = isMiniPay ? address : walletType === 'stellar' ? stellarAddress : address
                      if (addressToCopy) {
                        navigator.clipboard.writeText(addressToCopy)
                        toast({
                          title: "Address Copied",
                          description: "Wallet address copied to clipboard",
                          variant: "default",
                        })
                      }
                    }}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                  </div>
              )}
              
              <div className="flex items-center justify-center gap-2">
                  <p className="text-[18px] font-bold text-gray-900">
                    {totalBalanceValue.toFixed(2) ?? "0.00"} {selectedCurrency || "USD"}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="relative" ref={currencyDropdownRef}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs border border-black text-black hover:text-black hover:border-black cursor-pointer"
                        onClick={() => {
                          setShowCurrencyDropdown(!showCurrencyDropdown)
                          // Fetch only when dropdown opens and currencies are empty
                          if (!showCurrencyDropdown && !currencyLoading && currencies.length === 0) {
                            refetchCurrencies()
                          }
                        }}
                      >
                        <ChevronDownIcon className="h-3 w-3 text-black" />
                      </Button>


                      {showCurrencyDropdown && (

                        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px] max-h-[200px] overflow-y-auto">
                          {currencyLoading ? (
                            <div className="px-2 py-1.5 text-xs text-gray-500">
                              Loading...
                            </div>
                          ) : currencyError ? (
                            <div className="px-2 py-1.5 text-xs">
                              <div className="text-red-500 mb-1">Error loading currencies</div>
                              <button
                                onClick={() => {
                                  refetchCurrencies()
                                  setShowCurrencyDropdown(false)
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                              >
                                Retry
                              </button>
                            </div>
                          ) : (
                            (() => {

                              const FIAT_CODES = new Set([
                                "USD", "EUR", "GBP", "KES", "UGX", "TZS", "GHS", "NGN", "ZAR", "ETB", "AED", "ZMW", "JPY"
                              ])

                              const fiatCurrencies = (currencies || []).filter((currency: any) => {
                                const tokenType = (currency?.token_type ?? "").toString().toLowerCase()
                                const symbol = (currency?.symbol ?? currency?.code ?? "").toString().toUpperCase()
                                const isActive =
                                  currency?.coin_status === "active" ||
                                  currency?.status === "active" ||
                                  currency?.status === true ||
                                  currency?.isActive === true

                                return isActive && (tokenType === "fiat" || FIAT_CODES.has(symbol))
                              })

                              if (fiatCurrencies.length === 0) {
                                return (
                                  <div className="px-2 py-1.5 text-xs text-gray-500">No fiat currencies available</div>
                                )
                              }

                              return fiatCurrencies.map((currency: any) => {
                                const code = currency.code ?? currency.symbol
                                const symbol = currency.symbol ?? code
                                const iconSrc = getCurrencyFlagIcon(symbol)
                                return (
                                  <button
                                    key={code ?? symbol}
                                    className={`w-full px-2 py-1.5 text-left text-xs hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg cursor-pointer flex items-center gap-2 ${
                                      selectedCurrency === symbol || selectedCurrency === code ? "bg-blue-50 text-blue-700" : "text-gray-900"
                                    }`}
                                    onClick={() => {
                                      setSelectedCurrency(symbol)
                                      setShowCurrencyDropdown(false)
                                    }}
                                  >
                                    <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center relative">
                                      <span className="text-[10px] font-semibold text-gray-500">
                                        {(symbol || "?").slice(0, 2)}
                                      </span>
                                      {iconSrc && (
                                        <img
                                          src={iconSrc}
                                          alt={symbol}
                                          className="w-full h-full object-cover absolute inset-0"
                                          onError={(e) => {
                                            e.currentTarget.style.display = "none"
                                          }}
                                        />
                                      )}
                                    </div>
                                    <span className="font-medium">{symbol}</span>
                                  </button>
                                )
                              })
                            })()
                          )}
                        </div>

                      )}
                </div>
                  </div>
                 </div>
 


              </CardContent>
            </Card>
           {!showTransactionForms && !showTerms && !showPrivacy && (
              <div className="grid grid-cols-3 gap-3 mb-6 sticky top-16 z-10 bg-white pt-2 pb-2">
                <Button
                  variant="outline"
                  className="h-12 flex flex-col items-center justify-center gap-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-black cursor-pointer"
                  onClick={() => {
                     setTransactionType("send")
                     setShowTransactionForms(true)
                  }}
                >
                  <div className="flex items-center gap-1">
                    <SendIcon className="h-4 w-4" />
                    <span className="text-xs">
                      <span className="sm:hidden">Send</span>
                      <span className="hidden sm:inline">Send Money</span>
                    </span>
                  </div>
                </Button>

                <Button
                  className="h-12 flex flex-col items-center justify-center gap-1 bg-[#19B17A] hover:bg-[#158f68] text-white cursor-pointer"
                 onClick={() => {
                     setTransactionType("buy")
                     setShowTransactionForms(true)
                  }}
                >
                  <div className="flex items-center gap-1">
                    <WalletIcon className="h-4 w-4" />
                    <span className="text-xs">Buy</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-12 flex flex-col items-center justify-center gap-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-black cursor-pointer"
                  onClick={() => {
                    setTransactionType("swap")
                    setShowTransactionForms(true)
                 }}
                >
                  <div className="flex items-center gap-1">
                    <RefreshCwIcon className="h-4 w-4" />
                    <span className="text-xs">Swap</span>
                  </div>
                </Button>
              </div>
           )}
      </div>}

      {/* Activities View */}
      {showNotifications && (() => {
        const getActivityIcon = (type: string, direction: string) => {
          if (type === 'swap')   return { Icon: RefreshCwIcon, bg: 'bg-blue-100',   color: 'text-blue-600'  }
          if (direction === 'out') return { Icon: ArrowUpIcon,   bg: 'bg-red-100',    color: 'text-red-500'   }
          return                        { Icon: ArrowDownIcon, bg: 'bg-green-100',  color: 'text-green-600' }
        }

        const isWalletReady = !!(address || (walletType === 'stellar' && stellarAddress))

        // Group visible items by date (derive from timestamp)
        const visibleItems = walletActivity.slice(0, notificationLimit)
        const grouped = visibleItems.reduce<Record<string, WalletActivityItem[]>>((acc, item) => {
          const date = item.timestamp ? item.timestamp.slice(0, 10) : 'unknown'
          if (!acc[date]) acc[date] = []
          acc[date].push(item)
          return acc
        }, {})

        return (
        <div className="px-6 py-8 pb-24">
          <div className="flex items-center mb-6">
            <Button variant="ghost" size="sm" className="mr-2 cursor-pointer" onClick={() => { setShowNotifications(false); setNotificationLimit(8) }}>
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-bold text-left flex-1">Activities</h2>
            {walletActivityLoading && (
              <RefreshCwIcon className="h-4 w-4 text-gray-400 animate-spin mr-1" />
            )}
          </div>

          {/* No wallet connected */}
          {!isWalletReady && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <WalletIcon className="h-6 w-6 text-gray-400" />
              </div>
              <p className="font-medium text-gray-700">No wallet connected</p>
              <p className="text-sm text-gray-400">Connect a wallet to see your transaction history.</p>
            </div>
          )}

          {/* Error state */}
          {isWalletReady && walletActivityError && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-red-500">{walletActivityError}</p>
              <Button variant="outline" size="sm" onClick={() => loadInitialWalletActivity()}>Retry</Button>
            </div>
          )}

          {/* Loading skeleton */}
          {isWalletReady && walletActivityLoading && walletActivity.length === 0 && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3 animate-pulse">
                  <div className="h-10 w-10 rounded-xl bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {isWalletReady && !walletActivityLoading && !walletActivityError && walletActivity.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <BellIcon className="h-6 w-6 text-gray-400" />
              </div>
              <p className="font-medium text-gray-700">No transactions yet</p>
              <p className="text-sm text-gray-400">Your on-chain activity will appear here.</p>
            </div>
          )}

          {/* Transaction list */}
          {!walletActivityLoading && Object.entries(grouped).map(([date, items]) => {
            const today = new Date()
            const d = new Date(date)
            const isToday = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
            const label = isToday ? "Today" : d.toLocaleDateString()
            return (
              <div key={date} className="mb-6">
                <div className="text-xs font-semibold text-gray-500 mb-2 pl-1">{label}</div>
                <div className="space-y-2">
                  {items.map((tx) => {
                    const { Icon, bg, color } = getActivityIcon(tx.type, tx.direction)
                    const amt = tx.amount > 0
                      ? `${tx.amount.toPrecision(6).replace(/\.?0+$/, '')} ${tx.asset}`
                      : tx.asset
                    const peer = tx.counterparty
                      ? `${tx.counterparty.slice(0, 8)}…${tx.counterparty.slice(-6)}`
                      : ''
                    const title = tx.type === 'swap'
                      ? `Swap — ${tx.asset}`
                      : tx.direction === 'out'
                        ? `Sent ${tx.asset}`
                        : `Received ${tx.asset}`
                    const description = tx.type === 'swap'
                      ? `${amt}${peer ? ` via ${peer}` : ''}`
                      : tx.direction === 'out'
                        ? `${amt}${peer ? ` → ${peer}` : ''}`
                        : `${amt}${peer ? ` from ${peer}` : ''}`
                    const time = tx.timestamp
                      ? new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : ''
                    const failed = tx.status === 'failed'
                    return (
                      <div key={tx.id} className={`bg-white rounded-xl shadow-sm border p-4 flex items-start gap-3 ${failed ? 'border-red-100 opacity-70' : 'border-gray-100'}`}>
                        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${bg}`}>
                          <Icon className={`h-5 w-5 ${color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-gray-900 truncate">{title}</p>
                            <span className="text-xs text-gray-400 shrink-0">{time}</span>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5 truncate">{description}</p>
                          {failed && (
                            <span className="inline-block mt-1 text-[11px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Failed</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {(walletActivity.length > notificationLimit || walletActivityHasMore) && (
            <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md px-6 pb-4 pt-2 bg-white border-t border-gray-100">
              <Button
                className="w-full bg-[#19B17A] hover:bg-[#158f68] text-white cursor-pointer"
                disabled={walletActivityLoadingMore}
                onClick={() => {
                  if (walletActivity.length > notificationLimit) {
                    setNotificationLimit((prev) => prev + 8)
                  } else {
                    loadMoreWalletActivity()
                  }
                }}
              >
                {walletActivityLoadingMore ? 'Loading…' : 'Load More'}
              </Button>
            </div>
          )}
        </div>
        )
      })()}

      {/* Terms of Service */}
      {showTerms && (
        <div className="px-6 py-8 pb-24">
          <div className="flex items-center mb-6">
            <Button variant="ghost" size="sm" className="mr-2 cursor-pointer" onClick={() => setShowTerms(false)}>
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-bold text-left flex-1">Terms of Service</h2>
          </div>
          <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h3>
              <p>By accessing or using PeerPesa Pay, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">2. Description of Service</h3>
              <p>PeerPesa Pay is a non-custodial blockchain-powered platform that enables cross-border money transfers directly to mobile wallets and bank accounts. We do not hold or control your funds at any time.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">3. Eligibility</h3>
              <p>You must be at least 18 years old and legally permitted to use financial services in your jurisdiction to use PeerPesa Pay. By using the service you represent and warrant that you meet these requirements.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">4. Non-Custodial Nature</h3>
              <p>PeerPesa Pay is a non-custodial service. You retain full control of your private keys and funds. We have no ability to recover lost keys or reverse transactions once broadcast to the blockchain.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">5. Transaction Fees</h3>
              <p>Transactions may be subject to network gas fees, service fees, and foreign exchange spreads. All applicable fees will be disclosed before you confirm any transaction.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">6. Prohibited Uses</h3>
              <p>You may not use PeerPesa Pay for money laundering, financing terrorism, circumventing sanctions, or any other unlawful purpose. We reserve the right to refuse service to anyone for any reason.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">7. Limitation of Liability</h3>
              <p>To the maximum extent permitted by law, PeerPesa shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service, including losses due to blockchain failures, exchange rate movements, or third-party service outages.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">8. Changes to Terms</h3>
              <p>We may update these Terms of Service at any time. Continued use of the service after changes take effect constitutes your acceptance of the revised terms.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">9. Contact</h3>
              <p>For questions about these terms, contact us at <span className="text-[#19B17A]">support@peerpesa.co</span>.</p>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy */}
      {showPrivacy && (
        <div className="px-6 py-8 pb-24">
          <div className="flex items-center mb-6">
            <Button variant="ghost" size="sm" className="mr-2 cursor-pointer" onClick={() => setShowPrivacy(false)}>
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-bold text-left flex-1">Privacy Policy</h2>
          </div>
          <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">1. Information We Collect</h3>
              <p>When you use PeerPesa Pay we may collect your blockchain wallet address, transaction history on our platform, device identifiers, and usage analytics. We do not collect private keys or seed phrases.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">2. How We Use Your Information</h3>
              <p>We use collected information to process your transactions, comply with anti-money-laundering (AML) and know-your-customer (KYC) obligations, improve the service, and communicate service updates to you.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">3. Blockchain Transparency</h3>
              <p>Transactions submitted to a public blockchain are publicly visible. PeerPesa has no control over data recorded on-chain. Your wallet address and transaction amounts may be visible to anyone inspecting the blockchain.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">4. Data Sharing</h3>
              <p>We do not sell your personal data. We may share data with regulated payment partners, banking institutions, and mobile money operators only as necessary to complete your transaction or meet legal requirements.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">5. Data Retention</h3>
              <p>We retain transaction records for as long as required by applicable financial regulations, typically 5–7 years. You may request deletion of non-essential personal data by contacting us.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">6. Cookies & Analytics</h3>
              <p>We use cookies and similar technologies to understand how you use the platform and to improve performance. You can disable cookies in your browser settings, though this may affect some functionality.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">7. Security</h3>
              <p>We implement industry-standard security measures including encryption in transit and at rest. However, no system is completely secure. You are responsible for keeping your wallet keys safe.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">8. Your Rights</h3>
              <p>Depending on your jurisdiction, you may have the right to access, correct, or delete personal data we hold about you. To exercise these rights, contact us at <span className="text-[#19B17A]">privacy@peerpesa.co</span>.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">9. Updates to This Policy</h3>
              <p>We may update this Privacy Policy periodically. We will notify you of material changes via the platform. Your continued use of PeerPesa Pay after the update constitutes acceptance.</p>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Forms Modal */}
      {showTransactionForms && (
        <TransactionForms
          onBack={() => setShowTransactionForms(false)}
          isWalletConnected={Boolean((isConnected && address) || (walletType === 'stellar' && stellarAddress) || (isMiniPay && address))}
          walletType={chain ? getNetworkName(chain.chainId as number) : "Wallet"}
          transactionType={transactionType}
          assets={supportedSendTokens}
          currencies={supportedSendFiat}
          mainWalletType={walletType}
          walletNetwork={walletType === "stellar" ? "Stellar" : (chain ? getNetworkName(chain.chainId as number) : undefined)}
          exchangeRates={exchangeRates}
          connectedWallet={address || stellarAddress || ""}
          connectWalletBalance={0}
          tokenBalances={tokenBalances}
          initialSwapParams={urlSwapParams ?? undefined}
          onConnectWallet={() => {
            toast({
              title: "Connect Wallet",
              description: "Please use the connect button in the header",
              variant: "default",
            })
          }}
         />
       )}
        

            {/* Tabs */}
       {!showTransactionForms && !showNotifications && !showTerms && !showPrivacy && (

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=inactive]:text-black hover:text-black cursor-pointer"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=inactive]:text-black hover:text-black cursor-pointer"
            >
              Transactions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-1">
            
            {/* Assets section - Only show when wallet is connected */}
            {((isConnected && address) || (walletType === 'stellar' && stellarAddress) || (isMiniPay && address)) && (
              <div className="mb-2">
                <div className="px-0 py-2">
                  <h3 className="text-md font-bold text-gray-500 mb-1">
                    Assets
                  </h3>
                </div>
                <div className="space-y-0">
                  {supportedTokensLoading ? (
                    <div className="p-8 text-center bg-gray-50">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center animate-spin">
                          <RefreshCwIcon className="h-4 w-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Loading assets...</p>
                          <p className="text-sm text-gray-600">Fetching supported assets...</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const currentEvmNetwork = chain ? getNetworkName(chain.chainId as number).toUpperCase() : ""
                      const nativeSym = chain ? getNativeSymbolForChain(chain.chainId as number) : undefined

                      const networkInfo = {
                        walletType,
                        chainId: chain?.chainId as number | undefined,
                        networkName: currentEvmNetwork || undefined,
                        nativeSymbol: nativeSym || undefined,
                      }
                      const balanceData = {
                        tokenBalances,
                        nativeBalance: nativeBalance ?? undefined,
                        stellarBalance,
                        usdcStellarBalance,
                      }

                      // All system-supported currencies for this network (balance may be 0)
                      const allNetworkAssets = getAllSupportedCurrenciesForNetwork(
                        currencies || [],
                        balanceData,
                        networkInfo,
                      )

                      if (allNetworkAssets.length === 0) {
                        return (
                          <div className="p-8 text-center bg-gray-50">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                <WalletIcon className="h-6 w-6 text-gray-400" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">No supported currencies found</p>
                                <p className="text-sm text-gray-600">
                                  {walletType === 'stellar'
                                    ? 'No supported currencies found for your Stellar wallet'
                                    : currentEvmNetwork
                                    ? `No supported currencies found for ${currentEvmNetwork} network`
                                    : 'Connect a wallet to see supported currencies'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      }

                      return allNetworkAssets.map((matched, index) => {
                        const asset = matched.currency
                        const localFlagIcon = getCurrencyFlagIcon(matched.symbol)
                        const fallbackIcon = getAssetIconFallback(asset)
                        const hasBalance = matched.hasBalance
                        const fiatValue = hasBalance
                          ? (exchangeAmount(matched.balanceFormatted, matched.symbol, selectedCurrency) || null)
                          : null

                        // Exchange rate (1 unit price) — prefer sale_rate on the currency object itself
                        const unitPrice: number | null =
                          matched.currency?.price?.rate?.sale_rate ??
                          getCurrencyRate(currencies || [], matched.symbol) ??
                          null

                        return (
                          <div
                            key={`${matched.symbol}-${index}`}
                            className={`flex items-center justify-between px-4 py-3 ${
                              index !== allNetworkAssets.length - 1 ? "border-b border-gray-100" : ""
                            } ${hasBalance ? "bg-white" : "bg-gray-50/60"}`}
                          >
                            {/* Left: icon + name */}
                            <div className="flex items-center gap-3">
                              <div className="relative h-10 w-10 shrink-0">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                  hasBalance ? 'bg-blue-100' : 'bg-gray-100'
                                }`}>
                                  {localFlagIcon || fallbackIcon ? (
                                    <img
                                      src={localFlagIcon || fallbackIcon || ""}
                                      alt={matched.name}
                                      className="w-6 h-6 rounded-full object-cover"
                                      onError={(e) => {
                                        if (fallbackIcon && e.currentTarget.src !== fallbackIcon) {
                                          e.currentTarget.src = fallbackIcon
                                          return
                                        }
                                        e.currentTarget.style.display = "none"
                                      }}
                                    />
                                  ) : (
                                    <span className={`text-xs font-bold ${hasBalance ? 'text-blue-600' : 'text-gray-400'}`}>
                                      {matched.symbol?.slice(0, 2).toUpperCase() || '--'}
                                    </span>
                                  )}
                                </div>
                                {hasBalance && (
                                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                                )}
                              </div>
                              <div>
                                <p className={`text-sm font-semibold ${hasBalance ? 'text-gray-900' : 'text-gray-500'}`}>
                                  {matched.name}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {matched.symbol}
                                  {unitPrice != null && (
                                    <span className="ml-1">· {formatFiatExchangeRate(unitPrice)} {selectedCurrency}</span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Right: balance + fiat value */}
                            <div className="text-right">
                              <p className={`text-sm font-semibold ${hasBalance ? 'text-gray-900' : 'text-gray-400'}`}>
                                {hasBalance
                                  ? `${matched.balanceFormatted} ${matched.symbol}`
                                  : <span className="text-gray-300">—</span>}
                              </p>
                              <p className="text-xs text-gray-400">
                                {fiatValue ? `${fiatValue} ${selectedCurrency}` : ''}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    })()
                  )}
                </div>
              </div>
            )}

            {/* Inline Notifications */}
            <WalletNotifications />

            {/* Recent Transactions section - hidden when notifications are active */}
            {!hasActiveNotifications && '1' === '0' && (
            <div>
              <div className="px-0 py-2">
                <h3 className="text-md font-bold text-gray-500 mb-1">Recent Transactions</h3>
              </div>
              <div className="space-y-0">
                {walletActivityLoading ? (
                  <div className="p-8 text-center bg-gray-50 py-10">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center animate-spin">
                        <RefreshCwIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Loading recent transactions...</p>
                        <p className="text-sm text-gray-600">Fetching latest wallet activity</p>
                      </div>
                    </div>
                  </div>
                ) : walletActivity.length > 0 ? (
                  <>
                  {walletActivity.slice(0, overviewTxVisible).map((item, index) => (
                    <div
                      key={`${item.id}-${index}`}
                      className={`p-4 flex items-center justify-between bg-gray-50 ${
                        index !== Math.min(walletActivity.length, overviewTxVisible) - 1 ? "border-b border-gray-100" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.type === "swap"
                          ? <RefreshCwIcon className="h-4 w-4 text-blue-500" />
                          : item.direction === "out"
                            ? <ArrowUpIcon className="h-4 w-4 text-red-500" />
                            : <ArrowDownIcon className="h-4 w-4 text-green-500" />
                        }
                        <div>
                          <p className="font-medium text-gray-900 capitalize">
                            {item.type === "swap" ? `Swap ${item.asset}` : item.direction === "out" ? `Sent ${item.asset}` : `Received ${item.asset}`}
                          </p>
                          <p className="text-sm text-gray-600">{formatDate(item.timestamp)}</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className="font-medium text-gray-900">
                          {item.direction === "in" ? "+" : "-"}{(() => { const d = item.amount >= 1 ? 2 : 4; return item.amount.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) })()} {item.asset}
                        </p>
                        <div className="flex items-center justify-end gap-2">
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {walletActivity.length > overviewTxVisible && (
                    <div ref={overviewTxLoadMoreRef} className="p-3 bg-gray-50 border-t border-gray-100 text-center text-sm text-gray-500">
                      Scroll to load more
                    </div>
                  )}
                  </>
                ) : (
                  <div className="p-8 text-center bg-gray-50 py-10">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <ArrowUpIcon className="h-6 w-6 text-gray-400" />
                        </div>
                      <div>
                        <p className="font-medium text-gray-900">No transactions yet</p>
                        <p className="text-sm text-gray-600">Your transaction history will appear here</p>
                    </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}




          
          </TabsContent>
          
          
          <TabsContent value="transactions" className="mt-6">
            {/* Transactions section */}
            <div>
              <div className="space-y-0">
                {walletActivityLoading ? (
                  <div className="p-8 text-center bg-gray-50 py-10">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center animate-spin">
                        <RefreshCwIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Loading wallet transactions...</p>
                        <p className="text-sm text-gray-600">Fetching blockchain activity</p>
                      </div>
                    </div>
                  </div>
                ) : walletActivityError ? (
                  <div className="p-8 text-center bg-gray-50 py-10">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <XIcon className="h-6 w-6 text-red-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Failed to load transactions</p>
                        <p className="text-sm text-gray-600">{walletActivityError}</p>
                      </div>
                    </div>
                  </div>
                ) : walletActivity.length > 0 ? (
                  <>
                  {walletActivity.slice(0, txTabVisible).map((item, index) => (
                    <div
                      key={`${item.id}-${index}`}
                      className={`p-4 flex items-center justify-between bg-gray-50 ${
                        index !== Math.min(walletActivity.length, txTabVisible) - 1 ? "border-b border-gray-100" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.type === "swap"
                          ? <RefreshCwIcon className="h-4 w-4 text-blue-500" />
                          : item.direction === "out"
                            ? <ArrowUpIcon className="h-4 w-4 text-red-500" />
                            : <ArrowDownIcon className="h-4 w-4 text-green-500" />
                        }
                        <div>
                          <p className="font-medium text-gray-900 capitalize">
                            {item.type === "swap" ? `Swap ${item.asset}` : item.direction === "out" ? `Sent ${item.asset}` : `Received ${item.asset}`}
                          </p>
                          <p className="text-sm text-gray-600">{formatDate(item.timestamp)}</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className="font-medium text-gray-900">
                          {item.direction === "in" ? "+" : "-"}{(() => { const d = item.amount >= 1 ? 2 : 4; return item.amount.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) })()} {item.asset}
                        </p>
                        <div className="flex items-center justify-end gap-2">
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                        {(walletActivity.length > txTabVisible || walletActivityHasMore) && (
                          <div className="p-4 bg-gray-50 border-t border-gray-100" ref={transactionsLoadMoreRef}>
                            <div className="text-center text-sm text-gray-600">
                              {walletActivityLoadingMore ? "Loading more transactions..." : "Scroll to load more"}
                            </div>
                          </div>
                        )}
                  </>
                ) : (
                  <div className="p-8 text-center bg-gray-50 py-10">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <ArrowUpIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">No transactions yet</p>
                        <p className="text-sm text-gray-600">Your transaction history will appear here</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

        </Tabs> )}




        {/* Wallet Connection Modal */}
        {showWalletModal && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowWalletModal(false) }}
          >
            <div className="w-full overflow-hidden bg-white shadow-2xl rounded-t-3xl sm:max-w-sm sm:rounded-3xl animate-in slide-in-from-bottom-6 duration-300">

              {/* Drag handle (mobile only) */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="h-1 w-10 rounded-full bg-gray-200" />
              </div>

              {/* Header */}
              <div className="relative flex items-center gap-3 border-b border-gray-100 bg-gradient-to-br from-[#f0fdf9] to-white px-5 py-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#19B17A]/10">
                  <ShieldCheckIcon className="h-5 w-5 text-[#19B17A]" />
                </div>
                <div>
                  <h2 className="text-base font-bold leading-none text-gray-900">Connect Wallet</h2>
                  <p className="mt-0.5 text-xs text-gray-500">Choose your preferred wallet to connect</p>
                </div>
                <button
                  className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  onClick={() => setShowWalletModal(false)}
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Wallet options */}
              <div className="px-4 py-4 space-y-1">

                {/* EVM section */}
                <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">EVM Networks</p>

                <button
                  className="group flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3 transition-all duration-150 hover:border-[#19B17A]/40 hover:bg-green-50"
                  onClick={async () => {
                    setShowWalletModal(false)
                    setTimeout(async () => { await openConnectWallet() }, 100)
                  }}
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 shadow-sm overflow-hidden">
                    <img src="/extra/evm.svg" alt="EVM" className="h-6 w-6" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-900">Connect EVM Wallet</p>
                    <p className="text-xs text-gray-500">MetaMask, WalletConnect, Coinbase &amp; more</p>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 text-gray-300 transition-colors group-hover:text-[#19B17A]" />
                </button>

                {/* Stellar section */}
                <p className="px-1 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Stellar Network</p>

                <div ref={stellarKitRef} className="hidden" />
                {stellarKit ? (
                  <button
                    className="group flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3 transition-all duration-150 hover:border-[#19B17A]/40 hover:bg-green-50"
                    onClick={async () => {
                      try {
                        toast({
                          title: "Opening Wallet Selection",
                          description: "Please choose your preferred Stellar wallet",
                          variant: "default",
                        })
                        await stellarKit.openModal({
                          onWalletSelected: async (wallet) => {
                            try {
                              toast({
                                title: "Wallet Selected",
                                description: `Selected ${wallet.name}. Please authorize the connection in your wallet.`,
                                variant: "default",
                              })
                              stellarKit.setWallet(wallet.id)
                              const addressResponse = await stellarKit.getAddress({ skipRequestAccess: false })
                              if (addressResponse.address) {
                                setStellarAddress(addressResponse.address)
                                setWalletType('stellar')
                                fetchStellarBalance(addressResponse.address)
                                localStorage.setItem('peerpesa_wallet_type', 'stellar')
                                localStorage.setItem('peerpesa_stellar_address', addressResponse.address)
                                toast({
                                  title: "\u2705 Connected to Stellar Wallet",
                                  description: `Wallet: ${wallet.name} - Address: ${addressResponse.address.slice(0, 8)}...${addressResponse.address.slice(-8)}`,
                                  variant: "default",
                                })
                                setShowWalletModal(false)
                              }
                            } catch (error) {
                              console.error('Wallet connection error:', error)
                              toast({
                                title: "Connection Failed",
                                description: `${(error as any)?.message || 'Connection was declined or failed'}`,
                                variant: "destructive",
                              })
                            }
                          },
                          modalTitle: 'Connect Stellar Wallet (Mainnet)',
                          notAvailableText: 'Wallet not available - please install the extension or app',
                        })
                      } catch (error) {
                        console.error('Modal open error:', error)
                        toast({
                          title: "Error",
                          description: "Failed to open wallet selection modal",
                          variant: "destructive",
                        })
                      }
                    }}
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-sm overflow-hidden">
                      <img src="/extra/stellar.svg" alt="Stellar" className="h-6 w-6" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-gray-900">Connect Stellar Wallet</p>
                      <p className="text-xs text-gray-500">Freighter, Albedo, XBull &amp; more</p>
                    </div>
                    <ChevronRightIcon className="h-4 w-4 text-gray-300 transition-colors group-hover:text-[#19B17A]" />
                  </button>
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3 opacity-50 cursor-not-allowed">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-sm overflow-hidden">
                      <img src="/extra/stellar.svg" alt="Stellar" className="h-6 w-6" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-gray-900">Connect Stellar Wallet</p>
                      <p className="text-xs text-gray-500">Initializing…</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 pb-6 pt-1 text-center">
                <div className="mb-1.5 flex items-center justify-center gap-1.5">
                  <ShieldCheckIcon className="h-3.5 w-3.5 text-[#19B17A]" />
                  <span className="text-xs text-gray-400">Your keys, your crypto · Non-custodial</span>
                </div>
                <p className="text-xs text-gray-400">
                  By connecting you agree to our{" "}
                  <span className="cursor-pointer text-[#19B17A] hover:underline" onClick={() => setShowTerms(true)}>Terms</span>
                  {" "}and{" "}
                  <span className="cursor-pointer text-[#19B17A] hover:underline" onClick={() => setShowPrivacy(true)}>Privacy Policy</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Fixed Bottom Navigation */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-md bg-white border-t border-gray-200 rounded-t-xl shadow-[0_-2px_10px_rgba(0,0,0,0.05)] max-h-[60px]">
          <div className="flex items-end justify-around px-6 pt-2 pb-[env(safe-area-inset-bottom,8px)]">
            {/* Home */}
            <button
              onClick={() => { setActiveTab("overview"); setShowTransactionForms(false); setShowTerms(false); setShowPrivacy(false) }}
              className="flex flex-col items-center gap-0.5 py-1 min-w-[64px] cursor-pointer"
            >
              <HomeIcon className={`h-5 w-5 ${activeTab === "overview" && !showTransactionForms && !showTerms && !showPrivacy ? "text-[#5ea838]" : "text-gray-400"}`} />
              <span className={`text-[11px] ${activeTab === "overview" && !showTransactionForms && !showTerms && !showPrivacy ? "text-[#5ea838] font-semibold" : "text-gray-500"}`}>Home</span>
            </button>

            {/* Send - raised green circle */}
            <button
              onClick={() => { setTransactionType("send"); setShowTransactionForms(true) }}
              className="flex flex-col items-center -mt-6 cursor-pointer"
            >
              <div className="h-14 w-14 rounded-full bg-[#5ea838] flex items-center justify-center shadow-lg">
                <SendIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-[11px] text-[#5ea838] font-semibold mt-0.5">Send</span>
            </button>

            {/* Notifications */}
            <button
              onClick={() => { setShowNotifications(true); setShowTransactionForms(false) }}
              className="flex flex-col items-center gap-0.5 py-1 min-w-[64px] cursor-pointer relative"
            >
              <BellIcon className={`h-5 w-5 ${showNotifications ? "text-[#5ea838]" : "text-gray-400"}`} />
              {mounted && walletActivity.length > 0 && (
                <span className="absolute -top-0.5 right-2 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {walletActivity.length > 99 ? "99+" : walletActivity.length}
                </span>
              )}
              <span className={`text-[11px] ${showNotifications ? "text-[#5ea838] font-semibold" : "text-gray-500"}`}>Activities</span>
            </button>
          </div>
        </div>

        {/* Bottom nav spacer */}
        <div className="h-20" />
      </div>
    </div>
  )
}
