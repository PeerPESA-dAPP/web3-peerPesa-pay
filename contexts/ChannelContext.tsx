"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
<<<<<<< HEAD
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
=======
import { fetchWithdrawChannels, Channel } from '@/utils/api'
>>>>>>> ef7c726b59bf4fc40c663d1b6712c0198cb0233b

interface ChannelContextType {
  channels: Channel[]
  channelsLoading: boolean
<<<<<<< HEAD
  fetchChannels: (params?: FetchChannelsParams) => Promise<void>
  networks: WithdrawNetwork[]
  networksLoading: boolean
  fetchNetworks: () => Promise<void>
=======
  fetchChannels: (params: {
    rampType?: string
    channelType?: string
    currency?: string
    status?: string
  }) => Promise<void>
>>>>>>> ef7c726b59bf4fc40c663d1b6712c0198cb0233b
  error: string | null
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined)

interface ChannelProviderProps {
  children: ReactNode
}

export function ChannelProvider({ children }: ChannelProviderProps) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [channelsLoading, setChannelsLoading] = useState(false)
<<<<<<< HEAD
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
=======
  const [error, setError] = useState<string | null>(null)

  const fetchChannels = useCallback(async (params: {
    rampType?: string
    channelType?: string
    currency?: string
    status?: string
  }) => {
    setChannelsLoading(true)
    setError(null)
    try {
      const result = await fetchWithdrawChannels(params)
      setChannels(result)
      if (result.length === 0) {
        console.warn('No channels found for params:', params)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch channels'
      setError(errorMessage)
      setChannels([])
      console.error('Error fetching channels:', err)
>>>>>>> ef7c726b59bf4fc40c663d1b6712c0198cb0233b
    } finally {
      setChannelsLoading(false)
    }
  }, [])

<<<<<<< HEAD
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

=======
>>>>>>> ef7c726b59bf4fc40c663d1b6712c0198cb0233b
  const value: ChannelContextType = {
    channels,
    channelsLoading,
    fetchChannels,
<<<<<<< HEAD
    networks,
    networksLoading,
    fetchNetworks,
=======
>>>>>>> ef7c726b59bf4fc40c663d1b6712c0198cb0233b
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
