"use client"

import { useToast } from "@/hooks/use-toast"
import { XIcon, CheckCircle2Icon, AlertTriangleIcon, InfoIcon, BellIcon } from "lucide-react"
import { useState, useEffect, useCallback, useRef } from "react"

// --- Notification History Store ---

export interface NotificationRecord {
  id: string
  title: string
  description?: string
  variant?: "default" | "destructive"
  timestamp: number // ms since epoch
}

const STORAGE_KEY = "peerpesa_notifications"
const READ_IDS_KEY = "peerpesa_notifications_read"
const MAX_NOTIFICATIONS = 100

function loadNotifications(): NotificationRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveNotifications(records: NotificationRecord[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_NOTIFICATIONS)))
}

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(READ_IDS_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveReadIds(ids: Set<string>) {
  if (typeof window === "undefined") return
  localStorage.setItem(READ_IDS_KEY, JSON.stringify([...ids]))
}

let notificationListeners: Array<(records: NotificationRecord[]) => void> = []
let notificationMemory: NotificationRecord[] = []
let readIdsListeners: Array<(ids: Set<string>) => void> = []
let readIdsMemory: Set<string> = new Set()

function initNotificationStore() {
  if (notificationMemory.length === 0) {
    notificationMemory = loadNotifications()
  }
  if (readIdsMemory.size === 0) {
    readIdsMemory = loadReadIds()
  }
}

export function addNotification(record: Omit<NotificationRecord, "id" | "timestamp">) {
  initNotificationStore()
  const entry: NotificationRecord = {
    ...record,
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  }
  notificationMemory = [entry, ...notificationMemory].slice(0, MAX_NOTIFICATIONS)
  saveNotifications(notificationMemory)
  notificationListeners.forEach((l) => l(notificationMemory))
}

export function clearNotifications() {
  notificationMemory = []
  readIdsMemory = new Set()
  saveNotifications([])
  saveReadIds(readIdsMemory)
  notificationListeners.forEach((l) => l([]))
  readIdsListeners.forEach((l) => l(new Set()))
}

export function markNotificationRead(id: string) {
  initNotificationStore()
  readIdsMemory = new Set(readIdsMemory)
  readIdsMemory.add(id)
  saveReadIds(readIdsMemory)
  readIdsListeners.forEach((l) => l(new Set(readIdsMemory)))
}

export function markAllNotificationsRead() {
  initNotificationStore()
  readIdsMemory = new Set(notificationMemory.map((r) => r.id))
  saveReadIds(readIdsMemory)
  readIdsListeners.forEach((l) => l(new Set(readIdsMemory)))
}

export function useReadIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => {
    initNotificationStore()
    return readIdsMemory
  })

  useEffect(() => {
    initNotificationStore()
    setIds(readIdsMemory)
    readIdsListeners.push(setIds)
    return () => {
      readIdsListeners = readIdsListeners.filter((l) => l !== setIds)
    }
  }, [])

  return ids
}

export function useNotificationHistory(): NotificationRecord[] {
  const [records, setRecords] = useState<NotificationRecord[]>(() => {
    initNotificationStore()
    return notificationMemory
  })

  useEffect(() => {
    initNotificationStore()
    setRecords(notificationMemory)
    notificationListeners.push(setRecords)
    return () => {
      notificationListeners = notificationListeners.filter((l) => l !== setRecords)
    }
  }, [])

  return records
}

// --- Hook to auto-record toasts as notifications ---

export function useRecordToastNotifications() {
  const { toasts } = useToast()
  const seenRef = useState<Set<string>>(() => new Set<string>())[0]

  useEffect(() => {
    for (const t of toasts) {
      if (!seenRef.has(t.id) && t.title) {
        seenRef.add(t.id)
        addNotification({
          title: typeof t.title === "string" ? t.title : String(t.title),
          description: t.description ? (typeof t.description === "string" ? t.description : String(t.description)) : undefined,
          variant: t.variant as "default" | "destructive" | undefined,
        })
      }
    }
  }, [toasts, seenRef])
}

// --- Date grouping helpers ---

