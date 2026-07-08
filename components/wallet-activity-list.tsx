"use client"

import { useActivity } from '@/contexts/ActivityContext'
import { WalletActivity } from '@/storage/activityStorage'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  RefreshCwIcon,
  WalletIcon,
  LinkIcon,
  GlobeIcon,
  ShoppingCartIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

function activityIcon(type: WalletActivity['type']) {
  switch (type) {
    case 'send':      return <ArrowUpIcon className="h-4 w-4 text-orange-500" />
    case 'receive':   return <ArrowDownIcon className="h-4 w-4 text-blue-500" />
    case 'swap':      return <RefreshCwIcon className="h-4 w-4 text-purple-500" />
    case 'buy':       return <ShoppingCartIcon className="h-4 w-4 text-green-500" />
    case 'connect':   return <LinkIcon className="h-4 w-4 text-green-500" />
    case 'disconnect':return <WalletIcon className="h-4 w-4 text-gray-400" />
    case 'network_switch': return <GlobeIcon className="h-4 w-4 text-indigo-500" />
    case 'account_switch': return <WalletIcon className="h-4 w-4 text-sky-500" />
    default:          return <WalletIcon className="h-4 w-4 text-gray-400" />
  }
}

const STATUS_STYLES: Record<WalletActivity['status'], string> = {
  completed: 'bg-green-50 text-green-700 border-green-200',
  pending:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  failed:    'bg-red-50 text-red-700 border-red-200',
}

function formatTs(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function WalletActivityList() {
  const { activities, isLoading, lastSynced, refresh } = useActivity()

  if (isLoading) {
    return (
      <div className="space-y-3 mt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-gray-500">
        <WalletIcon className="h-8 w-8 text-gray-300 mb-3" />
        <p className="font-medium text-gray-700">No activity yet</p>
        <p className="text-xs mt-1 text-gray-400">Activity will appear here once you use your wallet</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400">
          {lastSynced ? `Last updated ${formatTs(lastSynced.toISOString())}` : ''}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-gray-500 hover:text-gray-900"
          onClick={() => refresh()}
        >
          <RefreshCwIcon className="h-3 w-3 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="space-y-0">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className={`flex items-center justify-between p-3 bg-gray-50 ${
              index < activities.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 h-8 w-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                {activityIcon(activity.type)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{activity.description}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{formatTs(activity.timestamp)}</span>
                  {activity.network && (
                    <>
                      <span>·</span>
                      <span>{activity.network}</span>
                    </>
                  )}
                  {activity.amount != null && activity.symbol && (
                    <>
                      <span>·</span>
                      <span>{activity.amount} {activity.symbol}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Badge className={`shrink-0 ml-2 text-[10px] ${STATUS_STYLES[activity.status]}`}>
              {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
