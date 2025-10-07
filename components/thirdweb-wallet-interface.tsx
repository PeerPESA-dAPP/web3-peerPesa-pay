"use client"

import { useState, useEffect, useRef } from "react"
import { 
  ConnectWallet,
  useAddress,
  useDisconnect,
  useChain,
  useSwitchChain,
  useConnectionStatus,
  useTokenBalance,
  useBalance,
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
import { useStandaloneCurrency } from "@/contexts/CurrencyContext"
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
  formatAssetBalance
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
  HomeIcon,
  ActivityIcon,
  GlobeIcon,
  XIcon,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

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
  const [activeTab, setActiveTab] = useState("overview")
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false)
  
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
  } = useStandaloneCurrency()
  const [showTransactionForms, setShowTransactionForms] = useState(false)
  const [activeFormService, setActiveFormService] = useState("send")
  const [transactionType, setTransactionType] = useState<"send" | "buy" | "swap">("send")
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [celoBalance, setCeloBalance] = useState(0.00)
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

  // Wallet asset management
  const [walletAssets, setWalletAssets] = useState<any[]>([])
  const [enabledAssets, setEnabledAssets] = useState<EnabledAsset[]>([])
  const [assetLoading, setAssetLoading] = useState(false)



  useEffect(() =>{
    const initalizeCurrencies = async () => {

      await refetchCurrencies()
      setWalletAssets(currencies.filter(currency => currency.isActive))
    }
    initalizeCurrencies()
  }, [])

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
  // Note: For multiple tokens, we'll need to use individual useTokenBalance hooks
  // or implement a different approach to get all token balances

  // Function to programmatically open the ConnectWallet modal
  const openConnectWallet = () => {
    // Find the hidden thirdweb ConnectWallet button and click it
    const container = document.querySelector('#thirdweb-connect-wallet-btn')
    if (container) {
      const connectButton = container.querySelector('button')
      if (connectButton) {
        connectButton.click()
      } else {
        console.warn('ConnectWallet button not found inside container')
      }
    } else {
      console.warn('ConnectWallet container not found')
    }
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

  // Function to fetch CELO balance for EVM wallets
  const fetchCeloBalance = async (address: string) => {
    try {
      // For demo purposes, set a mock CELO balance when connected
      setCeloBalance(10.5000)
      setUsdValue(6.825)
      console.log(`CELO balance set for address: ${address}`)
    } catch (error) {
      console.error('Error setting CELO balance:', error)
      setCeloBalance(0.00)
      setUsdValue(0.00)
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
          console.log(`Stellar balance fetched: ${xlmBalance.balance} XLM`)
        }

        ///  also fetch USDC balance
        console.log(`USDC -------------- USDC`, accountData)
        const usdcBalance = accountData.balances.find((balance: any) => balance.asset_type === 'usdc')
        if (usdcBalance) {
          setUsdcStellarBalance(parseFloat(usdcBalance.balance))
          console.log(`USDC balance fetched: ${usdcBalance.balance} USDC`)
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
    
    // Only reset CELO balance if no EVM wallet is connected
    if (!isConnected || !address) {
      setCeloBalance(0.00)
      setUsdValue(0.00)
    }
    
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
      fetchCeloBalance(savedStellarAddress)
    }
  }, [])
  const connectionStatus = useConnectionStatus()

  const isConnected = connectionStatus === "connected"

  // Sync connection status with toast notifications and fetch CELO balance
  useEffect(() => {
    if (isConnected && address) {
      toast({
        title: "Wallet Connected",
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
        variant: "default",
      })
      
      // Fetch CELO balance when EVM wallet connects
      fetchCeloBalance(address)
    } else if (!isConnected && !address && !stellarAddress) {
      // Reset CELO balance when no wallet is connected (neither EVM nor Stellar)
      setCeloBalance(0.00)
      setUsdValue(0.00)
    }
  }, [isConnected, address, walletType])

  // Handle Stellar wallet balance updates
  useEffect(() => {
    if (walletType === 'stellar' && stellarAddress) {
      // Set CELO balance when Stellar wallet is connected
      fetchCeloBalance(stellarAddress)
    } else if (walletType === null && !stellarAddress) {
      // Reset CELO balance when Stellar wallet is disconnected
      setCeloBalance(0.00)
      setUsdValue(0.00)
    }
  }, [walletType, stellarAddress])

  // Fetch supported tokens when wallet connects or token balances change
  useEffect(() => {
    
    if (isConnected && address && chain) {
      fetchSupportedTokens()  
    } else {
      setSupportedTokens(currencies)
    }
    setSupportedSendFiat(currencies.filter((currency: any) => currency.token_type === "fiat" && currency.status === "active"));

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
      
      // Only reset CELO balance if no Stellar wallet is connected
      if (walletType !== 'stellar' || !stellarAddress) {
        setCeloBalance(0.00)
        setUsdValue(0.00)
      }
      
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

  
  const exchangeAmount = (amount: string, symbol: string, currency: string) => {
     try{
      const theRateGor = generalExchangeRates.filter(rate => rate.price.base_coin === symbol && rate.price.quote_coin === currency)
      if(theRateGor.length > 0) {
        const theTAmount: any = (Number(theRateGor[0].price.marketcap_amount) * Number(amount)).toFixed(2)
        return theTAmount;
      }
      return (0).toFixed(2)
      
     } catch(error) {
      return (0).toFixed(2)
     }
        
  }

  // Calculate total balance from all tokens
  useEffect(() => {
    let total = 0
    
    // Calculate from EVM supported tokens (if connected)
    if (supportedTokens.length > 0 && generalExchangeRates.length > 0) {
      supportedTokens.forEach((token) => {
        const theRateGor = generalExchangeRates.filter(
          rate => rate.price?.base_coin === token.symbol && rate.price?.quote_coin === selectedCurrency
        )
        if (theRateGor.length > 0 && token.balanceFormatted) {
          const amount = Number(theRateGor[0].price.marketcap_amount) * Number(token.balanceFormatted)
          console.log(`Token ${token.symbol}: ${token.balanceFormatted} * ${theRateGor[0].price.marketcap_amount} = ${amount}`)
          total += amount
        }
      })
      
      // stellar selected populate erc20 tokens
      setSupportedSendTokens(supportedTokens);
    }
    
    // Calculate from Stellar tokens (if connected)
    if (walletType === 'stellar' && stellarBalance && generalExchangeRates.length > 0) {
      const xlmRate = generalExchangeRates.filter(
        rate => rate.price?.base_coin === 'XLM' && rate.price?.quote_coin === selectedCurrency
      )
      if (xlmRate.length > 0) {
        const xlmAmount = Number(xlmRate[0].price.marketcap_amount) * stellarBalance
        total += xlmAmount
      }

      // stellar selected populate xlm and usdc
      setSupportedSendTokens(supportedTokens.filter((token: any) => token.symbol === 'XLM' || token.symbol === 'USDC'));
    }

    setSupportedSendFiat(currencies.filter((currency: any) => currency.token_type === "fiat" && currency.status === "active"));
    setTotalBalanceValue(total)
  
  }, [supportedTokens, generalExchangeRates, selectedCurrency, walletType, stellarBalance])

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
              {(isConnected && address) || (walletType === 'stellar' && stellarAddress) ? (
                <div className="flex items-center space-x-2">
                  {walletType === 'stellar' && stellarAddress ? (
                    // Stellar wallet connected
                    <>
                      <Badge variant="outline" className="text-blue-600 border-blue-200 hidden sm:flex">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        Mainnet
                      </Badge>
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
                  ) : (
                    // EVM wallet connected
                    <>
                      <Badge variant="outline" className="text-green-600 border-green-200 hidden sm:flex">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        {getNetworkName(chain ? (chain.chainId as number) : undefined)}
                  </Badge>
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
                      <div className="fixed left-1/2 transform -translate-x-1/2 mt-2 w-[90%] max-w-[calc(28rem*0.9)] bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {walletType === 'stellar' ? 'Stellar Wallet' : 'EVM Wallet'}
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
                        <div className="p-4 max-h-96 overflow-y-auto">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <LinkIcon className={`h-4 w-4 ${walletType === 'stellar' ? 'text-blue-500' : 'text-green-500'}`} />
                                <div>
                                  <p className="font-medium text-gray-900">Wallet Connected</p>
                                  <p className="text-sm text-gray-600">
                                    {walletType === 'stellar' && stellarAddress 
                                      ? `${stellarAddress.slice(0, 6)}...${stellarAddress.slice(-4)}`
                                      : address 
                                        ? `${address.slice(0, 6)}...${address.slice(-4)}`
                                        : "Not connected"
                                    }
                                  </p>
                                </div>
                              </div>
                              <Badge className={`${walletType === 'stellar' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                Active
                              </Badge>
                            </div>

                            {/* Network/Balance Information */}
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <GlobeIcon className={`h-4 w-4 ${walletType === 'stellar' ? 'text-blue-500' : 'text-purple-500'}`} />
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {walletType === 'stellar' ? 'Balance' : 'Network'}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {walletType === 'stellar' 
                                        ? `${stellarBalance} XLM`
                                        : getNetworkName(chain ? (chain.chainId as number) : undefined)
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {walletType !== 'stellar' && (
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

                            {/* Disconnect Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-3 border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => {
                                if (walletType === 'stellar') {
                                  disconnectStellarWallet()
                                } else if (isConnected && address) {
                                  handleDisconnect()
                                }
                                setShowSettingsDropdown(false)
                              }}
                            >
                              Disconnect Wallet
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (


                <div className="flex gap-2">
                 {/* Hidden ConnectWallet button - accessible for programmatic clicks */}
                 <div id="thirdweb-connect-wallet-btn" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
                  <ConnectWallet
                    theme="light"
                    modalSize="compact"
                    welcomeScreen={{
                      title: "Connect to PeerPesa",
                      subtitle: "Your gateway to the decentralized web",
                    }}
                    modalTitleIconUrl="/images/peerpesa-logo.png"
                    /> 
                 </div>
                 <Button
                    onClick={() => setShowWalletModal(true)}
                    variant="outline"
                    className="border-[#19B17A] text-[#19B17A] hover:bg-[#19B17A] hover:text-white"
                  >
                    <WalletIcon className="w-4 h-4 mr-2" />
                      Wallet Connect
                  </Button>
                </div>


              )}
            </div>
          </div>
        </div>
      </header>



      {/* Old UI Body */}
      <div className="max-w-md mx-auto min-h-screen bg-white pb-20">
        {/* Balance Card */}
        <div className="px-6 pt-8">
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 relative">
            <CardContent className="py-0 px-4 text-center">
              
              {/* Wallet Address with Copy Icon */}
              {((isConnected && address) || (walletType === 'stellar' && stellarAddress)) && (
                <div className="flex items-center justify-center gap-2 mb-2 pt-4">
                  <p className="text-xs text-gray-600 font-mono">
                    {walletType === 'stellar' && stellarAddress
                      ? `${stellarAddress.slice(0, 6)}...${stellarAddress.slice(-6)}`
                      : address
                      ? `${address.slice(0, 6)}...${address.slice(-6)}`
                      : ''
                    }
                  </p>
                  <button
                    onClick={() => {
                      const addressToCopy = walletType === 'stellar' ? stellarAddress : address
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
              
              <p className="text-sm text-gray-600 mb-1">Your Balance</p>
              <div className="flex items-center justify-center gap-2">
                  <p className="text-2xl font-bold text-gray-900">
                    {totalBalanceValue.toFixed(2) || 0.00}   {` ${selectedCurrency}`} 
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="relative" ref={currencyDropdownRef}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs border border-black text-black hover:text-black hover:border-black cursor-pointer"
                        onClick={() => {
                          setShowCurrencyDropdown(!showCurrencyDropdown)
                          // Fetch currencies when dropdown is first opened and we have default currencies
                          if (!showCurrencyDropdown && !currencyLoading && currencies.length <= 6) {
                            refetchCurrencies()
                          }
                        }}
                      >
                        <ChevronDownIcon className="h-3 w-3 text-black" />
                      </Button>


                      {showCurrencyDropdown && (

                        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px] max-h-[200px] overflow-y-auto">
                          {currencyLoading ? (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              Loading...
                  </div>
                          ) : currencyError ? (
                            <div className="px-3 py-2 text-sm">
                              <div className="text-red-500 mb-2">Error loading currencies</div>
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
                              currencies.length > 0 && currencies.filter((currency: any) => currency.token_type === "fiat" && currency.status === "active").map((currency) => (
                              <button  
                                key={currency.symbol}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg cursor-pointer flex items-center justify-between ${
                                  selectedCurrency === currency.code ? 'bg-blue-50 text-blue-700' : ''
                                }`}
                                onClick={() => {
                                  setSelectedCurrency(currency.symbol)
                                  setShowCurrencyDropdown(false)
                                }}
                              >
                                <span className="text-xs text-gray-500">{currency.symbol}</span>
                              </button>
                            ))
                          )}
                </div>

                      )}
                </div>
                  </div>
                 </div>
 


              </CardContent>
            </Card>
           {! showTransactionForms && (
              <div className="grid grid-cols-3 gap-3 mb-6">
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
                    <span className="text-xs">Send Money</span>
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
          exchangeRates={exchangeRates}
          connectedWallet={""}
          connectWalletBalance={0}

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
       {!showTransactionForms && (
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

          <TabsContent value="overview" className="mt-1">
            {/* Assets section */}
            {walletType === 'stellar' && stellarAddress && (
             <div className="mb-2">
              <div className="px-0 py-2">
                <h3 className="text-md font-bold text-gray-500 mb-1">Assets</h3>
                    </div>
              <div className="space-y-0">
                {/* Display Native assets for current network when wallet is connected, or all Native assets when not connected */}
                {((isConnected && address) || (walletType === 'stellar' && stellarAddress)) 
                  && getEnabledNativeAssetsFromApi().filter(asset => asset.symbol === 'XLM' || asset.symbol === 'USDC').map((asset) => {
                      const hasAsset = checkWalletNativeCurrency(asset.symbol)
                      return (
                        <div key={asset.symbol} className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                              {asset?.icon ? (
                                <img src={asset.icon} alt={asset.name} className="w-4 h-4" />
                              ) : (
                                <span className="text-lg">{asset.symbol.charAt(0)}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{asset.name}</p>
                              <p className="text-sm text-gray-600">
                                {asset.symbol === 'USDC' ? `${usdcStellarBalance}` : `${stellarBalance}`} {asset.symbol}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">
                              {exchangeAmount(asset.symbol === 'USDC' ? `${usdcStellarBalance}` : `${stellarBalance}`, asset.symbol, selectedCurrency) || '0.00'}  {selectedCurrency}
                            </p>
                            <Badge variant={hasAsset ? "default" : "secondary"} className="text-xs text-right pr-0">
                              {hasAsset ? "Available" : "Not Available"}
                            </Badge>
                          </div>
                        </div>
                      )
                    })
                }
              </div>
            </div>
            )}


            {/* Supported Tokens section - Only show when wallet is connected */}
            {isConnected && address && (
              <div className="mb-2">
                <div className="px-0 py-2">
                  <h3 className="text-md font-bold text-gray-500 mb-1">
                    Assets {chain?.name?.tx || ''}
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
                          <p className="font-medium text-gray-900">Loading tokens...</p>
                          <p className="text-sm text-gray-600">Fetching supported tokens for {chain?.name}</p>
                        </div>
                      </div>
                    </div>
                  ) : supportedTokens.length > 0 ? (
                    supportedTokens.filter(token => getEnabledNativeAssetsFromApi().some(token2 => token2.symbol.toLowerCase() === token.symbol.toLowerCase())).map((token, index) => (
                       <div
                        key={`${token.address}-${index}`}
                        className={`p-4 flex items-center justify-between bg-gray-50 ${
                          index !== supportedTokens.length - 1 ? "border-b border-gray-100" : ""
                        }`}
                        >
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            token.type === 'native' ? 'bg-blue-100' : 'bg-green-100'
                          }`}>
                            {token.logo ? (
                              <img src={token.logo} alt={token.symbol} className="w-6 h-6 rounded-full" />
                            ) : (
                              <span className={`text-xs font-bold ${
                                token.type === 'native' ? 'text-blue-600' : 'text-green-600'
                              }`}>
                                {token.symbol.slice(0, 2).toUpperCase()}
                              </span>
                              )}
                            </div>
                            <div>
                            <p className="font-medium text-gray-900">{token.name}</p>
                            <p className="text-sm text-gray-600">
                              {token.balanceFormatted || '0.00'} {token.symbol}
                            </p>
                            </div>
                          </div>
                          <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {exchangeAmount(token.balanceFormatted, token.symbol, selectedCurrency) || '0.00'}  {selectedCurrency}
                          </p>
                          <Badge 
                            variant={token.type === 'native' ? "default" : "secondary"} 
                            className={`text-xs ${
                              token.type === 'native' 
                                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                : 'bg-green-50 text-green-700 border-green-200'
                            }`}
                          >
                            {token.type === 'native' ? 'Native' : 'ERC-20'}
                          </Badge>
                        </div>
                      </div>
                      
                    ))
                  ) : (
                    <div className="p-8 text-center bg-gray-50">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <WalletIcon className="h-6 w-6 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">No tokens found</p>
                          <p className="text-sm text-gray-600">No supported tokens detected in this wallet</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

   
            {/* Recent Transactions section */}
            <div>
              <div className="px-0 py-2">
                <h3 className="text-md font-bold text-gray-500 mb-1">Recent Transactions</h3>
              </div>
              <div className="space-y-0">
                {mockTransactions.length > 0 ? (
                  mockTransactions.map((transaction, index) => (
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
                  ))
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




            {isConnected && address && (
              <div className="mb-2">
               <div className="px-0 py-2">
                 <h3 className="text-md font-bold text-gray-500 mb-1">
                  Exchange Rates
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
                          <p className="font-medium text-gray-900">Loading exchange rates ...</p>
                          <p className="text-sm text-gray-600">Fetching  exchange rates for {chain?.name} tokens</p>
                        </div>
                      </div>
                    </div>
                  ) : generalExchangeRates.length > 0 && (
                    generalExchangeRates.filter(token => token?.token_type === 'Native').map((token, index) => (
                       <div
                        key={`${token.token_name}-${index}`}
                        className={`p-4 py-2 flex items-center justify-between bg-gray-50 ${
                          index !== supportedTokens.length - 1 ? "border-b border-gray-100" : ""
                        }`}
                        >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            token.type === 'native' ? 'bg-blue-100' : 'bg-green-100'
                          }`}>
                            {token.logo ? (
                              <img src={token.icon} alt={token.symbol} className="w-6 h-6 rounded-full" />
                            ) : (
                              <span className={`text-xs font-bold ${
                                token.type === 'native' ? 'text-blue-600' : 'text-green-600'
                              }`}>
                                {token.symbol.slice(0, 1).toUpperCase()}{token.symbol.slice(-1).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              {token.symbol}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-small text-green-400 text-sm">
                            <span>Buy</span> {(Number(token?.price?.amount) - (Number(token?.price?.amount)*(Number(token?.price?.buy_markup)/100))).toFixed(2) || ""} {token.price.quote_coin}
                          </p>
                          <p className="font-small text-red-400 text-sm">
                            <span>Sell</span> {((((token?.price?.buy_markup/100)*Number(token?.price?.amount)) + Number(token?.price?.amount))).toFixed(2) || ""} {token.price.quote_coin}
                          </p>
                        </div>
                      </div>
                      
                    ))
                  )}
                </div>
              </div>
            )}
          
          </TabsContent>
          
          
          <TabsContent value="transactions" className="mt-6">
            {/* Transactions section */}
            <div>
              <div className="px-6 py-2">
                <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                  All Transactions
                </h3>
              </div>
              <div className="space-y-0">
                {mockTransactions.length > 0 ? (
                  mockTransactions.map((transaction, index) => (
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
                        ))
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

          <TabsContent value="activity" className="mt-6">
            {(isConnected && address) || (walletType === 'stellar' && stellarAddress) ? (
              <>
                {/* Transaction Statistics */}
            <div className="mb-4">
              <div className="px-6 py-2">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Transaction Statistics</h3>
          </div>
              <div className="grid grid-cols-2 gap-3 px-6 mb-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowUpIcon className="h-4 w-4 text-blue-600" />
                    <p className="text-xs text-gray-600">Total Sent</p>
              </div>
                  <p className="text-xl font-bold text-blue-600">$1,250</p>
                  <p className="text-xs text-gray-600">3 transactions</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowDownIcon className="h-4 w-4 text-green-600" />
                    <p className="text-xs text-gray-600">Total Received</p>
                  </div>
                  <p className="text-xl font-bold text-green-600">$1,875</p>
                  <p className="text-xs text-gray-600">2 transactions</p>
                </div>
              </div>
            </div>

            {/* Monthly Report */}
            <div className="mb-4">
              <div className="px-6 py-2">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Monthly Report</h3>
              </div>
              <div className="px-6">
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Volume</span>
                        <span className="font-semibold text-gray-900">$3,125.50</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Transactions</span>
                        <span className="font-semibold text-gray-900">4</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Average Transaction</span>
                        <span className="font-semibold text-gray-900">$781.38</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Net Change</span>
                        <span className="font-semibold text-green-600">+$625.00</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Transaction Activity Graph */}
            <div className="mb-4">
              <div className="px-6 py-2">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Transaction Activity</h3>
              </div>
              <div className="px-6">
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardContent className="p-4">
                    {/* Simple Bar Chart Representation */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">Monday</span>
                          <span className="text-xs font-medium text-gray-900">$500</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '40%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">Tuesday</span>
                          <span className="text-xs font-medium text-gray-900">$750</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">Wednesday</span>
                          <span className="text-xs font-medium text-gray-900">$1,250</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-purple-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">Thursday</span>
                          <span className="text-xs font-medium text-gray-900">$625</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-orange-600 h-2 rounded-full" style={{ width: '50%' }}></div>
                            </div>
                            </div>
                          <div>
                         <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">Friday</span>
                          <span className="text-xs font-medium text-gray-900">$0</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-gray-400 h-2 rounded-full" style={{ width: '0%' }}></div>
                          </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Transaction Breakdown */}
            <div className="mb-4">
              <div className="px-6 py-2">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Transaction Breakdown</h3>
              </div>
              <div className="px-6">
                <div className="space-y-3">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                         <span className="text-sm font-medium text-gray-900">Buy</span>
                       </div>
                      <span className="text-sm font-bold text-blue-600">50%</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '50%' }}></div>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-900">Sell</span>
                      </div>
                      <span className="text-sm font-bold text-red-600">25%</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2">
                      <div className="bg-red-600 h-2 rounded-full" style={{ width: '25%' }}></div>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-900">Receive</span>
                      </div>
                      <span className="text-sm font-bold text-green-600">25%</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '25%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
          </div>

            {/* Wallet Status */}
            <div className="mb-4">
              <div className="px-6 py-2">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Wallet Status</h3>
              </div>
              <div className="px-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <LinkIcon className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="font-medium text-gray-900">Wallet Connected</p>
                        <p className="text-sm text-gray-600">
                          {isConnected && address
                            ? `${address.slice(0, 6)}...${address.slice(-4)}`
                            : "Not connected"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={
                        isConnected
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-50 text-gray-700 border-gray-200"
                      }
                    >
                      {isConnected ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <GlobeIcon className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="font-medium text-gray-900">Network</p>
                        <p className="text-sm text-gray-600">
                          {getNetworkName(chain ? (chain.chainId as number) : undefined)}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-purple-50 text-purple-700 border-purple-200">Active</Badge>
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
            </div>
              </>
            ) : (
              <div className="p-8 text-center bg-gray-50 py-10">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    <UserIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 mb-2">Connect Wallet to View Activity</p>
                    <p className="text-sm text-gray-600 mb-4">Connect your wallet to see transaction statistics and activity</p>
                    <Button
                      onClick={() => setShowWalletModal(true)}
                      className="bg-[#19B17A] hover:bg-[#158f68] text-white px-6 py-2"
                    >
                      Connect Wallet
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs> )}




        {/* Footer Navigation Bar */}
        <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 shadow-2xl px-8 h-[60px]">
          <div className="flex items-center justify-between relative h-full">
            {/* Home Button */}
            <Button
              variant="ghost"
              className="flex flex-col items-center gap-1 h-14 px-6 text-gray-500 hover:text-[#19B17A] hover:bg-green-50 cursor-pointer transition-all duration-200 rounded-xl"
              onClick={() => {
                setActiveTab("overview")
                setShowTransactionForms(false)
              }}
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
              onClick={() => {
                setActiveTab("activity")
                setShowTransactionForms(false)
              }}
            >
              <ActivityIcon className="h-6 w-6" />
              <span className="text-xs font-medium">Activities</span>
            </Button>
            </div>
          </div>

        {/* Wallet Connection Modal */}
        {showWalletModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md mx-auto shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Connect Wallet</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                  onClick={() => setShowWalletModal(false)}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600 mb-6">Choose your preferred wallet to connect</p>
                
                {/* Thirdweb Button */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-700 mb-2">EVM Wallets</div>
                  <Button
                    variant="outline"
                    className="w-full h-16 flex items-center justify-start gap-4 p-4 border-2 hover:border-[#19B17A] hover:bg-green-50 transition-all duration-200 bg-transparent"
                    onClick={() => {
                      // Close modal and let the header ConnectWallet handle it
                        setShowWalletModal(false)
                        openConnectWallet()
                    }}
                  >
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <WalletIcon className="h-5 w-5 text-blue-600" />
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
                      className="w-full h-16 flex items-center justify-start gap-4 p-4 border-2 hover:border-[#19B17A] hover:bg-green-50 transition-all duration-200 bg-transparent"
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
                                  
                                  // Set CELO balance for Stellar wallet connection too
                                  fetchCeloBalance(addressResponse.address)
                                  
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
                        <WalletIcon className="h-5 w-5 text-blue-600" />
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
      </div>
    </div>
  )
}
