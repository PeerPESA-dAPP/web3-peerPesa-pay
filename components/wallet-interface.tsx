"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useAccount, useConnect, useDisconnect, useSwitchChain, useBalance, usePublicClient } from 'wagmi'
import { formatUnits } from 'viem'
import { fetchSupportedCurrencies, fetchExchangeRates } from "@/utils/api"
import type { Connector } from 'wagmi'

// Global flag to prevent multiple WalletConnect initializations across the entire app
let walletConnectInitialized = false
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TransactionForms } from "./transaction-forms"
import { EthereumProvider } from "@walletconnect/ethereum-provider"
import { WalletConnectModal } from "@walletconnect/modal"
import { WALLETCONNECT_CONFIG, STELLAR_CONFIG } from "@/lib/walletconnect-config"
import { setupPolyfills } from "@/lib/polyfills"
import { toast } from "@/hooks/use-toast"
import { useMiniPay } from "@/hooks/use-minipay"
import {
  ArrowUpIcon,
  ArrowDownIcon,
  WalletIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  BitcoinIcon,
  LinkIcon,
  SendIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  HomeIcon,
  ActivityIcon,
  XIcon,
  GlobeIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  ZapIcon,
} from "lucide-react"

interface Transaction {
  id: string
  type: "buy" | "sell" | "receive" | "send"
  amount: number
  currency: string
  fiatAmount: number
  date: string
  status: "completed" | "pending" | "failed"
}

const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "buy",
    amount: 0.025,
    currency: "BTC",
    fiatAmount: 1250.0,
    date: "2024-01-15T10:30:00Z",
    status: "completed",
  },
  {
    id: "2",
    type: "sell",
    amount: 2.5,
    currency: "ETH",
    fiatAmount: 5875.5,
    date: "2024-01-14T15:45:00Z",
    status: "completed",
  },
  {
    id: "3",
    type: "buy",
    amount: 100,
    currency: "USDC",
    fiatAmount: 100.0,
    date: "2024-01-13T09:15:00Z",
    status: "pending",
  },
  {
    id: "4",
    type: "receive",
    amount: 0.01,
    currency: "BTC",
    fiatAmount: 500.0,
    date: "2024-01-12T14:20:00Z",
    status: "completed",
  },
]