function formatDateLabel(ts: number): string {
  const date = new Date(ts)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (dateDay.getTime() === today.getTime()) return "Today"
  if (dateDay.getTime() === yesterday.getTime()) return "Yesterday"
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

function groupByDate(records: NotificationRecord[]): { label: string; items: NotificationRecord[] }[] {
  const map = new Map<string, NotificationRecord[]>()
  for (const r of records) {
    const label = formatDateLabel(r.timestamp)
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(r)
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
}

// --- Active toast check ---

export function useHasActiveNotifications(): boolean {
  const { toasts } = useToast()
  return toasts.some((t) => t.open !== false)
}

export function useNotificationCount(): number {
  const records = useNotificationHistory()
  const readIds = useReadIds()
  return records.filter((r) => !readIds.has(r.id)).length
}

// --- Inline toast display (existing) ---

export function WalletNotifications() {
  const { toasts, dismiss } = useToast()

  const activeToasts = toasts.filter((t) => t.open !== false)

  if (activeToasts.length === 0) return null

  return (
    <div className="space-y-2 mb-3">
      {activeToasts.map((t) => {
        const isDestructive = t.variant === "destructive"
        const icon = isDestructive ? (
          <AlertTriangleIcon className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2Icon className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
        )

        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              isDestructive
                ? "bg-red-50 border-red-200"
                : "bg-green-50 border-green-200"
            }`}
          >
            {icon}
            <div className="flex-1 min-w-0">
              {t.title && (
                <p className={`text-sm font-semibold ${isDestructive ? "text-red-800" : "text-green-800"}`}>
                  {t.title}
                </p>
              )}
              {t.description && (
                <p className={`text-xs mt-0.5 ${isDestructive ? "text-red-600" : "text-green-600"}`}>
                  {t.description}
                </p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className={`shrink-0 p-0.5 rounded-full hover:bg-black/10 ${
                isDestructive ? "text-red-400" : "text-green-400"
              }`}
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// --- Full Notifications Panel (grouped by date) ---

export function NotificationsPanel() {
  const records = useNotificationHistory()
  const readIds = useReadIds()
  const unreadCount = records.filter((r) => !readIds.has(r.id)).length
  const [visibleCount, setVisibleCount] = useState(5)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Reset visible count when records change significantly (e.g. clear all)
  useEffect(() => {
    if (records.length <= 5) setVisibleCount(5)
  }, [records.length])

  // IntersectionObserver to load more on scroll
  useEffect(() => {
    if (records.length <= visibleCount) return
    const sentinel = loadMoreRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + 5)
        }
      },
      { root: null, rootMargin: "220px", threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [records.length, visibleCount])

  const visibleRecords = records.slice(0, visibleCount)
  const grouped = groupByDate(visibleRecords)

  if (records.length === 0) {
    return (
      <div className="p-8 text-center py-10">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
            <BellIcon className="h-6 w-6 text-gray-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900">No notifications yet</p>
            <p className="text-sm text-gray-600">Your notifications will appear here</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-md font-bold text-gray-900">Notifications</h3>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllNotificationsRead}
              className="text-xs text-[#5ea838] hover:text-[#4e8f2f] font-medium"
            >
              Mark all read
            </button>
          )}
          {records.length > 0 && (
            <button
              onClick={clearNotifications}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {grouped.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
            {group.label}
          </p>
          <div className="space-y-1.5">
            {group.items.map((item) => {
              const isRead = readIds.has(item.id)
              const isDestructive = item.variant === "destructive"
              return (
                <div
                  key={item.id}
                  onClick={() => { if (!isRead) markNotificationRead(item.id) }}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isRead
                      ? "bg-white border-gray-200"
                      : isDestructive
                        ? "bg-red-50 border-red-200"
                        : "bg-green-50 border-green-200"
                  }`}
                >
                  {isDestructive ? (
                    <AlertTriangleIcon className={`h-4 w-4 shrink-0 mt-0.5 ${isRead ? "text-gray-400" : "text-red-500"}`} />
                  ) : (
                    <CheckCircle2Icon className={`h-4 w-4 shrink-0 mt-0.5 ${isRead ? "text-gray-400" : "text-green-500"}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isRead ? "font-medium text-gray-600" : "font-semibold"} ${
                      isRead ? "" : isDestructive ? "text-red-800" : "text-green-800"
                    }`}>
                      {item.title}
                    </p>
                    {item.description && (
                      <p className={`text-xs mt-0.5 ${
                        isRead ? "text-gray-500" : isDestructive ? "text-red-600" : "text-green-600"
                      }`}>
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    {!isRead && (
                      <span className="w-2 h-2 rounded-full bg-[#5ea838]" />
                    )}
                    <span className="text-[10px] text-gray-400">
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {records.length > visibleCount && (
        <div ref={loadMoreRef} className="p-3 text-center text-sm text-gray-500">
          Scroll to load more
        </div>
      )}
    </div>
  )
}
