"use client"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { API_BASE_URL, fetchExchangeRates, getCurrencyRate, fetchNetworksByChannelIds, fetchCoinRate, fetchTransactionFees, TransactionFeeResult, Network } from "@/utils/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import PhoneInput from "react-phone-number-input"
// import "react-phone-number-input/style.css"
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
  const [sendNetworksLoading, setSendNetworksLoading] = useState(false)
  const [payoutNetworks, setPayoutNetworks] = useState<Network[]>([])
  const [payoutNetworksLoading, setPayoutNetworksLoading] = useState(false)
  const [selectedPayoutNetwork, setSelectedPayoutNetwork] = useState("")
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

  // Removed dummy data - all data now comes from props
  const recentAddresses: any[] = []
  const cryptoAssets: any[] = []
  
  // Fetch networks when receiveCurrency changes
    // Fetch channels filtered by currency + paymentMode for the send tab
    useEffect(() => {
      if (activeTab !== "send" || !paymentMode || !receiveCurrency) {
        setSendNetworksLoading(false)
        return
      }
      const channelType = paymentMode === "mobile" ? "momo" : "bank"
      setSendNetworksLoading(true)
      setSelectedNetwork("")
      setSelectedPayoutNetwork("")
      setPayoutNetworks([])
      fetchChannels({
        rampType: 'withdraw',
        channelType,
        currency: receiveCurrency,
        status: 'active',
      }).finally(() => {
        setSendNetworksLoading(false)
      })
    }, [activeTab, paymentMode, receiveCurrency, fetchChannels])

    // Group channels by network, collecting channelIds + aggregated min/max
    useEffect(() => {
      if (!channels || channels.length === 0) {
        setSendNetworks([])
        return
      }
      const grouped: Record<string, { name: string; min: number; max: number; channelIds: string[] }> = {}
      channels.forEach((ch) => {
        const name = ch.network || ch.name
        if (!name) return
        const id = String(ch.id ?? ch.name)
        const min = Number(ch.minAmount ?? ch.min_amount ?? ch.min ?? 0)
        const max = Number(ch.maxAmount ?? ch.max_amount ?? ch.max ?? 0)
        if (!grouped[name]) {
          grouped[name] = { name, min: min || 0, max: max || 0, channelIds: id ? [id] : [] }
        } else {
          if (min) grouped[name].min = grouped[name].min ? Math.min(grouped[name].min, min) : min
          if (max) grouped[name].max = Math.max(grouped[name].max, max)
          if (id) grouped[name].channelIds.push(id)
        }
      })
      setSendNetworks(Object.values(grouped))
    }, [channels])

    // Fetch sub-networks for the channel IDs of the selected payout network
    useEffect(() => {
      if (!selectedNetwork) {
        setPayoutNetworks([])
        setSelectedPayoutNetwork("")
        return
      }
      const networkGroup = sendNetworks.find((n) => n.name === selectedNetwork)
      const ids = networkGroup?.channelIds ?? []
      if (!ids.length) {
        setPayoutNetworks([])
        setSelectedPayoutNetwork("")
        return
      }
      setPayoutNetworksLoading(true)
      fetchNetworksByChannelIds(ids)
        .then((nets) => {
          setPayoutNetworks(nets)
          setSelectedPayoutNetwork(nets[0]?.name ?? "")
        })
        .finally(() => setPayoutNetworksLoading(false))
    }, [selectedNetwork, sendNetworks])
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
  const [rateCountdown, setRateCountdown] = useState(240);
  const [sendCoinRate, setSendCoinRate] = useState<number | null>(null);
  const [sendCoinRateLoading, setSendCoinRateLoading] = useState(false);
  const [sendFeeResult, setSendFeeResult] = useState<TransactionFeeResult | null>(null);
  const [sendFeesLoading, setSendFeesLoading] = useState(false);
  const [sendUsdDraft, setSendUsdDraft] = useState("");
  const [isEditingSendUsd, setIsEditingSendUsd] = useState(false);
  const [recipientAmountDraft, setRecipientAmountDraft] = useState("");
  const [isEditingRecipientAmount, setIsEditingRecipientAmount] = useState(false);

  useEffect(() => {
    async function fetchRate() {
      if (fromCurrency && toCurrency) {
        // Fetch USD prices for both currencies
        const ratesResp = await fetchExchangeRates('USD');
        const rates = ratesResp.data?.rates || [];
        const fromRate = rates.find(r => r.symbol === fromCurrency)?.rate;
        const toRate = rates.find(r => r.symbol === toCurrency)?.rate;
        if (fromRate && toRate) {
          // USDC-USD = 1, UGX-USD = 0.0002, so USDC-UGX = USDC-USD / UGX-USD
          setSwapExchangeRate(fromRate / toRate);
        } else {
          setSwapExchangeRate(null);
        }
      }
    }
    if (activeTab === 'swap') fetchRate();
  }, [activeTab, fromCurrency, toCurrency]);

  // Fetch live exchange rate for the send pair via GET /rates/:base/:quote
  useEffect(() => {
    if (activeTab !== "send" || !sendCurrency || !receiveCurrency) {
      setSendCoinRate(null)
      return
    }
    setSendCoinRateLoading(true)
    fetchCoinRate(sendCurrency, receiveCurrency)
      .then((data) => {
        const rate = data?.price?.rate?.sale_rate
        setSendCoinRate(typeof rate === "number" && Number.isFinite(rate) ? rate : null)
      })
      .finally(() => setSendCoinRateLoading(false))
  }, [activeTab, sendCurrency, receiveCurrency])

  // Fetch transaction fees from API (uses state directly to avoid forward-ref of derived consts)
  useEffect(() => {
    const amt = Number(sendAmount) || 0
    if (activeTab !== "send" || !sendCurrency || !receiveCurrency || !sendCoinRate || amt <= 0) {
      setSendFeeResult(null)
      return
    }
    const gross = Math.round(amt * sendCoinRate)
    if (!gross) return

    // Resolve blockchain network ID for the sell currency inline
    const asset = cryptoNativeAssetsForWallet.find((c: any) => c.symbol === sendCurrency)
    const nets = getCoinNetworks(asset)
    const netId = (() => {
      if (!nets.length) return ""
      if (walletNetwork) {
        const m = nets.find((n: any) =>
          normalizeNetworkKey(n.network || n.label || "").includes(normalizeNetworkKey(walletNetwork)) ||
          normalizeNetworkKey(walletNetwork).includes(normalizeNetworkKey(n.network || n.label || ""))
        )
        return m?.id || nets[0]?.id || ""
      }
      return nets[0]?.id || ""
    })()

    setSendFeesLoading(true)
    fetchTransactionFees({
      from_currency: receiveCurrency,
      to_currency: sendCurrency,
      process: "send",
      network: netId,
      amount: gross,
    })
      .then((result) => setSendFeeResult(result))
      .finally(() => setSendFeesLoading(false))
  }, [activeTab, sendCurrency, receiveCurrency, sendAmount, sendCoinRate, walletNetwork, cryptoNativeAssetsForWallet])

  // Countdown timer — resets when a new rate is fetched
  useEffect(() => {
    if (activeTab !== "send") return
    setRateCountdown(240)
    const interval = setInterval(() => {
      setRateCountdown((prev) => (prev <= 1 ? 240 : prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [activeTab, sendCurrency, receiveCurrency])

  // Send form computed values (used in both form and review screen)
  const sendBalance = getBalanceForSymbol(sendCurrency)
  const sendCoinUsd = getCurrencyRate(allCurrencies, sendCurrency)
  const receiveCoinUsd = getCurrencyRate(allCurrencies, receiveCurrency)
  // Prefer live /rates API (sale_rate); fall back to USD-ratio from currency catalogue
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
      return match?.id || sendAssetNetsAll[0]?.id || ""
    }
    return sendAssetNetsAll[0]?.id || ""
  })()

  // Fee from API; fall back to 2.5% of gross fiat if API hasn't responded
  const feeInFiat = sendFeeResult?.fee ?? (grossFiatAmount * 0.025)
  const feeCurrencyLabel = sendFeeResult?.feeCurrency || receiveCurrency || ""
  const feePercentageLabel = sendFeeResult?.feePercentage != null
    ? `${sendFeeResult.feePercentage}%`
    : ""

  const sendRecipientAmount = Math.max(0, grossFiatAmount - feeInFiat)
  const hasInsufficientBalance = parsedSendAmount > 0 && parsedSendAmount > sendBalance
  const selectedSendNetworkGroup = sendNetworks.find((n) => n.name === selectedNetwork)
  const sendMinPayout = selectedSendNetworkGroup?.min || 0
  const hasBelowMinPayout = sendRecipientAmount > 0 && sendMinPayout > 0 && sendRecipientAmount < sendMinPayout

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-7">
      {/* Main Content */}
      <div className="pt-2 px-4 pb-4">
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
        ) : !showReview && (
          <div className="grid grid-cols-3 gap-2 mb-2">
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
            <CardContent className="p-4">
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
                      <span className="font-medium">
                        {sendToReceiveRate ? `1 ${sendCurrency} = ${sendToReceiveRate.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${receiveCurrency}` : "--"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">
                        Fee{feePercentageLabel ? ` (${feePercentageLabel})` : ""}
                      </span>
                      <span className="font-medium">
                        {feeInFiat > 0
                          ? `${feeInFiat.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${feeCurrencyLabel}`
                          : `0 ${feeCurrencyLabel}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-gray-600">Transfer Time</span>
                      <span className="font-medium">{paymentMode === "mobile" ? "~5 mins" : "10 - 30 mins"}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-gray-50 px-4">
                      <span className="font-semibold">Total Receive</span>
                      <span className="font-bold text-lg text-[#19B17A]">
                        {sendRecipientAmount > 0 ? sendRecipientAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"} {receiveCurrency}
                      </span>
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
            <CardContent className="p-3">
              {/* Send Tab Content */}
              {activeTab === "send" && (() => {
                const sendAssetNetwork = (() => {
                  if (walletNetwork) return walletNetwork
                  return sendAssetNetsAll[0]?.label || sendAssetNetsAll[0]?.network || ""
                })()
                const selectedReceiveAsset = fiatCurrencies.find((c: any) => c.symbol === receiveCurrency)

                return (
                  <div className="space-y-3">
                    {/* Wallet status row */}
                    {isWalletConnected ? (
                      <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-[#19B17A] shrink-0" />
                          <span className="text-xs font-medium text-gray-700 truncate">
                            {connectedWallet
                              ? `${connectedWallet.slice(0, 6)}…${connectedWallet.slice(-4)}`
                              : "Wallet connected"}
                          </span>
                        </div>
                        {walletNetwork && (
                          <span className="text-[10px] font-semibold text-[#19B17A] bg-green-100 rounded-full px-2 py-0.5 shrink-0 ml-2">
                            {walletNetwork}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-gray-50 border border-dashed border-gray-200 rounded-xl px-3 py-2.5">
                        <span className="text-xs text-gray-500">Connect wallet to see balances</span>
                        <button
                          type="button"
                          onClick={onConnectWallet}
                          className="text-xs font-semibold text-[#19B17A] hover:text-[#158f68] shrink-0 ml-2"
                        >
                          Connect
                        </button>
                      </div>
                    )}

                    {/* YOU SELL */}
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">You Sell</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-gray-500 font-medium">
                            {sendBalance > 0 ? `${sendBalance.toFixed(4)} ${sendCurrency}` : `0 ${sendCurrency || ""}`}
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
                          Insufficient balance. Available: {sendBalance.toFixed(4)} {sendCurrency}
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
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                      <span className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase block mb-3">Recipient Gets</span>
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

                      {/* Network selector — each entry aggregates channels by network name */}
                      <Select
                        value={selectedNetwork}
                        onValueChange={(val) => {
                          setSelectedNetwork(val)
                          setSelectedPayoutNetwork("")
                        }}
                      >
                        <SelectTrigger className="w-full rounded-xl border border-gray-200 bg-white h-12 px-4">
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
                                      {grp.min > 0 ? `Min: ${grp.min.toLocaleString()}` : ""}
                                      {grp.min > 0 && grp.max > 0 ? " · " : ""}
                                      {grp.max > 0 ? `Max: ${grp.max.toLocaleString()}` : ""}
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
                        </SelectTrigger>
                        <SelectContent className="bg-white max-h-[300px]">
                          {sendNetworksLoading ? (
                            <div className="p-4 text-center text-sm text-gray-500">Loading…</div>
                          ) : sendNetworks.length > 0 ? (
                            sendNetworks.map((grp) => (
                              <SelectItem key={grp.name} value={grp.name} className="bg-white hover:bg-gray-50">
                                <div className="flex items-center justify-between w-full gap-4">
                                  <span className="font-medium">{grp.name}</span>
                                  {(grp.min > 0 || grp.max > 0) && (
                                    <span className="text-xs text-gray-400">
                                      {grp.min > 0 ? `Min: ${grp.min.toLocaleString()}` : ""}
                                      {grp.min > 0 && grp.max > 0 ? " · " : ""}
                                      {grp.max > 0 ? `Max: ${grp.max.toLocaleString()}` : ""}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-4 text-center text-sm text-gray-500">
                              {receiveCurrency ? "No payout networks available" : "Select a recipient currency first"}
                            </div>
                          )}
                        </SelectContent>
                      </Select>

                      {/* Sub-network selector — populated from channelIds of the selected network */}
                      {selectedNetwork && (
                        <Select value={selectedPayoutNetwork} onValueChange={setSelectedPayoutNetwork}>
                          <SelectTrigger className="w-full rounded-xl border border-gray-200 bg-white h-12 px-4">
                            {payoutNetworksLoading ? (
                              <span className="text-sm text-gray-400">Loading…</span>
                            ) : selectedPayoutNetwork ? (
                              <span className="text-sm font-medium text-gray-900">{selectedPayoutNetwork}</span>
                            ) : (
                              <span className="text-sm text-gray-400">Select routing network</span>
                            )}
                          </SelectTrigger>
                          <SelectContent className="bg-white max-h-[300px]">
                            {payoutNetworksLoading ? (
                              <div className="p-4 text-center text-sm text-gray-500">Loading…</div>
                            ) : payoutNetworks.length > 0 ? (
                              payoutNetworks.map((net) => (
                                <SelectItem key={net.id ?? net.name} value={net.name} className="bg-white hover:bg-gray-50">
                                  <span className="font-medium">{net.name}</span>
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-4 text-center text-sm text-gray-500">No routing networks available</div>
                            )}
                          </SelectContent>
                        </Select>
                      )}
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
                            feeInFiat > 0
                              ? `${feeInFiat.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${feeCurrencyLabel}`
                              : `0 ${feeCurrencyLabel}`
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm text-gray-500">Wallet balance</span>
                        <span className="text-sm font-medium text-gray-900">
                          {sendBalance.toFixed(4)} {sendCurrency || ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm font-semibold text-gray-900">You receive</span>
                        <span className="text-sm font-bold text-[#19B17A]">
                          {sendRecipientAmount > 0 ? sendRecipientAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"} {receiveCurrency || ""}
                        </span>
                      </div>
                    </div>

                    {/* Review Transfer / Connect Wallet */}
                    {isWalletConnected ? (
                      <Button
                        className="w-full h-12 bg-[#19B17A] hover:bg-[#158f68] text-white rounded-xl font-semibold text-base flex items-center gap-2"
                        onClick={handleNext}
                        disabled={hasInsufficientBalance || hasBelowMinPayout || !sendAmount || !receiveCurrency}
                      >
                        <SendIcon className="h-4 w-4" />
                        Review Transfer
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

              {/* Buy Tab Content */}
              {activeTab === "buy" && (
                <div className="space-y-2">
                  {/* Pay Card - Fiat */}
                  <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-400 mb-1">You pay</p>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <Input
                          type="number"
                          placeholder="0"
                          value={sendAmount}
                          onChange={(e) => setSendAmount(e.target.value)}
                          className="text-2xl font-bold border-0 p-0 h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
                        />
                        <p className="text-xs text-gray-400 mt-0.5">
                          {sendAmount ? sendAmount : "0.00"} {receiveCurrency}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <Select value={receiveCurrency} onValueChange={setReceiveCurrency}>
                          <SelectTrigger className="border border-gray-200 rounded-full px-3 py-2 h-auto bg-gray-50 hover:bg-gray-100 min-w-[110px] focus:ring-0 [\border border-gray-200 rounded-full px-3 py-2 h-auto bg-gray-50 hover:bg-gray-100 min-w-[110px] focus:ring-0>svg:last-child]:hidden">
                            <div className="flex items-center gap-2">
                              <div className="relative w-6 h-6 rounded-full overflow-hidden bg-gray-200 shrink-0 flex items-center justify-center">
                                <span className="text-[9px] font-bold text-green-600">{receiveCurrency?.slice(0, 2) || "--"}</span>
                                {(() => {
                                  const iconUrl = getCurrencyIconUrl({ symbol: receiveCurrency })
                                  return iconUrl ? (
                                    <img src={iconUrl} alt={receiveCurrency} className="absolute inset-0 w-full h-full object-contain rounded-full" onError={(e) => { e.currentTarget.style.display = "none" }} />
                                  ) : null
                                })()}
                              </div>
                              <span className="font-semibold text-gray-900 text-sm">{receiveCurrency || "Select"}</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent className="bg-white max-h-[300px]">
                            {fiatCurrencies && fiatCurrencies.length > 0 ? (
                              fiatCurrencies.map((currency) => {
                                const iconUrl = getCurrencyIconUrl(currency)
                                return (
                                  <SelectItem key={currency.symbol} value={currency.symbol} className="bg-white hover:bg-gray-50">
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                                        {iconUrl && <img src={iconUrl} alt={currency.symbol} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none" }} />}
                                      </div>
                                      <span>{currency.symbol}</span>
                                    </div>
                                  </SelectItem>
                                )
                              })
                            ) : (
                              <div className="p-4 text-center text-sm text-gray-500">No currencies available</div>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400 text-right mt-0.5 pr-1">0 {receiveCurrency}</p>
                      </div>
                    </div>
                  </div>

                  {/* Arrow separator */}
                  <div className="flex justify-center -my-0.5">
                    <div className="w-7 h-7 rounded-full bg-green-100 border-4 border-white shadow flex items-center justify-center">
                      <ArrowDownIcon className="h-3 w-3 text-green-600" />
                    </div>
                  </div>

                  {/* Buy Card - Crypto */}
                  <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-400 mb-1">You receive</p>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-2xl font-bold text-gray-900">
                          {sendAmount ? (Number(sendAmount) * 0.17).toFixed(7) : "0.0000000"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {sendAmount ? sendAmount : "0.00"} {receiveCurrency}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <Select value={sendCurrency} onValueChange={setSendCurrency}>
                          <SelectTrigger className="border border-gray-200 rounded-full px-3 py-2 h-auto bg-gray-50 hover:bg-gray-100 min-w-[110px] focus:ring-0 [\border border-gray-200 rounded-full px-3 py-2 h-auto bg-gray-50 hover:bg-gray-100 min-w-[110px] focus:ring-0>svg:last-child]:hidden">
                            <div className="flex items-center gap-2">
                              <div className="relative w-6 h-6 rounded-full overflow-hidden bg-gray-200 shrink-0 flex items-center justify-center">
                                <span className="text-[9px] font-bold text-blue-600">{sendCurrency?.slice(0, 2) || "--"}</span>
                                {(() => {
                                  const iconUrl = getCurrencyIconUrl({ symbol: sendCurrency })
                                  return iconUrl ? (
                                    <img src={iconUrl} alt={sendCurrency} className="absolute inset-0 w-full h-full object-contain rounded-full" onError={(e) => { e.currentTarget.style.display = "none" }} />
                                  ) : null
                                })()}
                              </div>
                              <span className="font-semibold text-gray-900 text-sm">{sendCurrency || "Select"}</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent className="bg-white max-h-[300px]">
                            {swapAssetsForSelectedNetwork && swapAssetsForSelectedNetwork.length > 0 ? (
                              swapAssetsForSelectedNetwork.map((asset) => {
                                const iconUrl = getCurrencyIconUrl(asset)
                                return (
                                  <SelectItem key={asset.symbol} value={asset.symbol} className="bg-white hover:bg-gray-50">
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
                              <div className="p-4 text-center text-sm text-gray-500">No assets available</div>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400 text-right mt-0.5 pr-1">0 {sendCurrency}</p>
                      </div>
                    </div>
                  </div>

                  {/* Rate details collapsible */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowBuyRateDetails((v) => !v)}
                    >
                      <span>
                        1 {receiveCurrency || "--"} = {(0.17).toFixed(6)} {sendCurrency || "--"}
                      </span>
                      <ChevronDownIcon
                        className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${showBuyRateDetails ? "rotate-180" : ""}`}
                      />
                    </button>

                    {showBuyRateDetails && (
                      <div className="border-t border-gray-100 px-3 py-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Price Impact</span>
                          <span className="text-sm font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-full">~0.00%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Expected output</span>
                          <span className="text-sm font-medium text-gray-900">
                            {sendAmount ? (Number(sendAmount) * 0.17).toFixed(7) : "0.0000000"} {sendCurrency}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Fees</span>
                          <span className="text-sm font-medium text-gray-900">{formatFee(sendAmount, receiveCurrency)}</span>
                        </div>
                        {walletNetwork && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Network</span>
                            <span className="text-sm font-medium text-gray-900">{walletNetwork}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>



                  {/* Payment Mode */}
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

                  {activeTab === "buy" && (
                    <div>
                      <Label className="text-sm text-gray-500 mb-2 block">Network</Label>
                      <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select network for selected fiat" />
                        </SelectTrigger>
                        <SelectContent className="bg-white max-h-[300px]">
                          {swapAssetsForSelectedNetwork && swapAssetsForSelectedNetwork.length > 0 ? (
                            swapAssetsForSelectedNetwork
                              .filter(asset => asset.symbol === receiveCurrency && asset.network)
                              .map((asset) => (
                                <SelectItem key={asset.network} value={asset.network} className="bg-white hover:bg-gray-50">
                                  <div className="flex items-center gap-2">
                                    <span>{asset.network}</span>
                                  </div>
                                </SelectItem>
                              ))
                          ) : (
                            <div className="p-4 text-center text-sm text-gray-500">No networks available for selected fiat</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Payment Phone Number */}
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

                  {/* Account Holder Name */}
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

                    {walletDestination === "connected" && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xs">🔗</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">Connected Wallet</span>
                        </div>
                        <div className="mt-2 text-xs font-mono text-gray-700 break-all">
                          {connectedWallet || "No wallet connected"}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Using your connected wallet</p>
                      </div>
                    )}

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

                  {/* Connect Wallet / Buy Button */}
                  {isWalletConnected ? (
                    <Button
                      className="w-full rounded-[28px] bg-gradient-to-r from-[#6c47ff] to-[#4b2fd1] px-6 py-5 text-lg font-semibold text-white shadow-xl shadow-violet-500/20 transition-all duration-200 hover:from-[#5a3fe8] hover:to-[#4327c4]"
                      onClick={handleNext}
                    >
                      Buy Now
                    </Button>
                  ) : (
                    <Button
                      className="w-full rounded-[28px] bg-gradient-to-r from-[#6c47ff] to-[#4b2fd1] px-6 py-5 text-lg font-semibold text-white shadow-xl shadow-violet-500/20 transition-all duration-200 hover:from-[#5a3fe8] hover:to-[#4327c4]"
                      onClick={onConnectWallet}
                    >
                      Connect Wallet
                    </Button>
                  )}
                </div>
              )}

              {/* Swap Tab Content */}
              {activeTab === "swap" && (
                <div className="space-y-2">
                  {/* Sell Card */}
                  <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-400 mb-1">Sell</p>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <Input
                          type="number"
                          placeholder="0"
                          value={fromAmount}
                          onChange={(e) => setFromAmount(e.target.value)}
                          className="text-2xl font-bold border-0 p-0 h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
                        />
                        <p className="text-xs text-gray-400 mt-0.5">
                          {fromAmount ? (Number(fromAmount) * 0.17).toFixed(2) : "0.00"}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <Select value={fromCurrency} onValueChange={setFromCurrency}>
                          <SelectTrigger className="border border-gray-200 rounded-full px-3 py-2 h-auto bg-gray-50 hover:bg-gray-100 min-w-[110px] focus:ring-0 [\border border-gray-200 rounded-full px-3 py-2 h-auto bg-gray-50 hover:bg-gray-100 min-w-[110px] focus:ring-0>svg:last-child]:hidden">
                            <div className="flex items-center gap-2">
                              <div className="relative w-6 h-6 rounded-full overflow-hidden bg-gray-200 shrink-0 flex items-center justify-center">
                                <span className="text-[9px] font-bold text-blue-600">{fromCurrency?.slice(0, 2) || "--"}</span>
                                {(() => {
                                  const iconUrl = getCurrencyIconUrl({ symbol: fromCurrency })
                                  return iconUrl ? (
                                    <img src={iconUrl} alt={fromCurrency} className="absolute inset-0 w-full h-full object-contain rounded-full" onError={(e) => { e.currentTarget.style.display = "none" }} />
                                  ) : null
                                })()}
                              </div>
                              <span className="font-semibold text-gray-900 text-sm">{fromCurrency || "Select"}</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent className="bg-white max-h-[300px]">
                            {cryptoNativeAssetsForWallet && cryptoNativeAssetsForWallet.length > 0 ? (
                              cryptoNativeAssetsForWallet.map((asset) => {
                                const iconUrl = getCurrencyIconUrl(asset)
                                return (
                                  <SelectItem key={asset.symbol} value={asset.symbol} className="bg-white hover:bg-gray-50">
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
                        <p className="text-xs text-gray-400 text-right mt-0.5 pr-1">

                          {getBalanceForSymbol(fromCurrency).toFixed(6)} {fromCurrency}

                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Arrow / swap separator */}
                  <div className="flex justify-center -my-0.5">
                    <button
                      type="button"
                      onClick={handleSwapCurrencies}
                      className="w-7 h-7 rounded-full bg-green-100 border-4 border-white shadow flex items-center justify-center hover:bg-green-200 transition-colors"
                    >
                      <ArrowUpDownIcon className="h-3 w-3 text-green-600" />
                    </button>
                  </div>

                  {/* Buy Card */}
                  <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-400 mb-1">Buy</p>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-2xl font-bold text-gray-900">
                          {fromAmount ? (Number(fromAmount) * 0.17).toFixed(7) : "0.0000000"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {fromAmount ? (Number(fromAmount) * 0.17).toFixed(2) : "0.00"}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <Select value={toCurrency} onValueChange={setToCurrency}>
                          <SelectTrigger className="border border-gray-200 rounded-full px-3 py-2 h-auto bg-gray-50 hover:bg-gray-100 min-w-[110px] focus:ring-0 [\border border-gray-200 rounded-full px-3 py-2 h-auto bg-gray-50 hover:bg-gray-100 min-w-[110px] focus:ring-0>svg:last-child]:hidden">
                            <div className="flex items-center gap-2">
                              <div className="relative w-6 h-6 rounded-full overflow-hidden bg-gray-200 shrink-0 flex items-center justify-center">
                                <span className="text-[9px] font-bold text-green-600">{toCurrency?.slice(0, 2) || "--"}</span>
                                {(() => {
                                  const iconUrl = getCurrencyIconUrl({ symbol: toCurrency })
                                  return iconUrl ? (
                                    <img src={iconUrl} alt={toCurrency} className="absolute inset-0 w-full h-full object-contain rounded-full" onError={(e) => { e.currentTarget.style.display = "none" }} />
                                  ) : null
                                })()}
                              </div>
                              <span className="font-semibold text-gray-900 text-sm">{toCurrency || "Select"}</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent className="bg-white max-h-[300px]">
                            {swapAssetsForSelectedNetwork && swapAssetsForSelectedNetwork.length > 0 ? (
                              swapToOptions.length > 0 ? (
                                swapToOptions.map((asset) => {
                                  const iconUrl = getCurrencyIconUrl(asset)
                                  return (
                                    <SelectItem key={asset.symbol} value={asset.symbol} className="bg-white hover:bg-gray-50">
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
                                <div className="p-4 text-center text-sm text-gray-500">No token to swap to on this network.</div>
                              )
                            ) : (
                              <div className="p-4 text-center text-sm text-gray-500">
                                {walletNetwork ? `No native tokens for ${walletNetwork}. Connect wallet on supported network.` : "Connect wallet to see assets"}
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400 text-right mt-0.5 pr-1">0 {toCurrency}</p>
                        {swapAssetsForSelectedNetwork.length > 0 && swapToOptions.length === 0 && (
                          <p className="text-xs text-amber-600 mt-1 text-right">No token to swap to on this network.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rate details collapsible */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowSwapRateDetails((v) => !v)}
                    >
                      <span>
                        1 {fromCurrency || "--"} = {(0.17).toFixed(6)} {toCurrency || "--"}
                      </span>
                      <ChevronDownIcon
                        className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${showSwapRateDetails ? "rotate-180" : ""}`}
                      />
                    </button>

                    {showSwapRateDetails && (
                      <div className="border-t border-gray-100 px-3 py-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Price Impact</span>
                          <span className="text-sm font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-full">~0.00%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Expected output</span>
                          <span className="text-sm font-medium text-gray-900">
                            {fromAmount ? (Number(fromAmount) * 0.17).toFixed(7) : "0.0000000"} {toCurrency}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Path</span>
                          <span className="text-sm font-medium text-gray-900">{fromCurrency} &gt; {toCurrency} (100%)</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Fees</span>
                          <span className="text-sm font-medium text-gray-900">{formatFee(fromAmount, fromCurrency)}</span>
                        </div>
                        {(swapFromNetwork || walletNetwork) && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Platform</span>
                            <span className="text-sm font-medium text-gray-900">{swapFromNetwork || walletNetwork}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Connect Wallet / Swap Button */}
                  {isWalletConnected ? (
                    <Button
                      className="w-full rounded-[28px] bg-gradient-to-r from-[#6c47ff] to-[#4b2fd1] px-6 py-5 text-lg font-semibold text-white shadow-xl shadow-violet-500/20 transition-all duration-200 hover:from-[#5a3fe8] hover:to-[#4327c4]"
                      onClick={handleNext}
                    >
                      Swap Now
                    </Button>
                  ) : (
                    <Button
                      className="w-full rounded-[28px] bg-gradient-to-r from-[#6c47ff] to-[#4b2fd1] px-6 py-5 text-lg font-semibold text-white shadow-xl shadow-violet-500/20 transition-all duration-200 hover:from-[#5a3fe8] hover:to-[#4327c4]"
                      onClick={onConnectWallet}
                    >
                      Connect Wallet
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
