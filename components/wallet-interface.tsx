"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TransactionForms } from "./transaction-forms"
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
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
        if (accounts.length > 0) {
          setWalletAddress(accounts[0])
          setWalletType("MetaMask")
          setIsWalletConnected(true)
          setShowWalletModal(false)
          console.log("[v0] MetaMask connected:", accounts[0])
        }
      } catch (error) {
        console.error("[v0] MetaMask connection failed:", error)
      }
    } else {
      alert("MetaMask is not installed. Please install MetaMask to continue.")
    }
  }

  const connectWalletConnect = async () => {
    try {
      console.log("[v0] WalletConnect integration would be implemented here")
      setWalletAddress("0x" + Math.random().toString(16).substr(2, 40))
      setWalletType("WalletConnect")
      setIsWalletConnected(true)
      setShowWalletModal(false)
    } catch (error) {
      console.error("[v0] WalletConnect connection failed:", error)
    }
  }

  const connectCoinbaseWallet = async () => {
    try {
      console.log("[v0] Coinbase Wallet integration would be implemented here")
      setWalletAddress("0x" + Math.random().toString(16).substr(2, 40))
      setWalletType("Coinbase Wallet")
      setIsWalletConnected(true)
      setShowWalletModal(false)
    } catch (error) {
      console.error("[v0] Coinbase Wallet connection failed:", error)
    }
  }

  const connectStellarWallet = async () => {
    try {
      console.log("[v0] Stellar wallet integration would be implemented here")
      // Generate a mock Stellar address (starts with G)
      const stellarAddress = "G" + Math.random().toString(36).substr(2, 55).toUpperCase()
      setWalletAddress(stellarAddress)
      setWalletType("Stellar Wallet")
      setIsWalletConnected(true)
      setShowWalletModal(false)
    } catch (error) {
      console.error("[v0] Stellar wallet connection failed:", error)
    }
  }

  const disconnectWallet = () => {
    setWalletAddress("")
    setWalletType("")
    setIsWalletConnected(false)
  }

  useEffect(() => {
    const checkWalletConnection = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" })
          if (accounts.length > 0) {
            setWalletAddress(accounts[0])
            setWalletType("MetaMask")
            setIsWalletConnected(true)
          }
        } catch (error) {
          console.error("[v0] Failed to check wallet connection:", error)
        }
      }
    }
    checkWalletConnection()
  }, [])

  const handleWalletConnect = (walletType: string) => {
    switch (walletType) {
      case "MetaMask":
        connectMetaMask()
        break
      case "WalletConnect":
        connectWalletConnect()
        break
      case "Coinbase Wallet":
        connectCoinbaseWallet()
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
          onClick={() => (isWalletConnected ? disconnectWallet() : setShowWalletModal(true))}
        >
          <LinkIcon className="h-4 w-4" />
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

              {/* MetaMask Option */}
              <Button
                variant="outline"
                className="w-full h-16 flex items-center justify-start gap-4 p-4 border-2 hover:border-[#19B17A] hover:bg-green-50 cursor-pointer transition-all duration-200 bg-transparent"
                onClick={() => handleWalletConnect("MetaMask")}
              >
                <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <WalletIcon className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">MetaMask</p>
                  <p className="text-sm text-gray-600">Browser extension</p>
                </div>
              </Button>

              {/* WalletConnect Option */}
              <Button
                variant="outline"
                className="w-full h-16 flex items-center justify-start gap-4 p-4 border-2 hover:border-[#19B17A] hover:bg-green-50 cursor-pointer transition-all duration-200 bg-transparent"
                onClick={() => handleWalletConnect("WalletConnect")}
              >
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <LinkIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">WalletConnect</p>
                  <p className="text-sm text-gray-600">Mobile wallets</p>
                </div>
              </Button>

              {/* Coinbase Wallet Option */}
              <Button
                variant="outline"
                className="w-full h-16 flex items-center justify-start gap-4 p-4 border-2 hover:border-[#19B17A] hover:bg-green-50 cursor-pointer transition-all duration-200 bg-transparent"
                onClick={() => handleWalletConnect("Coinbase Wallet")}
              >
                <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <WalletIcon className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Coinbase Wallet</p>
                  <p className="text-sm text-gray-600">Self-custody wallet</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-16 flex items-center justify-start gap-4 p-4 border-2 hover:border-[#19B17A] hover:bg-green-50 cursor-pointer transition-all duration-200 bg-transparent"
                onClick={() => handleWalletConnect("Stellar Wallet")}
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
