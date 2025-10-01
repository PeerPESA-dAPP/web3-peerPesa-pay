"use client"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  SendIcon,
  LinkIcon,
  HomeIcon,
  ActivityIcon,
  ArrowDownIcon,
  ChevronDownIcon,
  SearchIcon,
  ArrowLeftIcon,
  WalletIcon,
  RefreshCwIcon,
} from "lucide-react"

interface TransactionFormsProps {
  onBack: () => void
  isWalletConnected: boolean
  walletType: string
  onConnectWallet: () => void
  transactionType: string
}

export function TransactionForms({ onBack, isWalletConnected, walletType, onConnectWallet, transactionType }: TransactionFormsProps) {
  const [activeTab, setActiveTab] = useState(transactionType)
  const [showReview, setShowReview] = useState(false)
  const [sendAmount, setSendAmount] = useState("")
  const [sendAddress, setSendAddress] = useState("")
  const [sendCurrency, setSendCurrency] = useState("ETH")
  const [receiveAmount, setReceiveAmount] = useState("")
  const [receiveCurrency, setReceiveCurrency] = useState("axlUSDC")
  const [selectedRoute, setSelectedRoute] = useState("Hyphen Bridge")
  const [showAssetSelector, setShowAssetSelector] = useState(false)
  const [showWalletSelector, setShowWalletSelector] = useState(false)
  const [paymentMode, setPaymentMode] = useState("")
  const [selectedBank, setSelectedBank] = useState("")
  const [bankAccountName, setBankAccountName] = useState("")
  const [bankAccountNumber, setBankAccountNumber] = useState("")
  const [selectedNetwork, setSelectedNetwork] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")

  const cryptoAssets = [
    // Ethereum
    { symbol: "ETH", name: "Ethereum", network: "Ethereum", icon: "🔷" },
    { symbol: "USDC", name: "USD Coin", network: "Ethereum", icon: "💵" },
    { symbol: "USDT", name: "Tether", network: "Ethereum", icon: "💰" },
    
    // Polygon
    { symbol: "MATIC", name: "Polygon", network: "Polygon", icon: "🔺" },
    { symbol: "USDC", name: "USD Coin", network: "Polygon", icon: "💵" },
    
    // Arbitrum
    { symbol: "ETH", name: "Ethereum", network: "Arbitrum", icon: "🔷" },
    { symbol: "ARB", name: "Arbitrum", network: "Arbitrum", icon: "🔵" },
    
    // OP Mainnet
    { symbol: "ETH", name: "Ethereum", network: "OP Mainnet", icon: "🔷" },
    { symbol: "OP", name: "Optimism", network: "OP Mainnet", icon: "🔴" },
    
    // Base
    { symbol: "ETH", name: "Ethereum", network: "Base", icon: "🔷" },
    { symbol: "USDC", name: "USD Coin", network: "Base", icon: "💵" },
    
    // BNB Smart Chain
    { symbol: "BNB", name: "BNB", network: "BNB Smart Chain", icon: "🟡" },
    { symbol: "USDT", name: "Tether", network: "BNB Smart Chain", icon: "💰" },
    
    // Blast
    { symbol: "ETH", name: "Ethereum", network: "Blast", icon: "🔷" },
    { symbol: "USDB", name: "Blast USD", network: "Blast", icon: "💵" },
    
    // Avalanche
    { symbol: "AVAX", name: "Avalanche", network: "Avalanche", icon: "🔺" },
    { symbol: "USDC", name: "USD Coin", network: "Avalanche", icon: "💵" },
    
    // Celo
    { symbol: "CELO", name: "Celo", network: "Celo", icon: "🌾" },
    { symbol: "cUSD", name: "Celo Dollar", network: "Celo", icon: "💲" },
    { symbol: "cEUR", name: "Celo Euro", network: "Celo", icon: "💶" },
    
    // zkSync Era
    { symbol: "ETH", name: "Ethereum", network: "zkSync Era", icon: "🔷" },
    { symbol: "USDC", name: "USD Coin", network: "zkSync Era", icon: "💵" },
    
    // Stellar
    { symbol: "XLM", name: "Stellar Lumens", network: "Stellar", icon: "⭐" },
    { symbol: "USDC", name: "USD Coin", network: "Stellar", icon: "💵" },
  ]

  const routes = [
    { name: "Hyphen Bridge", fee: "$4.98", time: "~2m", amount: "1267.34" },
    { name: "Multichain Bridge", fee: "$1.33", time: "3m", amount: "1268.21", recommended: true },
    { name: "Stargate Bridge", fee: "$2.67", time: "3m", amount: "1270.68" },
  ]

  const recentAddresses = [
    { address: "0x0f192...5128e", date: "01.06.2023" },
    { address: "0xeD32...5685B", date: "31.05.2023" },
    { address: "0xg67m...543jf", date: "22.06.2023" },
    { address: "0x94vx6...037fv", date: "18.06.2023" },
    { address: "areknow.eth", date: "15.05.2023" },
  ]

  const banks = [
    "Standard Bank",
    "FNB",
    "ABSA",
    "Nedbank",
    "Capitec Bank",
    "African Bank",
    "Investec",
    "Discovery Bank",
  ]

  const mobileNetworks = ["MTN", "Vodacom", "Cell C", "Telkom Mobile", "Rain"]

  const handleNext = () => {
    setShowReview(true)
  }

  const handleBackFromReview = () => {
    setShowReview(false)
  }


  useEffect(() => {
    setActiveTab(transactionType)
  }, [transactionType])

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-7">
      {/* Main Content */}
      <div className="p-6">
        {!showReview && (
          <div className="grid grid-cols-3 gap-3 mb-2">
            <Button
              variant={activeTab === "send" ? "default" : "outline"}
              className={`h-12 flex flex-col items-center justify-center gap-1 cursor-pointer ${
                activeTab === "send"
                  ? "bg-[#19B17A] hover:bg-[#158f68] text-white"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-black"
              }`}
              onClick={() => setActiveTab("send")}
            >
              <div className="flex items-center gap-1">
                <SendIcon className="h-4 w-4" />
                <span className="text-xs">Send Money </span>
              </div>
            </Button>
            <Button
              variant={activeTab === "buy" ? "default" : "outline"}
              className={`h-12 flex flex-col items-center justify-center gap-1 cursor-pointer ${
                activeTab === "buy"
                  ? "bg-[#19B17A] hover:bg-[#158f68] text-white"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-black"
              }`}
              onClick={() => setActiveTab("buy")}
            >
              <div className="flex items-center gap-1">
                <WalletIcon className="h-4 w-4" />
                <span className="text-xs">Buy</span>
              </div>
            </Button>
            <Button
              variant={activeTab === "swap" ? "default" : "outline"}
              className={`h-12 flex flex-col items-center justify-center gap-1 cursor-pointer ${
                activeTab === "swap"
                  ? "bg-[#19B17A] hover:bg-[#158f68] text-white"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-black"
              }`}
              onClick={() => setActiveTab("swap")}
            >
              <div className="flex items-center gap-1">
                <RefreshCwIcon className="h-4 w-4" />
                <span className="text-xs">Swap</span>
              </div>
            </Button>
          </div>
        )}

        {/* Wallet Selector Modal */}
        {showWalletSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Select wallet</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowWalletSelector(false)}>
                  ×
                </Button>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                By connecting your wallet, we will have access to view your address and balance.
              </p>

              <div className="space-y-3 mb-6">
                <Label className="text-sm text-gray-500">Recently used</Label>
                {recentAddresses.map((addr, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  >
                    <span className="font-mono text-sm">{addr.address}</span>
                    <span className="text-xs text-gray-500">{addr.date}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">🦊</div>
                  <span className="font-medium">Metamask</span>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Connect
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Asset Selector Modal */}
        {showAssetSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Select asset</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowAssetSelector(false)}>
                  ×
                </Button>
              </div>

              <Select defaultValue="all">
                <SelectTrigger className="mb-4">
                  <SelectValue placeholder="All networks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🌐 All networks</SelectItem>
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="optimism">Optimism</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative mb-4">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search" className="pl-10" />
              </div>

              <div className="space-y-2">
                {cryptoAssets.map((asset, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm">
                      {asset.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{asset.symbol}</div>
                      <div className="text-sm text-gray-500">on {asset.network}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Transaction Form Card */}
        {showReview ? (
          /* Review Screen */
          <Card className="bg-white border-0 shadow-sm rounded-2xl">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-6">
                {activeTab === "send" ? "Review Send" : activeTab === "buy" ? "Review Purchase" : "Review Swap"}
              </h2>

              {/* Transaction Summary */}
              <div className="space-y-4 mb-6">
                {activeTab === "send" && (
                  <>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Payment Mode</span>
                      <span className="font-medium">{paymentMode === "bank" ? "Bank Transfer" : "Mobile Money"}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Amount</span>
                      <span className="font-medium">{sendAmount || "0"} CELO</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Recipient</span>
                      <span className="font-medium font-mono text-sm">{sendAddress || "Not specified"}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Ex`chan`ge Rate</span>
                      <span className="font-medium">1 CELO ~ 5.2938 ZAR</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Fees</span>
                      <span className="font-medium">0.001 CELO</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Transfer Time</span>
                      <span className="font-medium">5 minutes</span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-gray-50 px-4">
                      <span className="font-semibold">Total Receive</span>
                      <span className="font-bold text-lg">0 ZAR</span>
                    </div>
                  </>
                )}

                {activeTab === "buy" && (
                  <>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Pay</span>
                      <span className="font-medium">
                        {sendAmount || "0.5"} {sendCurrency}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Receive</span>
                      <span className="font-medium">1267.34 {receiveCurrency}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Route</span>
                      <span className="font-medium">{selectedRoute}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Fees</span>
                      <span className="font-medium">$4.98</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Time</span>
                      <span className="font-medium">~2m</span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-gray-50 px-4">
                      <span className="font-semibold">Total Receive</span>
                      <span className="font-bold text-lg">1267.34 {receiveCurrency}</span>
                    </div>
                  </>
                )}

                {activeTab === "swap" && (
                  <>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">From</span>
                      <span className="font-medium">0 CELO</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">To</span>
                      <span className="font-medium">0 USDC</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Exchange Rate</span>
                      <span className="font-medium">1 CELO = 0.85 USDC</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Slippage</span>
                      <span className="font-medium">1%</span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-gray-50 px-4">
                      <span className="font-semibold">You'll Receive</span>
                      <span className="font-bold text-lg">0 USDC</span>
                    </div>
                  </>
                )}
              </div>

              {/* Confirm Button */}
              <Button className="w-full bg-[#19B17A] hover:bg-[#158f68] text-white py-3 rounded-xl font-medium">
                {activeTab === "send" ? "Confirm Send" : activeTab === "buy" ? "Confirm Purchase" : "Confirm Swap"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Original Form Content */
          <Card className="bg-white border-0 shadow-sm rounded-2xl">
            <CardContent className="p-6">
              {/* Send Tab Content */}
              {activeTab === "send" && (
                <div className="space-y-4">
                  {/* Amount Section */}
                  <div>
                    <Label className="text-sm text-gray-500 mb-2 block">Amount</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="0"
                        value={sendAmount}
                        onChange={(e) => setSendAmount(e.target.value)}
                        className="text-2xl font-semibold border-0 p-0 h-auto bg-transparent"
                      />
                      <span className="text-lg font-medium text-gray-600">CELO</span>
                    </div>
                  </div>

                  {/* Payment Mode Selection */}
                  <div>
                    <Label className="text-sm text-gray-500 mb-2 block">Payment Mode</Label>
                    <Select value={paymentMode} onValueChange={setPaymentMode}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
                        <SelectItem value="mobile">Mobile Money</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bank Fields */}
                  {paymentMode === "bank" && (
                    <>
                      <div>
                        <Label className="text-sm text-gray-500 mb-2 block">Bank Name</Label>
                        <Select value={selectedBank} onValueChange={setSelectedBank}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select your bank" />
                          </SelectTrigger>
                          <SelectContent>
                            {banks.map((bank) => (
                              <SelectItem key={bank} value={bank}>
                                {bank}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm text-gray-500 mb-2 block">Account Name</Label>
                        <Input
                          placeholder="Enter account holder name"
                          value={bankAccountName}
                          onChange={(e) => setBankAccountName(e.target.value)}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <Label className="text-sm text-gray-500 mb-2 block">Account Number</Label>
                        <Input
                          placeholder="Enter bank account number"
                          value={bankAccountNumber}
                          onChange={(e) => setBankAccountNumber(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </>
                  )}

                  {/* Mobile Money Fields */}
                  {paymentMode === "mobile" && (
                    <>
                      <div>
                        <Label className="text-sm text-gray-500 mb-2 block">Mobile Network</Label>
                        <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select mobile network" />
                          </SelectTrigger>
                          <SelectContent>
                            {mobileNetworks.map((network) => (
                              <SelectItem key={network} value={network}>
                                {network}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm text-gray-500 mb-2 block">Phone Number</Label>
                        <Input
                          placeholder="Enter mobile number"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </>
                  )}

                  {/* Recipient */}
                  <div>
                    <Label className="text-sm text-gray-500 mb-2 block">Send to</Label>
                    <Input
                      placeholder="Enter recipient address"
                      value={sendAddress}
                      onChange={(e) => setSendAddress(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {/* Transaction Details */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <h4 className="font-medium text-gray-900 mb-3">Transaction Details</h4>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Wallet Balance</span>
                      <span className="text-sm font-medium">0 CELO</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Sell Amount</span>
                      <span className="text-sm font-medium">0 CELO</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Exchange Rate</span>
                      <span className="text-sm font-medium">1 CELO ~ 5.2938 ZAR</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Fees</span>
                      <span className="text-sm font-medium">0.001 CELO</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Transfer Time</span>
                      <span className="text-sm font-medium">5 minutes</span>
                    </div>

                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">Receive Amount</span>
                        <span className="text-sm font-bold text-gray-900">0 ZAR</span>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    className="w-full bg-[#19B17A] hover:bg-[#158f68] text-white py-3 rounded-xl font-medium"
                    onClick={handleNext}
                  >
                    Next
                  </Button>
                </div>
              )}

              {/* Buy Tab Content */}
              {activeTab === "buy" && (
                <div className="space-y-4">
                  {/* Pay Section */}
                  <div>
                    <Label className="text-sm text-gray-500 mb-2 block">Pay</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="0.5"
                        value={sendAmount}
                        onChange={(e) => setSendAmount(e.target.value)}
                        className="text-2xl font-semibold border-0 p-0 h-auto bg-transparent"
                      />
                      <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 bg-transparent">
                        Max
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 p-0 h-auto mt-2 text-gray-700"
                      onClick={() => setShowAssetSelector(true)}
                    >
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">🔷</div>
                      <span className="font-medium">{sendCurrency}</span>
                      <span className="text-sm text-gray-500">on Ethereum</span>
                      <ChevronDownIcon className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Send From */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Send from</span>
                      <div className="w-4 h-4 bg-orange-100 rounded">🦊</div>
                      <span className="font-mono text-sm">0x0f92...5128e</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 p-0 h-auto"
                      onClick={() => setShowWalletSelector(true)}
                    >
                      Change
                    </Button>
                  </div>

                  {/* Arrow Down */}
                  <div className="flex justify-center">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <ArrowDownIcon className="h-4 w-4 text-gray-600" />
                    </div>
                  </div>

                  {/* Receive Section */}
                  <div>
                    <Label className="text-sm text-gray-500 mb-2 block">Receive</Label>
                    <div className="text-2xl font-semibold mb-2">1267.34</div>

                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 p-0 h-auto text-gray-700"
                      onClick={() => setShowAssetSelector(true)}
                    >
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">🌊</div>
                      <span className="font-medium">{receiveCurrency}</span>
                      <span className="text-sm text-gray-500">on Osmosis</span>
                      <ChevronDownIcon className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Send To */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Send to</span>
                      <div className="w-4 h-4 bg-blue-100 rounded-full">🌊</div>
                      <span className="font-mono text-sm">osmo12tb...8g5re</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-blue-600 p-0 h-auto">
                      Change
                    </Button>
                  </div>

                  {/* Route Selection */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Use</span>
                      <div className="w-4 h-4 bg-purple-100 rounded">🌉</div>
                      <span className="font-medium text-sm">{selectedRoute}</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">$0.62</span>
                      <span className="text-xs text-gray-500">2m</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-blue-600 p-0 h-auto">
                      Change
                    </Button>
                  </div>

                  {/* Transaction Details */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <h4 className="font-medium text-gray-900 mb-3">Transaction Details</h4>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Wallet Balance</span>
                      <span className="text-sm font-medium">0.5 ETH</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Buy Amount</span>
                      <span className="text-sm font-medium">0.5 ETH</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Exchange Rate</span>
                      <span className="text-sm font-medium">1 ETH ~ 2534.68 USDC</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Fees</span>
                      <span className="text-sm font-medium">$4.98</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Processing Time</span>
                      <span className="text-sm font-medium">~2 minutes</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Slippage Tolerance</span>
                      <span className="text-sm font-medium">1%</span>
                    </div>

                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">Receive Amount</span>
                        <span className="text-sm font-bold text-gray-900">1267.34 axlUSDC</span>
                      </div>
                    </div>
                  </div>

                  {/* Continue Button */}
                  <Button
                    className="w-full bg-[#19B17A] hover:bg-[#158f68] text-white py-3 rounded-xl font-medium"
                    onClick={handleNext}
                  >
                    Next
                  </Button>
                </div>
              )}

              {/* Swap Tab Content */}
              {activeTab === "swap" && (
                <div className="space-y-4">
                  {/* From Section */}
                  <div>
                    <Label className="text-sm text-gray-500 mb-2 block">From</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="0"
                        className="text-2xl font-semibold border-0 p-0 h-auto bg-transparent"
                      />
                      <span className="text-lg font-medium text-gray-600">CELO</span>
                    </div>
                  </div>

                  {/* Arrow Down */}
                  <div className="flex justify-center">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <ArrowDownIcon className="h-4 w-4 text-gray-600" />
                    </div>
                  </div>

                  {/* To Section */}
                  <div>
                    <Label className="text-sm text-gray-500 mb-2 block">To</Label>
                    <div className="text-2xl font-semibold mb-2">0</div>
                    <span className="text-lg font-medium text-gray-600">USDC</span>
                  </div>

                  {/* Transaction Details */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <h4 className="font-medium text-gray-900 mb-3">Transaction Details</h4>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Wallet Balance</span>
                      <span className="text-sm font-medium">0 CELO</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Swap Amount</span>
                      <span className="text-sm font-medium">0 CELO</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Exchange Rate</span>
                      <span className="text-sm font-medium">1 CELO ~ 0.85 USDC</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Fees</span>
                      <span className="text-sm font-medium">0.001 CELO</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Processing Time</span>
                      <span className="text-sm font-medium">~30 seconds</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Slippage Tolerance</span>
                      <span className="text-sm font-medium">1%</span>
                    </div>

                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">Receive Amount</span>
                        <span className="text-sm font-bold text-gray-900">0 USDC</span>
                      </div>
                    </div>
                  </div>

                  {/* Swap Button */}
                  <Button
                    className="w-full bg-[#19B17A] hover:bg-[#158f68] text-white py-3 rounded-xl font-medium"
                    onClick={handleNext}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer Navigation Bar */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 shadow-2xl px-8 h-[60px]">
        <div className="flex items-center justify-between relative h-full">
          {/* Home Button */}
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 h-14 px-6 text-gray-500 hover:text-[#19B17A] hover:bg-green-50 cursor-pointer transition-all duration-200 rounded-xl"
            onClick={onBack}
          >
            <HomeIcon className="h-6 w-6" />
            <span className="text-xs font-medium">Home</span>
          </Button>

          {/* Send Money Button - Circular with overflow */}
          <Button className="flex flex-col items-center gap-1 h-16 w-16 rounded-full bg-gradient-to-r from-[#19B17A] to-[#15a06b] hover:from-[#158f68] hover:to-[#138f5f] text-white cursor-pointer -mt-10 shadow-lg shadow-green-200 transition-all duration-200 hover:shadow-xl hover:shadow-green-300 hover:scale-105">
            <SendIcon className="h-6 w-6" />
            <span className="text-xs font-medium">Send</span>
          </Button>

          {/* Activities Button */}
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 h-14 px-6 text-gray-500 hover:text-[#19B17A] hover:bg-green-50 cursor-pointer transition-all duration-200 rounded-xl"
          >
            <ActivityIcon className="h-6 w-6" />
            <span className="text-xs font-medium">Activities</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
