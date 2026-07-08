"use client"

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react'
import {
  WalletActivity,
  ActivityType,
  ActivityStatus,
  loadActivities,
  appendActivities,
  updateActivityStatus,
  clearActivities,
} from '@/storage/activityStorage'

interface ActivityContextType {
  activities: WalletActivity[]
  isLoading: boolean
  lastSynced: Date | null
  addActivity: (activity: Omit<WalletActivity, 'id' | 'walletAddress' | 'timestamp'>) => Promise<void>
  updateStatus: (id: string, status: ActivityStatus) => Promise<void>
  refresh: () => Promise<void>
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined)

const REFRESH_INTERVAL_MS = 60_000

export function ActivityProvider({
  children,
  walletAddress,
}: {
  children: ReactNode
  walletAddress: string
}) {
  const [activities, setActivities] = useState<WalletActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const prevWalletRef = useRef<string>('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    if (!walletAddress) {
      setActivities([])
      setIsLoading(false)
      return
    }
    const stored = await loadActivities(walletAddress)
    setActivities(stored)
    setLastSynced(new Date())
  }, [walletAddress])

  // Clear storage and reset when wallet address changes
  useEffect(() => {
    const prev = prevWalletRef.current

    if (prev && prev !== walletAddress.toLowerCase()) {
      clearActivities(prev)
      setActivities([])
    }

    prevWalletRef.current = walletAddress.toLowerCase()

    if (!walletAddress) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    loadActivities(walletAddress).then(stored => {
      setActivities(stored)
      setIsLoading(false)
      setLastSynced(new Date())
    })
  }, [walletAddress])

  // 60-second auto-refresh
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!walletAddress) return

    intervalRef.current = setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [walletAddress, refresh])

  const addActivity = useCallback(
    async (activity: Omit<WalletActivity, 'id' | 'walletAddress' | 'timestamp'>) => {
      if (!walletAddress) return
      const entry: WalletActivity = {
        ...activity,
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        walletAddress: walletAddress.toLowerCase(),
        timestamp: new Date().toISOString(),
      }
      const merged = await appendActivities(walletAddress, [entry])
      setActivities(merged)
      setLastSynced(new Date())
    },
    [walletAddress]
  )

  const updateStatus = useCallback(
    async (id: string, status: ActivityStatus) => {
      if (!walletAddress) return
      await updateActivityStatus(walletAddress, id, status)
      setActivities(prev => prev.map(a => (a.id === id ? { ...a, status } : a)))
    },
    [walletAddress]
  )

  return (
    <ActivityContext.Provider
      value={{ activities, isLoading, lastSynced, addActivity, updateStatus, refresh }}
    >
      {children}
    </ActivityContext.Provider>
  )
}

export function useActivity() {
  const ctx = useContext(ActivityContext)
  if (!ctx) throw new Error('useActivity must be used within ActivityProvider')
  return ctx
}
