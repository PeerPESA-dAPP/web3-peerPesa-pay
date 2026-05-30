"use client"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { API_BASE_URL, fetchExchangeRates, getCurrencyRate, fetchNetworksByChannelIds, fetchCoinRate, fetchTransactionFees, TransactionFeeResult, Network } from "@/utils/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import PhoneInput from "react-phone-number-input"
import "react-phone-number-input/style.css"
import { useSettings } from "@/contexts/SettingsContext"
import { useTransaction } from "@/contexts/TransactionContext"
import { useCurrency } from "@/contexts/CurrencyContext"
import { useChannel } from "@/contexts/ChannelContext"
import {
  SendIcon,
  LinkIcon,
  HomeIcon,
  ActivityIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,  
  ChevronDownIcon,
  ChevronLeftIcon,
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
  /** Per-token balance map (symbol -> balance) from on-chain reads */
  tokenBalances?: Record<string, number>
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
                                    initialSwapParams,
                                    tokenBalances,
                                 }: TransactionFormsProps) {
  const [activeTab, setActiveTab] = useState(transactionType)
  const [showNotifications, setShowNotifications] = useState(false)
  // Dummy notifications data grouped by date
  const notificationsData = [
    {
      date: "2026-04-09",
      items: [
        { id: 1, title: "Deposit received", description: "You received 0.5 ETH.", time: "09:30" },
        { id: 2, title: "Withdrawal processed", description: "Your withdrawal to bank was successful.", time: "08:15" }
      ],
    },
    {
      date: "2026-04-08",
      items: [
        { id: 3, title: "New offer available", description: "Check out the latest rates.", time: "17:40" },
      ],
    },
  ]

  // Helper to format date
  const formatDate = (dateStr: string) => {
    const today = new Date()
    const date = new Date(dateStr)
    if (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    ) {
      return "Today"
    }
    return date.toLocaleDateString()
  }
  const [showReview, setShowReview] = useState(false)
  const [sendStep, setSendStep] = useState<1 | 2 | 3>(1)
  const [buyStep, setBuyStep] = useState<1 | 2 | 3>(1)
  const [swapStep, setSwapStep] = useState<1 | 2 | 3>(1)
  const [swapRateCountdown, setSwapRateCountdown] = useState(300)
  const [swapRateTick, setSwapRateTick] = useState(0)
  const [swapDestinationMode, setSwapDestinationMode] = useState<"connected" | "custom">("connected")
  const [swapDestinationAddress, setSwapDestinationAddress] = useState("")
  const [swapAddressVerified, setSwapAddressVerified] = useState(false)
  const [swapAddressVerifying, setSwapAddressVerifying] = useState(false)
  const [swapMemo, setSwapMemo] = useState("")
  const [sendReason, setSendReason] = useState("")
  const [recipientName, setRecipientName] = useState("")
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
  const [paymentMode, setPaymentMode] = useState("bank")
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
  const [showSendRateDetails, setShowSendRateDetails] = useState(false)
  const [showBuyRateDetails, setShowBuyRateDetails] = useState(false)
  const [showSwapRateDetails, setShowSwapRateDetails] = useState(false)
  const [swapFromNetwork, setSwapFromNetwork] = useState("")
  const [swapToNetwork, setSwapToNetwork] = useState("")
  const [sendNetworks, setSendNetworks] = useState<{ name: string; min: number; max: number; channelIds: string[] }[]>([])
  const [payoutNetworks, setPayoutNetworks] = useState<Network[]>([])
  const [payoutNetworksLoading, setPayoutNetworksLoading] = useState(false)
  const [selectedPayoutNetwork, setSelectedPayoutNetwork] = useState("")
  const [networkSearchOpen, setNetworkSearchOpen] = useState(false)
  const [networkSearch, setNetworkSearch] = useState("")
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

  const sendNetworksLoading = paymentMode === "mobile" ? mobileNetworksLoading : bankNetworksLoading

  // Get channels from Channel Context
  const { channels, channelsLoading, fetchChannels } = useChannel()
  
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

  const formatBalance = (balance: number): string => {
    const decimals = balance >= 1 ? 2 : 4
    return balance.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
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

  const formatWalletAddress = (addr: string): string => {
    if (!addr) return "No wallet"
    if (addr.length <= 16) return addr
    return `${addr.slice(0, 8)}....${addr.slice(-8)}`
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
    const nets = getCoinNetworks(coin)
    return nets.some((net: any) => {
      const network = normalizeNetworkKey(String(net?.network || ""))
      const label = normalizeNetworkKey(String(net?.label || ""))
      return aliases.some((alias) =>
        network === alias || label === alias || network.includes(alias) || label.includes(alias)
      )
    })
  }

  // Send form token list: further filtered to the connected wallet's specific network,
  // plus any token the wallet actually holds (balance > 0 in tokenBalances).
  const sendAssetsForWallet = (() => {
    if (!isWalletConnected) return cryptoNativeAssetsForWallet
    if (walletNetwork) {
      return cryptoNativeAssetsForWallet.filter((c: any) => {
        const listedForNetwork = coinSupportsSpecificNetwork(c, walletNetwork)
        const walletHoldsIt = tokenBalances && Number(tokenBalances[String(c.symbol || "").toUpperCase()] ?? 0) > 0
        return listedForNetwork || walletHoldsIt
      })
    }
    return cryptoNativeAssetsForWallet
  })()

  // Set default receiveCurrency when fiatCurrencies loads (for send mode)
  useEffect(() => {
    if (activeTab === "send" && fiatCurrencies.length > 0 && !fiatCurrencies.some((c: any) => c.symbol === receiveCurrency)) {
      setReceiveCurrency(fiatCurrencies[0]?.symbol ?? "")
    }
  }, [activeTab, fiatCurrencies, receiveCurrency])

  // Set default sendCurrency when crypto loads (for send mode)
  useEffect(() => {
    if (activeTab === "send" && sendAssetsForWallet.length > 0 && !sendAssetsForWallet.some((c: any) => c.symbol === sendCurrency)) {
      setSendCurrency(sendAssetsForWallet[0]?.symbol ?? "")
    }
  }, [activeTab, sendAssetsForWallet])

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

  // Reload networks and channels whenever currency pair or payment type changes
  useEffect(() => {
    if ((activeTab !== "send" && activeTab !== "buy") || !receiveCurrency || !paymentMode) return
    const channelType = paymentMode === "mobile" ? "momo" : "bank"
    setSelectedNetwork("")
    setSelectedPayoutNetwork("")
    setPayoutNetworks([])
    if (paymentMode === "mobile") {
      fetchMobileNetworks(receiveCurrency)
    } else {
      fetchBankNetworks(receiveCurrency)
    }
    fetchChannels({ rampType: "withdraw", channelType, currency: receiveCurrency, status: "active" })
  }, [activeTab, paymentMode, receiveCurrency, fetchBankNetworks, fetchMobileNetworks, fetchChannels])

  // Build sendNetworks from network list + channel min/max matched by channelIds
  useEffect(() => {
    const source = paymentMode === "mobile" ? mobileNetworks : bankNetworks
    if (!source || source.length === 0) {
      setSendNetworks([])
      return
    }
    const mapped = source.map((net: any) => {
      const ids: string[] = Array.isArray(net.channelIds) ? net.channelIds : (net.id ? [String(net.id)] : [])
      let min = 0
      let max = 0
      if (channels && channels.length > 0) {
        ids.forEach((cid) => {
          const ch: any = channels.find((c: any) => String(c.id) === cid)
          if (!ch) return
          const cMin = Number(ch.min ?? ch.minAmount ?? ch.min_amount ?? 0)
          const cMax = Number(ch.max ?? ch.maxAmount ?? ch.max_amount ?? 0)
          if (cMin > 0) min = min > 0 ? Math.min(min, cMin) : cMin
          if (cMax > 0) max = Math.max(max, cMax)
        })
      }
      return { name: net.name, min, max, channelIds: ids }
    })
    setSendNetworks(mapped)
  }, [paymentMode, bankNetworks, mobileNetworks, channels])

  const handleNext = () => {
    if (activeTab === "send") {
      setSendStep((s) => Math.min(s + 1, 3) as 1 | 2 | 3)
    } else if (activeTab === "buy") {
      setBuyStep((s) => Math.min(s + 1, 3) as 1 | 2 | 3)
    } else if (activeTab === "swap") {
      setSwapStep((s) => Math.min(s + 1, 3) as 1 | 2 | 3)
    } else {
      setShowReview(true)
    }
  }

  const handleBackFromReview = () => {
    if (activeTab === "send") {
      setSendStep((s) => Math.max(s - 1, 1) as 1 | 2 | 3)
    } else if (activeTab === "buy") {
      setBuyStep((s) => Math.max(s - 1, 1) as 1 | 2 | 3)
    } else if (activeTab === "swap") {
      setSwapStep((s) => Math.max(s - 1, 1) as 1 | 2 | 3)
    } else {
      setShowReview(false)
    }
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
    } catch (error) {
      console.error("Phone verification failed:", error)
    } finally {
      setIsVerifyingPhone(false)
    }
  }

  const handleVerifyPaymentPhone = async () => {
    setIsVerifyingPaymentPhone(true)
    try {
      // TODO: replace with real verification API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      setPaymentPhoneHolderName("Verified")
      setRecipientName((prev) => prev || "")
    } catch (error) {
      console.error("Payment phone verification failed:", error)
    } finally {
      setIsVerifyingPaymentPhone(false)
    }
  }

  const handleVerifySwapAddress = async () => {
    if (!swapDestinationAddress) return
    setSwapAddressVerifying(true)
    setSwapAddressVerified(false)
    try {
      const res = await fetch("/api/verify-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: swapDestinationAddress,
          network: swapToNetwork,
          symbol: toCurrency,
        }),
      })
      const data = await res.json()
      setSwapAddressVerified(data.valid === true)
    } catch {
      setSwapAddressVerified(false)
    } finally {
      setSwapAddressVerifying(false)
    }
  }


  useEffect(() => {
    setActiveTab(transactionType)
  }, [transactionType])


  // Helper: Get exchange rate for a pair
  const getExchangeRate = (from: string, to: string): number | null => {
    if (!exchangeRates || !from || !to) return null;
    const rateObj = exchangeRates.find((r: any) => r.from === from && r.to === to);
    return rateObj ? rateObj.rate : null;
  };

  // Helper: Check balance
  const isAmountExceedsBalance = (amount: string | number, balance: number): boolean => {
    const num = typeof amount === "number" ? amount : Number(amount);
    return num > balance;
  };

  // Helper: resolve balance for a given token symbol from tokenBalances map, fallback to connectWalletBalance
  const getBalanceForSymbol = (symbol: string): number => {
    if (tokenBalances && symbol) {
      const sym = symbol.toUpperCase()
      if (sym in tokenBalances) return tokenBalances[sym]
    }
    return connectWalletBalance || 0
  }

  // State for validation warning
  const [amountWarning, setAmountWarning] = useState("");

  // Calculate receive amount and update warning
  useEffect(() => {
    if (activeTab === "swap" || activeTab === "send" || activeTab === "buy") {
      let amt = activeTab === "swap" ? fromAmount : sendAmount;
      let currSym = activeTab === "swap" ? fromCurrency : sendCurrency;
      let bal = getBalanceForSymbol(currSym);
      if (isAmountExceedsBalance(amt, bal)) {
        setAmountWarning("Warning: Entered amount exceeds available balance.");
      } else {
        setAmountWarning("");
      }
    }
  }, [activeTab, sendAmount, fromAmount, sendCurrency, fromCurrency, tokenBalances, connectWalletBalance]);

  // Calculate receive amount
  const getReceiveAmount = () => {
    let amt = activeTab === "swap" ? fromAmount : sendAmount;
    let from = activeTab === "swap" ? fromCurrency : sendCurrency;
    let to = activeTab === "swap" ? toCurrency : receiveCurrency;
    const rate = getExchangeRate(from, to);
    if (!amt || !rate) return 0;
    return Number(amt) * rate;
  };

  // Helper: Fetch and calculate exchange rate for swap
  const [swapExchangeRate, setSwapExchangeRate] = useState<number | null>(null);
  const [swapCoinRateLoading, setSwapCoinRateLoading] = useState(false);
  const [rateCountdown, setRateCountdown] = useState(240);
  const [sendCoinRate, setSendCoinRate] = useState<number | null>(null);
  const [sendCoinRateLoading, setSendCoinRateLoading] = useState(false);
  const [sendFeeResult, setSendFeeResult] = useState<TransactionFeeResult | null>(null);
  const [sendFeesLoading, setSendFeesLoading] = useState(false);
  const [swapFeeResult, setSwapFeeResult] = useState<TransactionFeeResult | null>(null);
  const [swapFeesLoading, setSwapFeesLoading] = useState(false);
  const [sendUsdDraft, setSendUsdDraft] = useState("");
  const [isEditingSendUsd, setIsEditingSendUsd] = useState(false);
  const [recipientAmountDraft, setRecipientAmountDraft] = useState("");
  const [isEditingRecipientAmount, setIsEditingRecipientAmount] = useState(false);

  useEffect(() => {
    if (activeTab !== "swap" || !fromCurrency || !toCurrency) {
      setSwapExchangeRate(null)
      return
    }
    setSwapCoinRateLoading(true)
    fetchCoinRate(fromCurrency, toCurrency)
      .then((data) => {
        const rate = data?.price?.rate?.exchange_rate
        setSwapExchangeRate(typeof rate === "number" && Number.isFinite(rate) ? rate : null)
      })
      .finally(() => setSwapCoinRateLoading(false))
  }, [activeTab, fromCurrency, toCurrency, swapRateTick]);

  // Fetch live exchange rate for the send/buy pair via GET /rates/:base/:quote
  useEffect(() => {
    if ((activeTab !== "send" && activeTab !== "buy") || !sendCurrency || !receiveCurrency) {
      setSendCoinRate(null)
      return
    }
    setSendCoinRateLoading(true)
    fetchCoinRate(sendCurrency, receiveCurrency)
      .then((data) => {
        const rateObj = data?.price?.rate
        const rate = activeTab === "buy" ? rateObj?.buy_rate : rateObj?.sale_rate
        setSendCoinRate(typeof rate === "number" && Number.isFinite(rate) ? rate : null)
      })
      .finally(() => setSendCoinRateLoading(false))
  }, [activeTab, sendCurrency, receiveCurrency])

  // Stable ref so the fee effect can read assets without them being a dep
  const cryptoAssetsRef = useRef(cryptoNativeAssetsForWallet)
  useEffect(() => { cryptoAssetsRef.current = cryptoNativeAssetsForWallet })

  // Fetch transaction fees — debounced 600 ms, stale-flagged to cancel in-flight calls
  useEffect(() => {
    const amt = Number(sendAmount) || 0
    if ((activeTab !== "send" && activeTab !== "buy") || !sendCurrency || !receiveCurrency || amt <= 0) {
      setSendFeeResult(null)
      return
    }

    let stale = false
    const timer = setTimeout(() => {
      // Resolve blockchain_network_id from currencies list for the selected crypto
      const asset = cryptoAssetsRef.current.find((c: any) => c.symbol === sendCurrency)
      const nets = getCoinNetworks(asset)
      const netId = (() => {
        if (!nets.length) return ""
        if (walletNetwork) {
          const m = nets.find((n: any) =>
            normalizeNetworkKey(n.network || n.label || "").includes(normalizeNetworkKey(walletNetwork)) ||
            normalizeNetworkKey(walletNetwork).includes(normalizeNetworkKey(n.network || n.label || ""))
          )
          return m?.blockchain_network_id || nets[0]?.blockchain_network_id || ""
        }
        return nets[0]?.blockchain_network_id || ""
      })()

      const process = activeTab === "buy" ? "buy" : "send"
      setSendFeesLoading(true)
      fetchTransactionFees({
        from_currency: sendCurrency,
        to_currency: receiveCurrency,
        process,
        network: netId,
        amount: amt,
      })
        .then((result) => { if (!stale) setSendFeeResult(result) })
        .finally(() => { if (!stale) setSendFeesLoading(false) })
    }, 600)

    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [activeTab, sendCurrency, receiveCurrency, sendAmount, walletNetwork])

  // Fetch swap fees — debounced 600 ms, process: "swap", network from "You Sell" asset
  useEffect(() => {
    const amt = Number(fromAmount) || 0
    if (activeTab !== "swap" || !fromCurrency || !toCurrency || amt <= 0) {
      setSwapFeeResult(null)
      return
    }

    let stale = false
    const timer = setTimeout(() => {
      const asset = cryptoAssetsRef.current.find((c: any) => c.symbol === fromCurrency)
      const nets = getCoinNetworks(asset)
      const activeNetwork = walletNetwork || swapFromNetwork
      const netId = (() => {
        if (!nets.length) return ""
        if (activeNetwork) {
          const m = nets.find((n: any) =>
            normalizeNetworkKey(n.network || n.label || "").includes(normalizeNetworkKey(activeNetwork)) ||
            normalizeNetworkKey(activeNetwork).includes(normalizeNetworkKey(n.network || n.label || ""))
          )
          return m?.blockchain_network_id || nets[0]?.blockchain_network_id || ""
        }
        return nets[0]?.blockchain_network_id || ""
      })()

      setSwapFeesLoading(true)
      fetchTransactionFees({
        from_currency: fromCurrency,
        to_currency: toCurrency,
        process: "swap",
        network: netId,
        amount: amt,
      })
        .then((result) => { if (!stale) setSwapFeeResult(result) })
        .finally(() => { if (!stale) setSwapFeesLoading(false) })
    }, 600)

    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [activeTab, fromCurrency, toCurrency, fromAmount, walletNetwork, swapFromNetwork])

  // Countdown timer — resets when a new rate is fetched
  useEffect(() => {
    if (activeTab !== "send" && activeTab !== "buy") return
    setRateCountdown(240)
    const interval = setInterval(() => {
      setRateCountdown((prev) => (prev <= 1 ? 240 : prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [activeTab, sendCurrency, receiveCurrency])

  // Swap rate countdown — 5 minutes; triggers re-fetch via swapRateTick when it expires
  useEffect(() => {
    if (activeTab !== "swap") return
    setSwapRateCountdown(300)
    const interval = setInterval(() => {
      setSwapRateCountdown((prev) => {
        if (prev <= 1) {
          setSwapRateTick((t) => t + 1)
          return 300
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [activeTab, fromCurrency, toCurrency])

  // Send form computed values (used in both form and review screen)
  const sendBalance = getBalanceForSymbol(sendCurrency)
  const sendCoinUsd = getCurrencyRate(allCurrencies, sendCurrency)
  const receiveCoinUsd = getCurrencyRate(allCurrencies, receiveCurrency)
  // Prefer live /rates API (buy_rate for buy tab, sale_rate for send); fall back to USD-ratio from currency catalogue
  const sendToReceiveRate =
    sendCoinRate ??
    (sendCoinUsd && receiveCoinUsd ? sendCoinUsd / receiveCoinUsd : null)
  const parsedSendAmount = Number(sendAmount) || 0
  const grossFiatAmount = parsedSendAmount * (sendToReceiveRate || 0)

  // Resolve the blockchain network ID for the selected "You Sell" asset
  const selectedSendAsset = cryptoNativeAssetsForWallet.find((c: any) => c.symbol === sendCurrency)
  const sendAssetNetsAll = getCoinNetworks(selectedSendAsset)
  const sendNetworkId = (() => {
    if (!sendAssetNetsAll.length) return ""
    if (walletNetwork) {
      const match = sendAssetNetsAll.find((n: any) =>
        normalizeNetworkKey(n.network || n.label || "").includes(normalizeNetworkKey(walletNetwork)) ||
        normalizeNetworkKey(walletNetwork).includes(normalizeNetworkKey(n.network || n.label || ""))
      )
      return match?.blockchain_network_id || sendAssetNetsAll[0]?.blockchain_network_id || ""
    }
    return sendAssetNetsAll[0]?.blockchain_network_id || ""
  })()

  // Fee is deducted from the crypto "You Sell" amount.
  const feeInCrypto = sendFeeResult?.fee ?? 0
  const feeCurrencyLabel = sendFeeResult?.feeCurrency || sendCurrency || ""
  const feePercentageLabel = sendFeeResult?.feePercentage != null
    ? `${sendFeeResult.feePercentage}%`
    : ""
  const netCryptoAfterFee = Math.max(0, parsedSendAmount - feeInCrypto)
  const sendRecipientAmount = netCryptoAfterFee * (sendToReceiveRate || 0)
  const hasInsufficientBalance = parsedSendAmount > 0 && parsedSendAmount > sendBalance
  const selectedSendNetworkGroup = sendNetworks.find((n) => n.name === selectedNetwork)
  const sendMinPayout = selectedSendNetworkGroup?.min || 0
  const hasBelowMinPayout = sendRecipientAmount > 0 && sendMinPayout > 0 && sendRecipientAmount < sendMinPayout

  // Swap fee computed values
  const swapFeeInCrypto = swapFeeResult?.fee ?? 0
  const swapFeeCurrencyLabel = swapFeeResult?.feeCurrency || fromCurrency || ""
  const swapFeePercentageLabel = swapFeeResult?.feePercentage != null ? `${swapFeeResult.feePercentage}%` : ""
  const fromAmountNum = Number(fromAmount) || 0
  const netFromAfterFee = Math.max(0, fromAmountNum - swapFeeInCrypto)
  const swapToAmount = swapExchangeRate && netFromAfterFee > 0 ? netFromAfterFee * swapExchangeRate : 0

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="px-3">
        {showNotifications ? (
          <div className="py-8">
            <h2 className="text-xl font-bold mb-6 text-center">Notifications</h2>
            {notificationsData.map((group) => (
              <div key={group.date} className="mb-6">
                <div className="text-xs font-semibold text-gray-500 mb-2 pl-1">{formatDate(group.date)}</div>
                <div className="space-y-2">
                  {group.items.map((notif) => (
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
            ))}
            <Button className="w-full mt-8" variant="outline" onClick={() => setShowNotifications(false)}>
              Back to Overview
            </Button>
          </div>
        ) : (!showReview && !(activeTab === "send" && sendStep > 1) && !(activeTab === "buy" && buyStep > 1) && !(activeTab === "swap" && swapStep > 1)) && (
          <div className="grid grid-cols-3 gap-2 mb-1">
            <Button
              variant={activeTab === "send" ? "default" : "outline"}
              className={`h-9 flex flex-col items-center justify-center gap-1 cursor-pointer ${
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
              className={`h-9 flex flex-col items-center justify-center gap-1 cursor-pointer ${
                activeTab === "buy"
                  ? "bg-[#19B17A] hover:bg-[#158f68] text-white"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-black"
              }`}
              onClick={() => setActiveTab("buy")}
            >
              <div className="flex items-center gap-1">
                <WalletIcon className="h-4 w-4" />
                <span className="text-xs">Buy Assets</span>
              </div>
            </Button>
            <Button
              variant={activeTab === "swap" ? "default" : "outline"}
              className={`h-9 flex flex-col items-center justify-center gap-1 cursor-pointer ${
                activeTab === "swap"
                  ? "bg-[#19B17A] hover:bg-[#158f68] text-white"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-black"
              }`}
              onClick={() => setActiveTab("swap")}
            >
              <div className="flex items-center gap-1">
                <RefreshCwIcon className="h-4 w-4" />
                <span className="text-xs">Swap Assets</span>
              </div>
            </Button>
          </div>
        )}
        {/* Transaction Form Card */}
        {showReview ? (
          /* Review Screen */
          <Card className="bg-white border-0 shadow-sm rounded-2xl">
            <CardContent className="p-3">
              <h2 className="text-xl font-semibold mb-3">
                {activeTab === "send" ? "Review Send" : activeTab === "buy" ? "Review Purchase" : "Review Swap"}
              </h2>

              {/* Transaction Summary */}
              <div className="space-y-2 mb-3">
                {activeTab === "send" && (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Payment Mode</span>
                      <span className="font-medium">{paymentMode === "bank" ? "Bank Transfer" : paymentMode === "mobile" ? "Mobile Money" : "Not selected"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Amount</span>
                      <span className="font-medium">{sendAmount || 0} {sendCurrency}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Recipient</span>
                      <span className="font-medium font-mono text-sm">{(paymentMode === "bank" ? bankAccountNumber : phoneNumber) || "Not specified"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Exchange Rate</span>
                      <span className="font-medium">
                        {sendToReceiveRate ? `1 ${sendCurrency} = ${sendToReceiveRate.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${receiveCurrency}` : "--"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">
                        Fee{feePercentageLabel ? ` (${feePercentageLabel})` : ""}
                      </span>
                      <span className="font-medium">
                        {feeInCrypto > 0
                          ? `${feeInCrypto.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${feeCurrencyLabel}`
                          : `0 ${feeCurrencyLabel}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Transfer Time</span>
                      <span className="font-medium">{paymentMode === "mobile" ? "~5 mins" : "10 - 30 mins"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 bg-gray-50 px-4">
                      <span className="font-semibold">Total Receive</span>
                      <span className="font-bold text-lg text-[#19B17A]">
                        {sendRecipientAmount > 0 ? sendRecipientAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"} {receiveCurrency}
                      </span>
                    </div>
                  </>
                )}

                {activeTab === "buy" && (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Pay</span>
                      <span className="font-medium">{sendAmount || 0} {receiveCurrency}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Receive</span>
                      <span className="font-medium">0 {sendCurrency}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Exchange Rate</span>
                      <span className="font-medium">
                        {sendToReceiveRate ? `1 ${sendCurrency} = ${sendToReceiveRate.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${receiveCurrency}` : "--"}
                      </span>
                    </div>
                    {walletNetwork && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Network</span>
                        <span className="font-medium">{walletNetwork}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Fees</span>
                      <span className="font-medium">{formatFee(sendAmount, receiveCurrency)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 bg-gray-50 px-4">
                      <span className="font-semibold">Total Receive</span>
                      <span className="font-bold text-lg">0 {receiveCurrency}</span>
                    </div>
                  </>
                )}

                {activeTab === "swap" && (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">You send</span>
                      <span className="font-medium">{fromAmount || 0} {fromCurrency}</span>
                    </div>
                    {swapFromNetwork && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Network</span>
                        <span className="font-medium">{swapFromNetwork}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">You Receive</span>
                      <span className="font-medium">
                        {swapToAmount > 0
                          ? `${swapToAmount.toLocaleString(undefined, { maximumFractionDigits: swapToAmount >= 1 ? 2 : 4 })} ${toCurrency}`
                          : `0 ${toCurrency}`}
                      </span>
                    </div>
                    {swapToNetwork && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">To Network</span>
                        <span className="font-medium">{swapToNetwork}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Exchange Rate</span>
                      <span className="font-medium">
                        {swapExchangeRate ? `1 ${fromCurrency} = ${swapExchangeRate.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${toCurrency}` : "--"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Slippage</span>
                      <span className="font-medium">--</span>
                    </div>
                    <div className="flex justify-between items-center py-2 bg-gray-50 px-4">
                      <span className="font-semibold">You'll Receive</span>
                      <span className="font-bold text-lg text-[#19B17A]">
                        {swapToAmount > 0
                          ? `${swapToAmount.toLocaleString(undefined, { maximumFractionDigits: swapToAmount >= 1 ? 2 : 4 })} ${toCurrency}`
                          : `0 ${toCurrency}`}
                      </span>
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
            <CardContent className="p-2">
              {/* Send Tab Content */}
              {activeTab === "send" && (() => {
                const sendAssetNetwork = (() => {
                  if (walletNetwork) return walletNetwork
                  return sendAssetNetsAll[0]?.label || sendAssetNetsAll[0]?.network || ""
                })()
                const selectedReceiveAsset = fiatCurrencies.find((c: any) => c.symbol === receiveCurrency)

                if (sendStep !== 1) return null
                return (
                  <div className="space-y-2">
                    {/* YOU SELL */}
                    <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">You Sell</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-gray-500 font-medium">
                            {sendBalance > 0 ? `${formatBalance(sendBalance)} ${sendCurrency}` : `0 ${sendCurrency || ""}`}
                          </span>
                          <button
                            type="button"
                            className="flex items-center gap-1 rounded-lg bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-gray-700 active:bg-gray-800 transition-colors"
                            onClick={() => setSendAmount(sendBalance > 0 ? sendBalance.toString() : "")}
                          >
                            <span className="rounded bg-white/20 px-1 py-0.5 text-[9px] font-bold tracking-wider">MAX</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <Input
                            type="number"
                            placeholder="0"
                            value={sendAmount}
                            min={0}
                            max={sendBalance > 0 ? sendBalance : undefined}
                            onChange={(e) => {
                              const raw = Number(e.target.value) || 0
                              const clamped = sendBalance > 0 ? Math.min(raw, sendBalance) : raw
                              const val = e.target.value === "" ? "" : String(clamped)
                              setSendAmount(val)
                              if (!isEditingSendUsd) {
                                const usdVal = sendCoinUsd ? clamped * sendCoinUsd : 0
                                setSendUsdDraft(usdVal > 0 ? usdVal.toFixed(2) : "")
                              }
                            }}
                            className="text-3xl font-bold border-0 p-0 h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
                          />
                          <div className="flex items-center gap-0.5 mt-0.5">
                            <span className="text-xs text-gray-400">≈ $</span>
                            <input
                              type="number"
                              placeholder="0.00"
                              value={isEditingSendUsd ? sendUsdDraft : (sendCoinUsd && parsedSendAmount > 0 ? (parsedSendAmount * sendCoinUsd).toFixed(2) : "")}
                              onFocus={() => {
                                setIsEditingSendUsd(true)
                                const usdVal = sendCoinUsd ? parsedSendAmount * sendCoinUsd : 0
                                setSendUsdDraft(usdVal > 0 ? usdVal.toFixed(2) : "")
                              }}
                              onBlur={() => setIsEditingSendUsd(false)}
                              onChange={(e) => {
                                setSendUsdDraft(e.target.value)
                                const usdVal = Number(e.target.value) || 0
                                if (sendCoinUsd && usdVal > 0) {
                                  const cryptoVal = usdVal / sendCoinUsd
                                  const clamped = sendBalance > 0 ? Math.min(cryptoVal, sendBalance) : cryptoVal
                                  setSendAmount(clamped.toFixed(6))
                                  if (clamped < cryptoVal && sendCoinUsd) {
                                    setSendUsdDraft((clamped * sendCoinUsd).toFixed(2))
                                  }
                                } else {
                                  setSendAmount("")
                                }
                              }}
                              className="text-xs text-gray-400 bg-transparent border-0 p-0 w-20 focus:outline-none focus:text-gray-700 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                        </div>

                        {/* Token selector — floats right, max 40% */}
                        <Select value={sendCurrency} onValueChange={setSendCurrency}>
                          <SelectTrigger className="border border-gray-200 rounded-xl px-3 py-2.5 h-auto bg-white shadow-sm w-full max-w-[40%] ml-auto focus:ring-0 [&>svg]:hidden">
                            <div className="flex items-center gap-2">
                              <div className="relative w-7 h-7 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                                <span className="text-[9px] font-bold text-blue-600">{sendCurrency?.slice(0, 2) || "--"}</span>
                                {(() => {
                                  const iconUrl = selectedSendAsset ? getCurrencyIconUrl(selectedSendAsset) : null
                                  return iconUrl ? (
                                    <img src={iconUrl} alt={sendCurrency} className="absolute inset-0 w-full h-full object-contain rounded-full" onError={(e) => { e.currentTarget.style.display = "none" }} />
                                  ) : null
                                })()}
                              </div>
                              <div className="flex flex-col items-start leading-tight">
                                <span className="font-bold text-gray-900 text-sm">{sendCurrency || "Select"}</span>
                                {sendAssetNetwork && (
                                  <span className="text-[10px] text-gray-400 font-medium">{sendAssetNetwork}</span>
                                )}
                              </div>
                              <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400 ml-1" />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="bg-white max-h-[300px]">
                            {sendAssetsForWallet.length > 0 ? (
                              sendAssetsForWallet.map((asset: any) => {
                                const iconUrl = getCurrencyIconUrl(asset)
                                const assetNets = getCoinNetworks(asset)
                                const netLabel = walletNetwork || assetNets[0]?.label || assetNets[0]?.network || ""
                                return (
                                  <SelectItem key={asset.symbol} value={asset.symbol} className="bg-white hover:bg-gray-50">
                                    <div className="flex items-center gap-2 w-full">
                                      <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                                        {iconUrl && <img src={iconUrl} alt={asset.symbol} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none" }} />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium">{asset.symbol}</div>
                                        {netLabel && <div className="text-[10px] text-gray-400">{netLabel}</div>}
                                      </div>
                                    </div>
                                  </SelectItem>
                                )
                              })
                            ) : (
                              <div className="p-4 text-center text-sm text-gray-500">
                                {isWalletConnected
                                  ? `No supported tokens on ${walletNetwork || "this network"}`
                                  : "Connect a wallet to see supported tokens"}
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {hasInsufficientBalance && (
                        <p className="text-xs text-red-500 mt-2 font-medium">
                          Insufficient balance. Available: {formatBalance(sendBalance)} {sendCurrency}
                        </p>
                      )}
                    </div>

                    {/* Exchange Rate Pill */}
                    <div className="flex justify-center">
                      <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-1.5 text-xs text-gray-600 font-medium">
                        <RefreshCwIcon className={`h-3 w-3 text-[#19B17A] ${sendCoinRateLoading ? "animate-spin" : ""}`} />
                        <span>
                          {sendCoinRateLoading
                            ? "Fetching rate…"
                            : `1 ${sendCurrency || "--"} = ${sendToReceiveRate ? sendToReceiveRate.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "--"} ${receiveCurrency || "--"}`}
                        </span>
                        {!sendCoinRateLoading && (
                          <span className="bg-[#19B17A] text-white rounded-full px-2 py-0.5 text-[10px] font-bold ml-1">
                            {Math.floor(rateCountdown / 60)}:{String(rateCountdown % 60).padStart(2, "0")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* RECIPIENT GETS */}
                    <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
                      <span className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase block mb-2">Recipient Gets</span>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <input
                            type="number"
                            placeholder="0"
                            value={
                              isEditingRecipientAmount
                                ? recipientAmountDraft
                                : sendRecipientAmount > 0
                                  ? sendRecipientAmount.toFixed(2)
                                  : ""
                            }
                            onFocus={() => {
                              setIsEditingRecipientAmount(true)
                              setRecipientAmountDraft(
                                sendRecipientAmount > 0 ? sendRecipientAmount.toFixed(2) : ""
                              )
                            }}
                            onBlur={() => setIsEditingRecipientAmount(false)}
                            onChange={(e) => {
                              setRecipientAmountDraft(e.target.value)
                              const fiatVal = Number(e.target.value) || 0
                              if (sendToReceiveRate && fiatVal > 0) {
                                const crypto = fiatVal / sendToReceiveRate
                                const clamped = sendBalance > 0 ? Math.min(crypto, sendBalance) : crypto
                                setSendAmount(clamped.toFixed(6))
                              } else if (!e.target.value) {
                                setSendAmount("")
                              }
                            }}
                            className="text-3xl font-bold text-gray-900 bg-transparent border-0 p-0 w-full focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          {!isEditingRecipientAmount && sendRecipientAmount > 0 && receiveCurrency && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {sendRecipientAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {receiveCurrency}
                            </p>
                          )}
                        </div>

                        {/* Fiat currency selector — floats right, max 40% */}
                        <div className="flex flex-col items-end gap-1 w-full max-w-[40%] ml-auto shrink-0">
                          <Select value={receiveCurrency} onValueChange={setReceiveCurrency}>
                            <SelectTrigger className="border border-gray-200 rounded-xl px-3 py-2.5 h-auto bg-white shadow-sm w-full focus:ring-0 [&>svg]:hidden">
                              <div className="flex items-center gap-2 w-full">
                                <div className="relative w-7 h-7 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                                  <span className="text-[9px] font-bold text-green-600">{receiveCurrency?.slice(0, 2) || "--"}</span>
                                  {(() => {
                                    const iconUrl = selectedReceiveAsset ? getCurrencyIconUrl(selectedReceiveAsset) : getCurrencyIconUrl({ symbol: receiveCurrency })
                                    return iconUrl ? (
                                      <img src={iconUrl} alt={receiveCurrency} className="absolute inset-0 w-full h-full object-contain rounded-full" onError={(e) => { e.currentTarget.style.display = "none" }} />
                                    ) : null
                                  })()}
                                </div>
                                <span className="font-bold text-gray-900 text-sm truncate">{receiveCurrency || "Select"}</span>
                                <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400 ml-auto shrink-0" />
                              </div>
                            </SelectTrigger>
                            <SelectContent className="bg-white max-h-[300px]">
                              {fiatCurrencies.length > 0 ? (
                                fiatCurrencies.map((currency: any) => {
                                  const iconUrl = getCurrencyIconUrl(currency)
                                  return (
                                    <SelectItem key={currency.symbol} value={currency.symbol} className="bg-white hover:bg-gray-50">
                                      <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                                          {iconUrl && <img src={iconUrl} alt={currency.symbol} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none" }} />}
                                        </div>
                                        <span className="text-sm font-medium">{currency.symbol}</span>
                                      </div>
                                    </SelectItem>
                                  )
                                })
                              ) : (
                                <div className="p-4 text-center text-sm text-gray-500">No currencies available</div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {hasBelowMinPayout && (
                        <p className="text-xs text-red-500 mt-2 font-medium">
                          Minimum payout is {sendMinPayout.toLocaleString()} {receiveCurrency}
                        </p>
                      )}
                    </div>

                    {/* PAYMENT METHOD */}
                    <div>
                      <span className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase block mb-2">Payment Method</span>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Bank card */}
                        <button
                          type="button"
                          onClick={() => setPaymentMode("bank")}
                          className={`relative rounded-xl border-2 p-3 text-left transition-all ${
                            paymentMode === "bank"
                              ? "border-[#19B17A] bg-green-50"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          {paymentMode === "bank" && (
                            <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#19B17A] flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                              </svg>
                            </span>
                          )}
                          <div className="font-semibold text-sm text-gray-900 mb-0.5">Bank</div>
                          <div className="text-[11px] text-gray-400">10 - 30 mins</div>
                        </button>

                        {/* Mobile card */}
                        <button
                          type="button"
                          onClick={() => setPaymentMode("mobile")}
                          className={`relative rounded-xl border-2 p-3 text-left transition-all ${
                            paymentMode === "mobile"
                              ? "border-[#19B17A] bg-green-50"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          {paymentMode === "mobile" && (
                            <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#19B17A] flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                              </svg>
                            </span>
                          )}
                          <div className="font-semibold text-sm text-gray-900 mb-0.5">Mobile</div>
                          <div className="text-[11px] text-gray-400">5 mins</div>
                        </button>
                      </div>
                    </div>

                    {/* PAYOUT NETWORKS */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase block">Payout Networks</span>

                      {/* Network selector with search */}
                      <Popover open={networkSearchOpen} onOpenChange={setNetworkSearchOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full rounded-xl border border-gray-200 bg-white h-12 px-4 flex items-center justify-between text-left"
                          >
                            {sendNetworksLoading ? (
                              <span className="text-sm text-gray-400">Loading networks…</span>
                            ) : selectedNetwork ? (
                              (() => {
                                const grp = sendNetworks.find((n) => n.name === selectedNetwork)
                                return (
                                  <div className="flex items-center justify-between w-full gap-3">
                                    <span className="text-sm font-medium text-gray-900">{selectedNetwork}</span>
                                    {grp && (grp.min > 0 || grp.max > 0) && (
                                      <span className="text-xs text-gray-400">
                                        {grp.min > 0 && grp.max > 0
                                          ? `(${grp.min.toLocaleString()} - ${grp.max.toLocaleString()} ${receiveCurrency})`
                                          : grp.min > 0
                                            ? `(min ${grp.min.toLocaleString()} ${receiveCurrency})`
                                            : `(max ${grp.max.toLocaleString()} ${receiveCurrency})`}
                                      </span>
                                    )}
                                  </div>
                                )
                              })()
                            ) : (
                              <span className="text-sm text-gray-400">
                                {receiveCurrency ? "Select payout network" : "Select a recipient currency first"}
                              </span>
                            )}
                            <ChevronDownIcon className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white" align="start">
                          <Command className="bg-white">
                            <CommandInput
                              placeholder="Search network…"
                              value={networkSearch}
                              onValueChange={setNetworkSearch}
                            />
                            <CommandList className="bg-white">
                              {sendNetworksLoading ? (
                                <div className="p-4 text-center text-sm text-gray-500">Loading…</div>
                              ) : (
                                <>
                                  <CommandEmpty className="bg-white">No networks found.</CommandEmpty>
                                  <CommandGroup className="bg-white">
                                    {sendNetworks
                                      .filter((grp) =>
                                        grp.name.toLowerCase().includes(networkSearch.toLowerCase())
                                      )
                                      .map((grp) => (
                                        <CommandItem
                                          key={grp.name}
                                          value={grp.name}
                                          onSelect={() => {
                                            setSelectedNetwork(grp.name)
                                            setSelectedPayoutNetwork("")
                                            setNetworkSearch("")
                                            setNetworkSearchOpen(false)
                                          }}
                                          className="flex items-center justify-between gap-4 cursor-pointer bg-white hover:bg-gray-50 aria-selected:bg-gray-50"
                                        >
                                          <span className="font-medium">{grp.name}</span>
                                          {(grp.min > 0 || grp.max > 0) && (
                                            <span className="text-xs text-gray-400 shrink-0">
                                              {grp.min > 0 && grp.max > 0
                                                ? `(${grp.min.toLocaleString()} - ${grp.max.toLocaleString()} ${receiveCurrency})`
                                                : grp.min > 0
                                                  ? `(min ${grp.min.toLocaleString()} ${receiveCurrency})`
                                                  : `(max ${grp.max.toLocaleString()} ${receiveCurrency})`}
                                            </span>
                                          )}
                                        </CommandItem>
                                      ))}
                                  </CommandGroup>
                                </>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                    </div>

                    {/* Summary */}
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 divide-y divide-gray-100">
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm text-gray-500">
                          Fee{feePercentageLabel ? ` (${feePercentageLabel})` : ""}
                        </span>
                        <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                          {sendFeesLoading ? (
                            <span className="flex items-center gap-1 text-gray-400">
                              <RefreshCwIcon className="h-3 w-3 animate-spin" />
                              Calculating…
                            </span>
                          ) : (
                            feeInCrypto > 0
                              ? `${feeInCrypto.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${feeCurrencyLabel}`
                              : `0 ${feeCurrencyLabel}`
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm text-gray-500">Wallet balance</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatBalance(sendBalance)} {sendCurrency || ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm font-semibold text-gray-900">You receive</span>
                        <span className="text-sm font-bold text-[#19B17A]">
                          {sendRecipientAmount > 0 ? sendRecipientAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"} {receiveCurrency || ""}
                        </span>
                      </div>
                    </div>

                    {/* Continue / Connect Wallet */}
                    {isWalletConnected ? (
                      <Button
                        className="w-full h-12 bg-[#19B17A] hover:bg-[#158f68] text-white rounded-xl font-semibold text-base flex items-center gap-2"
                        onClick={handleNext}
                        disabled={hasInsufficientBalance || hasBelowMinPayout || !sendAmount || !receiveCurrency || !selectedNetwork}
                      >
                        Continue
                        <ChevronDownIcon className="h-4 w-4 rotate-[-90deg]" />
                      </Button>
                    ) : (
                      <Button
                        className="w-full h-12 bg-[#19B17A] hover:bg-[#158f68] text-white rounded-xl font-semibold text-base"
                        onClick={onConnectWallet}
                      >
                        Connect Wallet
                      </Button>
                    )}
                  </div>
                )
              })()}

              {/* Send Step 2 — Payment Details */}
              {activeTab === "send" && sendStep === 2 && (
                <div className="space-y-2">
                  {/* Step header */}
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={handleBackFromReview} className="p-1.5 rounded-lg hover:bg-gray-100">
                      <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                    </button>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Payment Details</h3>
                      <p className="text-xs text-gray-400">Step 2 of 3</p>
                    </div>
                  </div>

                  {paymentMode === "bank" ? (
                    /* ── Bank fields ── */
                    <>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase block">Account Name</label>
                        <input
                          type="text"
                          placeholder="Enter account holder name"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#19B17A]/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase block">Account Number</label>
                        <input
                          type="text"
                          placeholder="Enter bank account number"
                          value={bankAccountNumber}
                          onChange={(e) => setBankAccountNumber(e.target.value)}
                          className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#19B17A]/30"
                        />
                      </div>
                      <Button
                        className="w-full h-12 bg-[#19B17A] hover:bg-[#158f68] text-white rounded-xl font-semibold text-base"
                        onClick={handleNext}
                        disabled={!recipientName || !bankAccountNumber}
                      >
                        Review Transfer
                      </Button>
                    </>
                  ) : (
                    /* ── Mobile fields ── */
                    <>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase block">Phone Number</label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            {countriesLoading ? (
                              <div className="flex items-center gap-2 h-12 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400">
                                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-[#19B17A] rounded-full" />
                                Loading…
                              </div>
                            ) : (
                              <PhoneInput
                                international
                                defaultCountry="UG"
                                value={phoneNumber}
                                onChange={(value) => setPhoneNumber(value || "")}
                                placeholder="Enter phone number"
                                className="phone-input-custom"
                                countries={
                                  countries.length > 0
                                    ? (countries
                                        .filter((c: any) => (c.isActive !== false && c.is_active !== false) && (c.alpha_2_code || c.code))
                                        .map((c: any) => c.alpha_2_code || c.code) as any)
                                    : undefined
                                }
                              />
                            )}
                          </div>
                          <Button
                            type="button"
                            className="shrink-0 h-12 px-4 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 disabled:opacity-50"
                            onClick={handleVerifyPaymentPhone}
                            disabled={!phoneNumber || phoneNumber.replace(/\D/g, "").length < 9 || isVerifyingPaymentPhone}
                          >
                            {isVerifyingPaymentPhone ? (
                              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                            ) : "Verify"}
                          </Button>
                        </div>
                        {paymentPhoneHolderName && (
                          <p className="text-xs text-[#19B17A] font-medium flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-[#19B17A] inline-flex items-center justify-center">
                              <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 8 8" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M1.5 4l2 2 3-3" /></svg>
                            </span>
                            Number verified
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase block">Name on Account</label>
                        <input
                          type="text"
                          placeholder="Enter registered name"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#19B17A]/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase block">Reason</label>
                        <input
                          type="text"
                          placeholder="Reason for sending money"
                          value={sendReason}
                          onChange={(e) => setSendReason(e.target.value)}
                          className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#19B17A]/30"
                        />
                      </div>
                      <Button
                        className="w-full h-12 bg-[#19B17A] hover:bg-[#158f68] text-white rounded-xl font-semibold text-base"
                        onClick={handleNext}
                        disabled={!phoneNumber || !recipientName}
                      >
                        Review Transfer
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Send Step 3 — Review */}
              {activeTab === "send" && sendStep === 3 && (
                <div className="space-y-2">
                  {/* Step header */}
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={handleBackFromReview} className="p-1.5 rounded-lg hover:bg-gray-100">
                      <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                    </button>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Review Transfer</h3>
                      <p className="text-xs text-gray-400">Step 3 of 3</p>
                    </div>
                  </div>

                  {/* Amount summary hero */}
                  <div className="bg-gradient-to-br from-[#19B17A]/10 to-[#19B17A]/5 rounded-2xl border border-[#19B17A]/20 px-4 py-3 flex items-center justify-between">
                    <div className="text-center flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">You Send</p>
                      <p className="text-xl font-bold text-gray-900">{sendAmount} <span className="text-base font-semibold text-gray-600">{sendCurrency}</span></p>
                    </div>
                    <div className="flex flex-col items-center px-3 gap-0.5">
                      <div className="h-px w-6 bg-gray-300" />
                      <ArrowDownIcon className="h-4 w-4 text-[#19B17A]" />
                      <div className="h-px w-6 bg-gray-300" />
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">Recipient Gets</p>
                      <p className="text-xl font-bold text-[#19B17A]">
                        {sendRecipientAmount > 0 ? sendRecipientAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"} <span className="text-base font-semibold">{receiveCurrency}</span>
                      </p>
                    </div>
                  </div>

                  {/* Exchange rate + fees */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                    <p className="px-4 pt-2 pb-0.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Rate &amp; Fees</p>
                    <div className="divide-y divide-gray-100">
                      <div className="px-4 py-2 flex items-center justify-between">
                        <span className="text-sm text-gray-500">Exchange Rate</span>
                        <span className="text-sm font-medium text-gray-900">
                          {sendToReceiveRate ? `1 ${sendCurrency} = ${sendToReceiveRate.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${receiveCurrency}` : "--"}
                        </span>
                      </div>
                      <div className="px-4 py-2 flex items-center justify-between">
                        <span className="text-sm text-gray-500">Fee{feePercentageLabel ? ` (${feePercentageLabel})` : ""}</span>
                        <span className="text-sm font-medium text-gray-900">
                          {feeInCrypto > 0 ? `${feeInCrypto.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${feeCurrencyLabel}` : `0 ${feeCurrencyLabel}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recipient details */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                    <p className="px-4 pt-2 pb-0.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Recipient Details</p>
                    <div className="divide-y divide-gray-100">
                      <div className="px-4 py-2 flex items-center justify-between">
                        <span className="text-sm text-gray-500">Payment Method</span>
                        <span className="text-sm font-medium text-gray-900">{paymentMode === "mobile" ? "Mobile Money" : "Bank Transfer"}</span>
                      </div>
                      <div className="px-4 py-2 flex items-center justify-between">
                        <span className="text-sm text-gray-500">Network</span>
                        <span className="text-sm font-medium text-gray-900">{selectedNetwork || "--"}</span>
                      </div>
                      {paymentMode === "mobile" && phoneNumber && (
                        <div className="px-4 py-2 flex items-center justify-between">
                          <span className="text-sm text-gray-500">Phone</span>
                          <span className="text-sm font-medium text-gray-900 font-mono">{phoneNumber}</span>
                        </div>
                      )}
                      {paymentMode === "bank" && bankAccountNumber && (
                        <div className="px-4 py-2 flex items-center justify-between">
                          <span className="text-sm text-gray-500">Account No.</span>
                          <span className="text-sm font-medium text-gray-900 font-mono">{bankAccountNumber}</span>
                        </div>
                      )}
                      {recipientName && (
                        <div className="px-4 py-2 flex items-center justify-between">
                          <span className="text-sm text-gray-500">Account Name</span>
                          <span className="text-sm font-medium text-gray-900">{recipientName}</span>
                        </div>
                      )}
                      {sendReason && (
                        <div className="px-4 py-2 flex items-center justify-between">
                          <span className="text-sm text-gray-500">Reason</span>
                          <span className="text-sm font-medium text-gray-900">{sendReason}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    className="w-full h-12 bg-[#19B17A] hover:bg-[#158f68] text-white rounded-xl font-semibold text-base flex items-center justify-center gap-2"
                    onClick={() => { /* TODO: submit transaction */ }}
                  >
                    <SendIcon className="h-4 w-4" />
                    Send Money
                  </Button>
                </div>
              )}

              {/* Buy Tab Content — Step 1 */}
              {activeTab === "buy" && buyStep === 1 && (
                <div className="space-y-2">
                  {/* YOU PAY — fiat (mirrors "Recipient Gets" selector from send) */}
                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
                    <span className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase block mb-2">You Pay</span>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <Input
                          type="number"
                          placeholder="0"
                          value={sendAmount}
                          onChange={(e) => setSendAmount(e.target.value)}
                          className="text-3xl font-bold border-0 p-0 h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
                        />
                        {parsedSendAmount > 0 && receiveCurrency && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {parsedSendAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {receiveCurrency}
                          </p>
                        )}
                      </div>
                      {/* Fiat currency selector — exact copy from send "Recipient Gets" */}
                      <div className="flex flex-col items-end gap-1 w-full max-w-[40%] ml-auto shrink-0">
                        <Select value={receiveCurrency} onValueChange={setReceiveCurrency}>
                          <SelectTrigger className="border border-gray-200 rounded-xl px-3 py-2.5 h-auto bg-white shadow-sm w-full focus:ring-0 [&>svg]:hidden">
                            <div className="flex items-center gap-2 w-full">
                              <div className="relative w-7 h-7 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                                <span className="text-[9px] font-bold text-green-600">{receiveCurrency?.slice(0, 2) || "--"}</span>
                                {(() => {
                                  const selectedReceiveAsset = fiatCurrencies.find((c: any) => c.symbol === receiveCurrency)
                                  const iconUrl = selectedReceiveAsset ? getCurrencyIconUrl(selectedReceiveAsset) : getCurrencyIconUrl({ symbol: receiveCurrency })
                                  return iconUrl ? (
                                    <img src={iconUrl} alt={receiveCurrency} className="absolute inset-0 w-full h-full object-contain rounded-full" onError={(e) => { e.currentTarget.style.display = "none" }} />
                                  ) : null
                                })()}
                              </div>
                              <span className="font-bold text-gray-900 text-sm truncate">{receiveCurrency || "Select"}</span>
                              <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400 ml-auto shrink-0" />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="bg-white max-h-[300px]">
                            {fiatCurrencies.length > 0 ? (
                              fiatCurrencies.map((currency: any) => {
                                const iconUrl = getCurrencyIconUrl(currency)
                                return (
                                  <SelectItem key={currency.symbol} value={currency.symbol} className="bg-white hover:bg-gray-50">
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                                        {iconUrl && <img src={iconUrl} alt={currency.symbol} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none" }} />}
                                      </div>
                                      <span className="text-sm font-medium">{currency.symbol}</span>
                                    </div>
                                  </SelectItem>
                                )
                              })
                            ) : (
                              <div className="p-4 text-center text-sm text-gray-500">No currencies available</div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Exchange Rate Pill */}
                  <div className="flex justify-center">
                    <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-1.5 text-xs text-gray-600 font-medium">
                      <RefreshCwIcon className={`h-3 w-3 text-[#19B17A] ${sendCoinRateLoading ? "animate-spin" : ""}`} />
                      <span>
                        {sendCoinRateLoading
                          ? "Fetching rate…"
                          : `1 ${sendCurrency || "--"} = ${sendToReceiveRate ? sendToReceiveRate.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "--"} ${receiveCurrency || "--"}`}
                      </span>
                      {!sendCoinRateLoading && (
                        <span className="bg-[#19B17A] text-white rounded-full px-2 py-0.5 text-[10px] font-bold ml-1">
                          {Math.floor(rateCountdown / 60)}:{String(rateCountdown % 60).padStart(2, "0")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* YOU RECEIVE — crypto (mirrors "You Sell" selector from send) */}
                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">You Receive</span>
                      <span className="text-[11px] text-gray-500 font-medium">
                        {sendBalance > 0 ? `${formatBalance(sendBalance)} ${sendCurrency}` : `0 ${sendCurrency || ""}`}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-3xl font-bold text-gray-900">
                          {sendToReceiveRate && parsedSendAmount > 0
                            ? (() => {
                                const v = parsedSendAmount / sendToReceiveRate
                                return v.toLocaleString(undefined, { maximumFractionDigits: v >= 1 ? 2 : 4 })
                              })()
                            : "0"}
                        </p>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <span className="text-xs text-gray-400">≈ $</span>
                          <span className="text-xs text-gray-400">
                            {sendCoinUsd && parsedSendAmount > 0
                              ? ((parsedSendAmount / (sendToReceiveRate || 1)) * sendCoinUsd).toFixed(2)
                              : "0.00"}
                          </span>
                        </div>
                      </div>
                      {/* Crypto selector — exact copy from send "You Sell" */}
                      <Select value={sendCurrency} onValueChange={setSendCurrency}>
                        <SelectTrigger className="border border-gray-200 rounded-xl px-3 py-2.5 h-auto bg-white shadow-sm w-full max-w-[40%] ml-auto focus:ring-0 [&>svg]:hidden">
                          <div className="flex items-center gap-2">
                            <div className="relative w-7 h-7 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-blue-600">{sendCurrency?.slice(0, 2) || "--"}</span>
                              {(() => {
                                const iconUrl = selectedSendAsset ? getCurrencyIconUrl(selectedSendAsset) : null
                                return iconUrl ? (
                                  <img src={iconUrl} alt={sendCurrency} className="absolute inset-0 w-full h-full object-contain rounded-full" onError={(e) => { e.currentTarget.style.display = "none" }} />
                                ) : null
                              })()}
                            </div>
                            <div className="flex flex-col items-start leading-tight">
                              <span className="font-bold text-gray-900 text-sm">{sendCurrency || "Select"}</span>
                              {walletNetwork && (
                                <span className="text-[10px] text-gray-400 font-medium">{walletNetwork}</span>
                              )}
                            </div>
                            <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400 ml-1" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-white max-h-[300px]">
                          {sendAssetsForWallet.length > 0 ? (
                            sendAssetsForWallet.map((asset: any) => {
                              const iconUrl = getCurrencyIconUrl(asset)
                              const assetNets = getCoinNetworks(asset)
                              const netLabel = walletNetwork || assetNets[0]?.label || assetNets[0]?.network || ""
                              return (
                                <SelectItem key={asset.symbol} value={asset.symbol} className="bg-white hover:bg-gray-50">
                                  <div className="flex items-center gap-2 w-full">
                                    <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                                      {iconUrl && <img src={iconUrl} alt={asset.symbol} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none" }} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium">{asset.symbol}</div>
                                      {netLabel && <div className="text-[10px] text-gray-400">{netLabel}</div>}
                                    </div>
                                  </div>
                                </SelectItem>
                              )
                            })
                          ) : (
                            <div className="p-4 text-center text-sm text-gray-500">
                              {isWalletConnected
                                ? `No supported tokens on ${walletNetwork || "this network"}`
                                : "Connect a wallet to see supported tokens"}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Payment method — exact copy from send */}
                  <div>
                    <span className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase block mb-2">Payment Method</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMode("bank")}
                        className={`relative rounded-xl border-2 p-3 text-left transition-all ${paymentMode === "bank" ? "border-[#19B17A] bg-green-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                      >
                        {paymentMode === "bank" && (
                          <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#19B17A] flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" /></svg>
                          </span>
                        )}
                        <div className="font-semibold text-sm text-gray-900 mb-0.5">Bank</div>
                        <div className="text-[11px] text-gray-400">10 - 30 mins</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMode("mobile")}
                        className={`relative rounded-xl border-2 p-3 text-left transition-all ${paymentMode === "mobile" ? "border-[#19B17A] bg-green-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                      >
                        {paymentMode === "mobile" && (
                          <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#19B17A] flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" /></svg>
                          </span>
                        )}
                        <div className="font-semibold text-sm text-gray-900 mb-0.5">Mobile</div>
                        <div className="text-[11px] text-gray-400">~5 mins</div>
                      </button>
                    </div>
                  </div>

                  {/* Payout Networks — exact copy from send */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase block">Payout Networks</span>
                    <Popover open={networkSearchOpen} onOpenChange={setNetworkSearchOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full rounded-xl border border-gray-200 bg-white h-12 px-4 flex items-center justify-between text-left"
                        >
                          {sendNetworksLoading ? (
                            <span className="text-sm text-gray-400">Loading networks…</span>
                          ) : selectedNetwork ? (
                            (() => {
                              const grp = sendNetworks.find((n) => n.name === selectedNetwork)
                              return (
                                <div className="flex items-center justify-between w-full gap-3">
                                  <span className="text-sm font-medium text-gray-900">{selectedNetwork}</span>
                                  {grp && (grp.min > 0 || grp.max > 0) && (
                                    <span className="text-xs text-gray-400">
                                      {grp.min > 0 && grp.max > 0
                                        ? `(${grp.min.toLocaleString()} - ${grp.max.toLocaleString()} ${receiveCurrency})`
                                        : grp.min > 0
                                          ? `(min ${grp.min.toLocaleString()} ${receiveCurrency})`
                                          : `(max ${grp.max.toLocaleString()} ${receiveCurrency})`}
                                    </span>
                                  )}
                                </div>
                              )
                            })()
                          ) : (
                            <span className="text-sm text-gray-400">
                              {receiveCurrency ? "Select payout network" : "Select a currency first"}
                            </span>
                          )}
                          <ChevronDownIcon className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white" align="start">
                        <Command className="bg-white">
                          <CommandInput placeholder="Search network…" value={networkSearch} onValueChange={setNetworkSearch} />
                          <CommandList className="bg-white">
                            {sendNetworksLoading ? (
                              <div className="p-4 text-center text-sm text-gray-500">Loading…</div>
                            ) : (
                              <>
                                <CommandEmpty className="bg-white">No networks found.</CommandEmpty>
                                <CommandGroup className="bg-white">
                                  {sendNetworks
                                    .filter((grp) => grp.name.toLowerCase().includes(networkSearch.toLowerCase()))
                                    .map((grp) => (
                                      <CommandItem
                                        key={grp.name}
                                        value={grp.name}
                                        onSelect={() => {
                                          setSelectedNetwork(grp.name)
                                          setSelectedPayoutNetwork("")
                                          setNetworkSearch("")
                                          setNetworkSearchOpen(false)
                                        }}
                                        className="flex items-center justify-between gap-4 cursor-pointer bg-white hover:bg-gray-50 aria-selected:bg-gray-50"
                                      >
                                        <span className="font-medium">{grp.name}</span>
                                        {(grp.min > 0 || grp.max > 0) && (
                                          <span className="text-xs text-gray-400 shrink-0">
                                            {grp.min > 0 && grp.max > 0
                                              ? `(${grp.min.toLocaleString()} - ${grp.max.toLocaleString()} ${receiveCurrency})`
                                              : grp.min > 0
                                                ? `(min ${grp.min.toLocaleString()} ${receiveCurrency})`
                                                : `(max ${grp.max.toLocaleString()} ${receiveCurrency})`}
                                          </span>
                                        )}
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Summary — fee, wallet balance, what you get */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-100 divide-y divide-gray-100">
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-gray-500">
                        Fee{feePercentageLabel ? ` (${feePercentageLabel})` : ""}
                      </span>
                      <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                        {sendFeesLoading ? (
                          <span className="flex items-center gap-1 text-gray-400">
                            <RefreshCwIcon className="h-3 w-3 animate-spin" />
                            Calculating…
                          </span>
                        ) : feeInCrypto > 0
                          ? `${feeInCrypto.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${receiveCurrency}`
                          : `0 ${receiveCurrency}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-gray-500">Wallet balance</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatBalance(sendBalance)} {sendCurrency || ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm font-semibold text-gray-900">You get</span>
                      <span className="text-sm font-bold text-[#19B17A]">
                        {(() => {
                          const netFiat = Math.max(0, parsedSendAmount - feeInCrypto)
                          const crypto = sendToReceiveRate && netFiat > 0 ? netFiat / sendToReceiveRate : 0
                          return crypto > 0 ? `${crypto.toLocaleString(undefined, { maximumFractionDigits: crypto >= 1 ? 2 : 4 })} ${sendCurrency || ""}` : `0 ${sendCurrency || ""}`
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Continue / Connect Wallet button */}
                  {isWalletConnected ? (
                    <Button
                      className="w-full h-12 bg-[#19B17A] hover:bg-[#158f68] text-white rounded-xl font-semibold text-base"
                      disabled={!parsedSendAmount || !selectedNetwork}
                      onClick={handleNext}
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button
                      className="w-full h-12 bg-[#19B17A] hover:bg-[#158f68] text-white rounded-xl font-semibold text-base"
                      onClick={onConnectWallet}
                    >
                      Connect Wallet
                    </Button>
                  )}
                </div>
              )}

              {/* Buy Step 2 — Payment Details */}
              {activeTab === "buy" && buyStep === 2 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={handleBackFromReview} className="p-1.5 rounded-lg hover:bg-gray-100">
                      <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                    </button>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Payment Details</h3>
                      <p className="text-xs text-gray-400">Step 2 of 3</p>
                    </div>
                  </div>

                  {paymentMode === "bank" ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase block">Account Name</label>
                        <input
                          type="text"
                          placeholder="Enter account holder name"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#19B17A]/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase block">Account Number</label>
                        <input
                          type="text"
                          placeholder="Enter bank account number"
                          value={bankAccountNumber}
                          onChange={(e) => setBankAccountNumber(e.target.value)}
                          className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#19B17A]/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase block">Reason for Payment</label>
                        <input
                          type="text"
                          placeholder="e.g. Goods, Services, Family support"
                          value={sendReason}
                          onChange={(e) => setSendReason(e.target.value)}
                          className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#19B17A]/30"
                        />
                      </div>
                      <Button
                        className="w-full h-12 bg-[#19B17A] hover:bg-[#158f68] text-white rounded-xl font-semibold text-base"
                        onClick={handleNext}
                        disabled={!recipientName || !bankAccountNumber}
                      >
                        Review Purchase
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase block">Phone Number</label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            {countriesLoading ? (
                              <div className="flex items-center gap-2 h-12 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400">
                                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-[#19B17A] rounded-full" />
                                Loading…
                              </div>
                            ) : (
                              <PhoneInput
                                international
                                defaultCountry="UG"
                                value={phoneNumber}
                                onChange={(value) => setPhoneNumber(value || "")}
                                placeholder="Enter phone number"
                                className="phone-input-custom"
                                countries={
                                  countries.length > 0
                                    ? (countries
                                        .filter((c: any) => (c.isActive !== false && c.is_active !== false) && (c.alpha_2_code || c.code))
                                        .map((c: any) => c.alpha_2_code || c.code) as any)
                                    : undefined
                                }
                              />
                            )}
                          </div>
                          <Button
                            type="button"
                            className="shrink-0 h-12 px-4 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 disabled:opacity-50"
                            onClick={handleVerifyPaymentPhone}
                            disabled={!phoneNumber || phoneNumber.replace(/\D/g, "").length < 9 || isVerifyingPaymentPhone}
                          >
                            {isVerifyingPaymentPhone ? (
                              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                            ) : "Verify"}
                          </Button>
                        </div>
                        {paymentPhoneHolderName && (
                          <p className="text-xs text-[#19B17A] font-medium flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-[#19B17A] inline-flex items-center justify-center">
                              <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 8 8" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M1.5 4l2 2 3-3" /></svg>
                            </span>
                            Number verified
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase block">Name on Account</label>
                        <input
                          type="text"
                          placeholder="Enter registered name"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#19B17A]/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase block">Reason for Payment</label>
                        <input
                          type="text"
                          placeholder="e.g. Goods, Services, Family support"
                          value={sendReason}
                          onChange={(e) => setSendReason(e.target.value)}
                          className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#19B17A]/30"
                        />
                      </div>
                      <Button
                        className="w-full h-12 bg-[#19B17A] hover:bg-[#158f68] text-white rounded-xl font-semibold text-base"
                        onClick={handleNext}
                        disabled={!phoneNumber || !recipientName}
                      >
                        Review Purchase
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Buy Step 3 — Review */}
              {activeTab === "buy" && buyStep === 3 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={handleBackFromReview} className="p-1.5 rounded-lg hover:bg-gray-100">
                      <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                    </button>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Review Purchase</h3>
                      <p className="text-xs text-gray-400">Step 3 of 3</p>
                    </div>
                  </div>

                  {/* Amount hero */}
                  <div className="bg-gradient-to-br from-[#19B17A]/10 to-[#19B17A]/5 rounded-2xl border border-[#19B17A]/20 px-4 py-3 flex items-center justify-between">
                    <div className="text-center flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">You Pay</p>
                      <p className="text-xl font-bold text-gray-900">{sendAmount} <span className="text-base font-semibold text-gray-600">{receiveCurrency}</span></p>
                    </div>
                    <div className="flex flex-col items-center px-3 gap-0.5">
                      <div className="h-px w-6 bg-gray-300" />
                      <ArrowDownIcon className="h-4 w-4 text-[#19B17A]" />
                      <div className="h-px w-6 bg-gray-300" />
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">You Receive</p>
                      <p className="text-xl font-bold text-[#19B17A]">
                        {(() => {
                          const netFiat = Math.max(0, parsedSendAmount - feeInCrypto)
                          const crypto = sendToReceiveRate && netFiat > 0 ? netFiat / sendToReceiveRate : 0
                          return `${crypto > 0 ? crypto.toLocaleString(undefined, { maximumFractionDigits: crypto >= 1 ? 2 : 4 }) : "0"}`
                        })()} <span className="text-base font-semibold">{sendCurrency}</span>
                      </p>
                    </div>
                  </div>

                  {/* Rate & Fees */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                    <p className="px-4 pt-2 pb-0.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Rate &amp; Fees</p>
                    <div className="divide-y divide-gray-100">
                      <div className="px-4 py-2 flex items-center justify-between">
                        <span className="text-sm text-gray-500">Exchange Rate</span>
                        <span className="text-sm font-medium text-gray-900">
                          {sendToReceiveRate ? `1 ${sendCurrency} = ${sendToReceiveRate.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${receiveCurrency}` : "--"}
                        </span>
                      </div>
                      <div className="px-4 py-2 flex items-center justify-between">
                        <span className="text-sm text-gray-500">Fee{feePercentageLabel ? ` (${feePercentageLabel})` : ""}</span>
                        <span className="text-sm font-medium text-gray-900">
                          {feeInCrypto > 0 ? `${feeInCrypto.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${receiveCurrency}` : `0 ${receiveCurrency}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                    <p className="px-4 pt-2 pb-0.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Payment Details</p>
                    <div className="divide-y divide-gray-100">
                      <div className="px-4 py-2 flex items-center justify-between">
                        <span className="text-sm text-gray-500">Payment Method</span>
                        <span className="text-sm font-medium text-gray-900">{paymentMode === "mobile" ? "Mobile Money" : "Bank Transfer"}</span>
                      </div>
                      <div className="px-4 py-2 flex items-center justify-between">
                        <span className="text-sm text-gray-500">Network</span>
                        <span className="text-sm font-medium text-gray-900">{selectedNetwork || "--"}</span>
                      </div>
                      {paymentMode === "mobile" && phoneNumber && (
                        <div className="px-4 py-2 flex items-center justify-between">
                          <span className="text-sm text-gray-500">Phone</span>
                          <span className="text-sm font-medium text-gray-900 font-mono">{phoneNumber}</span>
                        </div>
                      )}
                      {paymentMode === "bank" && bankAccountNumber && (
                        <div className="px-4 py-2 flex items-center justify-between">
                          <span className="text-sm text-gray-500">Account No.</span>
                          <span className="text-sm font-medium text-gray-900 font-mono">{bankAccountNumber}</span>
                        </div>
                      )}
                      {recipientName && (
                        <div className="px-4 py-2 flex items-center justify-between">
                          <span className="text-sm text-gray-500">Account Name</span>
                          <span className="text-sm font-medium text-gray-900">{recipientName}</span>
                        </div>
                      )}
                      {sendReason && (
                        <div className="px-4 py-2 flex items-center justify-between">
                          <span className="text-sm text-gray-500">Reason</span>
                          <span className="text-sm font-medium text-gray-900">{sendReason}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    className="w-full h-12 bg-[#19B17A] hover:bg-[#158f68] text-white rounded-xl font-semibold text-base flex items-center justify-center gap-2"
                    onClick={() => { /* TODO: submit buy transaction */ }}
                  >
                    <WalletIcon className="h-4 w-4" />
                    Confirm Purchase
                  </Button>
                </div>
              )}

              {/* Swap Tab — Step 1 */}
              {activeTab === "swap" && swapStep === 1 && (
                <div className="space-y-2">
                  {/* YOU SELL */}
                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">You Sell</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-500 font-medium">
                          {getBalanceForSymbol(fromCurrency) > 0
                            ? `${formatBalance(getBalanceForSymbol(fromCurrency))} ${fromCurrency}`
                            : `0 ${fromCurrency || ""}`}
                        </span>
                        <button
                          type="button"
                          className="flex items-center gap-1 rounded-lg bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-gray-700 active:bg-gray-800 transition-colors"
                          onClick={() => setFromAmount(getBalanceForSymbol(fromCurrency) > 0 ? getBalanceForSymbol(fromCurrency).toString() : "")}
                        >
                          <span className="rounded bg-white/20 px-1 py-0.5 text-[9px] font-bold tracking-wider">MAX</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <Input
                          type="number"
                          placeholder="0"
                          value={fromAmount}
                          onChange={(e) => setFromAmount(e.target.value)}
                          className="text-3xl font-bold border-0 p-0 h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
                        />
                        <p className="text-xs text-gray-400 mt-0.5">
                          {swapToAmount > 0
                            ? `≈ ${swapToAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${toCurrency}`
                            : `0 ${toCurrency}`}
                        </p>
                      </div>
                      <Select value={fromCurrency} onValueChange={setFromCurrency}>
                        <SelectTrigger className="border border-gray-200 rounded-xl px-3 py-2.5 h-auto bg-white shadow-sm w-full max-w-[40%] ml-auto focus:ring-0 [&>svg]:hidden">
                          <div className="flex items-center gap-2">
                            <div className="relative w-7 h-7 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-blue-600">{fromCurrency?.slice(0, 2) || "--"}</span>
                              {(() => {
                                const iconUrl = getCurrencyIconUrl(swapFromCrypto || { symbol: fromCurrency })
                                return iconUrl ? <img src={iconUrl} alt={fromCurrency} className="absolute inset-0 w-full h-full object-contain rounded-full" onError={(e) => { e.currentTarget.style.display = "none" }} /> : null
                              })()}
                            </div>
                            <div className="flex flex-col items-start leading-tight">
                              <span className="font-bold text-gray-900 text-sm">{fromCurrency || "Select"}</span>
                              {swapFromNetwork && <span className="text-[10px] text-gray-400 font-medium">{swapFromNetwork}</span>}
                            </div>
                            <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400 ml-1" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-white max-h-[300px]">
                          {cryptoNativeAssetsForWallet.length > 0 ? (
                            cryptoNativeAssetsForWallet.map((asset: any) => {
                              const iconUrl = getCurrencyIconUrl(asset)
                              const nets = getCoinNetworks(asset)
                              const netLabel = walletNetwork || nets[0]?.label || nets[0]?.network || ""
                              return (
                                <SelectItem key={asset.symbol} value={asset.symbol} className="bg-white hover:bg-gray-50">
                                  <div className="flex items-center gap-2 w-full">
                                    <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                                      {iconUrl ? <img src={iconUrl} alt={asset.symbol} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none" }} /> : <span className="text-[10px] font-bold text-gray-600">{asset.symbol?.slice(0, 2)}</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium">{asset.symbol}</div>
                                      {netLabel && <div className="text-[10px] text-gray-400">{netLabel}</div>}
                                    </div>
                                  </div>
                                </SelectItem>
                              )
                            })
                          ) : (
                            <div className="p-4 text-center text-sm text-gray-500">
                              {isWalletConnected ? `No supported tokens on ${walletNetwork || "this network"}` : "Connect a wallet to see tokens"}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Exchange Rate Pill + swap button */}
                  <div className="flex justify-center relative">
                    <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-1.5 text-xs text-gray-600 font-medium">
                      <RefreshCwIcon className={`h-3 w-3 text-[#19B17A] ${swapCoinRateLoading ? "animate-spin" : ""}`} />
                      <span>
                        {swapCoinRateLoading
                          ? "Fetching rate…"
                          : `1 ${fromCurrency || "--"} = ${swapExchangeRate ? swapExchangeRate.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "--"} ${toCurrency || "--"}`}
                      </span>
                      {!swapCoinRateLoading && (
                        <span className="bg-[#19B17A] text-white rounded-full px-2 py-0.5 text-[10px] font-bold ml-1">
                          {Math.floor(swapRateCountdown / 60)}:{String(swapRateCountdown % 60).padStart(2, "0")}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleSwapCurrencies}
                      className="absolute right-0 w-7 h-7 rounded-full bg-white border-2 border-gray-200 shadow flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <ArrowUpDownIcon className="h-3 w-3 text-[#19B17A]" />
                    </button>
                  </div>

                  {/* YOU BUY */}
                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">You Buy</span>
                      <span className="text-[11px] text-gray-500 font-medium">
                        {getBalanceForSymbol(toCurrency) > 0
                          ? `${formatBalance(getBalanceForSymbol(toCurrency))} ${toCurrency}`
                          : `0 ${toCurrency || ""}`}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-3xl font-bold text-[#19B17A]">
                          {swapToAmount > 0
                            ? swapToAmount.toLocaleString(undefined, { maximumFractionDigits: swapToAmount >= 1 ? 2 : 4 })
                            : "0"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {swapExchangeRate ? `1 ${fromCurrency} = ${swapExchangeRate.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${toCurrency}` : "--"}
                        </p>
                      </div>
                      <Select value={toCurrency} onValueChange={setToCurrency}>
                        <SelectTrigger className="border border-gray-200 rounded-xl px-3 py-2.5 h-auto bg-white shadow-sm w-full max-w-[40%] ml-auto focus:ring-0 [&>svg]:hidden">
                          <div className="flex items-center gap-2">
                            <div className="relative w-7 h-7 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-green-600">{toCurrency?.slice(0, 2) || "--"}</span>
                              {(() => {
                                const iconUrl = getCurrencyIconUrl(swapToCrypto || { symbol: toCurrency })
                                return iconUrl ? <img src={iconUrl} alt={toCurrency} className="absolute inset-0 w-full h-full object-contain rounded-full" onError={(e) => { e.currentTarget.style.display = "none" }} /> : null
                              })()}
                            </div>
                            <div className="flex flex-col items-start leading-tight">
                              <span className="font-bold text-gray-900 text-sm">{toCurrency || "Select"}</span>
                              {swapToNetwork && <span className="text-[10px] text-gray-400 font-medium">{swapToNetwork}</span>}
                            </div>
                            <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400 ml-1" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-white max-h-[300px]">
                          {swapToOptions.length > 0 ? (
                            swapToOptions.map((asset: any) => {
                              const iconUrl = getCurrencyIconUrl(asset)
                              const nets = getCoinNetworks(asset)
                              const netLabel = walletNetwork || nets[0]?.label || nets[0]?.network || ""
                              return (
                                <SelectItem key={asset.symbol} value={asset.symbol} className="bg-white hover:bg-gray-50">
                                  <div className="flex items-center gap-2 w-full">
                                    <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                                      {iconUrl ? <img src={iconUrl} alt={asset.symbol} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none" }} /> : <span className="text-[10px] font-bold text-gray-600">{asset.symbol?.slice(0, 2)}</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium">{asset.symbol}</div>
                                      {netLabel && <div className="text-[10px] text-gray-400">{netLabel}</div>}
                                    </div>
                                  </div>
                                </SelectItem>
                              )
                            })
                          ) : (
                            <div className="p-4 text-center text-sm text-gray-500">
                              {swapAssetsForSelectedNetwork.length > 0 ? "No other tokens to swap to." : isWalletConnected ? `No tokens on ${walletNetwork || "this network"}` : "Connect a wallet to see tokens"}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Fee summary */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-100 divide-y divide-gray-100">
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-gray-500">
                        Fee{swapFeePercentageLabel ? ` (${swapFeePercentageLabel})` : ""}
                      </span>
                      <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                        {swapFeesLoading ? (
                          <span className="flex items-center gap-1 text-gray-400">
                            <RefreshCwIcon className="h-3 w-3 animate-spin" />
                            Calculating…
                          </span>
                        ) : swapFeeInCrypto > 0
                          ? `${swapFeeInCrypto.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${swapFeeCurrencyLabel}`
                          : `0 ${swapFeeCurrencyLabel}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm font-semibold text-gray-900">You receive</span>
                      <span className="text-sm font-bold text-[#19B17A]">
                        {swapToAmount > 0
                          ? `${swapToAmount.toLocaleString(undefined, { maximumFractionDigits: swapToAmount >= 1 ? 2 : 4 })} ${toCurrency || ""}`
                          : `0 ${toCurrency || ""}`}
                      </span>
                    </div>
                  </div>

                  {/* Continue / Connect Wallet */}
                  {isWalletConnected ? (
                    <Button
                      className="w-full h-12 bg-[#19B17A] hover:bg-[#158f68] text-white rounded-xl font-semibold text-base flex items-center gap-2"
                      disabled={!fromAmount || !fromCurrency || !toCurrency}
                      onClick={handleNext}
                    >
                      Continue
                      <ChevronDownIcon className="h-4 w-4 rotate-[-90deg]" />
                    </Button>
                  ) : (
                    <Button
                      className="w-full h-12 bg-[#19B17A] hover:bg-[#158f68] text-white rounded-xl font-semibold text-base"
                      onClick={onConnectWallet}
                    >
                      Connect Wallet
                    </Button>
                  )}
                </div>
              )}

              {/* Swap Tab — Step 2: Exchange Details */}
              {activeTab === "swap" && swapStep === 2 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={handleBackFromReview} className="p-1.5 rounded-lg hover:bg-gray-100">
                      <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                    </button>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Exchange Details</h3>
                      <p className="text-xs text-gray-400">Step 2 of 3</p>
                    </div>
                  </div>

                  {/* Destination wallet toggle */}
                  <div>
                    <span className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase block mb-2">Destination Wallet</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSwapDestinationMode("connected")}
                        className={`relative rounded-xl border-2 p-3 text-left transition-all ${swapDestinationMode === "connected" ? "border-[#19B17A] bg-green-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                      >
                        {swapDestinationMode === "connected" && (
                          <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#19B17A] flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" /></svg>
                          </span>
                        )}
                        <div className="font-semibold text-sm text-gray-900 mb-0.5">Connected</div>
                        <div className="text-[11px] text-gray-400 font-mono truncate">{formatWalletAddress(connectedWallet || "")}</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSwapDestinationMode("custom")}
                        className={`relative rounded-xl border-2 p-3 text-left transition-all ${swapDestinationMode === "custom" ? "border-[#19B17A] bg-green-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                      >
                        {swapDestinationMode === "custom" && (
                          <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#19B17A] flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" /></svg>
                          </span>
                        )}
                        <div className="font-semibold text-sm text-gray-900 mb-0.5">Custom</div>
                        <div className="text-[11px] text-gray-400">Enter address</div>
                      </button>
                    </div>
                  </div>

                  {/* Custom address input + verify */}
                  {swapDestinationMode === "custom" && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase block">
                        Destination Address <span className="text-gray-300 normal-case tracking-normal">({toCurrency} · {swapToNetwork || "any network"})</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter wallet address"
                          value={swapDestinationAddress}
                          onChange={(e) => {
                            setSwapDestinationAddress(e.target.value)
                            setSwapAddressVerified(false)
                          }}
                          className={`flex-1 h-12 px-4 rounded-xl border bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#19B17A]/30 ${
                            swapDestinationAddress && !swapAddressVerified
                              ? "border-gray-200"
                              : swapAddressVerified
                                ? "border-[#19B17A]"
                                : "border-gray-200"
                          }`}
                        />
                        <Button
                          type="button"
                          className="shrink-0 h-12 px-4 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 disabled:opacity-50"
                          onClick={handleVerifySwapAddress}
                          disabled={!swapDestinationAddress || swapAddressVerifying || swapAddressVerified}
                        >
                          {swapAddressVerifying ? (
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          ) : swapAddressVerified ? "✓" : "Verify"}
                        </Button>
                      </div>
                      {swapAddressVerified && (
                        <p className="text-xs text-[#19B17A] font-medium flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-[#19B17A] inline-flex items-center justify-center">
                            <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 8 8" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M1.5 4l2 2 3-3" /></svg>
                          </span>
                          Address verified for {swapToNetwork || toCurrency}
                        </p>
                      )}
                      {swapDestinationAddress && !swapAddressVerified && !swapAddressVerifying && (
                        <p className="text-xs text-amber-500 font-medium">Verify the address before continuing</p>
                      )}
                    </div>
                  )}

                  {/* Memo / Destination tag (optional) */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase block">
                      Memo / Tag <span className="text-gray-300 normal-case tracking-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Stellar memo or XRP destination tag"
                      value={swapMemo}
                      onChange={(e) => setSwapMemo(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#19B17A]/30"
                    />
                  </div>

                  <Button
                    className="w-full h-12 bg-[#19B17A] hover:bg-[#158f68] text-white rounded-xl font-semibold text-base flex items-center gap-2"
                    disabled={swapDestinationMode === "custom" && (!swapDestinationAddress || !swapAddressVerified)}
                    onClick={handleNext}
                  >
                    Review Swap
                    <ChevronDownIcon className="h-4 w-4 rotate-[-90deg]" />
                  </Button>
                </div>
              )}

              {/* Swap Tab — Step 3: Review */}
              {activeTab === "swap" && swapStep === 3 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={handleBackFromReview} className="p-1.5 rounded-lg hover:bg-gray-100">
                      <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                    </button>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Review Swap</h3>
                      <p className="text-xs text-gray-400">Step 3 of 3</p>
                    </div>
                  </div>

                  {/* Amount hero */}
                  <div className="bg-gradient-to-br from-[#19B17A]/10 to-[#19B17A]/5 rounded-2xl border border-[#19B17A]/20 px-4 py-3 flex items-center justify-between">
                    <div className="text-center flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">You Sell</p>
                      <p className="text-xl font-bold text-gray-900">{fromAmount} <span className="text-base font-semibold text-gray-600">{fromCurrency}</span></p>
                    </div>
                    <div className="flex flex-col items-center px-3 gap-0.5">
                      <div className="h-px w-6 bg-gray-300" />
                      <ArrowDownIcon className="h-4 w-4 text-[#19B17A]" />
                      <div className="h-px w-6 bg-gray-300" />
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">You Receive</p>
                      <p className="text-xl font-bold text-[#19B17A]">
                        {swapToAmount > 0
                          ? swapToAmount.toLocaleString(undefined, { maximumFractionDigits: swapToAmount >= 1 ? 2 : 4 })
                          : "0"}{" "}
                        <span className="text-base font-semibold">{toCurrency}</span>
                      </p>
                    </div>
                  </div>

                  {/* Rate & Fees */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                    <p className="px-4 pt-2 pb-0.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Rate &amp; Fees</p>
                    <div className="divide-y divide-gray-100">
                      <div className="px-4 py-2 flex items-center justify-between">
                        <span className="text-sm text-gray-500">Exchange Rate</span>
                        <span className="text-sm font-medium text-gray-900">
                          {swapExchangeRate ? `1 ${fromCurrency} = ${swapExchangeRate.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${toCurrency}` : "--"}
                        </span>
                      </div>
                      <div className="px-4 py-2 flex items-center justify-between">
                        <span className="text-sm text-gray-500">Fee{swapFeePercentageLabel ? ` (${swapFeePercentageLabel})` : ""}</span>
                        <span className="text-sm font-medium text-gray-900">
                          {swapFeeInCrypto > 0 ? `${swapFeeInCrypto.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${swapFeeCurrencyLabel}` : `0 ${swapFeeCurrencyLabel}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Exchange Details */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                    <p className="px-4 pt-2 pb-0.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Exchange Details</p>
                    <div className="divide-y divide-gray-100">
                      <div className="px-4 py-2 flex items-center justify-between">
                        <span className="text-sm text-gray-500">From Network</span>
                        <span className="text-sm font-medium text-gray-900">{swapFromNetwork || "--"}</span>
                      </div>
                      <div className="px-4 py-2 flex items-center justify-between">
                        <span className="text-sm text-gray-500">To Network</span>
                        <span className="text-sm font-medium text-gray-900">{swapToNetwork || "--"}</span>
                      </div>
                      <div className="px-4 py-2 flex items-center justify-between">
                        <span className="text-sm text-gray-500">Destination</span>
                        <span className="text-sm font-medium text-gray-900 font-mono">
                          {swapDestinationMode === "connected"
                            ? formatWalletAddress(connectedWallet || "")
                            : formatWalletAddress(swapDestinationAddress)}
                        </span>
                      </div>
                      {swapMemo && (
                        <div className="px-4 py-2 flex items-center justify-between">
                          <span className="text-sm text-gray-500">Memo / Tag</span>
                          <span className="text-sm font-medium text-gray-900">{swapMemo}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    className="w-full h-12 bg-[#19B17A] hover:bg-[#158f68] text-white rounded-xl font-semibold text-base flex items-center justify-center gap-2"
                    onClick={() => { /* TODO: submit swap transaction */ }}
                  >
                    <RefreshCwIcon className="h-4 w-4" />
                    Confirm Swap
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
