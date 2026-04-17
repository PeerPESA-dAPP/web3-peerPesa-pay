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
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useMiniPay } from "@/hooks/use-minipay"
import { WalletNotifications, useHasActiveNotifications, NotificationsPanel, useRecordToastNotifications, useNotificationCount } from "@/components/wallet-notifications"
import {
  parseSwapUrlParams,
  isSwapModeFromUrl,
  normalizeChainParam,
  normalizeTokenParam,
} from "@/lib/swap-url-params"

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
  type: "send" | "receive"
  amount: number
  asset: string
  timestamp: string
  status: "completed" | "pending" | "failed"
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

const mockTransactions: Transaction[] = [
  // {
  //   id: "1",
  //   type: "buy",
  //   amount: 0.025,
  //   currency: "BTC",
  //   fiatAmount: 1250.0,
  //   date: "2024-01-15T10:30:00Z",
  //   status: "completed",
  // }
]


export function ThirdwebWalletInterface() {
  const searchParams = useSearchParams()
  const hasActiveNotifications = useHasActiveNotifications()
  const notificationCount = useNotificationCount()
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
        // toast({
        //   title: "ℹ️ Regular Wallet Mode",
        //   description: "MiniPay is not detected. Standard wallet connection is available.",
        //   variant: "default",
        // })
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

        const usdcBalance = accountData.balances.find((balance: any) => balance.asset_type === 'usdc')
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
     try{
      const theRateGor = generalExchangeRates.filter(rate => rate.price?.base_coin === symbol && rate.price?.quote_coin === currency)
      if(theRateGor.length > 0) {
        const theTAmount: any = (Number(theRateGor[0].price?.marketcap_amount) * Number(amount)).toFixed(2)
        return theTAmount;
      }
      return (0).toFixed(2)
      
     } catch(error) {
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

        const isSend = from === lowerAddress
        const asset = record?.asset_type === "native" ? "XLM" : (record?.asset_code || "ASSET")

        return {
          id: String(record?.id || record?.paging_token || record?.transaction_hash || crypto.randomUUID()),
          hash: String(record?.transaction_hash || ""),
          type: isSend ? "send" : "receive",
          amount,
          asset,
          timestamp: String(record?.created_at || new Date().toISOString()),
          status: "completed",
          network: "Stellar",
          counterparty: isSend ? to : from,
        } as WalletActivityItem
      })
      .filter((item: WalletActivityItem | null): item is WalletActivityItem => Boolean(item))

    const nextCursor = records.length > 0 ? String(records[records.length - 1]?.paging_token || "") : null
    return {
      items,
      hasMore: records.length >= 25,
      nextCursor,
      mode: "stellar",
    }
  }

  const fetchEvmActivity = async (
    walletAddress: string,
    page: number,
    rpcFromBlock?: number | null,
  ): Promise<ActivityFetchResult> => {
    const networkName = getNetworkName(chain ? (chain.chainId as number) : undefined)
    const lowerAddress = walletAddress.toLowerCase()

    const explorerApiUrl =
      (chain as any)?.blockExplorers?.default?.apiUrl ||
      (chain as any)?.explorers?.[0]?.apiUrl ||
      // Known explorer API URLs as fallback
      (() => {
        const chainId = chain ? (chain.chainId as number) : 0
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
      })()

    if (explorerApiUrl) {
      try {
        const explorerResponse = await fetch(
          `${explorerApiUrl}?module=account&action=txlist&address=${walletAddress}&sort=desc&page=${page}&offset=25`
        )
        if (explorerResponse.ok) {
          const explorerData = await explorerResponse.json()
          const results = Array.isArray(explorerData?.result) ? explorerData.result : []
          if (results.length > 0) {
            return {
              items: results.map((tx: any) => {
              const from = String(tx?.from || "").toLowerCase()
              const to = String(tx?.to || "").toLowerCase()
              const wei = Number(tx?.value || 0)
              const amount = wei > 0 ? wei / 1e18 : 0
              const txStatus = tx?.txreceipt_status === "0" || tx?.isError === "1" ? "failed" : "completed"
              return {
                id: String(tx?.hash || `${tx?.blockNumber}-${tx?.nonce}`),
                hash: String(tx?.hash || ""),
                type: from === lowerAddress ? "send" : "receive",
                amount,
                asset: getNativeSymbolForChain(chain ? (chain.chainId as number) : undefined),
                timestamp: tx?.timeStamp
                  ? new Date(Number(tx.timeStamp) * 1000).toISOString()
                  : new Date().toISOString(),
                status: txStatus,
                network: networkName,
                counterparty: from === lowerAddress ? to : from,
              } as WalletActivityItem
              }),
              hasMore: results.length >= 25,
              mode: "evm-explorer",
            }
          }
        }
      } catch {
      }
    }

    const rawRpcUrl = (chain as any)?.rpc?.[0]
    const rpcUrl = resolveRpcUrl(rawRpcUrl)
    if (!rpcUrl) return { items: [], hasMore: false, mode: "evm-rpc" as const }

    const rpcCall = async (method: string, params: any[]) => {
      const rpcResponse = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      })
      const rpcData = await rpcResponse.json()
      return rpcData?.result
    }

    const latestHex = await rpcCall("eth_blockNumber", [])
    if (!latestHex) return { items: [], hasMore: false, nextBlock: null, mode: "evm-rpc" }
    const latest = Number.parseInt(latestHex, 16)
    if (!Number.isFinite(latest)) return { items: [], hasMore: false, nextBlock: null, mode: "evm-rpc" }

    const startBlock = rpcFromBlock == null ? latest : rpcFromBlock
    const blockNumbers = Array.from({ length: 5 }, (_, idx) => startBlock - idx).filter((n) => n >= 0)
    // Fetch blocks sequentially to avoid 429 rate limiting
    const blocks: any[] = []
    for (const bn of blockNumbers) {
      const block = await rpcCall("eth_getBlockByNumber", [`0x${bn.toString(16)}`, true])
      blocks.push(block)
    }

    const items: WalletActivityItem[] = []
    blocks.forEach((block: any) => {
      const ts = block?.timestamp ? new Date(Number.parseInt(block.timestamp, 16) * 1000).toISOString() : new Date().toISOString()
      const txs = Array.isArray(block?.transactions) ? block.transactions : []
      txs.forEach((tx: any) => {
        const from = String(tx?.from || "").toLowerCase()
        const to = String(tx?.to || "").toLowerCase()
        if (from !== lowerAddress && to !== lowerAddress) return
        const valueHex = String(tx?.value || "0x0")
        const amount = Number.parseInt(valueHex, 16) / 1e18
        items.push({
          id: String(tx?.hash || `${block?.number}-${tx?.nonce}`),
          hash: String(tx?.hash || ""),
          type: from === lowerAddress ? "send" : "receive",
          amount: Number.isFinite(amount) ? amount : 0,
          asset: getNativeSymbolForChain(chain ? (chain.chainId as number) : undefined),
          timestamp: ts,
          status: "completed",
          network: networkName,
          counterparty: from === lowerAddress ? to : from,
        })
      })
    })

    const sorted = items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const minScannedBlock = blockNumbers.length > 0 ? Math.min(...blockNumbers) : -1
    const nextBlock = minScannedBlock > 0 ? minScannedBlock - 1 : null
    return {
      items: sorted,
      hasMore: nextBlock != null,
      nextBlock,
      mode: "evm-rpc",
    }
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
        const result = await fetchEvmActivity(address, 1, null)
        setWalletActivity(result.items)
        setWalletActivityHasMore(result.hasMore)
        setWalletActivityMode(result.mode)
        setEvmActivityPage(2)
        setEvmRpcNextBlock(result.nextBlock ?? null)
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
        const result = await fetchEvmActivity(address, evmActivityPage, evmRpcNextBlock)
        setWalletActivity((prev) => [...prev, ...result.items])
        setWalletActivityHasMore(result.hasMore)
        setWalletActivityMode(result.mode)
        if (result.mode === "evm-explorer") {
          setEvmActivityPage((prev) => prev + 1)
        } else {
          setEvmRpcNextBlock(result.nextBlock ?? null)
        }
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
    if (activeTab === "overview" || activeTab === "transactions" || activeTab === "notifications") {
      loadInitialWalletActivity()
    }
  }, [activeTab, walletType, stellarAddress, isConnected, address, chain?.chainId])

  const totalSentActivity = walletActivity
    .filter((item) => item.type === "send")
    .reduce((sum, item) => sum + item.amount, 0)

  const totalReceivedActivity = walletActivity
    .filter((item) => item.type === "receive")
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
              {/* Show connected wallet info based on wallet type */}
              {(isConnected && address) || (walletType === 'stellar' && stellarAddress) || (isMiniPay && address) ? (
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
        <div className="px-6 pt-8">
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 relative">
            <CardContent className="pt-[10px] pb-[10px] px-4 text-center">
              
              {((isConnected && address) || (walletType === 'stellar' && stellarAddress) || (isMiniPay && address)) && (
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
              {((isConnected && address) || (walletType === 'stellar' && stellarAddress) || (isMiniPay && address)) && (
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
           {!showTransactionForms && (
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
      </div>

        

      {/* Notifications View */}
      {showNotifications && (() => {
        const notificationsData = [
          {
            date: new Date().toISOString().slice(0, 10),
            items: [
              { id: 1, title: "Deposit received", description: "You received 0.5 ETH.", time: "09:30" },
              { id: 2, title: "Withdrawal processed", description: "Your withdrawal to bank was successful.", time: "08:15" },
              { id: 4, title: "Rate alert", description: "ETH/USD rate changed significantly.", time: "07:00" },
              { id: 5, title: "Transfer complete", description: "Your transfer of 100 USDT was completed.", time: "06:45" },
              { id: 6, title: "Security alert", description: "New login detected from your account.", time: "05:30" },
              { id: 7, title: "Promo available", description: "Get 0% fees on your next transaction.", time: "04:15" },
            ],
          },
          {
            date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
            items: [
              { id: 3, title: "New offer available", description: "Check out the latest rates.", time: "17:40" },
              { id: 8, title: "Deposit confirmed", description: "Your deposit of 1 ETH was confirmed.", time: "14:20" },
              { id: 9, title: "Swap completed", description: "Swapped 0.5 ETH to 900 USDT.", time: "12:00" },
              { id: 10, title: "Withdrawal initiated", description: "Withdrawal of 200 USDT initiated.", time: "10:30" },
            ],
          },
          {
            date: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
            items: [
              { id: 11, title: "KYC approved", description: "Your identity verification was approved.", time: "16:00" },
              { id: 12, title: "New feature", description: "Try our new swap feature with lower fees.", time: "09:00" },
            ],
          },
        ]
        // Flatten all notifications and apply limit
        const allItems = notificationsData.flatMap((group) => group.items.map((item) => ({ ...item, date: group.date })))
        const visibleItems = allItems.slice(0, notificationLimit)
        const hasMore = allItems.length > notificationLimit
        // Re-group visible items by date
        const groupedVisible = visibleItems.reduce<Record<string, typeof visibleItems>>((acc, item) => {
          if (!acc[item.date]) acc[item.date] = []
          acc[item.date].push(item)
          return acc
        }, {})
        return (
        <div className="px-6 py-8 pb-24">
          <div className="flex items-center mb-6">
            <Button variant="ghost" size="sm" className="mr-2 cursor-pointer" onClick={() => { setShowNotifications(false); setNotificationLimit(8) }}>
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-bold text-left flex-1">Notifications</h2>
          </div>
          {Object.entries(groupedVisible).map(([date, items]) => {
            const today = new Date()
            const d = new Date(date)
            const label =
              d.getFullYear() === today.getFullYear() &&
              d.getMonth() === today.getMonth() &&
              d.getDate() === today.getDate()
                ? "Today"
                : d.toLocaleDateString()
            return (
              <div key={date} className="mb-6">
                <div className="text-xs font-semibold text-gray-500 mb-2 pl-1">{label}</div>
                <div className="space-y-2">
                  {items.map((notif) => (
                    <div key={notif.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-gray-900">{notif.title}</div>
                        <div className="text-xs text-gray-400">{notif.time}</div>
                      </div>
                      <div className="text-sm text-gray-600">{notif.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {hasMore && (
            <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md px-6 pb-4 pt-2 bg-white border-t border-gray-100">
              <Button className="w-full bg-[#19B17A] hover:bg-[#158f68] text-white cursor-pointer" onClick={() => setNotificationLimit((prev) => prev + 8)}>
                Load More
              </Button>
            </div>
          )}
        </div>
        )
      })()}

      {/* Transaction Forms Modal */}
      {showTransactionForms && (
        <TransactionForms
          onBack={() => setShowTransactionForms(false)}
          isWalletConnected={isConnected}
          walletType={chain ? getNetworkName(chain.chainId as number) : "Wallet"}
          transactionType={transactionType}
          assets={supportedSendTokens}
          currencies={supportedSendFiat}
          mainWalletType={walletType}
          walletNetwork={walletType === "stellar" ? "Stellar" : (chain ? getNetworkName(chain.chainId as number) : undefined)}
          exchangeRates={exchangeRates}
          connectedWallet={address || ""}
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
       {!showTransactionForms && !showNotifications && (
        
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

                      const walletMatchedAssets = compareNativeCurrenciesWithWallet(
                        currencies || [],
                        {
                          tokenBalances,
                          nativeBalance: nativeBalance ?? undefined,
                          stellarBalance,
                          usdcStellarBalance,
                        },
                        {
                          walletType,
                          chainId: chain?.chainId as number | undefined,
                          networkName: currentEvmNetwork || undefined,
                          nativeSymbol: nativeSym || undefined,
                        },
                      )

                      if (walletMatchedAssets.length === 0) {
                        return (
                          <div className="p-8 text-center bg-gray-50">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                <WalletIcon className="h-6 w-6 text-gray-400" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">No coins found on wallet {JSON.stringify(compareNativeCurrenciesWithWallet)}</p>
                                <p className="text-sm text-gray-600">
                                  {walletType === 'stellar'
                                    ? 'No native currencies with balance found on your Stellar wallet'
                                    : currentEvmNetwork
                                    ? `No native currencies with balance found for ${currentEvmNetwork} network`
                                    : 'No native currencies with balance found'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      }

                      return walletMatchedAssets.map((matched, index) => {
                        const asset = matched.currency
                        const balance = matched.balanceFormatted
                        const localFlagIcon = getCurrencyFlagIcon(matched.symbol)
                        const fallbackIcon = getAssetIconFallback(asset)

                        return (
                          <div
                            key={`${matched.symbol}-${index}`}
                            className={`p-4 flex items-center justify-between bg-gray-50 ${
                              index !== walletMatchedAssets.length - 1 ? "border-b border-gray-100" : ""
                            }`}
                          >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              asset.type === 'native' ? 'bg-blue-100' : 'bg-green-100'
                            }`}>
                                  {localFlagIcon || fallbackIcon ? (
                                    <img
                                      src={localFlagIcon || fallbackIcon || ""}
                                      alt={matched.name}
                                      className="w-6 h-6 rounded-full"
                                      onError={(e) => {
                                        if (fallbackIcon && e.currentTarget.src !== fallbackIcon) {
                                          e.currentTarget.src = fallbackIcon
                                          return
                                        }
                                        e.currentTarget.style.display = "none"
                                      }}
                                    />
                              ) : (
                                <span className={`text-xs font-bold ${
                                  (asset.token_type === 'Native' || asset.type === 'native') ? 'text-blue-600' : 'text-green-600'
                                }`}>
                                  {matched.symbol?.slice(0, 2).toUpperCase() || '--'}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{balance} {matched.name}</p>
                              {generalExchangeRates.length > 0 && (() => {
                                const rate = generalExchangeRates.find((r: any) => r.price?.base_coin === matched.symbol && r.price?.quote_coin === selectedCurrency)
                                const price = rate ? Number(rate.price?.marketcap_amount) : null
                                return price != null ? (
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    1 {matched.symbol} = {formatFiatExchangeRate(price)} {selectedCurrency}
                                  </p>
                                ) : null
                              })()}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">
                              {exchangeAmount(
                                balance,
                                matched.symbol,
                                selectedCurrency
                              ) || '0.00'} {selectedCurrency}
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
            {!hasActiveNotifications && (
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
                        {item.type === "send" ? (
                          <ArrowUpIcon className="h-4 w-4 text-red-500" />
                        ) : (
                          <ArrowDownIcon className="h-4 w-4 text-green-500" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 capitalize">
                            {item.type} {item.asset}
                          </p>
                          <p className="text-sm text-gray-600">{formatDate(item.timestamp)}</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className="font-medium text-gray-900">
                              {item.type === "receive" ? "+" : "-"}
                              {item.amount.toFixed(6)} {item.asset}
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
                        {item.type === "send" ? (
                          <ArrowUpIcon className="h-4 w-4 text-red-500" />
                        ) : (
                          <ArrowDownIcon className="h-4 w-4 text-green-500" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 capitalize">
                            {item.type} {item.asset}
                          </p>
                          <p className="text-sm text-gray-600">{formatDate(item.timestamp)}</p>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end">
                        <p className="font-medium text-gray-900">
                              {item.type === "receive" ? "+" : "-"}
                              {item.amount.toFixed(6)} {item.asset}
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md mx-auto shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Connect Wallet</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0 rounded-full bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center"
                  onClick={() => setShowWalletModal(false)}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600 mb-6">Choose your preferred wallet to connect 33</p>
                
                {/* Thirdweb Button */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-700 mb-2">EVM Wallets</div>
                  <Button
                    variant="outline"
                    className="w-full h-16 flex items-center justify-start gap-4 p-4 border-2 hover:border-[#19B17A] hover:bg-green-50 transition-all duration-200 bg-transparent"
                    onClick={async () => {
                      // Close modal and trigger ConnectWallet modal
                      setShowWalletModal(false)
                      // Small delay to ensure modal is closed, then open ConnectWallet
                      setTimeout(async () => {
                        await openConnectWallet()
                      }, 100)
                    }}
                  >
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <img src="/extra/evm.svg" alt="Evm" className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Connect EVM Wallet</p>
                      <p className="text-sm text-gray-600">Connect via thirdweb</p>
                    </div>
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or</span>
                  </div>
                </div>





                {/* Stellar Wallets Kit */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-700 mb-2">Stellar Wallets</div>
                  <div ref={stellarKitRef}></div>
                  {stellarKit && (  // request to connect stellar wallet
                    <Button
                      variant="outline"
                      className="w-full h-16 flex items-center justify-start gap-4 p-4 border-2 hover:border-[#6EBE44] hover:bg-green-50 transition-all duration-200 bg-transparent"
                      onClick={async () => {
                        try {
                          // Show initial loading state
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
                                const addressResponse = await stellarKit.getAddress({
                                  skipRequestAccess: false  // Force explicit user approval
                                })
                                
                                if (addressResponse.address) {
                                  setStellarAddress(addressResponse.address)
                                  setWalletType('stellar')
                                  fetchStellarBalance(addressResponse.address)
                                  
                                  // Store in localStorage for persistence
                                  localStorage.setItem('peerpesa_wallet_type', 'stellar')
                                  localStorage.setItem('peerpesa_stellar_address', addressResponse.address)
                                  
                                  toast({
                                    title: "✅ Connected to Stellar Wallet",
                                    description: `Wallet: ${wallet.name} - Address: ${addressResponse.address.slice(0, 8)}...${addressResponse.address.slice(-8)}`,
                                    variant: "default",
                                  })
                                  setShowWalletModal(false)
                                }
                                } catch (error) {
                                  console.error('Wallet connection error:', error)
                                  toast({
                                    title: "Connection Failed",
                                    description: `${wallet.name} connection was declined or failed`,
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
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <img src="/extra/stellar.svg" alt="Stellar" className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">Connect Stellar Wallet</p>
                        <p className="text-sm text-gray-600">Freighter, Albedo, XBull & More</p>
                      </div>
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-6 pt-0">
                <p className="text-xs text-gray-500 text-center">
                  By connecting a wallet, you agree to our Terms of Service and Privacy Policy
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
              onClick={() => { setActiveTab("overview"); setShowTransactionForms(false) }}
              className="flex flex-col items-center gap-0.5 py-1 min-w-[64px] cursor-pointer"
            >
              <HomeIcon className={`h-5 w-5 ${activeTab === "overview" && !showTransactionForms ? "text-[#5ea838]" : "text-gray-400"}`} />
              <span className={`text-[11px] ${activeTab === "overview" && !showTransactionForms ? "text-[#5ea838] font-semibold" : "text-gray-500"}`}>Home</span>
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
              onClick={() => { setActiveTab("notifications"); setShowTransactionForms(false) }}
              className="flex flex-col items-center gap-0.5 py-1 min-w-[64px] cursor-pointer relative"
            >
              <BellIcon className={`h-5 w-5 ${activeTab === "notifications" && !showTransactionForms ? "text-[#5ea838]" : "text-gray-400"}`} />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 right-2 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
              <span className={`text-[11px] ${activeTab === "notifications" && !showTransactionForms ? "text-[#5ea838] font-semibold" : "text-gray-500"}`}>Notifications</span>
            </button>
          </div>
        </div>

        {/* Bottom nav spacer */}
        <div className="h-20" />
      </div>
    </div>
  )
}
