import { createConfig, http } from 'wagmi'
import { walletConnect, metaMask, coinbaseWallet } from 'wagmi/connectors'
import { mainnet, polygon, arbitrum, optimism, base, bsc, avalanche, celo, zkSync } from 'wagmi/chains'

// Define custom chains for networks not in wagmi/chains
const blast = {
  id: 81457,
  name: 'Blast',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.blast.io'] },
    public: { http: ['https://rpc.blast.io'] },
  },
  blockExplorers: {
    default: { name: 'Blastscan', url: 'https://blastscan.io' },
  },
} as const

const zkSyncEra = {
  id: 324,
  name: 'zkSync Era',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.era.zksync.io'] },
    public: { http: ['https://mainnet.era.zksync.io'] },
  },
  blockExplorers: {
    default: { name: 'zkSync Era Explorer', url: 'https://explorer.zksync.io' },
  },
} as const

// WalletConnect project metadata
const projectId = "4dac0c42-240e-4a40-b80e-93b1b2dd14c6"

// Define all supported chains
export const chains = [
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  bsc,
  blast,
  avalanche,
  celo,
  zkSyncEra,
] as const

// Create Wagmi configuration
export const config = createConfig({
  chains,
  connectors: [
    walletConnect({
      projectId,
      metadata: {
        name: 'PeerPesa',
        description: 'Move money across borders effortlessly straight to mobile wallets and bank accounts with our blockchain-powered technology.',
        url: 'https://pay.peerpesa.co',
        icons: [
          'https://pay.peerpesa.co/images/peerpesa-logo.png',
          'https://peerpesa.co/uploads/d736ef5a-1d0b-4873-9626-415d2c26a76c.png'
        ],
      },
    }),
    metaMask(),
    coinbaseWallet({
      appName: 'PeerPesa',
      appLogoUrl: 'https://pay.peerpesa.co/images/peerpesa-logo.png',
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
    [bsc.id]: http(),
    [blast.id]: http(),
    [avalanche.id]: http(),
    [celo.id]: http(),
    [zkSyncEra.id]: http(),
  },
})

// Export types for TypeScript
export type Config = typeof config
export type Chain = typeof chains[number]
