"use client"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { API_BASE_URL } from "@/utils/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import PhoneInput from "react-phone-number-input"
import "react-phone-number-input/style.css"
import { useSettings } from "@/contexts/SettingsContext"
import { useTransaction } from "@/contexts/TransactionContext"
import { useCurrency } from "@/contexts/CurrencyContext"
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
  transactionType: string,
  assets?: any[],
  currencies?: any[],
  exchangeRates?: any[],
  connectedWallet?: string,
  connectWalletBalance?: number,
  mainWalletType?: any
  /** Wallet's connected network (e.g. "Celo", "Base", "Stellar") - filters coins to those supporting this network */
  walletNetwork?: string
  /** Initial swap params from URL (rhino.fi style: chainIn, chainOut, token, tokenOut) */
  initialSwapParams?: {
    chainIn?: string
    chainOut?: string
    token?: string
    tokenOut?: string
  }
}

export function TransactionForms({  onBack, 
                                    isWalletConnected, 
                                    walletType, 
                                    onConnectWallet, 
                                    transactionType,
                                    assets,
                                    currencies,
                                    exchangeRates,
                                    connectedWallet,
                                    connectWalletBalance,
                                    mainWalletType,
                                    walletNetwork,
                                    initialSwapParams
                                 }: TransactionFormsProps) {
  const [activeTab, setActiveTab] = useState(transactionType)
  const [showReview, setShowReview] = useState(false)
  const [sendAmount, setSendAmount] = useState("")
  const [sendAddress, setSendAddress] = useState("")
  const [sendCurrency, setSendCurrency] = useState(() => {
    if (transactionType === "buy") {
      return assets && assets.length > 0 ? assets[0]?.symbol || "" : ""
    }
    return assets && assets.length > 0 ? assets[0]?.symbol || "" : ""
  })
  const [receiveAmount, setReceiveAmount] = useState("")
  const [receiveCurrency, setReceiveCurrency] = useState(() => {
    if (transactionType === "buy") {
      return currencies && currencies.length > 0 ? currencies[0]?.symbol || "" : ""
    }
    return currencies && currencies.length > 0 ? currencies[0]?.symbol || "" : ""
  })
  const [selectedRoute, setSelectedRoute] = useState("")
  const [showAssetSelector, setShowAssetSelector] = useState(false)
  const [showWalletSelector, setShowWalletSelector] = useState(false)
  const [paymentMode, setPaymentMode] = useState("")
  const [selectedBank, setSelectedBank] = useState("")
  const [bankAccountName, setBankAccountName] = useState("")
  const [phoneHolderName, setPhoneHolderName] = useState("")
  const [bankAccountNumber, setBankAccountNumber] = useState("")
  const [selectedNetwork, setSelectedNetwork] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [walletDestination, setWalletDestination] = useState("connected") // "connected" or "custom"
  const [customWalletAddress, setCustomWalletAddress] = useState("")
  const [network, setNetwork] = useState("") //base, ethereum, optimism
  const [isVerifyingAccount, setIsVerifyingAccount] = useState(false)
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false)
  const [isVerifyingPaymentPhone, setIsVerifyingPaymentPhone] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState("")
  const [paymentPhoneHolderName, setPaymentPhoneHolderName] = useState("")
  const [swapFromNetwork, setSwapFromNetwork] = useState("")
  const [swapToNetwork, setSwapToNetwork] = useState("")
  const appliedInitialSwapParams = useRef(false)
  const appliedInitialChainParams = useRef(false)

  // Get countries from Settings Context
  const { countries, loading: countriesLoading } = useSettings()
  
  // Get transaction networks from Transaction Context
  const { 
    bankNetworks, 
    bankNetworksLoading, 
    fetchBankNetworks,
    mobileNetworks,
    mobileNetworksLoading,
    fetchMobileNetworks
  } = useTransaction()
  
  // Get currencies from context (API fetched at provider level)
  const { currencies: contextCurrencies } = useCurrency()
  
  // Use contextCurrencies when available (full API data); fall back to props when context is empty
  const allCurrencies = (contextCurrencies?.length ?? 0) > 0 ? contextCurrencies : (currencies ?? [])
  
  // Fiat currencies for "Receiver gets": token_type = fiat only (API uses coin_status)
  const fiatCurrencies = allCurrencies.filter(
    (c: any) =>
      (c.token_type?.toLowerCase() === "fiat") &&
      (c.coin_status === "active" || c.status === "active" || c.status === true || c.isActive === true)
  )

  // Crypto assets: include all coins with token_type Native/native
  const cryptoNativeAssets = allCurrencies.filter(
    (c: any) =>
      (c.token_type === "Native" || c.token_type === "native") && (c.coin_status === "active")  
  )


  // Parse networks from coin (API returns JSON string)
  const getCoinNetworks = (coin: any) => {
    try {
      const networks = typeof coin?.networks === "string" ? JSON.parse(coin.networks || "[]") : (coin?.networks || [])
      return Array.isArray(networks) ? networks.filter((n: any) => n.status === "active") : []
    } catch {
      return []
    }
  }

  // Get icon URL from local /flag by currency symbol
  const getCurrencyIconUrl = (asset: any): string | null => {
    const symbol = (asset?.symbol || asset?.icon || "").toString().trim()
    if (!symbol) return null
    if (typeof asset?.icon === "string" && asset.icon.startsWith("http")) return asset.icon
    if (typeof asset?.icon === "string" && asset.icon.startsWith("/")) return `${API_BASE_URL}${asset.icon}`

    const filename = symbol.toLowerCase() === "usd" ? "USD" : symbol.toLowerCase()
    return `/flag/${filename}.png`
  }

  const formatFee = (amount: string | number, currency: string): string => {
    const numericAmount = typeof amount === "number" ? amount : Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return `0 ${currency || ""}`.trim()
    }

    const fee = numericAmount * 0.025
    const formattedFee = fee % 1 === 0 ? fee.toString() : fee.toFixed(4).replace(/\.?0+$/, "")
    return `${formattedFee} ${currency || ""}`.trim()
  }

  const isStellarNetworkName = (value: string): boolean => value.toLowerCase().includes("stellar")

  const hasExactStellarNetwork = (coin: any): boolean => {
    const networks = getCoinNetworks(coin)
    return networks.some((net: any) => String(net?.network || "").toUpperCase() === "STELLAR")
  }

  const coinSupportsStellar = (coin: any): boolean => {
    const symbol = String(coin?.symbol || "").toUpperCase()
    if (symbol === "XXLM" || symbol === "XLM") return true
    return hasExactStellarNetwork(coin)
  }

  const coinSupportsEvm = (coin: any): boolean => {
    const networks = getCoinNetworks(coin)
    return networks.some((net: any) => {
      const networkName = (net.network || "").toLowerCase()
      const networkLabel = (net.label || "").toLowerCase()
      return !networkName.includes("stellar") && !networkLabel.includes("stellar")
    })
  }

  // If no wallet is connected, show all assets.
  // If connected wallet is Stellar, show Stellar-supported coins only.
  // Otherwise, show EVM-supported coins.
  const isStellarWalletConnected =
    isWalletConnected &&
    (walletType?.toLowerCase().includes("stellar") || (walletNetwork ? isStellarNetworkName(walletNetwork) : false))

  const cryptoNativeAssetsForWallet = !isWalletConnected
    ? cryptoNativeAssets
    : isStellarWalletConnected
      ? cryptoNativeAssets.filter((c: any) => coinSupportsStellar(c))
      : cryptoNativeAssets.filter((c: any) => coinSupportsEvm(c))

  const normalizeNetworkKey = (value: string): string =>
    value.toLowerCase().replace(/[\s_-]/g, "")

  const getNetworkAliases = (networkName: string): string[] => {
    const key = normalizeNetworkKey(networkName)
    if (key.includes("stellar")) return ["stellar"]
    if (key.includes("celo")) return ["celo"]
    if (key.includes("bnb") || key.includes("bsc") || key.includes("binance")) {
      return ["bsc", "bnb", "binancesmartchain"]
    }
    if (key.includes("ethereum") || key === "eth") return ["ethereum", "eth"]
    if (key.includes("polygon") || key.includes("matic")) return ["polygon", "matic"]
    if (key.includes("arbitrum")) return ["arbitrum"]
    if (key.includes("optimism") || key === "op") return ["optimism", "op"]
    if (key.includes("base")) return ["base"]
    if (key.includes("avalanche") || key.includes("avax")) return ["avalanche", "avax"]
    return [key]
  }

  const coinSupportsSpecificNetwork = (coin: any, networkName: string): boolean => {
    if (!networkName) return true
    const aliases = getNetworkAliases(networkName)
    const symbol = String(coin?.symbol || "").toUpperCase()
    if (aliases.includes("stellar")) {
      return symbol === "XXLM" || symbol === "XLM" || hasExactStellarNetwork(coin)
    }
    const networks = getCoinNetworks(coin)
    return networks.some((net: any) => {
      const network = normalizeNetworkKey(String(net?.network || ""))
      const label = normalizeNetworkKey(String(net?.label || ""))
      return aliases.some((alias) =>
        network === alias || label === alias || network.includes(alias) || label.includes(alias)
      )
    })
  }

  // Set default receiveCurrency when fiatCurrencies loads (for send mode)
  useEffect(() => {
    if (activeTab === "send" && fiatCurrencies.length > 0 && !fiatCurrencies.some((c: any) => c.symbol === receiveCurrency)) {
      setReceiveCurrency(fiatCurrencies[0]?.symbol ?? "")
    }
  }, [activeTab, fiatCurrencies, receiveCurrency])

  // Set default sendCurrency when crypto loads (for send mode)
  useEffect(() => {
    if (activeTab === "send" && cryptoNativeAssetsForWallet.length > 0 && !cryptoNativeAssetsForWallet.some((c: any) => c.symbol === sendCurrency)) {
      alert(cryptoNativeAssetsForWallet[1]?.symbol)
      setSendCurrency(cryptoNativeAssetsForWallet[0]?.symbol ?? "")
    }
  }, [activeTab, cryptoNativeAssetsForWallet])

  // Set default buy currencies when data loads (buy mode)
  useEffect(() => {
    if (activeTab === "buy") {
      if (fiatCurrencies.length > 0 && !fiatCurrencies.some((c: any) => c.symbol === receiveCurrency)) {
        setReceiveCurrency(fiatCurrencies[0]?.symbol ?? "")
      }
      if (cryptoNativeAssetsForWallet.length > 0 && !cryptoNativeAssetsForWallet.some((c: any) => c.symbol === sendCurrency)) {
        setSendCurrency(cryptoNativeAssetsForWallet[0]?.symbol ?? "")
      }
    }
  }, [activeTab, fiatCurrencies, cryptoNativeAssetsForWallet])

  // Swap form state - use native tokens from context (must be declared before swapFromCrypto/swapToCrypto)
  const [fromCurrency, setFromCurrency] = useState("")
  const [toCurrency, setToCurrency] = useState("")

  const selectedSwapNetwork = walletNetwork || swapFromNetwork || ""
  const swapAssetsForSelectedNetwork = selectedSwapNetwork
    ? cryptoNativeAssetsForWallet.filter((c: any) => coinSupportsSpecificNetwork(c, selectedSwapNetwork))
    : cryptoNativeAssetsForWallet
  const swapToOptions = swapAssetsForSelectedNetwork.filter((c: any) => c.symbol !== fromCurrency)

  // Swap: both From and To filtered by wallet's connected network
  const swapFromCrypto = swapAssetsForSelectedNetwork.find((c: any) => c.symbol === fromCurrency)
  const swapToCrypto = swapAssetsForSelectedNetwork.find((c: any) => c.symbol === toCurrency)
  const swapFromNetworks = swapFromCrypto ? getCoinNetworks(swapFromCrypto) : []
  const swapToNetworks = swapToCrypto ? getCoinNetworks(swapToCrypto) : []
  useEffect(() => {
    if (activeTab !== "swap") return
    if (walletNetwork) {
      setSwapFromNetwork(walletNetwork)
      return
    }

    if (fromCurrency && swapFromNetworks.length > 0) {
      setSwapFromNetwork((prev) =>
        swapFromNetworks.some((n: any) => n.network === prev) ? prev : swapFromNetworks[0]?.network ?? ""
      )
    } else {
      setSwapFromNetwork("")
    }
  }, [activeTab, walletNetwork, fromCurrency, swapFromNetworks])

  useEffect(() => {
    if (activeTab !== "swap") return
    if (swapFromNetwork) {
      setSwapToNetwork(swapFromNetwork)
    } else if (walletNetwork) {
      setSwapToNetwork(walletNetwork)
    } else if (toCurrency && swapToNetworks.length > 0) {
      setSwapToNetwork((prev) =>
        swapToNetworks.some((n: any) => n.network === prev) ? prev : swapToNetworks[0]?.network ?? ""
      )
    } else {
      setSwapToNetwork("")
    }
  }, [activeTab, swapFromNetwork, walletNetwork, toCurrency, swapToNetworks])

  useEffect(() => {
    if (activeTab !== "swap") return
    const lockedNetwork = walletNetwork || swapFromNetwork || ""
    if (lockedNetwork && swapToNetwork !== lockedNetwork) {
      setSwapToNetwork(lockedNetwork)
    }
  }, [activeTab, walletNetwork, swapFromNetwork, swapToNetwork])

  // Set default swap currencies: both filtered by wallet network
  useEffect(() => {
    if (activeTab === "swap" && swapAssetsForSelectedNetwork.length > 0) {
      if (!fromCurrency || !swapAssetsForSelectedNetwork.some((c: any) => c.symbol === fromCurrency)) {
        setFromCurrency(swapAssetsForSelectedNetwork[0]?.symbol ?? "")
      }
      const toOptions = swapAssetsForSelectedNetwork.filter((c: any) => c.symbol !== fromCurrency)
      if (!toCurrency || !swapAssetsForSelectedNetwork.some((c: any) => c.symbol === toCurrency) || toCurrency === fromCurrency) {
        setToCurrency(toOptions[0]?.symbol ?? "")
      }
    }
  }, [activeTab, swapAssetsForSelectedNetwork, fromCurrency, toCurrency])

  // Apply initial swap params from URL (rhino.fi style: chainIn, chainOut, token, tokenOut)
  const networkMatches = (net: any, chainParam: string) => {
    if (!chainParam) return false
    const n = (net.network || net.label || "").toLowerCase()
    const l = (net.label || net.network || "").toLowerCase()
    const p = chainParam.toLowerCase()
    return n.includes(p) || l.includes(p) || p.includes(n) || p.includes(l)
  }
  useEffect(() => {
    if (activeTab !== "swap" || !initialSwapParams || cryptoNativeAssetsForWallet.length === 0 || appliedInitialSwapParams.current) return
    const { chainIn, chainOut, token, tokenOut } = initialSwapParams

    // Use all crypto native assets for URL param matching (not filtered by wallet) so we can pre-select even when wallet not connected
    const allCrypto = allCurrencies.filter(
      (c: any) =>
        (c.token_type === "Native" || c.token_type === "native") &&
        (c.coin_status === "active" || c.status === "active" || c.status === true)
    )

    if (token) {
      const fromAsset = allCrypto.find((c: any) => (c.symbol || "").toUpperCase() === token)
      if (fromAsset && cryptoNativeAssetsForWallet.some((c: any) => c.symbol === fromAsset.symbol)) {
        setFromCurrency(fromAsset.symbol)
      }
    }
    if (tokenOut) {
      const toAsset = allCrypto.find((c: any) => (c.symbol || "").toUpperCase() === tokenOut)
      const fromSym = (token || fromCurrency || "").toUpperCase()
      if (toAsset && toAsset.symbol.toUpperCase() !== fromSym && cryptoNativeAssetsForWallet.some((c: any) => c.symbol === toAsset.symbol)) {
        setToCurrency(toAsset.symbol)
      }
    }
    appliedInitialSwapParams.current = true
  }, [activeTab, initialSwapParams, cryptoNativeAssetsForWallet.length, allCurrencies])

  // Apply chainIn/chainOut after from/to currencies are set (networks come from selected coin)
  useEffect(() => {
    if (activeTab !== "swap" || !initialSwapParams || appliedInitialChainParams.current) return
    const { chainIn, chainOut } = initialSwapParams
    let applied = false
    if (chainIn && fromCurrency && swapFromNetworks.length > 0) {
      const match = swapFromNetworks.find((n: any) => networkMatches(n, chainIn))
      if (match) {
        setSwapFromNetwork(match.network)
        applied = true
      }
    }
    if (chainOut && toCurrency && swapToNetworks.length > 0) {
      const match = swapToNetworks.find((n: any) => networkMatches(n, chainOut))
      if (match) {
        setSwapToNetwork(match.network)
        applied = true
      }
    }
    if (applied) appliedInitialChainParams.current = true
  }, [activeTab, initialSwapParams, fromCurrency, toCurrency, swapFromNetworks, swapToNetworks])
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")

  // Swap function to switch from and to currencies (and networks)
  const handleSwapCurrencies = () => {
    const tempCurrency = fromCurrency
    const tempAmount = fromAmount
    const tempNetwork = swapFromNetwork
    
    setFromCurrency(toCurrency)
    setToCurrency(tempCurrency)
    setFromAmount(toAmount)
    setToAmount(tempAmount)
    setSwapFromNetwork(swapToNetwork)
    setSwapToNetwork(tempNetwork)
  }

  // Removed dummy data - all data now comes from props
  const recentAddresses: any[] = []
  const cryptoAssets: any[] = []
  
  // Fetch networks when receiveCurrency changes
  useEffect(() => {
    if (receiveCurrency) {
      console.log(`🔄 Fetching networks for currency: ${receiveCurrency}`)
      
      // Fetch both bank and mobile networks for the selected currency
      fetchBankNetworks(receiveCurrency).then(() => {
        console.log(`✅ Bank networks fetched for ${receiveCurrency}`)
      })
      
      fetchMobileNetworks(receiveCurrency).then(() => {
        console.log(`✅ Mobile networks fetched for ${receiveCurrency}`)
      })
    }
  }, [receiveCurrency, fetchBankNetworks, fetchMobileNetworks])

  const handleNext = () => {
    setShowReview(true)
  }

  const handleBackFromReview = () => {
    setShowReview(false)
  }

  const handleVerifyAccount = async () => {
    setIsVerifyingAccount(true)
    try {
      // TODO: Implement actual account verification API call
      // For now, simulate verification
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Set a dummy account name after verification
      setBankAccountName("Account Verified - Name Retrieved")
      
      // Show success message (you can add toast notification here)
      console.log("Account verified successfully")
    } catch (error) {
      console.error("Account verification failed:", error)
    } finally {
      setIsVerifyingAccount(false)
    }
  }

  const handleVerifyPhone = async () => {
    setIsVerifyingPhone(true)
    try {
      // TODO: Implement actual phone verification API call
      // For now, simulate verification
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Set a dummy holder name after verification
      setPhoneHolderName("Phone Verified - Name Retrieved")
      
      // Show success message (you can add toast notification here)
      console.log("Phone verified successfully")
    } catch (error) {
      console.error("Phone verification failed:", error)
    } finally {
      setIsVerifyingPhone(false)
    }
  }

  const handleVerifyPaymentPhone = async () => {
    setIsVerifyingPaymentPhone(true)
    try {
      // TODO: Implement actual payment phone verification API call
      // For now, simulate verification
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Set a dummy holder name after verification
      setPaymentPhoneHolderName("Payment Phone Verified - Name Retrieved")
      
      // Show success message (you can add toast notification here)
      console.log("Payment phone verified successfully")
    } catch (error) {
      console.error("Payment phone verification failed:", error)
    } finally {
      setIsVerifyingPaymentPhone(false)
    }
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
                <SelectContent className="bg-white">
                  <SelectItem value="all" className="bg-white hover:bg-gray-50">All networks</SelectItem>
                  <SelectItem value="ethereum" className="bg-white hover:bg-gray-50">Ethereum</SelectItem>
                  <SelectItem value="optimism" className="bg-white hover:bg-gray-50">Optimism</SelectItem>
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
                      <span className="font-medium">{paymentMode === "bank" ? "Bank Transfer" : paymentMode === "mobile" ? "Mobile Money" : "Not selected"}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Amount</span>
                      <span className="font-medium">{sendAmount || 0} {sendCurrency}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Recipient</span>
                      <span className="font-medium font-mono text-sm">{(paymentMode === "bank" ? bankAccountNumber : phoneNumber) || "Not specified"}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Exchange Rate</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Fees</span>
                      <span className="font-medium">{formatFee(sendAmount, sendCurrency)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Transfer Time</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-gray-50 px-4">
                      <span className="font-semibold">Total Receive</span>
                      <span className="font-bold text-lg">0 {receiveCurrency}</span>
                    </div>
                  </>
                )}

                {activeTab === "buy" && (
                  <>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Pay</span>
                      <span className="font-medium">
                        {sendAmount || 0} {receiveCurrency}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Receive</span>
                      <span className="font-medium">0 {sendCurrency}</span>
                    </div>
                    {walletNetwork && (
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-gray-600">Network</span>
                        <span className="font-medium">{walletNetwork}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Route</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Fees</span>
                      <span className="font-medium">{formatFee(sendAmount, receiveCurrency)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Time</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-gray-50 px-4">
                      <span className="font-semibold">Total Receive</span>
                      <span className="font-bold text-lg">0 {receiveCurrency}</span>
                    </div>
                  </>
                )}

                {activeTab === "swap" && (
                  <>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">You send</span>
                      <span className="font-medium">{fromAmount || 0} {fromCurrency}</span>
                    </div>
                    {swapFromNetwork && (
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-gray-600">Network</span>
                        <span className="font-medium">{swapFromNetwork}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Tox</span>
                      <span className="font-medium">0 {toCurrency}</span>
                    </div>
                    {swapToNetwork && (
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-gray-600">To Network</span>
                        <span className="font-medium">{swapToNetwork}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Exchange Rate</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Slippage</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-gray-50 px-4">
                      <span className="font-semibold">You'll Receive</span>
                      <span className="font-bold text-lg">0 {toCurrency}</span>
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
                <div className="space-y-6">
                  {/* Sending From Section - Native tokens only, filtered by wallet network */}
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="text-sm text-gray-500 mb-3">I want to send</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-gray-100 shrink-0">
                          <span className="text-xs font-bold text-blue-600">
                            {sendCurrency?.slice(0, 2) || "--"}
                          </span>
                          {(() => {
                            const selectedAsset = cryptoNativeAssetsForWallet.find((c: any) => c.symbol === sendCurrency)
                            const iconUrl = selectedAsset ? getCurrencyIconUrl(selectedAsset) : null
                            return iconUrl ? (
                              <img 
                                src={iconUrl} 
                                alt={sendCurrency} 
                                className="absolute inset-0 w-full h-full object-contain rounded-full"
                                onError={(e) => { e.currentTarget.style.display = "none" }}
                              />
                            ) : null
                          })()}
                        </div>
                        <div>
                          <Select value={sendCurrency} onValueChange={setSendCurrency}>
                            <SelectTrigger className="border-0 p-0 h-auto bg-transparent w-auto min-w-[120px]">
                              <SelectValue>
                                <div className="font-medium text-gray-900">{sendCurrency || "Select"}</div>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-white max-h-[300px]">
                              {swapAssetsForSelectedNetwork && swapAssetsForSelectedNetwork.length > 0 ? (
                                swapAssetsForSelectedNetwork.map((asset) => {
                                  const iconUrl = getCurrencyIconUrl(asset)
                                  return (
                                    <SelectItem 
                                      key={asset.symbol} 
                                      value={asset.symbol} 
                                      className="bg-white hover:bg-gray-50"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full flex items-center justify-center overflow-hidden bg-gray-100 shrink-0">
                                          {iconUrl ? (
                                            <img src={iconUrl} alt={asset.symbol} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none" }} />
                                          ) : (
                                            <span className="text-[10px] font-bold text-gray-600">{asset.symbol?.slice(0, 2)}</span>
                                          )}
                                        </div>
                                        <span>{asset.symbol || asset.token_name}</span>
                                      </div>
                                    </SelectItem>
                                  )
                                })
                              ) : (
                                <div className="p-4 text-center text-sm text-gray-500">
                                  {isStellarWalletConnected
                                    ? "No Stellar-supported native tokens available."
                                    : "No EVM-supported native tokens available."}
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                          <div className="text-sm text-gray-500">{isStellarWalletConnected ? "Stellar" : "EVM"}</div>
                        </div>
                      </div>
                      <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="0"
                        value={sendAmount}
                        onChange={(e) => setSendAmount(e.target.value)}
                            className="text-2xl font-bold border-0 p-0 h-auto bg-transparent text-right w-24"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSendAmount(connectWalletBalance?.toString() || "")}
                            className="text-xs px-2 py-1 h-6 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
                          >
                            Max
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Exchange Rate Section */}
                  <div className="relative flex items-center justify-center">
                    
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>

                    <div className="relative flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full w-10 h-10 p-0 bg-white border-gray-300 hover:bg-gray-50  hidden display-none"
                      >
                        <ArrowDownIcon className="h-4 w-4 text-gray-600" />
                      </Button>
                      
                      <div className="bg-gray-100 rounded-full px-3 py-1">
                        <span className="text-xs text-gray-600">--</span>
                      </div>
                    </div>
                  </div>

                  {/* Receiver Gets Section - Fiat with icons from public/flag */}
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="text-sm text-gray-500 mb-3">Receiver gets</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-gray-100 shrink-0">
                          <span className="text-xs font-bold text-red-600">{receiveCurrency?.slice(0, 2) || "--"}</span>
                          {(() => {
                            const iconUrl = getCurrencyIconUrl({ symbol: receiveCurrency })
                            return iconUrl ? (
                              <img 
                                src={iconUrl} 
                                alt={receiveCurrency} 
                                className="absolute inset-0 w-full h-full object-contain rounded-full"
                                onError={(e) => { e.currentTarget.style.display = "none" }}
                              />
                            ) : null
                          })()}
                        </div>
                        <div>
                          <Select value={receiveCurrency} onValueChange={setReceiveCurrency}>
                            <SelectTrigger className="border-0 p-0 h-auto bg-transparent w-auto min-w-[120px]">
                              <SelectValue>
                                <div className="font-medium text-gray-900">{receiveCurrency || "Select"}</div>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-white max-h-[300px]">
                              {fiatCurrencies && fiatCurrencies.length > 0 ? (
                                fiatCurrencies.map((currency) => {
                                  const iconUrl = getCurrencyIconUrl({ symbol: currency.symbol })
                                  return (
                                    <SelectItem 
                                      key={currency.symbol} 
                                      value={currency.symbol} 
                                      className="bg-white hover:bg-gray-50"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                                          {iconUrl && (
                                            <img src={iconUrl} alt={currency.symbol} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none" }} />
                                          )}
                                        </div>
                                        <span>{currency.symbol}</span>
                                      </div>
                                    </SelectItem>
                                  )
                                })
                              ) : (
                                <div className="p-4 text-center text-sm text-gray-500">
                                  No currencies available
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                          <div className="text-sm text-gray-500">Fiat Currency</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          0.00
                        </div>
                      </div>
                    </div>
                  </div>

                

                  <div>
                    <Label className="text-sm text-gray-500 mb-2 block">Payment Mode</Label>
                    <Select value={paymentMode} onValueChange={setPaymentMode}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="bank" className="bg-white hover:bg-gray-50">Bank Transfer</SelectItem>
                        <SelectItem value="mobile" className="bg-white hover:bg-gray-50">Mobile Money</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>


                  {/* Country Selection */}
                  <div>
                    <Label className="text-sm text-gray-500 mb-2 block">Country</Label>
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent className="bg-white max-h-[300px]">
                        {countriesLoading ? (
                          <div className="p-4 text-center text-sm text-gray-500">
                            Loading countries...
                          </div>
                        ) : countries.length > 0 ? (
                          countries
                            .filter(country => {
                              const hasValidCode = country.alpha_3_code || country.code
                              const isActive = country.isActive !== false && country.is_active !== false
                              return isActive && hasValidCode
                            })
                            .map((country) => {
                              const countryCode = country.alpha_3_code || country.code || String(country.id)
                              const countryName = country.country_name || country.name || countryCode
                              const countryFlag = country.flag || country.emoji_flag
                              
                              return (
                                <SelectItem 
                                  key={countryCode} 
                                  value={countryCode} 
                                  className="bg-white hover:bg-gray-50"
                                >
                                  <div className="flex items-center gap-2">
                                    {countryFlag && <span className="text-lg">{countryFlag}</span>}
                                    <span>{countryName}</span>
                                  </div>
                                </SelectItem>
                              )
                            })
                        ) : (
                          <div className="p-4 text-center text-sm text-gray-500">
                            No countries available
                          </div>
                        )}
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
                          <SelectContent className="bg-white max-h-[300px]">
                            {bankNetworksLoading ? (
                              <div className="p-4 text-center text-sm text-gray-500">
                                Loading banks...
                              </div>
                            ) : bankNetworks.length > 0 ? (
                              bankNetworks
                                .filter(bank => bank.isActive !== false)
                                .map((bank) => (
                                  <SelectItem 
                                    key={bank.id || bank.name} 
                                    value={bank.name} 
                                    className="bg-white hover:bg-gray-50"
                                  >
                                    {bank.name}
                              </SelectItem>
                                ))
                            ) : (
                              <div className="p-4 text-center text-sm text-gray-500">
                                No banks available for {receiveCurrency}
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm text-gray-500 mb-2 block">Account Number</Label>
                        <Input
                          placeholder="Enter bank account number"
                          value={bankAccountNumber}
                          onChange={(e) => setBankAccountNumber(e.target.value)}
                          className="w-full"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full mt-2 border-[#19B17A] text-[#19B17A] hover:bg-[#19B17A] hover:text-white transition-colors"
                          onClick={handleVerifyAccount}
                          disabled={!bankAccountNumber || isVerifyingAccount}
                        >
                          {isVerifyingAccount ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                              Verifying...
                            </>
                          ) : (
                            "Verify account number"
                          )}
                        </Button>
                      </div>

                      <div>
                        <Label className="text-sm text-gray-500 mb-2 block">Account Name</Label>
                        <Input
                          placeholder="Account name will appear after verification"
                          value={bankAccountName}
                          onChange={(e) => setBankAccountName(e.target.value)}
                          className="w-full bg-gray-50"
                          readOnly
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
                          <SelectContent className="bg-white max-h-[300px]">
                            {mobileNetworksLoading ? (
                              <div className="p-4 text-center text-sm text-gray-500">
                                Loading mobile networks...
                              </div>
                            ) : mobileNetworks.length > 0 ? (
                              mobileNetworks
                                .filter(network => network.isActive !== false)
                                .map((network) => (
                                  <SelectItem 
                                    key={network.id || network.name} 
                                    value={network.name} 
                                    className="bg-white hover:bg-gray-50"
                                  >
                                    {network.name}
                              </SelectItem>
                                ))
                            ) : (
                              <div className="p-4 text-center text-sm text-gray-500">
                                No mobile networks available for {receiveCurrency}
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm text-gray-500 mb-2 block">Phone Number</Label>
                        {countriesLoading ? (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-[#19B17A] rounded-full" />
                            Loading countries...
                          </div>
                        ) : (
                          <PhoneInput
                            international
                            defaultCountry="US"
                          value={phoneNumber}
                            onChange={(value) => setPhoneNumber(value || "")}
                            placeholder="Enter phone number"
                            className="phone-input-custom"
                            countries={
                              countries.length > 0
                                ? (countries
                                    .filter(c => {
                                      const isActive = c.isActive !== false && c.is_active !== false
                                      const hasCode = c.alpha_2_code || c.code
                                      return isActive && hasCode
                                    })
                                    .map(c => c.alpha_2_code || c.code) as any)
                                : undefined
                            }
                          />
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full mt-2 border-[#19B17A] text-[#19B17A] hover:bg-[#19B17A] hover:text-white transition-colors"
                          onClick={handleVerifyPhone}
                          disabled={!phoneNumber || isVerifyingPhone}
                        >
                          {isVerifyingPhone ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                              Verifying...
                            </>
                          ) : (
                            "Verify phone number"
                          )}
                        </Button>
                      </div>


                  <div>
                        <Label className="text-sm text-gray-500 mb-2 block">Holder Name</Label>
                    <Input
                          placeholder="Holder name will appear after verification"
                          value={phoneHolderName}
                          onChange={(e) => setPhoneHolderName(e.target.value)}
                      className="w-full bg-gray-50"
                          readOnly
                    />
                  </div>
                    </>
                  )}

                  {/* Transaction Details */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <h4 className="font-medium text-gray-900 mb-3">Transaction Details</h4>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Wallet Balance</span>
                      <span className="text-sm font-medium">{connectWalletBalance || 0} {sendCurrency}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Sell Amount</span>
                      <span className="text-sm font-medium">{sendAmount || 0} {sendCurrency}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Exchange Rate</span>
                      <span className="text-sm font-medium">--</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Fees</span>
                      <span className="text-sm font-medium">{formatFee(sendAmount, sendCurrency)}</span>
                    </div>

                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">Receive Amount</span>
                        <span className="text-sm font-bold text-gray-900">0 {receiveCurrency}</span>
                      </div>
                    </div>
                  </div>

                  {/* Send Money Button */}
                  <Button
                    className="w-full bg-green-400 hover:bg-green-500 text-white-900 py-8 rounded-xl font-bold text-lg"
                    onClick={handleNext}
                  >
                    SEND MONEY NOW
                  </Button>
                </div>
              )}

              {/* Buy Tab Content */}
              {activeTab === "buy" && (
                <div className="space-y-6">
                  {/* I will pay Section - Fiat with icons from public/flag */}
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="text-sm text-gray-500 mb-3">I will pay</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-gray-100 shrink-0">
                          <span className="text-xs font-bold text-green-600">{receiveCurrency?.slice(0, 2) || "FI"}</span>
                          {(() => {
                            const iconUrl = getCurrencyIconUrl({ symbol: receiveCurrency })
                            return iconUrl ? (
                              <img 
                                src={iconUrl} 
                                alt={receiveCurrency} 
                                className="absolute inset-0 w-full h-full object-contain rounded-full"
                                onError={(e) => { e.currentTarget.style.display = "none" }}
                              />
                            ) : null
                          })()}
                        </div>
                        <div>
                          <Select value={receiveCurrency} onValueChange={setReceiveCurrency}>
                            <SelectTrigger className="border-0 p-0 h-auto bg-transparent w-auto min-w-[120px]">
                              <SelectValue>
                                <div className="font-medium text-gray-900">{receiveCurrency || "Select"}</div>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-white max-h-[300px]">
                              {fiatCurrencies && fiatCurrencies.length > 0 ? (
                                fiatCurrencies.map((currency) => {
                                  const iconUrl = getCurrencyIconUrl(currency)
                                  return (
                                    <SelectItem 
                                      key={currency.symbol} 
                                      value={currency.symbol} 
                                      className="bg-white hover:bg-gray-50"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                                          {iconUrl && (
                                            <img src={iconUrl} alt={currency.symbol} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none" }} />
                                          )}
                                        </div>
                                        <span>{currency.symbol}</span>
                                      </div>
                                    </SelectItem>
                                  )
                                })
                              ) : (
                                <div className="p-4 text-center text-sm text-gray-500">
                                  No currencies available
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                          <div className="text-sm text-gray-500">Fiat Currency</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Input
                          type="number"
                          placeholder="0"
                          value={sendAmount}
                          onChange={(e) => setSendAmount(e.target.value)}
                          className="text-2xl font-bold border-0 p-0 h-auto bg-transparent text-right w-24"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Exchange Rate Section */}
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex items-center gap-3">
                      <div className="bg-gray-100 rounded-full px-3 py-1">
                        <span className="text-xs text-gray-600">--</span>
                      </div>
                    </div>
                  </div>

                  {/* I want to buy Section - Crypto with icons from public/flag, Network selector */}
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="text-sm text-gray-500 mb-3">I want to buy</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-gray-100 shrink-0">
                          <span className="text-xs font-bold text-blue-600">{sendCurrency?.slice(0, 2) || "CR"}</span>
                          {getCurrencyIconUrl({ symbol: sendCurrency }) && (
                            <img 
                              src={getCurrencyIconUrl({ symbol: sendCurrency })!} 
                              alt={sendCurrency} 
                              className="absolute inset-0 w-full h-full object-contain rounded-full"
                              onError={(e) => { e.currentTarget.style.display = "none" }}
                            />
                          )}
                        </div>
                        <div>
                          <Select value={sendCurrency} onValueChange={setSendCurrency}>
                            <SelectTrigger className="border-0 p-0 h-auto bg-transparent w-auto min-w-[120px]">
                              <SelectValue>
                                <div className="font-medium text-gray-900">{sendCurrency || "Select"}</div>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-white max-h-[300px]">
                              {swapAssetsForSelectedNetwork && swapAssetsForSelectedNetwork.length > 0 ? (
                                swapAssetsForSelectedNetwork.map((asset) => {
                                  const iconUrl = getCurrencyIconUrl(asset)
                                  return (
                                    <SelectItem 
                                      key={asset.symbol} 
                                      value={asset.symbol} 
                                      className="bg-white hover:bg-gray-50"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                                          {iconUrl ? (
                                            <img src={iconUrl} alt={asset.symbol} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none" }} />
                                          ) : (
                                            <span className="text-[10px] font-bold text-gray-600">{asset.symbol?.slice(0, 2)}</span>
                                          )}
                                        </div>
                                        <span>{asset.symbol || asset.token_name}</span>
                                      </div>
                                    </SelectItem>
                                  )
                                })
                              ) : (
                                <div className="p-4 text-center text-sm text-gray-500">
                                  No assets available
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                          <div className="text-sm text-gray-500">Asset</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          0.00
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Mode - Phone Number */}
                  <div>
                    <Label className="text-sm text-gray-500 mb-2 block">Payment Phone Number</Label>
                    {countriesLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-[#19B17A] rounded-full" />
                        Loading countries...
                      </div>
                    ) : (
                      <PhoneInput
                        international
                        defaultCountry="US"
                        value={phoneNumber}
                        onChange={(value) => setPhoneNumber(value || "")}
                        placeholder="Enter payment phone number"
                        className="phone-input-custom"
                        countries={
                          countries.length > 0
                            ? (countries
                                .filter(c => {
                                  const isActive = c.isActive !== false && c.is_active !== false
                                  const hasCode = c.alpha_2_code || c.code
                                  return isActive && hasCode
                                })
                                .map(c => c.alpha_2_code || c.code) as any)
                            : undefined
                        }
                      />
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mt-2 border-[#19B17A] text-[#19B17A] hover:bg-[#19B17A] hover:text-white transition-colors"
                      onClick={handleVerifyPaymentPhone}
                      disabled={!phoneNumber || isVerifyingPaymentPhone}
                    >
                      {isVerifyingPaymentPhone ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                          Verifying...
                        </>
                      ) : (
                        "Verify phone number"
                      )}
                    </Button>
                  </div>

                  {/* Payment Phone Holder Name */}
                  <div>
                    <Label className="text-sm text-gray-500 mb-2 block">Account Holder Name</Label>
                    <Input
                      placeholder="Holder name will appear after verification"
                      value={paymentPhoneHolderName}
                      onChange={(e) => setPaymentPhoneHolderName(e.target.value)}
                      className="w-full bg-gray-50"
                      readOnly
                    />
                  </div>

                   {/* Receive Wallet Selection */}
                  <div>
                     <Label className="text-sm text-gray-500 mb-2 block">Receive Wallet</Label>

                     {/* Wallet Destination Tabs */}
                     <div className="flex gap-2 mb-3">
                    <Button
                         variant={walletDestination === "connected" ? "default" : "outline"}
                         size="sm"
                         onClick={() => setWalletDestination("connected")}
                         className={`flex-1 ${
                           walletDestination === "connected"
                             ? "bg-blue-500 hover:bg-blue-600 text-white"
                             : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                         }`}
                       >
                         Connected Wallet
                       </Button>
                       <Button
                         variant={walletDestination === "custom" ? "default" : "outline"}
                         size="sm"
                         onClick={() => setWalletDestination("custom")}
                         className={`flex-1 ${
                           walletDestination === "custom"
                             ? "bg-blue-500 hover:bg-blue-600 text-white"
                             : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                         }`}
                       >
                         Custom Wallet
                    </Button>
                  </div>

                     {/* Connected Wallet Display */}
                     {walletDestination === "connected" && (
                       <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                           <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                             <span className="text-xs">🔗</span>
                    </div>
                           <span className="text-sm font-medium text-gray-900">
                             {connectedWallet || "Connected Wallet"}
                           </span>
                  </div>
                         <p className="text-xs text-gray-500 mt-1">Using your connected wallet</p>
                       </div>
                     )}

                     {/* Custom Wallet Input */}
                     {walletDestination === "custom" && (
                       <div>
                         <Input
                           placeholder="Enter wallet address (0x...)"
                           value={customWalletAddress}
                           onChange={(e) => setCustomWalletAddress(e.target.value)}
                           className="w-full"
                         />
                         <p className="text-xs text-gray-500 mt-1">Enter the recipient's wallet address</p>
                    </div>
                     )}
                  </div>

                  {/* Transaction Details */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <h4 className="font-medium text-gray-900 mb-3">Transaction Details</h4>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Network</span>
                      <span className="text-sm font-medium">{network || "--"}</span>
                    </div>

                     <div className="flex justify-between items-center">
                       <span className="text-sm text-gray-600">Receive Wallet</span>
                       <span className="text-sm font-medium">
                         {walletDestination === "connected" 
                           ? (connectedWallet ? `${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-6)}` : "Connected Wallet")
                           : (customWalletAddress ? `${customWalletAddress.slice(0, 6)}...${customWalletAddress.slice(-6)}` : "Not specified")
                         }
                       </span>
                     </div>


                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Payment Amount</span>
                      <span className="text-sm font-medium">{sendAmount || 0} {receiveCurrency}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Exchange Rate</span>
                      <span className="text-sm font-medium">--</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Fees</span>
                      <span className="text-sm font-medium">{formatFee(sendAmount, receiveCurrency)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Slippage Tolerance</span>
                      <span className="text-sm font-medium">--</span>
                    </div>

                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">Recieve Amount</span>
                        <span className="text-sm font-bold text-gray-900">{sendAmount || 0} {sendCurrency} </span>
                      </div>
                    </div>
                  </div>

                  {/* Buy Button */}
                  <Button
                    className="w-full bg-green-400 hover:bg-green-500 text-white-900 py-8 rounded-xl font-bold text-lg"
                    onClick={handleNext}
                  >
                    BUY NOW
                  </Button>
                </div>
              )}

              {/* Swap Tab Content */}
              {activeTab === "swap" && (
                <div className="space-y-6">
                  {/* Wallet section - Native tokens on wallet's connected network only */}
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-gray-100 shrink-0">
                          <span className="text-xs font-bold text-blue-600">{fromCurrency?.slice(0, 2) || "--"}</span>
                          {getCurrencyIconUrl({ symbol: fromCurrency }) && (
                            <img 
                              src={getCurrencyIconUrl({ symbol: fromCurrency })!} 
                              alt={fromCurrency} 
                              className="absolute inset-0 w-full h-full object-contain rounded-full"
                              onError={(e) => { e.currentTarget.style.display = "none" }}
                            />
                          )}
                        </div>
                        <div>
                          <Select value={fromCurrency} onValueChange={setFromCurrency}>
                            <SelectTrigger className="border-0 p-0 h-auto bg-transparent w-auto min-w-[120px]">
                              <SelectValue>
                                <div className="font-medium text-gray-900">{fromCurrency || "Select"}</div>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-white max-h-[300px]">
                              {cryptoNativeAssetsForWallet && cryptoNativeAssetsForWallet.length > 0 ? (
                                cryptoNativeAssetsForWallet.map((asset) => {
                                  const iconUrl = getCurrencyIconUrl(asset)
                                  return (
                                    <SelectItem 
                                      key={asset.symbol} 
                                      value={asset.symbol} 
                                      className="bg-white hover:bg-gray-50"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                                          {iconUrl ? (
                                            <img src={iconUrl} alt={asset.symbol} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none" }} />
                                          ) : (
                                            <span className="text-[10px] font-bold text-gray-600">{asset.symbol?.slice(0, 2)}</span>
                                          )}
                                        </div>
                                        <span>{asset.symbol || asset.token_name}</span>
                                      </div>
                                    </SelectItem>
                                  )
                                })
                              ) : (
                                <div className="p-4 text-center text-sm text-gray-500">
                                  {walletNetwork ? `No native tokens for ${walletNetwork}. Connect wallet on supported network.` : "Connect wallet to see assets"}
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="0"
                            value={fromAmount}
                            onChange={(e) => setFromAmount(e.target.value)}
                            className="text-2xl font-bold border-0 p-0 h-auto bg-transparent text-right w-24"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFromAmount(connectWalletBalance?.toString() || "")}
                            className="text-xs px-2 py-1 h-6 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
                          >
                            Max
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Swap Button Section */}
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSwapCurrencies}
                        className="rounded-full w-10 h-10 p-0 bg-white border-gray-300 hover:bg-gray-50"
                      >
                      <ArrowDownIcon className="h-4 w-4 text-gray-600" />
                      </Button>
                      <div className="bg-gray-100 rounded-full px-3 py-1">
                        <span className="text-xs text-gray-600">--</span>
                      </div>
                    </div>
                  </div>

                  {/* To Section - All native tokens with icons from public/flag, network selector */}
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="text-sm text-gray-500 mb-3">To</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-gray-100 shrink-0">
                          <span className="text-xs font-bold text-green-600">{toCurrency?.slice(0, 2) || "--"}</span>
                          {getCurrencyIconUrl({ symbol: toCurrency }) && (
                            <img 
                              src={getCurrencyIconUrl({ symbol: toCurrency })!} 
                              alt={toCurrency} 
                              className="absolute inset-0 w-full h-full object-contain rounded-full"
                              onError={(e) => { e.currentTarget.style.display = "none" }}
                            />
                          )}
                        </div>
                        <div>
                          <Select value={toCurrency} onValueChange={setToCurrency}>
                            <SelectTrigger className="border-0 p-0 h-auto bg-transparent w-auto min-w-[120px]">
                              <SelectValue>
                                <div className="font-medium text-gray-900">{toCurrency || "Select"}</div>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-white max-h-[300px]">
                              {swapAssetsForSelectedNetwork && swapAssetsForSelectedNetwork.length > 0 ? (
                                swapToOptions.length > 0 ? (
                                  swapToOptions.map((asset) => {
                                    const iconUrl = getCurrencyIconUrl(asset)
                                    return (
                                      <SelectItem 
                                        key={asset.symbol} 
                                        value={asset.symbol} 
                                        className="bg-white hover:bg-gray-50"
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                                            {iconUrl ? (
                                              <img src={iconUrl} alt={asset.symbol} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none" }} />
                                            ) : (
                                              <span className="text-[10px] font-bold text-gray-600">{asset.symbol?.slice(0, 2)}</span>
                                            )}
                                          </div>
                                          <span>{asset.symbol || asset.token_name}</span>
                                        </div>
                                      </SelectItem>
                                    )
                                  })
                                ) : (
                                  <div className="p-4 text-center text-sm text-gray-500">
                                    No token to swap to on this network.
                                  </div>
                                )
                              ) : (
                                <div className="p-4 text-center text-sm text-gray-500">
                                  {walletNetwork ? `No native tokens for ${walletNetwork}. Connect wallet on supported network.` : "Connect wallet to see assets"}
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                          {swapAssetsForSelectedNetwork.length > 0 && swapToOptions.length === 0 && (
                            <div className="text-xs text-amber-600 mt-1">No token to swap to on this network.</div>
                          )}
                          <div className="text-sm text-gray-500">
                            {swapToNetwork
                              ? (swapToNetworks.find((n: any) => n.network === swapToNetwork)?.label || swapToNetwork)
                              : ""}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          0.00
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <h4 className="font-medium text-gray-900 mb-3">Transaction Details</h4>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Wallet Balance</span>
                      <span className="text-sm font-medium">{connectWalletBalance || 0} {fromCurrency}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Swap Amount</span>
                      <span className="text-sm font-medium">{fromAmount || 0} {fromCurrency}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Exchange Rate</span>
                      <span className="text-sm font-medium">--</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Fees</span>
                      <span className="text-sm font-medium">{formatFee(fromAmount, fromCurrency)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Slippage Tolerance</span>
                      <span className="text-sm font-medium">--</span>
                    </div>

                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-900">Receive Amount</span>
                        <span className="text-sm font-bold text-gray-900">0 {toCurrency}</span>
                      </div>
                    </div>
                  </div>

                  {/* Swap Button */}
                  <Button
                    className="w-full bg-green-400 hover:bg-green-500 text-white-900 py-8 rounded-xl font-bold text-lg"
                    onClick={handleNext}
                  >
                    SWAP NOW
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