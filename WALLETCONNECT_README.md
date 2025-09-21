# PeerPesa Web3 Wallet Integration

This project includes WalletConnect v2 integration for connecting to various cryptocurrency wallets.

## Features

- **WalletConnect v2**: Connect to mobile wallets via QR code
- **MetaMask**: Browser extension wallet support
- **Multiple Wallet Support**: Ready for additional wallet integrations
- **Connection State Management**: Automatic connection checking and state persistence
- **Error Handling**: Comprehensive error handling for connection failures

## WalletConnect Setup

### 1. Get Your Project ID

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create a new project
3. Copy your project ID

### 2. Environment Variables

Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_ETHEREUM_RPC_URL=your_ethereum_rpc_url_here
```

### 3. Configuration

The WalletConnect configuration is in `lib/walletconnect-config.ts`. You can modify:

- Supported chains
- RPC endpoints
- Project settings

## How It Works

### Connection Flow

1. **Initialization**: WalletConnect provider is initialized on component mount
2. **Connection Check**: Automatically checks if already connected
3. **User Action**: User clicks "Connect Wallet" button
4. **Wallet Selection**: User chooses WalletConnect from the modal
5. **Connection**: 
   - If already connected, retrieves existing account
   - If not connected, initiates new connection via QR code
6. **State Update**: Updates UI with connected wallet information

### Key Functions

- `connectWalletConnect()`: Handles WalletConnect connection logic
- `disconnectWallet()`: Properly disconnects and cleans up
- `initializeWalletConnect()`: Sets up provider and event listeners

## Usage

```tsx
// The wallet interface automatically handles:
// - Connection state management
// - Error handling
// - UI updates
// - Event listeners for account/chain changes

// Users can:
// 1. Click "Connect Wallet"
// 2. Select WalletConnect
// 3. Scan QR code with mobile wallet
// 4. Approve connection
```

## Supported Wallets

- **WalletConnect v2**: All mobile wallets that support WalletConnect
- **MetaMask**: Browser extension
- **Stellar Wallet**: (Mock implementation ready)

## Error Handling

The implementation includes:

- Connection failure alerts
- Provider initialization errors
- Disconnection handling
- Network/chain change handling

## Security Notes

- Always use your own WalletConnect project ID in production
- Replace demo RPC URLs with your own endpoints
- Consider implementing additional security measures for production use
