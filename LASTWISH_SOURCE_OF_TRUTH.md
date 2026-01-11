# LastWish.eth - Single Source of Truth Documentation

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Status:** Production-Ready MVP

---

## 📋 Table of Contents

1. [What LastWish IS](#what-lastwish-is)
2. [What LastWish IS NOT](#what-lastwish-is-not)
3. [Locked Decisions](#locked-decisions)
4. [Technical Boundaries](#technical-boundaries)
5. [Pricing & Limits](#pricing--limits)
6. [UX Rules](#ux-rules)
7. [Legal & Compliance](#legal--compliance)
8. [Current Features (What's Working)](#current-features-whats-working)
9. [Known Limitations](#known-limitations)

---

## What LastWish IS

### Core Identity
- **Stateless web application** for generating crypto inheritance instruction PDFs
- **Planning tool only** - creates printable, notarizable documents with instructions
- **No accounts, no private keys, no seed phrases stored**
- **Client-side processing** (except API key hiding and payment verification)
- **Privacy-first** - all data cleared after PDF generation

### Primary Function
Users connect crypto wallets, view holdings, allocate assets to beneficiaries, and generate a professional PDF document containing complete inheritance instructions.

### Target Users
- Crypto holders planning inheritance
- Estate planners working with crypto assets
- Families wanting to document crypto holdings
- Anyone needing a printable record of crypto asset distribution

---

## What LastWish IS NOT

### ❌ NOT a Custodian
- **Never holds user assets**
- **Never stores private keys or seed phrases**
- **Never has access to user funds**
- **Cannot move or transfer assets**

### ❌ NOT an Executor
- **Does not execute transfers**
- **Does not manage asset distribution**
- **Does not enforce allocations**
- **Only provides instructions in PDF format**

### ❌ NOT a Storage Service
- **No long-term data storage** (except during active session)
- **All data cleared after PDF generation**
- **No user accounts or persistent profiles**
- **No cloud backup of user data**

### ❌ NOT Legal or Financial Advice
- **Informational purposes only**
- **Not a legal service provider**
- **Not a financial advisor**
- **Users must consult qualified professionals**

### ❌ NOT a Key Management System
- **Never requests seed phrases**
- **Never requests private keys**
- **Never stores wallet credentials**
- **Uses wallet connection protocols only (WalletConnect, Xverse)**

### ❌ NOT a Multi-Signature Wallet
- **Does not create or manage multi-sig wallets**
- **Does not require multiple signatures**
- **Does not hold assets in escrow**

---

## Locked Decisions

### 🔒 Planning Only (No Execution)
**Decision:** LastWish only generates instructions, never executes transfers.  
**Date Locked:** January 2025  
**Rationale:** Reduces legal liability, keeps scope focused, maintains stateless architecture.  
**Cannot Change:** This is core to the product identity.

### 🔒 Percentage + Asset-Based Allocation
**Decision:** Support both percentage-based and amount-based allocation methods.  
**Date Locked:** January 2025  
**Rationale:** Provides flexibility for different asset types and user preferences.  
**Cannot Change:** Already implemented and tested.

### 🔒 US-First, Global Later
**Decision:** No international restrictions currently, but designed for US legal framework.  
**Date Locked:** January 2025  
**Rationale:** Simplifies initial launch, can expand later.  
**Can Change:** Future expansion possible.

### 🔒 Client-Side PDF Generation
**Decision:** PDF generation happens entirely in browser, no server processing.  
**Date Locked:** January 2025  
**Rationale:** Privacy, security, no server storage of sensitive data.  
**Cannot Change:** Core privacy principle.

### 🔒 Payment in Crypto Only
**Decision:** Payment accepted only in cryptocurrency (ETH on Ethereum mainnet).  
**Date Locked:** January 2025  
**Rationale:** Aligns with crypto-native audience, simplifies payment flow.  
**Can Change:** Could add fiat later, but not planned.

### 🔒 Privacy-First (Clear After PDF)
**Decision:** All sensitive data cleared immediately after PDF generation.  
**Date Locked:** January 2025  
**Rationale:** Critical for public computers, user privacy, legal protection.  
**Cannot Change:** Core privacy principle.

### 🔒 Stateless Architecture
**Decision:** No persistent user accounts, no database storage of user data.  
**Date Locked:** January 2025  
**Rationale:** Reduces attack surface, simplifies compliance, protects privacy.  
**Cannot Change:** Core architecture principle.

---

## Technical Boundaries

### Supported Blockchains
**Current Support:**
- ✅ Ethereum (Mainnet)
- ✅ Base
- ✅ Arbitrum
- ✅ Polygon
- ✅ Bitcoin

**NOT Supported:**
- ❌ Solana (name resolution only, no wallet connection or asset loading)
- ❌ Cosmos chains
- ❌ Cardano
- ❌ Other non-EVM chains (except Bitcoin)

**Note:** Solana Name Service (.sol) resolution works, but Solana wallet connection and asset loading are NOT implemented.

### Supported Wallet Types

**EVM Wallets:**
- ✅ WalletConnect (QR code - works with all WalletConnect-compatible wallets)
  - MetaMask
  - Rainbow
  - Coinbase Wallet
  - Trust Wallet
  - Ledger
  - Any WalletConnect-compatible wallet

**Bitcoin Wallets:**
- ✅ Xverse (browser extension)
- ✅ Manual address input
- ⚠️ OKX (detected but may have issues)
- ⚠️ Blockchain.com (detected but may have issues)

**NOT Supported:**
- ❌ Solana wallets (Phantom, Solflare, etc.)
- ❌ Hardware wallets (except via WalletConnect)
- ❌ Direct wallet file imports

### Supported Asset Types

**EVM Chains:**
- ✅ Native tokens (ETH, BASE, etc.)
- ✅ ERC-20 tokens
- ✅ ERC-721 NFTs (with images)
- ✅ ERC-1155 NFTs (with images)
- ✅ Ethscriptions (digital artifacts on Ethereum)

**Bitcoin:**
- ✅ Native Bitcoin (BTC)
- ✅ SATs (including rare SATs detection)
- ✅ Ordinals (inscriptions with images)

**NOT Supported:**
- ❌ Solana assets (SOL, SPL tokens, Solana NFTs)
- ❌ Cosmos assets
- ❌ Other non-EVM assets

### API Dependencies

**Current:**
- ✅ Moralis API (for EVM asset fetching)
- ✅ Blockstream API (for Bitcoin balance)
- ✅ Multiple Ordinal APIs (for Bitcoin ordinals)
- ✅ Etherscan API (for payment verification)
- ✅ Ethereum RPC (for ENS resolution and payment verification)

**Rate Limits:**
- EVM Portfolio: 30 requests per minute per IP
- Bitcoin Portfolio: Rate limited per API
- Payment Verification: Uses Etherscan rate limits

### Technical Stack

**Frontend:**
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS

**Wallet Integration:**
- wagmi v3 (EVM wallets)
- viem (Ethereum utilities)
- WalletConnect (EVM wallet connections)
- Xverse (Bitcoin wallet)

**PDF Generation:**
- pdf-lib (client-side)

**Deployment:**
- Netlify (static export compatible with IPFS)

---

## Pricing & Limits

### Pricing Tiers

**Free Tier:**
- Price: $0
- Max Wallets: 1
- Max Beneficiaries: 2
- Features: Full Color PDF
- Updates: No
- Support: Standard

**Standard Tier:**
- Price: $20.26 (special until Feb 1, 2026) / $42.00 (regular)
- Max Wallets: 20
- Max Beneficiaries: 10
- Features: Full Color PDF
- Updates: No
- Support: Standard

**Premium Tier:**
- Price: $99.00
- Max Wallets: Unlimited
- Max Beneficiaries: Unlimited
- Features: Full Color PDF, Priority Support, PDF Updates (2 years)
- Updates: Yes (2 years)
- Support: Priority

### Hard Limits

**System-Wide:**
- Maximum 20 wallets total (Free: 1, Standard: 20, Premium: unlimited)
- Maximum 10 beneficiaries (Free: 2, Standard: 10, Premium: unlimited)
- WalletConnect session management: Auto-disconnects previous session

**Enforcement:**
- Tier limits enforced at payment step
- Cannot proceed if limits exceeded
- Discount codes can bypass tier limits (gives premium access)

### Payment Details

**Payment Method:**
- Cryptocurrency only (ETH on Ethereum mainnet)
- Payment address: `0x016ae25Ac494B123C40EDb2418d9b1FC2d62279b` (lastwish.eth)
- Payment verification: On-chain via Etherscan API + RPC fallback

**Discount Codes:**
- Private codes available (not exposed in UI)
- 100% discount option for testing/friends
- Applied at payment step

**Payment State:**
- Resets after PDF generation
- Requires new payment for additional downloads
- Free tier skips payment

---

## UX Rules

### Navigation Flow

**Step 1: Connect**
- User connects wallets (EVM via WalletConnect, Bitcoin via Xverse/Manual)
- Can connect multiple wallets incrementally
- Wallet ownership verification required (signature)
- Can name wallets (custom or auto-resolved ENS)

**Step 2: Assets**
- View all assets from connected wallets
- Select assets to include in inheritance plan
- Spam token filtering (enabled by default)
- Can load assets from selected wallet or all wallets

**Step 3: Allocate**
- Add beneficiaries (up to tier limit)
- Allocate assets by percentage or amount
- Real-time validation prevents over-allocation
- NFTs cannot be split (full allocation only)

**Step 4: Details**
- Enter owner information
- Enter executor information
- Add key access instructions
- ENS resolution for addresses

**Step 5: Payment**
- Select pricing tier
- Make payment (or use discount code)
- Payment verification required

**Step 6: Download**
- Generate PDF
- Automatic print dialog
- All data cleared after generation
- Returns to Step 1 (connect)

### Navigation Rules

**Free Navigation:**
- Steps 1-4: Can navigate freely back and forth
- Step 5: Requires payment to proceed
- Step 6: Only accessible after payment verification

**Validation:**
- Real-time validation on all forms
- Clear error messages
- Cannot proceed with invalid data

### Error Handling

**User-Friendly Errors:**
- Clear, actionable error messages
- No technical jargon
- Guidance on how to fix issues

**Silent Failures:**
- Name resolution failures (don't block flow)
- Optional API failures (ethscriptions, ordinals)

### Mobile Support

**Full Feature Parity:**
- All features work on mobile
- Responsive design
- Touch-optimized controls
- Mobile-friendly wallet connections

---

## Legal & Compliance

### Disclaimers

**PDF Disclaimer (included in every PDF):**
> "This document is provided for informational purposes only and does not constitute legal, financial, or tax advice. The information contained herein is intended to assist the executor and beneficiaries in locating and accessing digital assets, but does not create any legal obligations or guarantees. The owner of these assets is solely responsible for ensuring the accuracy of the information provided. LastWishCrypto is not a legal service provider, custodian, or executor of these instructions. Consult with qualified legal, financial, and tax professionals before taking any action based on this document."

### Terms of Service

**Current Status:** Not implemented  
**Future:** Should be added

### Privacy Policy

**Current Status:** Not implemented  
**Future:** Should be added

### Jurisdiction

**Current:** US-focused (not explicitly restricted)  
**Future:** May need jurisdiction-specific disclaimers

### Data Handling

**What We Store:**
- Nothing (stateless by design)
- Temporary session data (cleared after PDF generation)
- Payment verification (on-chain, public)

**What We Don't Store:**
- Private keys
- Seed phrases
- Wallet addresses (after session ends)
- Asset information (after session ends)
- Personal information (after session ends)

---

## Current Features (What's Working)

### ✅ Wallet Connection
- EVM wallets via WalletConnect (QR code)
- Bitcoin wallets via Xverse extension
- Manual Bitcoin address input
- Wallet ownership verification (signature)
- Multiple wallet support (up to tier limit)
- Wallet naming (custom or ENS)

### ✅ Asset Loading
- EVM assets (native, ERC-20, NFTs, Ethscriptions)
- Bitcoin assets (BTC, SATs, Ordinals)
- Multi-chain support (Ethereum, Base, Arbitrum, Polygon, Bitcoin)
- Spam token filtering
- Asset images (NFTs, Ordinals)

### ✅ Name Resolution
- ENS (.eth, .base.eth, .farcaster.eth)
- Solana Name Service (.sol) - **NAME RESOLUTION ONLY**
- Unstoppable Domains (.crypto, .nft, .wallet, etc.)
- Space ID (.arb, .bnb)
- Lens Protocol (.lens)
- Forward and reverse resolution

### ✅ Asset Management
- Multi-select asset selection
- Asset grouping and sorting
- Filtering (spam tokens)
- Asset images display

### ✅ Beneficiary Management
- Add/remove beneficiaries
- Up to tier limit
- Optional contact information
- ENS resolution for addresses

### ✅ Asset Allocation
- Percentage-based allocation
- Amount-based allocation
- NFT vs fungible differentiation
- Over-allocation prevention
- Auto-reallocation on beneficiary removal
- Inline editing

### ✅ Payment System
- Tiered pricing
- Dynamic pricing (special offers)
- Discount codes
- On-chain payment verification
- Payment state management

### ✅ PDF Generation
- Client-side generation
- Full-color PDF
- Professional formatting
- Title page
- Table of contents
- Page numbers
- All required sections
- NFT/Ordinal images embedded
- Automatic print dialog

### ✅ Privacy & Security
- All data cleared after PDF generation
- No persistent storage
- Wallet verification required
- Client-side processing
- No private key collection

---

## Known Limitations

### ❌ Solana Blockchain Support
**Status:** NOT SUPPORTED  
**What Works:** Solana Name Service (.sol) name resolution  
**What Doesn't Work:**
- Solana wallet connection
- Solana asset loading (SOL, SPL tokens, NFTs)
- Solana portfolio API endpoint

**Impact:** Users cannot include Solana assets in inheritance plans.

**Note:** This is the ONLY known limitation found during documentation review.

### ⚠️ Bitcoin Wallet Detection
**Status:** Partial  
**What Works:** Xverse, Manual input  
**What May Have Issues:** OKX, Blockchain.com (detected but connection may fail)

### ⚠️ API Rate Limits
**Status:** Managed  
**Impact:** High-frequency users may hit rate limits
**Mitigation:** Rate limiting implemented, clear error messages

### ⚠️ Ordinal Image Loading
**Status:** Works with fallbacks  
**Impact:** Some ordinal images may not load (uses multiple API sources)

---

## Decision Log

### 2025-01 - Privacy Cleanup After PDF
**Decision:** Clear all sensitive data immediately after PDF generation  
**Rationale:** Critical for public computers, user privacy  
**Status:** ✅ Implemented

### 2025-01 - Immediate Step Reset
**Decision:** Reset to connect step immediately after PDF generation  
**Rationale:** User should see fresh start, not payment screen  
**Status:** ✅ Implemented

### 2025-01 - Wallet Persistence
**Decision:** Allow wallets to persist during session (don't auto-clear on load)  
**Rationale:** Better UX, users can refresh without losing progress  
**Status:** ✅ Implemented

---

## Future Considerations

### Potential Additions (Not Planned)
- Solana blockchain support (identified as needed)
- Additional blockchain support
- Fiat payment options
- Terms of Service page
- Privacy Policy page
- Multi-language support

### Not Under Consideration
- Custody services
- Execution services
- Account system
- Cloud storage
- Multi-signature wallet creation

---

**End of Document**

*This document is the single source of truth for LastWish.eth scope, boundaries, and decisions. Update this document when making significant changes or decisions.*

