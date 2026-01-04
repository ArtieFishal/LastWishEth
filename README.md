# LastWish - Crypto Inheritance Instructions

A stateless web application that allows users to connect crypto wallets, view holdings across supported chains, allocate assets to beneficiaries, and generate a printable, notarizable document with instructions for accessing and distributing crypto assets.

## Features

- **Multi-chain Support**: Ethereum, Base, Arbitrum, Polygon, and Bitcoin
- **Wallet Connections**: EVM wallets via WalletConnect, Bitcoin via Xverse
- **Asset Inventory**: Automatically loads and displays all assets across connected wallets
  - Native tokens (ETH, BTC, etc.)
  - ERC-20 tokens
  - NFTs (ERC-721, ERC-1155)
  - **Ethscriptions** (digital artifacts on Ethereum)
  - Bitcoin assets (including SATs)
- **Beneficiary Management**: Add up to 10 beneficiaries with wallet addresses
- **Asset Allocation**: Allocate assets by percentage or amount with real-time validation
- **Payment Gating**: $42 crypto payment required to unlock PDF generation
- **PDF Generation**: Client-side PDF generation with all required sections
- **Stateless**: No accounts, no private keys stored, no persistent data

## Setup

### Prerequisites

- Node.js 16+
- npm or yarn
- Moralis API key (for asset fetching)
- WalletConnect Project ID (for wallet connections)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd lastwisheth
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Edit `.env.local` with your values:
```env
MORALIS_API_KEY=your_moralis_api_key_here
PAYMENT_RECEIVER_ADDRESS=lastwish.eth
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

### Getting API Keys

- **Moralis API Key**: Sign up at [Moralis](https://moralis.io) and get your API key from the dashboard
- **WalletConnect Project ID**: 
  1. Go to [Reown Cloud](https://cloud.reown.com)
  2. Create a new project
  3. Copy your Project ID

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## User Flow

1. **Connect Wallets**: Connect EVM wallets via WalletConnect and/or Bitcoin wallet via Xverse
2. **Review Assets**: View all assets across connected wallets (tokens, NFTs, ethscriptions, Bitcoin)
3. **Allocate Assets**: 
   - Add beneficiaries (up to 10)
   - Allocate assets by percentage or amount
   - Real-time validation prevents over-allocation
4. **Enter Details**: 
   - Owner name
   - Executor name and wallet address
   - Key access instructions
5. **Payment**: Pay $42 in crypto (USDC on Base recommended)
6. **Download PDF**: Generate and download the printable document

## Architecture

- **Frontend**: Next.js 16 with App Router, React, TypeScript
- **Wallet Integration**: wagmi v3, viem
- **PDF Generation**: pdf-lib (client-side)
- **API Routes**: Next.js API routes for portfolio fetching and payment verification
- **Styling**: Tailwind CSS

## Supported Chains

- Ethereum (Mainnet)
- Base
- Arbitrum
- Polygon
- Bitcoin

## Security

- No private keys or seed phrases collected
- No persistent user data storage
- All operations are client-side
- Payment verification happens on-chain
- PDF generation is client-side only

## Important Notes

- This is a backup plan tool, not an executor or custodian
- The generated document is for informational purposes only
- Consult with legal and financial professionals before relying on these instructions
- Refreshing the page clears all data (by design - stateless)

## Development

### Project Structure

```
lastwisheth/
├── app/
│   ├── api/              # API routes
│   ├── page.tsx          # Main application page
│   ├── layout.tsx        # Root layout
│   └── providers.tsx     # Wagmi providers
├── components/           # React components
├── lib/                  # Utilities and configurations
├── types/                # TypeScript type definitions
└── public/               # Static assets
```

### Building for Production

```bash
npm run build
npm start
```

## License

[Your License Here]

## Support

For issues or questions, please open an issue on GitHub.
