import { NextRequest, NextResponse } from "next/server"

const CHECK_API = "https://api.checkcryptoaddress.com/wallet-checks"
const API_KEY = process.env.CHECKCRYPTOADDRESS_API_KEY ?? ""

// Map a swap network/symbol to a checkcryptoaddress.com network code.
// All EVM-compatible chains share the same 0x address format → use "eth".
function toCheckNetworkCode(network: string, symbol: string): string | null {
  const net = network.toLowerCase()
  const sym = symbol.toUpperCase()

  if (net.includes("stellar") || sym === "XLM" || sym === "XXLM") return null // handled by regex
  if (net.includes("bitcoin") || sym === "BTC") return "btc"
  // EVM: ethereum, base, polygon, bsc, bnb, arbitrum, optimism, celo, avalanche
  return "eth"
}

// Regex fallback for networks not supported by the API
function regexValidate(address: string, network: string, symbol: string): boolean {
  const net = network.toLowerCase()
  const sym = symbol.toUpperCase()

  if (net.includes("stellar") || sym === "XLM" || sym === "XXLM") {
    return /^G[A-Z2-7]{55}$/.test(address)
  }
  if (/^0x[a-fA-F0-9]{40}$/.test(address)) return true
  return address.length >= 20 && !/\s/.test(address)
}

export async function POST(req: NextRequest) {
  try {
    const { address, network, symbol } = await req.json()

    if (!address) {
      return NextResponse.json({ valid: false, message: "Address is required" }, { status: 400 })
    }

    const networkCode = toCheckNetworkCode(network ?? "", symbol ?? "")

    // If no API network code, use local regex only
    if (!networkCode) {
      const valid = regexValidate(address, network ?? "", symbol ?? "")
      return NextResponse.json({
        valid,
        message: valid ? "Address format is valid" : "Invalid address format for this network",
      })
    }

    // Call checkcryptoaddress.com
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (API_KEY) headers["X-Api-Key"] = API_KEY

    const res = await fetch(CHECK_API, {
      method: "POST",
      headers,
      body: JSON.stringify({ address, network: networkCode }),
    })

    if (!res.ok) {
      // API error — fall back to regex
      const valid = regexValidate(address, network ?? "", symbol ?? "")
      return NextResponse.json({
        valid,
        message: valid ? "Address format is valid" : "Invalid address format",
      })
    }

    const data = await res.json()
    const valid = data.valid === true
    const scamReports = Number(data.scamReport ?? 0)

    return NextResponse.json({
      valid,
      scamReports,
      message: !valid
        ? "Invalid address"
        : scamReports > 0
          ? `Address valid but has ${scamReports} scam report(s) — proceed with caution`
          : "Address verified",
    })
  } catch {
    return NextResponse.json({ valid: false, message: "Verification failed, please try again" }, { status: 500 })
  }
}
