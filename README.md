# peerPesa Web3 dApp

**peerPesa Web3** is a decentralized, cross-border payments application powered by blockchain and designed to connect **mobile money systems** (like M-Pesa, MTN MoMo) with **crypto networks** (e.g. Stellar, Celo, Ethereum). It allows users to securely **send**, **receive**, and **manage value** across borders with transparency and minimal friction.

---

## 🚀 Why peerPesa?

- 🌍 **Borderless Payments**: Facilitate seamless transfers across regions by bridging fiat (mobile money) with crypto.
- 🔐 **Secure & Decentralized**: Leveraging blockchain smart contracts for trustless value exchange.
- 📲 **Inclusive & Accessible**: Mobile-first design targeting unbanked and underbanked populations.
- 🎓 **Built-in Gamification**: Encourage saving and spending through task-reward mechanisms suitable for families or educational contexts.

---

## 🧭 Repository Structure

```plaintext
peerPesa-Web3/
│
├── src/                     # React (or Next.js) frontend for Web3 browser interface
│   ├── components/          # Reusable UI components
│   ├── pages/               # Views and routes
│   ├── hooks/               # Web3 / wallet integration helpers
│   └── styles/
│
├── contracts/               # Solidity/Vyper smart contracts (e.g., bridge, rewards)
│
├── scripts/                 # Deployment/testing scripts (Hardhat/Truffle)
│
├── backend/ (optional)      # (If present) Microservices for off-chain tasks/API
│
├── public/                  # Static assets
│
├── tests/                   # Unit & integration tests for frontend and smart contracts
│
└── README.md                # You are here!

⚙️ Core Features

🔗 Wallet Connect Support: Connect via MetaMask, WalletConnect, or other Web3 wallets.
💱 On‑Ramp / Off‑Ramp Flow: Convert between crypto and mobile money.
🛠️ Smart Contracts: Manage deposits, releases, and task-driven rewards.
📅 Task & Reward Tracking: Assign, complete, and reward tasks via blockchain.
🔔 Notifications & Activity Logs: Frontend notifications and on‑chain event tracking.

---

## 📲 Connecting to MiniPay

[MiniPay](https://www.opera.com/products/minipay) is a stablecoin-based wallet built into Opera Mini, designed for everyday payments on the **Celo** network. peerPesa supports MiniPay as a wallet option for users in Africa.

### How It Works

MiniPay injects a standard EIP-1193 provider into the browser context, so it behaves like any other injected EVM wallet (similar to MetaMask). When a user opens peerPesa inside the MiniPay in-app browser:

1. **Auto-detection** – The dApp detects the injected provider (`window.ethereum`) from MiniPay.
2. **Connect** – The user taps **Connect Wallet** and selects the injected wallet option. MiniPay will prompt for approval.
3. **Network** – MiniPay operates on **Celo Mainnet** (chain ID `42220`). The app already supports Celo, so no manual network switching is required.
4. **Transact** – Once connected, the user can send, receive, buy, and swap tokens (e.g. cUSD, USDT, USDC, CELO) through the standard transaction flows.

### Testing with MiniPay

1. Install [Opera Mini](https://play.google.com/store/apps/details?id=com.opera.mini.native) on an Android device and activate MiniPay.
2. Open the peerPesa dApp URL in the MiniPay in-app browser.
3. Connect the wallet – the MiniPay injected provider will appear automatically.
4. The connected account and Celo balances will display in the wallet interface.

---

## 📜 Celo & Stellar Asset Transfers

peerPesa facilitates cross-border asset transfers on both **Celo** (EVM) and **Stellar** networks.

### Celo (EVM)

Celo is fully EVM-compatible. The dApp supports direct ERC-20 token transfers (cUSD, USDT, USDC) and native CELO transfers, as well as escrow-based flows for off-ramp confirmation.

#### Supported Tokens on Celo

| Token | Contract Address |
|-------|-----------------|
| cUSD  | `0x765DE816845861e75A25fCA122bb6898B8B1282a` |
| cEUR  | `0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73` |
| USDC  | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` |
| USDT  | `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` |

### Stellar (Soroban)

Stellar uses [Soroban](https://soroban.stellar.org) for on-chain smart contracts. peerPesa handles XLM and Stellar-issued tokens (e.g. USDC via Circle).

#### Supported Assets on Stellar

| Asset | Issuer |
|-------|--------|
| XLM   | Native (no issuer) |
| USDC  | `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` (Circle) |

### Frontend Integration

- **Celo/EVM** – `viem` calls (`readContract`, `writeContract`) using the connected wallet provider. Token contract addresses are resolved from the API or the `KNOWN_TOKEN_CONTRACTS` map in the wallet interface.
- **Stellar** – The Horizon REST API (`https://horizon.stellar.org`) for balance queries, and Stellar SDK / Soroban client for submitting signed transactions via Freighter, Albedo, xBull, or Rabet wallets.


🔧 Getting Started

Prerequisites
Node.js (version 16+)
npm or Yarn
Hardhat or Truffle
Web3 wallet (MetaMask, WalletConnect)
(Optional) A backend runtime for off-chain logic

Installation & Run

# Clone repo
git clone https://github.com/PeerPESA-dAPP/peerPesa-Web3.git
cd peerPesa-Web3

# Install dependencies
npm install   # or yarn install

# Compile and deploy contracts to a testnet/local node
npx hardhat compile
npx hardhat run scripts/deploy.js --network [local|rinkeby|...]

# Start frontend dev server
npm run dev    # or yarn dev

Testing
Smart contracts: run npx hardhat test
Frontend: npm run test
🛠️ Deployment

Contracts: Deployed via scripts/deploy.js to desired networks.
Frontend: Can be deployed to Vercel, Netlify, or other web hosts.
🤝 Contributing

Welcome! Please follow:

Fork → Create topic branch (feature/..., fix/...)
Run tests locally before submitting a PR
Write clear commit messages and update docs if needed
📄 License

Distributed under the MIT License. See LICENSE for details.

📬 Stay Connected

🌐 Website: peerpesa.co
✉️ Email: support@peerpesa.co
📢 Twitter: @peerpesa


For more info refer to the link below;
https://github.com/PeerPESA-dAPP/web3-peerPesa-pay
