"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { fetchWithdrawChannels, Channel } from '@/utils/api'
interface ChannelContextType {
  channels: Channel[]
  channelsLoading: boolean
  fetchChannels: (params: {
    rampType?: string
    channelType?: string
    currency?: string
    status?: string
  }) => Promise<void>
  error: string | null
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined)

interface ChannelProviderProps {
  children: ReactNode
}

export function ChannelProvider({ children }: ChannelProviderProps) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [channelsLoading, setChannelsLoading] = useState(false)
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
    } finally {
      setChannelsLoading(false)
    }
  }, [])
  const value: ChannelContextType = {
    channels,
    channelsLoading,
    fetchChannels,
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
