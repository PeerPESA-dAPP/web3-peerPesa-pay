import localforage from 'localforage'

export type ActivityType =
  | 'connect'
  | 'disconnect'
  | 'send'
  | 'receive'
  | 'swap'
  | 'buy'
  | 'network_switch'
  | 'account_switch'

export type ActivityStatus = 'completed' | 'pending' | 'failed'

export interface WalletActivity {
  id: string
  walletAddress: string
  type: ActivityType
  description: string
  network?: string
  amount?: number
  symbol?: string
  txHash?: string
  timestamp: string
  status: ActivityStatus
}

const store = localforage.createInstance({
  name: 'peerpesa',
  storeName: 'wallet_activities',
})

function key(walletAddress: string): string {
  return `activities_${walletAddress.toLowerCase()}`
}

export async function loadActivities(walletAddress: string): Promise<WalletActivity[]> {
  if (!walletAddress) return []
  try {
    return (await store.getItem<WalletActivity[]>(key(walletAddress))) ?? []
  } catch {
    return []
  }
}

export async function saveActivities(walletAddress: string, activities: WalletActivity[]): Promise<void> {
  if (!walletAddress) return
  try {
    await store.setItem(key(walletAddress), activities.slice(0, 200))
  } catch (err) {
    console.warn('[ActivityStorage] save failed:', err)
  }
}

export async function appendActivities(
  walletAddress: string,
  incoming: WalletActivity[]
): Promise<WalletActivity[]> {
  if (!walletAddress || incoming.length === 0) return loadActivities(walletAddress)
  const existing = await loadActivities(walletAddress)
  const seen = new Set(existing.map(a => a.id))
  const fresh = incoming.filter(a => !seen.has(a.id))
  if (fresh.length === 0) return existing
  const merged = [...fresh, ...existing].slice(0, 200)
  await saveActivities(walletAddress, merged)
  return merged
}

export async function updateActivityStatus(
  walletAddress: string,
  id: string,
  status: ActivityStatus
): Promise<void> {
  const existing = await loadActivities(walletAddress)
  const updated = existing.map(a => (a.id === id ? { ...a, status } : a))
  await saveActivities(walletAddress, updated)
}

export async function clearActivities(walletAddress: string): Promise<void> {
  if (!walletAddress) return
  try {
    await store.removeItem(key(walletAddress))
  } catch (err) {
    console.warn('[ActivityStorage] clear failed:', err)
  }
}
