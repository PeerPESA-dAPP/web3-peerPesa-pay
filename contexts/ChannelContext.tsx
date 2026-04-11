"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { API_BASE_URL } from '@/utils/api'

export interface Channel {
  id?: number
  name?: string
  network?: string
  channelType?: string
  rampType?: string
  currency?: string
  status?: string
  minAmount?: number
  min_amount?: number
  min?: number
  maxAmount?: number
  max_amount?: number
  max?: number
  [key: string]: any
}

export interface WithdrawNetwork {
  id?: number
  name?: string
  status?: string
  [key: string]: any
}

interface FetchChannelsParams {
  rampType?: string
  channelType?: string
  currency?: string
  status?: string
}

interface ChannelContextType {
  channels: Channel[]
  channelsLoading: boolean
  fetchChannels: (params?: FetchChannelsParams) => Promise<void>
  networks: WithdrawNetwork[]
  networksLoading: boolean
  fetchNetworks: () => Promise<void>
  error: string | null
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined)

interface ChannelProviderProps {
  children: ReactNode
}

export function ChannelProvider({ children }: ChannelProviderProps) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [channelsLoading, setChannelsLoading] = useState(false)
  const [networks, setNetworks] = useState<WithdrawNetwork[]>([])
  const [networksLoading, setNetworksLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchChannels = useCallback(async (params?: FetchChannelsParams) => {
    setChannelsLoading(true)
    setError(null)

    try {
      const url = new URL(`${API_BASE_URL}/dapp/system/withdraw/channels`)
      if (params?.rampType) url.searchParams.set('rampType', params.rampType)
      if (params?.channelType) url.searchParams.set('channelType', params.channelType)
      if (params?.currency) url.searchParams.set('currency', params.currency)
      if (params?.status) url.searchParams.set('status', params.status)

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`Failed to fetch channels: ${res.status}`)
      const data = await res.json()
      const items = Array.isArray(data) ? data : (data?.data ?? data?.channels ?? [])
      setChannels(items)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch channels'
      setError(msg)
      console.error('Error fetching channels:', err)
      setChannels([])
    } finally {
      setChannelsLoading(false)
    }
  }, [])

  const fetchNetworks = useCallback(async () => {
    setNetworksLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE_URL}/dapp/system/withdraw/networks`)
      if (!res.ok) throw new Error(`Failed to fetch networks: ${res.status}`)
      const data = await res.json()
      const items = Array.isArray(data) ? data : (data?.data ?? data?.networks ?? [])
      setNetworks(items)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch networks'
      setError(msg)
      console.error('Error fetching networks:', err)
      setNetworks([])
    } finally {
      setNetworksLoading(false)
    }
  }, [])

  const value: ChannelContextType = {
    channels,
    channelsLoading,
    fetchChannels,
    networks,
    networksLoading,
    fetchNetworks,
    error,
  }

  return (
    <ChannelContext.Provider value={value}>
      {children}
    </ChannelContext.Provider>
  )
}

export function useChannel() {
  const context = useContext(ChannelContext)
  if (context === undefined) {
    throw new Error('useChannel must be used within a ChannelProvider')
  }
  return context
}