export function WalletInterface() {
  const [activeTab, setActiveTab] = useState("overview")
  const [buyAmount, setBuyAmount] = useState("")
  const [sellAmount, setSellAmount] = useState("")
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState("USD")
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [walletType, setWalletType] = useState("")
  const [showTransactionForms, setShowTransactionForms] = useState(false)
  const [walletConnectProvider, setWalletConnectProvider] = useState<any>(null)
  const [currentNetwork, setCurrentNetwork] = useState("ethereum")
  const [isConnecting, setIsConnecting] = useState(false)
  const [availableAccounts, setAvailableAccounts] = useState<string[]>([])
  const [selectedAccountIndex, setSelectedAccountIndex] = useState(0)
  const isInitializing = useRef(false)

  // Supported crypto assets from API, filtered by connected network
  const [supportedAssets, setSupportedAssets] = useState<any[]>([])
  const [assetRates, setAssetRates] = useState<Record<string, number>>({})
  const [assetRatesLoading, setAssetRatesLoading] = useState(false)

  // ERC-20 token balances: symbol -> formatted balance string
  const [tokenBalances, setTokenBalances] = useState<Record<string, number>>({})
  const [tokenBalancesLoading, setTokenBalancesLoading] = useState(false)

  // Wagmi hooks
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  // MiniPay detection hook
  const { isMiniPay, miniPayVersion } = useMiniPay()

  // Native token balance for the connected wallet
  const { data: nativeBalance } = useBalance({ address: address as `0x${string}` | undefined })

  // Public client for reading ERC-20 token balances
  const publicClient = usePublicClient()

  // ERC-20 balanceOf ABI fragment
  const erc20BalanceOfAbi = [
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

  // Helper: extract contract address from API coin, with fallback to well-known addresses
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

  // Fetch ERC-20 token balances for supported assets on the current chain
  // (see useEffect below assetsForCurrentNetwork declaration)

  // Sync Wagmi state with component state
  useEffect(() => {
    if (isConnected && address) {
      setIsWalletConnected(true)
      setWalletAddress(address)
      setWalletType("Wagmi")
      setAvailableAccounts([address])
      setSelectedAccountIndex(0)
    } else {
      setIsWalletConnected(false)
      setWalletAddress("")
      setWalletType("")
      setAvailableAccounts([])
      setSelectedAccountIndex(0)
    }
  }, [isConnected, address])

  // Update current network when chain changes
  useEffect(() => {
    if (chain) {
      setCurrentNetwork(chain.name)
    }
  }, [chain])

  // Update wallet type when MiniPay is detected
  useEffect(() => {
    console.log('[WalletInterface] MiniPay detection:', { isMiniPay, miniPayVersion, currentWalletType: walletType })
    if (isMiniPay && walletType === "WalletConnect") {
      console.log('[WalletInterface] Setting wallet type to MiniPay')
      setWalletType("MiniPay")
    } else if (!isMiniPay && walletType === "MiniPay") {
      console.log('[WalletInterface] Setting wallet type back to WalletConnect')
      setWalletType("WalletConnect")
    }
  }, [isMiniPay, walletType])

  // Derive native balance values from wagmi hook
  const celoBalance = nativeBalance ? parseFloat(nativeBalance.formatted) : 0.0
  const usdValue = celoBalance * (assetRates[nativeBalance?.symbol?.toUpperCase() || 'CELO'] || 0)
  const totalBalance = celoBalance

  const currencies = [
    { code: "USD", symbol: "$" },
    { code: "EUR", symbol: "€" },
    { code: "GBP", symbol: "£" },
    { code: "JPY", symbol: "¥" },
    { code: "KES", symbol: "KSh" },
    { code: "UGX", symbol: "USh" },
    { code: "NGN", symbol: "₦" },
    { code: "GHS", symbol: "₵" },
  ]

  const getCurrentCurrency = () => currencies.find((c) => c.code === selectedCurrency) || currencies[0]
  const convertAmount = (amount: number, rateToUsd: number) => (amount * rateToUsd).toFixed(2)

  // Parse active networks from a coin object (networks field is a JSON string)
  const getCoinNetworks = (coin: any): any[] => {
    try {
      const nets = typeof coin?.networks === "string" ? JSON.parse(coin.networks || "[]") : (coin?.networks || [])
      return Array.isArray(nets) ? nets.filter((n: any) => n.status === "active") : []
    } catch {
      return []
    }
  }

  // Filter supported assets to those that support the current connected network
  const assetsForCurrentNetwork = supportedAssets.filter((coin) => {
    if (!isWalletConnected || !currentNetwork) return true
    const coinNets = getCoinNetworks(coin)
    const currNet = currentNetwork.toLowerCase()
    return coinNets.some((n: any) => {
      const netName = (n.network || n.label || "").toLowerCase()
      return netName.includes(currNet) || currNet.includes(netName) || netName === currNet
    })
  })

  // Fetch ERC-20 token balances for supported assets on the current chain
  // (moved below assetsForCurrentNetwork declaration)
  useEffect(() => {
    if (!publicClient || !address || !isConnected || !currentNetwork || assetsForCurrentNetwork.length === 0) return

    const currentChainId = chain?.id

    const fetchTokenBalances = async () => {
      setTokenBalancesLoading(true)
      const balances: Record<string, number> = {}

      // Include native gas token from useBalance hook
      if (nativeBalance) {
        balances[nativeBalance.symbol?.toUpperCase() || 'CELO'] = parseFloat(nativeBalance.formatted)
      }

      // Filter: active, "Native" token_type, not the native gas token, has a resolvable contract address
      const tokensToCheck = assetsForCurrentNetwork.filter((coin) => {
        const sym = (coin.symbol || '').toUpperCase()
        const type = String((coin as any)?.token_type || '').toLowerCase()
        const active = (coin as any)?.coin_status === 'active' || (coin as any)?.status === 'active' || (coin as any)?.status === true
        if (!active || type !== 'native') return false
        if (nativeBalance && nativeBalance.symbol?.toUpperCase() === sym) return false
        return getTokenContractForNetwork(coin, currentNetwork, currentChainId) !== null
      })

      await Promise.all(tokensToCheck.map(async (coin) => {
        const sym = (coin.symbol || '').toUpperCase()
        const contractAddr = getTokenContractForNetwork(coin, currentNetwork, currentChainId)
        if (!contractAddr) return

        try {
          const [rawBalance, decimals] = await Promise.all([
            publicClient.readContract({
              address: contractAddr as `0x${string}`,
              abi: erc20BalanceOfAbi,
              functionName: 'balanceOf',
              args: [address as `0x${string}`],
            }),
            publicClient.readContract({
              address: contractAddr as `0x${string}`,
              abi: erc20BalanceOfAbi,
              functionName: 'decimals',
            }),
          ])
          balances[sym] = parseFloat(formatUnits(rawBalance as bigint, decimals as number))
        } catch (err) {
          console.warn(`[v0] Failed to read balance for ${sym} at ${contractAddr}:`, err)
          balances[sym] = 0
        }
      }))

      setTokenBalances(balances)
      setTokenBalancesLoading(false)
    }

    fetchTokenBalances()
  }, [publicClient, address, isConnected, currentNetwork, chain?.id, assetsForCurrentNetwork.length, nativeBalance, getTokenContractForNetwork])

  // Fetch supported crypto assets once on mount
  useEffect(() => {
    fetchSupportedCurrencies()
      .then((data: any[]) => {
        const cryptoNative = data.filter(
          (c: any) =>
            (c.token_type === "Native" || c.token_type === "native") &&
            c.coin_status === "active"
        )
        setSupportedAssets(cryptoNative)
      })
      .catch((err) => console.error("[v0] Failed to fetch supported currencies:", err))
  }, [])

  // Fetch exchange rates whenever the selected base currency changes
  useEffect(() => {
    if (!selectedCurrency) return
    setAssetRatesLoading(true)
    fetchExchangeRates(selectedCurrency)
      .then((resp) => {
        const rates: any[] = resp.data?.rates || (resp as any).rates || []
        const rateMap: Record<string, number> = {}
        rates.forEach((r: any) => {
          const sym = (r.symbol || r.currency || "").toUpperCase()
          if (sym && r.rate) rateMap[sym] = Number(r.rate)
        })
        setAssetRates(rateMap)
      })
      .catch((err) => console.error("[v0] Failed to fetch exchange rates:", err))
      .finally(() => setAssetRatesLoading(false))
  }, [selectedCurrency])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "buy":
        return <TrendingUpIcon className="h-4 w-4 text-green-500" />
      case "sell":
        return <TrendingDownIcon className="h-4 w-4 text-red-500" />
      case "receive":
        return <ArrowDownIcon className="h-4 w-4 text-blue-500" />
      case "send":
        return <ArrowUpIcon className="h-4 w-4 text-orange-500" />
      default:
        return <WalletIcon className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: "bg-green-50 text-green-700 border-green-200",
      pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
      failed: "bg-red-50 text-red-700 border-red-200",
    }

    return (
      <Badge className={variants[status as keyof typeof variants]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const balanceCards = [
    {
      symbol: "BTC",
      name: "Bitcoin",
      balance: tokenBalances["BTC"] || 0,
      value: 12250.5,
      icon: BitcoinIcon,
      color: "text-orange-500",
    },
    { symbol: "ETH", name: "Ethereum", balance: tokenBalances["ETH"] || 0, value: 11280.0, icon: null, color: "text-blue-500" },
    {
      symbol: "USDC",
      name: "USD Coin",
      balance: tokenBalances["USDC"] || 0,
      value: 1250.0,
      icon: DollarSignIcon,
      color: "text-green-500",
    },
    {
      symbol: "CELO",
      name: "Celo",
      balance: celoBalance,
      value: usdValue,
      icon: null,
      color: "text-purple-500",
    },
  ]

  const connectMetaMask = async () => {
    try {
      setIsConnecting(true)
      const metaMaskConnector = connectors.find(c => c.id === 'metaMask')
      if (metaMaskConnector) {
        await connect({ connector: metaMaskConnector })
        setShowWalletModal(false)
        toast({
          title: "MetaMask Connected",
          description: `Connected to MetaMask`,
          variant: "default",
        })
      } else {
        toast({
          title: "MetaMask Required",
          description: "Please install MetaMask extension to continue.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] MetaMask connection failed:", error)
      toast({
        title: "Connection Failed",
        description: "Failed to connect to MetaMask. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }






  const connectWalletConnect = async () => {
    try {
      setIsConnecting(true)
      const walletConnectConnector = connectors.find(c => c.id === 'walletConnect')
      if (walletConnectConnector) {
        await connect({ connector: walletConnectConnector })
        setShowWalletModal(false)
        toast({
          title: "WalletConnect Connected",
          description: `Connected via WalletConnect`,
          variant: "default",
        })
      } else {
        toast({
          title: "WalletConnect Error",
          description: "WalletConnect connector not available.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] WalletConnect connection failed:", error)
      toast({
        title: "Connection Failed",
        description: "Failed to connect via WalletConnect. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const connectMiniPay = async () => {
    try {
      setIsConnecting(true)
      
      // Try to connect via WalletConnect first
      const walletConnectConnector = connectors.find(c => c.id === 'walletConnect')
      if (walletConnectConnector) {
        await connect({ connector: walletConnectConnector })
        setShowWalletModal(false)
        
        // Check if MiniPay was connected
        setTimeout(() => {
          if (isMiniPay) {
            toast({
              title: "MiniPay Connected",
              description: `Connected to MiniPay${miniPayVersion ? ` v${miniPayVersion}` : ''}`,
              variant: "default",
            })
          } else {
            toast({
              title: "Wallet Connected",
              description: "Connected via WalletConnect (not MiniPay)",
              variant: "default",
            })
          }
        }, 1000) // Give time for the hook to detect MiniPay
      } else {
        toast({
          title: "WalletConnect Error",
          description: "WalletConnect connector not available.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] MiniPay connection failed:", error)
      toast({
        title: "Connection Failed",
        description: "Failed to connect to MiniPay. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const connectCoinbaseWallet = async () => {
    try {
      setIsConnecting(true)
      const coinbaseConnector = connectors.find(c => c.id === 'coinbaseWallet')
      if (coinbaseConnector) {
        await connect({ connector: coinbaseConnector })
        setShowWalletModal(false)
        toast({
          title: "Coinbase Wallet Connected",
          description: `Connected to Coinbase Wallet`,
          variant: "default",
        })
      } else {
        toast({
          title: "Coinbase Wallet Required",
          description: "Please install Coinbase Wallet extension to continue.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Coinbase Wallet connection failed:", error)
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Coinbase Wallet. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const connectStellarWallet = async () => {
    try {
      setIsConnecting(true)
      
      // Check if Freighter wallet is available (most common Stellar wallet)
      if (typeof window !== "undefined" && (window as any).freighter) {
        const freighter = (window as any).freighter
        
        // Check if Freighter is connected
        const isConnected = await freighter.isConnected()
        
        if (!isConnected) {
          // Request connection
          await freighter.connect()
        }
        
        // Get the public key
        const publicKey = await freighter.getPublicKey()
        
        if (publicKey) {
          setWalletAddress(publicKey)
          setWalletType("Stellar Wallet")
          setIsWalletConnected(true)
          setShowWalletModal(false) // Close modal on successful connection
          
          toast({
            title: "Stellar Wallet Connected",
            description: `Connected to Stellar ${STELLAR_CONFIG.network}`,
            variant: "default",
          })
        }
      } else {
        // Fallback: Show instructions for installing Freighter
        setShowWalletModal(false) // Close modal
        toast({
          title: "Stellar Wallet Required",
          description: "Please install Freighter wallet extension to connect to Stellar network",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Stellar wallet connection failed:", error)
      setShowWalletModal(false) // Close modal on error
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Stellar wallet. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const switchNetwork = async (networkId: number) => {
    try {
      await switchChain({ chainId: networkId })
      toast({
        title: "Network Switched",
        description: `Switched to ${getNetworkName(networkId)}`,
        variant: "default",
      })
    } catch (error: any) {
      console.error("Failed to switch network:", error)
      toast({
        title: "Network Switch Failed",
        description: `Failed to switch to ${getNetworkName(networkId)}`,
        variant: "destructive",
      })
    }
  }

  const getNetworkName = (chainId: number) => {
    switch (chainId) {
      case 1: return "Ethereum"
      case 137: return "Polygon"
      case 42161: return "Arbitrum"
      case 10: return "OP Mainnet"
      case 8453: return "Base"
      case 56: return "BNB Smart Chain"
      case 81457: return "Blast"
      case 43114: return "Avalanche"
      case 42220: return "Celo"
      case 324: return "zkSync Era"
      case 44787: return "Celo Testnet"
      default: return "Ethereum"
    }
  }

  const getChainConfig = (chainId: number) => {
    switch (chainId) {
      case 1: // Ethereum
        return {
          chainId: `0x${chainId.toString(16)}`,
          chainName: "Ethereum Mainnet",
          nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18,
          },
          rpcUrls: [WALLETCONNECT_CONFIG.rpcMap[1]],
          blockExplorerUrls: ["https://etherscan.io"],
        }
      case 137: // Polygon
        return {
          chainId: `0x${chainId.toString(16)}`,
          chainName: "Polygon",
          nativeCurrency: {
            name: "MATIC",
            symbol: "MATIC",
            decimals: 18,
          },
          rpcUrls: [WALLETCONNECT_CONFIG.rpcMap[137]],
          blockExplorerUrls: ["https://polygonscan.com"],
        }
      case 42161: // Arbitrum
        return {
          chainId: `0x${chainId.toString(16)}`,
          chainName: "Arbitrum One",
          nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18,
          },
          rpcUrls: [WALLETCONNECT_CONFIG.rpcMap[42161]],
          blockExplorerUrls: ["https://arbiscan.io"],
        }
      case 10: // OP Mainnet
        return {
          chainId: `0x${chainId.toString(16)}`,
          chainName: "OP Mainnet",
          nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18,
          },
          rpcUrls: [WALLETCONNECT_CONFIG.rpcMap[10]],
          blockExplorerUrls: ["https://optimistic.etherscan.io"],
        }
      case 8453: // Base
        return {
          chainId: `0x${chainId.toString(16)}`,
          chainName: "Base",
          nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18,
          },
          rpcUrls: [WALLETCONNECT_CONFIG.rpcMap[8453]],
          blockExplorerUrls: ["https://basescan.org"],
        }
      case 56: // BNB Smart Chain
        return {
          chainId: `0x${chainId.toString(16)}`,
          chainName: "BNB Smart Chain",
          nativeCurrency: {
            name: "BNB",
            symbol: "BNB",
            decimals: 18,
          },
          rpcUrls: [WALLETCONNECT_CONFIG.rpcMap[56]],
          blockExplorerUrls: ["https://bscscan.com"],
        }
      case 81457: // Blast
        return {
          chainId: `0x${chainId.toString(16)}`,
          chainName: "Blast",
          nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18,
          },
          rpcUrls: [WALLETCONNECT_CONFIG.rpcMap[81457]],
          blockExplorerUrls: ["https://blastscan.io"],
        }
      case 43114: // Avalanche
        return {
          chainId: `0x${chainId.toString(16)}`,
          chainName: "Avalanche",
          nativeCurrency: {
            name: "AVAX",
            symbol: "AVAX",
            decimals: 18,
          },
          rpcUrls: [WALLETCONNECT_CONFIG.rpcMap[43114]],
          blockExplorerUrls: ["https://snowtrace.io"],
        }
      case 42220: // Celo
        return {
          chainId: `0x${chainId.toString(16)}`,
          chainName: "Celo",
          nativeCurrency: {
            name: "CELO",
            symbol: "CELO",
            decimals: 18,
          },
          rpcUrls: [WALLETCONNECT_CONFIG.rpcMap[42220]],
          blockExplorerUrls: ["https://explorer.celo.org"],
        }
      case 324: // zkSync Era
        return {
          chainId: `0x${chainId.toString(16)}`,
          chainName: "zkSync Era",
          nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18,
          },
          rpcUrls: [WALLETCONNECT_CONFIG.rpcMap[324]],
          blockExplorerUrls: ["https://explorer.zksync.io"],
        }
      case 44787: // Celo Testnet
        return {
          chainId: `0x${chainId.toString(16)}`,
          chainName: "Celo Alfajores Testnet",
          nativeCurrency: {
            name: "CELO",
            symbol: "CELO",
            decimals: 18,
          },
          rpcUrls: [(WALLETCONNECT_CONFIG.rpcMap as any)[44787] || "https://alfajores-forno.celo-testnet.org"],
          blockExplorerUrls: ["https://alfajores-blockscout.celo-testnet.org"],
        }
      default:
        return null
    }
  }

  const getWalletConnectSessions = async () => {
    if (!walletConnectProvider) return []
    
    try {
      // Get active sessions from WalletConnect
      const sessions = walletConnectProvider.sessions || []
      console.log("[v0] WalletConnect sessions:", sessions)
      return sessions
    } catch (error) {
      console.error("[v0] Failed to get WalletConnect sessions:", error)
      return []
    }
  }

  const handleMultipleWalletConnectConnections = async () => {
    if (!walletConnectProvider) return
    
    try {
      // Check for existing connections
      const sessions = await getWalletConnectSessions()
      
      if (sessions.length > 0) {
        console.log("[v0] Found existing WalletConnect sessions:", sessions.length)
        
        // Get accounts from all sessions
        const allAccounts: string[] = []
        for (const session of sessions) {
          try {
            const accounts = session.namespaces?.eip155?.accounts || []
            const ethAccounts = accounts
              .filter((account: string) => account.startsWith('eip155:'))
              .map((account: string) => account.split(':')[2])
            allAccounts.push(...ethAccounts)
          } catch (error) {
            console.error("[v0] Error processing session:", error)
          }
        }
        
        // Remove duplicates
        const uniqueAccounts = [...new Set(allAccounts)]
        
        if (uniqueAccounts.length > 0) {
          setAvailableAccounts(uniqueAccounts)
          setSelectedAccountIndex(0)
          setWalletAddress(uniqueAccounts[0])
          setWalletType("WalletConnect")
          setIsWalletConnected(true)
          
          toast({
            title: "Multiple WalletConnect Sessions",
            description: `Found ${sessions.length} session${sessions.length > 1 ? 's' : ''} with ${uniqueAccounts.length} account${uniqueAccounts.length > 1 ? 's' : ''}`,
            variant: "default",
          })
        }
      }
    } catch (error) {
      console.error("[v0] Failed to handle multiple WalletConnect connections:", error)
    }
  }

  const switchAccount = (accountIndex: number) => {
    if (accountIndex >= 0 && accountIndex < availableAccounts.length) {
      setSelectedAccountIndex(accountIndex)
      setWalletAddress(availableAccounts[accountIndex])
      
      toast({
        title: "Account Switched",
        description: `Switched to ${availableAccounts[accountIndex].slice(0, 6)}...${availableAccounts[accountIndex].slice(-4)}`,
        variant: "default",
      })
    }
  }

  const disconnectWallet = () => {
    disconnect()
    setWalletAddress("")
    setWalletType("")
    setIsWalletConnected(false)
    setAvailableAccounts([])
    setSelectedAccountIndex(0)
    
    // Reset global initialization flag when disconnecting WalletConnect
    if (walletType === "WalletConnect") {
      walletConnectInitialized = false
    }
  }

  useEffect(() => {
    const initializeWalletConnect = async () => {
      try {
        // Check if project ID is available before initializing
        if (!WALLETCONNECT_CONFIG.projectId) {
          console.warn("[v0] WalletConnect project ID not configured, skipping initialization")
          return
        }

        // Prevent multiple initializations
        if (walletConnectProvider || isInitializing.current || walletConnectInitialized) {
          console.log("[v0] WalletConnect provider already initialized or initializing, skipping")
          return
        }

        walletConnectInitialized = true
        isInitializing.current = true
        console.log("[v0] Initializing WalletConnect with project ID:", WALLETCONNECT_CONFIG.projectId)
        
        // Setup polyfills first
        await setupPolyfills()
        
        const provider = await EthereumProvider.init({
          projectId: WALLETCONNECT_CONFIG.projectId,
          chains: WALLETCONNECT_CONFIG.chains,
          optionalChains: WALLETCONNECT_CONFIG.chains as [number, ...number[]],
          showQrModal: true,
          rpcMap: WALLETCONNECT_CONFIG.rpcMap,
        })

        setWalletConnectProvider(provider)
        console.log("[v0] WalletConnect provider initialized successfully")

        // Check for existing connections
        if (provider.connected) {
          try {
            const accounts = await provider.request({ method: "eth_accounts" }) as string[]
            if (accounts.length > 0) {
              setAvailableAccounts(accounts)
              setSelectedAccountIndex(0)
              setWalletAddress(accounts[0])
              setWalletType("WalletConnect")
              setIsWalletConnected(true)
              console.log("[v0] Restored existing WalletConnect connection with accounts:", accounts)
            }
          } catch (error) {
            console.error("[v0] Failed to get existing WalletConnect accounts:", error)
          }
        }

        // Also check for multiple sessions
        await handleMultipleWalletConnectConnections()

        // Set up event listeners
        provider.on("accountsChanged", (accounts: string[]) => {
          console.log("[v0] WalletConnect accounts changed:", accounts)
          if (accounts.length > 0) {
            setAvailableAccounts(accounts)
            // Keep the same selected account index if it still exists, otherwise reset to 0
            const newIndex = selectedAccountIndex < accounts.length ? selectedAccountIndex : 0
            setSelectedAccountIndex(newIndex)
            setWalletAddress(accounts[newIndex])
            setWalletType("WalletConnect")
            setIsWalletConnected(true)
          } else {
            disconnectWallet()
          }
        })

        provider.on("chainChanged", (chainId: string) => {
          console.log("[v0] WalletConnect chain changed:", chainId)
          setCurrentNetwork(getNetworkName(parseInt(chainId, 16)))
        })

        provider.on("disconnect", () => {
          console.log("[v0] WalletConnect disconnected")
          disconnectWallet()
        })

        // Add error event listener to prevent unhandled errors
        provider.on("error" as any, (error: Error) => {
          console.error("[v0] WalletConnect provider error:", error)
          // Handle the error gracefully - don't disconnect unless it's a critical error
          if (error.message.includes("Connection interrupted") || 
              error.message.includes("subscription") ||
              error.message.includes("Connection lost")) {
            console.warn("[v0] Connection subscription error, attempting to reconnect...")
            // Optionally trigger a reconnection attempt
            setTimeout(() => {
              if (!provider.connected) {
                console.log("[v0] Attempting to restore connection...")
                // The provider will handle reconnection automatically
              }
            }, 2000)
          }
        })

        // Add connection health monitoring
        provider.on("session_delete", () => {
          console.log("[v0] WalletConnect session deleted, cleaning up...")
          disconnectWallet()
        })

        provider.on("session_expire" as any, () => {
          console.log("[v0] WalletConnect session expired, cleaning up...")
          disconnectWallet()
        })

        // Set up periodic health check for WalletConnect connection
        const healthCheckInterval = setInterval(() => {
          if (provider && walletType === "WalletConnect") {
            try {
              // Check if provider is still responsive
              if (!provider.connected && isWalletConnected) {
                console.warn("[v0] WalletConnect connection lost, cleaning up...")
                disconnectWallet()
              }
            } catch (error) {
              console.warn("[v0] Health check failed:", error)
              if (isWalletConnected && walletType === "WalletConnect") {
                disconnectWallet()
              }
            }
          }
        }, 10000) // Check every 10 seconds

        // Store interval reference for cleanup
        // Store interval reference for cleanup (do not assign to provider)
        ;(provider as any)._healthCheckInterval = healthCheckInterval
      } catch (error) {
        console.error("[v0] Failed to initialize WalletConnect:", error)
        console.error("[v0] Error details:", {
          message: (error as Error).message,
          stack: (error as Error).stack,
          config: WALLETCONNECT_CONFIG
        })
        walletConnectInitialized = false
        isInitializing.current = false
      } finally {
        isInitializing.current = false
      }
    }

    // Initialize WalletConnect on component mount
    initializeWalletConnect()
    console.log("--------------------------------",window.ethereum,"--------------------------------")
    
    // Cleanup function to remove event listeners and prevent memory leaks
    return () => {
      if (walletConnectProvider) {
        try {
          // Clear health check interval if it exists
          if (walletConnectProvider._healthCheckInterval) {
            clearInterval(walletConnectProvider._healthCheckInterval)
            console.log("[v0] WalletConnect health check interval cleared")
          }
          
          // Remove all event listeners
          walletConnectProvider.removeAllListeners()
          console.log("[v0] WalletConnect event listeners cleaned up")
        } catch (error) {
          console.warn("[v0] Error cleaning up WalletConnect listeners:", error)
        }
      }
    }
  }, []) // Empty dependency array to run only once on mount

  useEffect(() => {
    const checkWalletConnection = async () => {
      if (typeof window !== "undefined" && window.ethereum && !isWalletConnected) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" })
          if (accounts.length > 0) {
            setAvailableAccounts(accounts)
            setSelectedAccountIndex(0)
            setWalletAddress(accounts[0])
            setWalletType("MetaMask")
            setIsWalletConnected(true)
          }
        } catch (error) {
          console.error("[v0] Failed to check wallet connection:", error)
        }
      }
    }
    
    // Only check if not already connected
    if (!isWalletConnected) {
      checkWalletConnection()
    }
  }, [isWalletConnected])

  const handleWalletConnect = (walletType: string) => {
    switch (walletType) {
      case "MetaMask":
        connectMetaMask()
        break
      case "WalletConnect":
        connectWalletConnect()
        break
      case "Stellar Wallet":
        connectStellarWallet()
        break
      default:
        console.log(`Unknown wallet type: ${walletType}`)
    }
  }

  // Compute overall wallet balance for the currently selected send currency in TransactionForms
  // This sums native balance + all token balances
  const computedWalletBalance = (() => {
    const allBals = { ...tokenBalances }
    if (nativeBalance) {
      allBals[nativeBalance.symbol?.toUpperCase() || ''] = parseFloat(nativeBalance.formatted)
    }
    // Return the total; TransactionForms uses this as the selected currency balance
    return Object.values(allBals).reduce((sum, b) => sum + b, 0)
  })()

  if (showTransactionForms) {
    return (
      <TransactionForms
        onBack={() => setShowTransactionForms(false)}
        isWalletConnected={isWalletConnected}
        walletType={walletType}
        onConnectWallet={() => (isWalletConnected ? disconnectWallet() : setShowWalletModal(true))}
        walletNetwork={walletType === "Stellar Wallet" ? "Stellar" : chain ? chain.name : undefined}
        transactionType={walletType === "Stellar Wallet" ? "send" : "send"}
        connectedWallet={walletAddress}
        connectWalletBalance={computedWalletBalance}
        tokenBalances={tokenBalances}
      />
    )
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="h-[50px] px-6 py-10 flex items-center justify-between">
        
        <div className="flex items-center" style={{ cursor: "pointer", padding: "0" }} onClick={() => setActiveTab("overview")}>
          <img src="/images/peerpesa-logo.png" alt="PeerPesa" className="h-[40px] min-w-[140px] object-contain" />
        </div>


        <Button
          size="sm"
          className={`flex items-center gap-2 rounded-full px-5 py-3 shadow-lg transition-all duration-200 ${
            isWalletConnected
              ? "bg-green-50 text-green-800 border border-green-200 hover:bg-green-100"
              : "bg-gradient-to-r from-[#19B17A] to-[#12a06d] text-white hover:from-[#17a16d] hover:to-[#10855c]"
          }`}
          onClick={() => {
            console.log("Connect wallet clicked, isWalletConnected:", isWalletConnected)
            if (isWalletConnected) {
              disconnectWallet()
            } else {
              console.log("Setting showWalletModal to true")
              setShowWalletModal(true)
            }
          }}
        >
          <WalletIcon className="h-4 w-4" />
          <span className="font-semibold text-sm">
            {isWalletConnected ? `${walletType}` : "Connect Wallet"}
          </span>
        </Button>
      </div>

      {/* Balance Card */}
      <div className="px-6 pt-2">
        <Card className="mb-3 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 relative">
          <CardContent className="p-2 text-center">
            <p className="text-sm text-gray-600 mb-0.5">Your Balance</p>
            <p className="text-2xl font-bold text-gray-900">
              {(() => {
                const b = nativeBalance ? parseFloat(nativeBalance.formatted) : celoBalance
                const sym = nativeBalance ? nativeBalance.symbol : "CELO"
                const d = b >= 1 ? 2 : 4
                return `${b.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })} ${sym}`
              })()}
            </p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-sm text-gray-600">
                ≈ {getCurrentCurrency().symbol}
                {nativeBalance
                  ? (parseFloat(nativeBalance.formatted) * (assetRates[nativeBalance.symbol?.toUpperCase() || ""] || 0)).toFixed(2)
                  : usdValue.toFixed(2)}{" "}
                {selectedCurrency}
              </p>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs border border-black text-black hover:text-black hover:border-black cursor-pointer"
                  onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                >
                  <ChevronDownIcon className="h-3 w-3 text-black" />
                </Button>
                {showCurrencyDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[80px]">
                    {currencies.map((currency) => (
                      <button
                        key={currency.code}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg cursor-pointer"
                        onClick={() => {
                          setSelectedCurrency(currency.code)
                          setShowCurrencyDropdown(false)
                        }}
                      >
                        {currency.code}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <Button
            variant="outline"
            className="h-12 flex flex-col items-center justify-center gap-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-black cursor-pointer"
            onClick={() => setShowTransactionForms(true)}
          >
            <div className="flex items-center gap-1">
              <SendIcon className="h-4 w-4" />
              <span className="text-xs">Send Money</span>
            </div>
          </Button>
          <Button
            className="h-12 flex flex-col items-center justify-center gap-1 bg-[#19B17A] hover:bg-[#158f68] text-white cursor-pointer"
            onClick={() => setShowTransactionForms(true)}
          >
            <div className="flex items-center gap-1">
              <WalletIcon className="h-4 w-4" />
              <span className="text-xs">Buy</span>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-12 flex flex-col items-center justify-center gap-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-black cursor-pointer"
            onClick={() => setShowTransactionForms(true)}
          >
            <div className="flex items-center gap-1">
              <RefreshCwIcon className="h-4 w-4" />
              <span className="text-xs">Swap</span>
            </div>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100">
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
          <TabsTrigger
            value="activity"
            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=inactive]:text-black hover:text-black cursor-pointer"
          >
            Wallet Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {/* Assets section */}
          <div className="mb-4">
            <div className="px-6 py-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xl font-bold text-gray-900">Assets</h3>
                {assetRatesLoading && (
                  <div className="animate-spin h-4 w-4 border-2 border-[#19B17A] border-t-transparent rounded-full" />
                )}
              </div>
              {isWalletConnected && (
                <p className="text-xs text-gray-500 mb-2">
                  {currentNetwork} · {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : ""}
                </p>
              )}
            </div>
            <div className="space-y-0">
              {assetsForCurrentNetwork.length > 0 ? (
                assetsForCurrentNetwork.map((asset: any, index: number) => {
                  const sym = (asset.symbol || "").toUpperCase()
                  const isNativeToken =
                    nativeBalance && nativeBalance.symbol?.toUpperCase() === sym
                  const balance = isNativeToken
                    ? parseFloat(nativeBalance.formatted)
                    : (tokenBalances[sym] ?? 0)
                  const hasBalance = isNativeToken || tokenBalances[sym] !== undefined
                  const rate = assetRates[sym] || 0
                  const fiatValue = balance * rate
                  const iconUrl = `/flag/${(asset.symbol || "").toLowerCase()}.png`

                  return (
                    <div
                      key={asset.symbol}
                      className={`flex items-center justify-between p-4 bg-gray-50 ${
                        index < assetsForCurrentNetwork.length - 1 ? "border-b border-gray-100" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative h-8 w-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-gray-600 z-0">{sym.slice(0, 2)}</span>
                          <img
                            src={iconUrl}
                            alt={sym}
                            className="absolute inset-0 w-full h-full object-cover rounded-full z-10"
                            onError={(e) => { e.currentTarget.style.display = "none" }}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{asset.token_name || asset.symbol}</p>
                          <p className="text-xs text-gray-500">{sym}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {hasBalance
                            ? (() => { const d = balance >= 1 ? 2 : 4; return balance.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) })()
                            : (tokenBalancesLoading ? "..." : "—")} {sym}
                        </p>
                        <p className="text-xs text-gray-500">
                          {rate > 0 && hasBalance
                            ? `${getCurrentCurrency().symbol}${fiatValue.toFixed(2)} ${selectedCurrency}`
                            : "—"}
                        </p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="p-8 text-center text-sm text-gray-500">
                  {isWalletConnected
                    ? "No supported assets for the connected network"
                    : "Connect your wallet to see assets"}
                </div>
              )}
            </div>
          </div>

          {/* Exchange Rates section — live from API */}
          {Object.keys(assetRates).length > 0 && (
            <div className="mb-4">
              <div className="px-6 py-2">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Exchange Rates <span className="text-sm font-normal text-gray-500">vs {selectedCurrency}</span>
                </h3>
              </div>
              <div className="space-y-0">
                {Object.entries(assetRates)
                  .slice(0, 10)
                  .map(([sym, rate], index, arr) => {
                    const iconUrl = `/flag/${sym.toLowerCase()}.png`
                    return (
                      <div
                        key={sym}
                        className={`flex items-center justify-between p-4 bg-gray-50 ${
                          index < arr.length - 1 ? "border-b border-gray-100" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative h-8 w-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-gray-600 z-0">{sym.slice(0, 2)}</span>
                            <img
                              src={iconUrl}
                              alt={sym}
                              className="absolute inset-0 w-full h-full object-cover rounded-full z-10"
                              onError={(e) => { e.currentTarget.style.display = "none" }}
                            />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{sym}/{selectedCurrency}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {getCurrentCurrency().symbol}
                            {rate.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          {/* Transactions section */}
          <div>
            <div className="px-6 py-2">
              <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <ArrowUpIcon className="h-5 w-5" />
                All Transactions
              </h3>
            </div>
            <div className="space-y-0">
              {mockTransactions.map((transaction, index) => (
                <div
                  key={transaction.id}
                  className={`p-4 flex items-center justify-between bg-gray-50 ${
                    index !== mockTransactions.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(transaction.type)}
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {transaction.type} {transaction.currency}
                      </p>
                      <p className="text-sm text-gray-600">{formatDate(transaction.date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {transaction.type === "buy" || transaction.type === "receive" ? "+" : "-"}
                      {transaction.amount} {transaction.currency}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-600">${transaction.fiatAmount.toFixed(2)}</p>
                      {getStatusBadge(transaction.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
                <WalletIcon className="h-5 w-5" />
                Wallet Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <LinkIcon className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="font-medium text-gray-900">Wallet Connected</p>
                      <p className="text-sm text-gray-600">
                        {isWalletConnected && walletAddress
                          ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                          : "Not connected"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={
                      isWalletConnected
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                    }
                  >
                    {isWalletConnected ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {/* Account Selection */}
                {isWalletConnected && availableAccounts.length > 1 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <WalletIcon className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="font-medium text-gray-900">Account</p>
                          <p className="text-sm text-gray-600">
                            {availableAccounts.length} account{availableAccounts.length > 1 ? 's' : ''} available
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {availableAccounts.map((account, index) => (
                        <button
                          key={account}
                          onClick={() => switchAccount(index)}
                          className={`w-full px-3 py-2 text-sm rounded-md border text-left ${
                            index === selectedAccountIndex
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono">
                              {account.slice(0, 6)}...{account.slice(-4)}
                            </span>
                            {index === selectedAccountIndex && (
                              <span className="text-xs text-blue-600">Active</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Network Selection */}
                {isWalletConnected && (walletType === "MetaMask" || walletType === "WalletConnect") && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <GlobeIcon className="h-4 w-4 text-purple-500" />
                        <div>
                          <p className="font-medium text-gray-900">Network</p>
                          <p className="text-sm text-gray-600">{currentNetwork}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => switchNetwork(1)}
                        className={`px-3 py-2 text-xs rounded-md border ${
                          currentNetwork === "Ethereum"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        Ethereum
                      </button>
                      <button
                        onClick={() => switchNetwork(137)}
                        className={`px-3 py-2 text-xs rounded-md border ${
                          currentNetwork === "Polygon"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        Polygon
                      </button>
                      <button
                        onClick={() => switchNetwork(42161)}
                        className={`px-3 py-2 text-xs rounded-md border ${
                          currentNetwork === "Arbitrum"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        Arbitrum
                      </button>
                      <button
                        onClick={() => switchNetwork(10)}
                        className={`px-3 py-2 text-xs rounded-md border ${
                          currentNetwork === "OP Mainnet"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        OP Mainnet
                      </button>
                      <button
                        onClick={() => switchNetwork(8453)}
                        className={`px-3 py-2 text-xs rounded-md border ${
                          currentNetwork === "Base"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        Base
                      </button>
                      <button
                        onClick={() => switchNetwork(56)}
                        className={`px-3 py-2 text-xs rounded-md border ${
                          currentNetwork === "BNB Smart Chain"
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        BNB Chain
                      </button>
                      <button
                        onClick={() => switchNetwork(81457)}
                        className={`px-3 py-2 text-xs rounded-md border ${
                          currentNetwork === "Blast"
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        Blast
                      </button>
                      <button
                        onClick={() => switchNetwork(43114)}
                        className={`px-3 py-2 text-xs rounded-md border ${
                          currentNetwork === "Avalanche"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        Avalanche
                      </button>
                      <button
                        onClick={() => switchNetwork(42220)}
                        className={`px-3 py-2 text-xs rounded-md border ${
                          currentNetwork === "Celo"
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        Celo
                      </button>
                      <button
                        onClick={() => switchNetwork(324)}
                        className={`px-3 py-2 text-xs rounded-md border ${
                          currentNetwork === "zkSync Era"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        zkSync Era
                      </button>
                    </div>
                  </div>
                )}

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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Wallet Connect Modal */}
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
                <p className="mt-0.5 text-xs text-gray-500">Non-custodial · End-to-end secure</p>
              </div>
              <button
                className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                onClick={() => setShowWalletModal(false)}
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Wallet list */}
            <div className="px-4 py-4 space-y-1">

              {/* EVM section */}
              <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">EVM Wallets</p>

              {/* MiniPay */}
              <button
                className="group flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3 transition-all duration-150 hover:border-[#19B17A]/40 hover:bg-green-50 disabled:opacity-50"
                onClick={connectMiniPay}
                disabled={isConnecting}
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 shadow-sm">
                  <SmartphoneIcon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-900">{isConnecting ? "Connecting…" : "MiniPay"}</p>
                  <p className="text-xs text-gray-500">Celo mobile wallet</p>
                </div>
                <ChevronRightIcon className="h-4 w-4 text-gray-300 transition-colors group-hover:text-[#19B17A]" />
              </button>

              {connectors.map((connector) => {
                const iconBg =
                  connector.id === "metaMask" ? "from-orange-400 to-amber-500" :
                  connector.id === "walletConnect" ? "from-blue-400 to-blue-600" :
                  connector.id === "coinbaseWallet" ? "from-blue-500 to-indigo-600" :
                  "from-gray-400 to-gray-600"
                const subtitle =
                  connector.id === "metaMask" ? "Browser extension" :
                  connector.id === "walletConnect" ? "300+ mobile wallets" :
                  connector.id === "coinbaseWallet" ? "Self-custody wallet" : "Wallet"
                const Icon =
                  connector.id === "walletConnect" ? ZapIcon : WalletIcon

                return (
                  <button
                    key={connector.id}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3 transition-all duration-150 hover:border-[#19B17A]/40 hover:bg-green-50 disabled:opacity-50"
                    onClick={() => {
                      if (connector.id === "metaMask") connectMetaMask()
                      else if (connector.id === "walletConnect") connectWalletConnect()
                      else if (connector.id === "coinbaseWallet") connectCoinbaseWallet()
                    }}
                    disabled={isPending}
                  >
                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${iconBg} shadow-sm`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-gray-900">{isPending ? "Connecting…" : connector.name}</p>
                      <p className="text-xs text-gray-500">{subtitle}</p>
                    </div>
                    <ChevronRightIcon className="h-4 w-4 text-gray-300 transition-colors group-hover:text-[#19B17A]" />
                  </button>
                )
              })}

              {/* Stellar section */}
              <p className="px-1 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Other Networks</p>

              <button
                className="group flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3 transition-all duration-150 hover:border-[#19B17A]/40 hover:bg-green-50 disabled:opacity-50"
                onClick={connectStellarWallet}
                disabled={isConnecting}
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                  <span className="text-xs font-extrabold text-white">XLM</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-900">Stellar Wallet</p>
                  <p className="text-xs text-gray-500">XLM &amp; Stellar assets</p>
                </div>
                <ChevronRightIcon className="h-4 w-4 text-gray-300 transition-colors group-hover:text-[#19B17A]" />
              </button>
            </div>

            {/* Footer */}
            <div className="px-5 pb-6 pt-1 text-center">
              <div className="mb-1.5 flex items-center justify-center gap-1.5">
                <ShieldCheckIcon className="h-3.5 w-3.5 text-[#19B17A]" />
                <span className="text-xs text-gray-400">Your keys, your crypto</span>
              </div>
              <p className="text-xs text-gray-400">
                By connecting you agree to our{" "}
                <span className="cursor-pointer text-[#19B17A] hover:underline">Terms</span>
                {" "}and{" "}
                <span className="cursor-pointer text-[#19B17A] hover:underline">Privacy Policy</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation Bar */}
    </div>
  )
}
