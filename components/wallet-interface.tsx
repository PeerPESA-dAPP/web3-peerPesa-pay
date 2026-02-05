"use client"
import { useState, useEffect, useRef } from "react"
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
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
  HomeIcon,
  ActivityIcon,
  XIcon,
  GlobeIcon,
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

  // Wagmi hooks
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

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

  const totalBalance = 0.0
  const celoBalance = 0.0
  const usdValue = 0.0
  const btcBalance = 0.245
  const ethBalance = 4.8
  const usdcBalance = 1250.0

  const currencies = [
    { code: "USD", symbol: "$", rate: 1 },
    { code: "EUR", symbol: "€", rate: 0.85 },
    { code: "GBP", symbol: "£", rate: 0.73 },
    { code: "JPY", symbol: "¥", rate: 110 },
  ]

  const getCurrentCurrency = () => currencies.find((c) => c.code === selectedCurrency) || currencies[0]
  const convertAmount = (amount: number) => (amount * getCurrentCurrency().rate).toFixed(2)

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
      balance: btcBalance,
      value: 12250.5,
      icon: BitcoinIcon,
      color: "text-orange-500",
    },
    { symbol: "ETH", name: "Ethereum", balance: ethBalance, value: 11280.0, icon: null, color: "text-blue-500" },
    {
      symbol: "USDC",
      name: "USD Coin",
      balance: usdcBalance,
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
          // Add connection timeout and retry configuration
          connectionTimeout: 30000, // 30 seconds
          retryCount: 3,
          retryDelay: 1000, // 1 second between retries
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
        provider.on("error", (error: Error) => {
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

        provider.on("session_expire", () => {
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
        provider._healthCheckInterval = healthCheckInterval
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

  if (showTransactionForms) {
    return (
      <TransactionForms
        onBack={() => setShowTransactionForms(false)}
        isWalletConnected={isWalletConnected}
        walletType={walletType}
        onConnectWallet={() => (isWalletConnected ? disconnectWallet() : setShowWalletModal(true))}
        walletNetwork={chain ? chain.name : undefined}
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
          variant={isWalletConnected ? "outline" : "default"}
          size="sm"
          className={`flex items-center gap-2 cursor-pointer ${
            isWalletConnected
              ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
              : "bg-[#19B17A] hover:bg-[#158f68] text-white"
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
          {isWalletConnected ? `${walletType}` : "Connect Wallet"}
        </Button>
      </div>

      {/* Balance Card */}
      <div className="px-6 pt-4">
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 relative">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">Your Balance</p>
            <p className="text-2xl font-bold text-gray-900">{celoBalance.toFixed(4)} CELO</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-sm text-gray-600">
                ≈ {getCurrentCurrency().symbol}
                {convertAmount(usdValue)} {selectedCurrency}
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

        <div className="grid grid-cols-3 gap-3 mb-6">
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
              <h3 className="text-xl font-bold text-gray-900 mb-3">Assets</h3>
            </div>
            <div className="space-y-0">
              <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <WalletIcon className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">MetaMask</p>
                    <p className="text-sm text-gray-600">Browser extension</p>
                  </div>
                </div>
                <Badge className="bg-green-50 text-green-700 border-green-200">Connected</Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <WalletIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">WalletConnect</p>
                    <p className="text-sm text-gray-600">Mobile wallets</p>
                  </div>
                </div>
                <Badge className="bg-gray-50 text-gray-700 border-gray-200">Available</Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <WalletIcon className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Coinbase Wallet</p>
                    <p className="text-sm text-gray-600">Self-custody wallet</p>
                  </div>
                </div>
                <Badge className="bg-gray-50 text-gray-700 border-gray-200">Available</Badge>
              </div>
            </div>
          </div>

          {/* Exchange Rates section */}
          <div className="mb-4">
            <div className="px-6 py-2">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Exchange Rates</h3>
            </div>
            <div className="space-y-0">
              <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <BitcoinIcon className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">BTC/USD</p>
                    <p className="text-sm text-gray-600">Bitcoin</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">$49,250.00</p>
                  <div className="flex items-center gap-1">
                    <TrendingUpIcon className="h-3 w-3 text-green-500" />
                    <p className="text-sm text-green-600">+2.4%</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-600">ETH</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">ETH/USD</p>
                    <p className="text-sm text-gray-600">Ethereum</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">$2,350.00</p>
                  <div className="flex items-center gap-1">
                    <TrendingUpIcon className="h-3 w-3 text-green-500" />
                    <p className="text-sm text-green-600">+1.8%</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-yellow-600">CELO</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">CELO/USD</p>
                    <p className="text-sm text-gray-600">Celo</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">$0.65</p>
                  <div className="flex items-center gap-1">
                    <TrendingDownIcon className="h-3 w-3 text-red-500" />
                    <p className="text-sm text-red-600">-0.5%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Transactions section */}
          <div>
            <div className="px-6 py-2">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Recent Transactions</h3>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm mx-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Connect Wallet</h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100 cursor-pointer"
                onClick={() => setShowWalletModal(false)}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 mb-6">Choose your preferred wallet to connect</p>
              
              {connectors.map((connector) => (
                <Button
                  key={connector.id}
                  variant="outline"
                  className="w-full h-16 flex items-center justify-start gap-4 p-4 border-2 hover:border-[#19B17A] hover:bg-green-50 cursor-pointer transition-all duration-200 bg-transparent"
                  onClick={() => {
                    if (connector.id === 'metaMask') {
                      connectMetaMask()
                    } else if (connector.id === 'walletConnect') {
                      connectWalletConnect()
                    } else if (connector.id === 'coinbaseWallet') {
                      connectCoinbaseWallet()
                    }
                  }}
                  disabled={isPending}
                >
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    connector.id === 'metaMask' ? 'bg-orange-100' :
                    connector.id === 'walletConnect' ? 'bg-blue-100' :
                    connector.id === 'coinbaseWallet' ? 'bg-purple-100' : 'bg-gray-100'
                  }`}>
                    <WalletIcon className={`h-5 w-5 ${
                      connector.id === 'metaMask' ? 'text-orange-600' :
                      connector.id === 'walletConnect' ? 'text-blue-600' :
                      connector.id === 'coinbaseWallet' ? 'text-purple-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">
                      {isPending ? "Connecting..." : connector.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {connector.id === 'metaMask' ? 'Browser extension' :
                       connector.id === 'walletConnect' ? 'Mobile wallets' :
                       connector.id === 'coinbaseWallet' ? 'Self-custody wallet' : 'Wallet'}
                    </p>
                  </div>
                </Button>
              ))}

              <Button
                variant="outline"
                className="w-full h-16 flex items-center justify-start gap-4 p-4 border-2 hover:border-[#19B17A] hover:bg-green-50 cursor-pointer transition-all duration-200 bg-transparent"
                onClick={() => connectStellarWallet()}
                disabled={isConnecting}
              >
                <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-yellow-600">XLM</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Stellar Wallet</p>
                  <p className="text-sm text-gray-600">XLM & Stellar assets</p>
                </div>
              </Button>
            </div>

            <div className="p-6 pt-0">
              <p className="text-xs text-gray-500 text-center">
                By connecting a wallet, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation Bar */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 shadow-2xl px-8 h-[60px]">
        <div className="flex items-center justify-between relative h-full">
          {/* Home Button */}
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 h-14 px-6 text-gray-500 hover:text-[#19B17A] hover:bg-green-50 cursor-pointer transition-all duration-200 rounded-xl"
            onClick={() => setActiveTab("overview")}
          >
            <HomeIcon className="h-6 w-6" />
            <span className="text-xs font-medium">Home</span>
          </Button>

          <Button
            className="flex flex-col items-center gap-1 h-16 w-16 rounded-full bg-gradient-to-r from-[#19B17A] to-[#15a06b] hover:from-[#158f68] hover:to-[#138f5f] text-white cursor-pointer -mt-10 shadow-lg shadow-green-200 transition-all duration-200 hover:shadow-xl hover:shadow-green-300 hover:scale-105"
            onClick={() => setShowTransactionForms(true)}
          >
            <SendIcon className="h-6 w-6" />
            <span className="text-xs font-medium">Send</span>
          </Button>

          {/* Activities Button */}
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 h-14 px-6 text-gray-500 hover:text-[#19B17A] hover:bg-green-50 cursor-pointer transition-all duration-200 rounded-xl"
            onClick={() => setActiveTab("activity")}
          >
            <ActivityIcon className="h-6 w-6" />
            <span className="text-xs font-medium">Activities</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
