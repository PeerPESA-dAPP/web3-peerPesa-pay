

export const WALLETCONNECT_CONFIG = {
  projectId: "4dac0c42-240e-4a40-b80e-93b1b2dd14c6", // process.env.NEXT_PUBLIC_PROJECT_ID || "00ffe2d5154bc84a5a956d7a37a78a4a",
  metadata: {                       // DApp information shown in wallet
    name: "PeerPesa",
    description: "Move money across borders effortlessly straight to mobile wallets and bank accounts with our blockchain-powered technology.",
    url: "https://pay.peerpesa.co",
    icons: ["https://pay.peerpesa.co/images/peerpesa.png", "https://peerpesa.co/uploads/d736ef5a-1d0b-4873-9626-415d2c26a76c.png"],
  },
  chains: [
    1,        // Ethereum mainnet
    137,      // Polygon
    42161,    // Arbitrum One
    10,       // OP Mainnet
    8453,     // Base
    56,       // BNB Smart Chain
    81457,    // Blast
    43114,    // Avalanche
    42220,    // Celo
    324,      // zkSync Era
  ],
  rpcMap: {
    // Ethereum mainnet
    1: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/demo",
    
    // Polygon
    137: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com",
    
    // Arbitrum One
    42161: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
    
    // OP Mainnet
    10: process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
    
    // Base
    8453: process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org",
    
    // BNB Smart Chain
    56: process.env.NEXT_PUBLIC_BNB_RPC_URL || "https://bsc-dataseed.binance.org",
    
    // Blast
    81457: process.env.NEXT_PUBLIC_BLAST_RPC_URL || "https://rpc.blast.io",
    
    // Avalanche
    43114: process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
    
    // Celo mainnet
    42220: process.env.NEXT_PUBLIC_CELO_RPC_URL || "https://forno.celo.org",
    
    // zkSync Era
    324: process.env.NEXT_PUBLIC_ZKSYNC_RPC_URL || "https://mainnet.era.zksync.io",
  },
  logger: "debug", // Logging level: "debug" | "info" | "warn" | "error"
  qrcode: true, 
};

// Stellar Network Configuration (Custom implementation since WalletConnect doesn't natively support Stellar)
export const STELLAR_CONFIG = {
  network: process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet", // "testnet" or "mainnet"
  horizonUrl: process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL || 
    "https://horizon-testnet.stellar.org",
  mainnetHorizonUrl: "https://horizon.stellar.org",
  testnetHorizonUrl: "https://horizon-testnet.stellar.org",
};


// Get your own WalletConnect project ID from: https://cloud.walletconnect.com/
// Replace the demo project ID with your own for production use
