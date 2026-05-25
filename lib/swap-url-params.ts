/**
 * Swap URL params - rhino.fi bridge style
 * https://app.rhino.fi/bridge?mode=pay&chainIn=ETHEREUM&chainOut=ARBITRUM&token=USDT&tokenOut=USDC
 *
 * Params: mode, chainIn, chainOut, token, tokenOut
 */

// Map rhino.fi / common chain identifiers to our internal network names
const CHAIN_ALIASES: Record<string, string> = {
  ETHEREUM: "Ethereum",
  ETH: "Ethereum",
  MAINNET: "Ethereum",
  POLYGON: "Polygon",
  MATIC: "Polygon",
  ARBITRUM: "Arbitrum",
  ARBITRUM_ONE: "Arbitrum",
  OPTIMISM: "Optimism",
  OP: "Optimism",
  OP_MAINNET: "Optimism",
  BASE: "Base",
  BSC: "BSC",
  BNB: "BSC",
  BNB_CHAIN: "BSC",
  AVALANCHE: "Avalanche",
  AVAX: "Avalanche",
  CELO: "Celo",
  BLAST: "Blast",
  ZKSYNC: "zkSync Era",
  ZKSYNC_ERA: "zkSync Era",
  STELLAR: "Stellar",
}

/**
 * Normalize chain param (e.g. "ETHEREUM", "ethereum") to our network name
 */
export function normalizeChainParam(chain: string): string {
  if (!chain) return ""
  const upper = chain.toUpperCase().replace(/-/g, "_")
  return CHAIN_ALIASES[upper] ?? chain
}

/**
 * Normalize token param (e.g. "USDT", "usdt") to uppercase symbol
 */
export function normalizeTokenParam(token: string): string {
  if (!token) return ""
  return token.toUpperCase()
}

export interface SwapUrlParams {
  mode?: string
  chainIn?: string
  chainOut?: string
  token?: string
  tokenOut?: string
}

/**
 * Parse swap params from URL search params
 */
export function parseSwapUrlParams(searchParams: URLSearchParams): SwapUrlParams {
  return {
    mode: searchParams.get("mode") ?? undefined,
    chainIn: searchParams.get("chainIn") ?? undefined,
    chainOut: searchParams.get("chainOut") ?? undefined,
    token: searchParams.get("token") ?? undefined,
    tokenOut: searchParams.get("tokenOut") ?? undefined,
  }
}

/**
 * Check if URL params indicate swap/bridge mode (pay = bridge in rhino.fi)
 */
export function isSwapModeFromUrl(params: SwapUrlParams): boolean {
  const mode = (params.mode ?? "").toLowerCase()
  return mode === "pay" || mode === "swap" || mode === "bridge"
}
