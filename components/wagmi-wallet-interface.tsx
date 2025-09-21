"use client"

import { useState } from "react"
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TransactionForms } from "./transaction-forms"
import { 
  WalletIcon, 
  LinkIcon, 
  GlobeAltIcon, 
  ChartBarIcon, 
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowsRightLeftIcon,
  UserIcon,
  ChevronDownIcon,
  CheckIcon,
  XMarkIcon
} from "@heroicons/react/24/outline"
import { toast } from "@/hooks/use-toast"
import { chains } from "@/lib/wagmi-config"
import type { Connector } from 'wagmi'

export function WagmiWalletInterface() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)

  const handleConnect = (connector: Connector) => {
    try {
      connect({ connector })
      setShowWalletModal(false)
      toast({
        title: "Wallet Connected",
        description: `Connected to ${connector.name}`,
        variant: "default",
      })
    } catch (error) {
      console.error("Connection failed:", error)
      toast({
        title: "Connection Failed",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setShowAccountModal(false)
    toast({
      title: "Wallet Disconnected",
      description: "You have been disconnected from your wallet.",
      variant: "default",
    })
  }

  const handleSwitchChain = async (chainId: number) => {
    try {
      await switchChain({ chainId })
      toast({
        title: "Network Switched",
        description: `Switched to ${chains.find(c => c.id === chainId)?.name}`,
        variant: "default",
      })
    } catch (error) {
      console.error("Failed to switch chain:", error)
      toast({
        title: "Network Switch Failed",
        description: "Failed to switch network. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getChainName = (chainId: number) => {
    const chainConfig = chains.find(c => c.id === chainId)
    return chainConfig?.name || "Unknown"
  }

  const getChainColor = (chainId: number) => {
    const colors: { [key: number]: string } = {
      1: "bg-blue-50 text-blue-700 border-blue-200",
      137: "bg-purple-50 text-purple-700 border-purple-200",
      42161: "bg-blue-50 text-blue-700 border-blue-200",
      10: "bg-red-50 text-red-700 border-red-200",
      8453: "bg-blue-50 text-blue-700 border-blue-200",
      56: "bg-yellow-50 text-yellow-700 border-yellow-200",
      81457: "bg-orange-50 text-orange-700 border-orange-200",
      43114: "bg-red-50 text-red-700 border-red-200",
      42220: "bg-yellow-50 text-yellow-700 border-yellow-200",
      324: "bg-blue-50 text-blue-700 border-blue-200",
    }
    return colors[chainId] || "bg-gray-50 text-gray-700 border-gray-200"
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white pb-20 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <WalletIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg">PeerPesa</h1>
            <p className="text-xs text-white/80">Multi-Chain Wallet</p>
          </div>
        </div>
        
        {isConnected ? (
          <button
            onClick={() => setShowAccountModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <UserIcon className="h-4 w-4" />
            <span className="text-sm font-medium">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
            <ChevronDownIcon className="h-4 w-4" />
          </button>
        ) : (
          <Button
            onClick={() => setShowWalletModal(true)}
            className="bg-white/20 hover:bg-white/30 text-white border-white/30"
          >
            <WalletIcon className="h-4 w-4 mr-2" />
            Connect Wallet
          </Button>
        )}
      </div>

      {/* Wallet Connection Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Choose your preferred wallet to connect</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWalletModal(false)}
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {connectors.map((connector) => (
                <Button
                  key={connector.uid}
                  variant="outline"
                  className="w-full justify-start h-12"
                  onClick={() => handleConnect(connector)}
                  disabled={isPending}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <WalletIcon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{connector.name}</div>
                      <div className="text-xs text-gray-500">
                        {connector.type === 'walletConnect' ? 'Connect via QR code' : 'Browser extension'}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Account Details</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAccountModal(false)}
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Account Info */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <UserIcon className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="font-medium text-gray-900">Account</p>
                      <p className="text-sm text-gray-600 font-mono">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {getChainName(chain?.id || 1)}
                  </Badge>
                </div>
              </div>

              {/* Network Selection */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <GlobeAltIcon className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="font-medium text-gray-900">Network</p>
                        <p className="text-sm text-gray-600">{getChainName(chain?.id || 1)}</p>
                      </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {chains.map((chainConfig) => (
                    <button
                      key={chainConfig.id}
                      onClick={() => handleSwitchChain(chainConfig.id)}
                      className={`px-3 py-2 text-xs rounded-md border ${
                        chain?.id === chainConfig.id
                          ? getChainColor(chainConfig.id)
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {chainConfig.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Disconnect Button */}
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleDisconnect}
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Disconnect Wallet
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Balance Card */}
        {isConnected ? (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <WalletIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Total Balance</p>
                    <p className="text-sm text-gray-600">{getChainName(chain?.id || 1)} Network</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">$0.00</div>
              <div className="text-sm text-gray-600">0.00 ETH</div>
            </CardContent>
          </Card>
        ) : (
          <></>
        )}

        {/* Transaction Forms */}
        <Tabs defaultValue="send" className="w-full">
          <TabsContent value="send" className="mt-4">
            <TransactionForms 
              onBack={() => {}}
              isWalletConnected={isConnected}
              walletType={connectors.find(c => c.id === 'walletConnect')?.name || 'WalletConnect'}
              onConnectWallet={() => setShowWalletModal(true)}
            />
          </TabsContent>
          
          <TabsContent value="buy" className="mt-4">
            <div className="text-center py-8 text-gray-500">
              Buy functionality coming soon...
            </div>
          </TabsContent>
          
          <TabsContent value="swap" className="mt-4">
            <div className="text-center py-8 text-gray-500">
              Swap functionality coming soon...
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  )
}
