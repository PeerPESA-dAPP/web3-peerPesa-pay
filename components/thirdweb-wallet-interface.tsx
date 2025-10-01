"use client"

import { useState, useEffect } from "react"
import { 
  ConnectWallet,
  useAddress,
  useDisconnect,
  useChain,
  useSwitchChain,
  useConnectionStatus,
} from "@thirdweb-dev/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TransactionForms } from "./transaction-forms"
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

const currencies = [
  { code: "USD", symbol: "$", rate: 1 },
  { code: "EUR", symbol: "€", rate: 0.92 },
  { code: "GBP", symbol: "£", rate: 0.79 },
  { code: "KES", symbol: "KSh", rate: 129.5 },
  { code: "UGX", symbol: "USh", rate: 3700 },
  { code: "TZS", symbol: "TSh", rate: 2350 },
]

export function ThirdwebWalletInterface() {
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedCurrency, setSelectedCurrency] = useState("USD")
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false)
  const [showTransactionForms, setShowTransactionForms] = useState(false)
  const [activeFormService, setActiveFormService] = useState("send")
  const [transactionType, setTransactionType] = useState<"send" | "buy" | "swap">("send")
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false)
  const [celoBalance] = useState(10.5)
  const [usdValue] = useState(6.825)

  // Thirdweb hooks
  const address = useAddress()
  const disconnect = useDisconnect()
  const chain = useChain()
  const switchChain = useSwitchChain()
  const connectionStatus = useConnectionStatus()

  const isConnected = connectionStatus === "connected"

  // Sync connection status with toast notifications
  useEffect(() => {
    if (isConnected && address) {
      toast({
        title: "Wallet Connected",
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
        variant: "default",
      })
    }
  }, [isConnected, address])

  const handleDisconnect = async () => {
    try {
      await disconnect()
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

  const getCurrentCurrency = () => {
    return currencies.find(c => c.code === selectedCurrency) || currencies[0]
  }

  const convertAmount = (amount: number) => {
    const currency = getCurrentCurrency()
    return (amount * currency.rate).toFixed(2)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

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
              {isConnected && address ? (
                <div className="flex items-center space-x-2">
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
                    <span className="hidden sm:inline">{formatAddress(address)}</span>
                  </Button>
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
                          <h3 className="text-lg font-semibold text-gray-900">Wallet Preferences</h3>
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
                                <LinkIcon className="h-4 w-4 text-green-500" />
                                <div>
                                  <p className="font-medium text-gray-900">Wallet Connected</p>
                                  <p className="text-sm text-gray-600">
                                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected"}
                                  </p>
                                </div>
                              </div>
                              <Badge className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                            </div>

                            {/* Network Selection */}
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <GlobeIcon className="h-4 w-4 text-purple-500" />
                                  <div>
                                    <p className="font-medium text-gray-900">Network</p>
                                    <p className="text-sm text-gray-600">
                                      {getNetworkName(chain ? (chain.chainId as number) : undefined)}
                                    </p>
                                  </div>
                                </div>
                              </div>
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
                    )}
                  </div>
                </div>
              ) : (
                <ConnectWallet
                  theme="light"
                  modalSize="compact"
                  welcomeScreen={{
                    title: "Connect to PeerPesa",
                    subtitle: "Your gateway to the decentralized web",
                  }}
                  modalTitleIconUrl="/images/peerpesa-logo.png"
                />
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
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Your Balance </p>
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

          <TabsContent value="overview" className="mt-6">
            {/* Assets section */}
            <div className="mb-4">
              <div className="px-6 py-2">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Assets</h3>
              </div>
              <div className="space-y-0">
                <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-yellow-600">XLM</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Stellar Lumens</p>
                      <p className="text-sm text-gray-600">0.00 XLM</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">$0.00</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">USDC</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">USD Coin</p>
                      <p className="text-sm text-gray-600">0.00 USDC</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">$0.00</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-yellow-600">CELO</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Celo</p>
                      <p className="text-sm text-gray-600">{celoBalance.toFixed(4)} CELO</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">${usdValue.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-green-600">cUSD</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Celo Dollar</p>
                      <p className="text-sm text-gray-600">0.00 cUSD</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">$0.00</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-green-600">USDT</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Tether USD</p>
                      <p className="text-sm text-gray-600">0.00 USDT</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">$0.00</p>
                  </div>
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
      </div>
    </div>
  )
}
