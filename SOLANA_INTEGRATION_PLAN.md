# Solana Blockchain Integration Plan

**Date:** January 2025  
**Status:** Planning  
**Priority:** High (Only known limitation)

---

## 🎯 Goal

Add full Solana blockchain support to LastWish.eth, allowing users to:
- Connect Solana wallets (Phantom, Solflare, etc.)
- Load Solana assets (SOL, SPL tokens, NFTs)
- Include Solana assets in inheritance plans
- Generate PDFs with Solana asset information

**Integration Point:** Within the existing "Connect Your Wallets" section, alongside EVM and Bitcoin options.

---

## 📋 Current State

### What Works
- ✅ Solana Name Service (.sol) name resolution (forward and reverse)
- ✅ Name resolution infrastructure already in place

### What Doesn't Work
- ❌ Solana wallet connection
- ❌ Solana asset loading (SOL, SPL tokens, NFTs)
- ❌ Solana portfolio API endpoint
- ❌ Solana assets in PDF generation

---

## 🏗️ Architecture Plan

### 1. Wallet Connection Integration

**Location:** `components/WalletConnect.tsx`  
**Approach:** Add Solana as a third tab alongside EVM and Bitcoin

**Current Structure:**
```
Tabs: [EVM] [Bitcoin]
```

**New Structure:**
```
Tabs: [EVM] [Bitcoin] [Solana]
```

**Implementation:**
- Add `'solana'` to `activeTab` state type
- Create Solana wallet connection component
- Integrate with existing `onEvmConnect` / `onBitcoinConnect` pattern
- Add `onSolanaConnect` callback

### 2. Solana Wallet Provider Setup

**Location:** `app/providers.tsx` or new `app/solana-provider.tsx`  
**Libraries Needed:**
- `@solana/web3.js` - Core Solana library
- `@solana/wallet-adapter-react` - React hooks
- `@solana/wallet-adapter-react-ui` - UI components
- `@solana/wallet-adapter-wallets` - Wallet adapters
- `@solana/wallet-adapter-phantom` - Phantom wallet
- `@solana/wallet-adapter-solflare` - Solflare wallet

**Provider Structure:**
```typescript
<ConnectionProvider endpoint={endpoint}>
  <WalletProvider wallets={wallets} autoConnect={false}>
    <WalletModalProvider>
      {children}
    </WalletModalProvider>
  </WalletProvider>
</ConnectionProvider>
```

### 3. Solana Portfolio API Endpoint

**Location:** `app/api/portfolio/solana/route.ts`  
**Functionality:**
- Fetch SOL balance
- Fetch SPL tokens
- Fetch Solana NFTs
- Return in same format as EVM/Bitcoin APIs

**API Options:**
1. **Helius API** (Recommended - if API key available)
   - Comprehensive asset fetching
   - NFT metadata included
   - Rate limits manageable

2. **Direct RPC** (Fallback)
   - Use Solana RPC endpoints
   - More complex, but no API key needed
   - May need multiple calls

3. **Hybrid Approach**
   - Try Helius first (if API key)
   - Fallback to RPC for basic balance
   - Best of both worlds

**Response Format:**
```typescript
{
  assets: Asset[],
  address: string,
  chain: 'solana'
}
```

### 4. State Management Updates

**Location:** `app/app/page.tsx`  
**Changes Needed:**

1. **Add Solana Address State:**
```typescript
const [connectedSolanaAddresses, setConnectedSolanaAddresses] = useState<Set<string>>(new Set())
```

2. **Update Wallet Type:**
```typescript
// In QueuedWalletSession type
walletType: 'evm' | 'btc' | 'solana'
```

3. **Update Asset Loading:**
- Add Solana case to `loadAssets` function
- Handle Solana wallet selection
- Include Solana in wallet limit checks

4. **Update Cleanup:**
- Include Solana addresses in `clearAllSensitiveData`
- Disconnect Solana wallets on cleanup

### 5. PDF Generation Updates

**Location:** `lib/pdf-generator.ts`  
**Changes Needed:**
- Add Solana chain to PDF display
- Handle Solana asset types (SOL, SPL tokens, NFTs)
- Include Solana wallet information
- Format Solana addresses correctly

### 6. Type Updates

**Location:** `types/index.ts`  
**Changes Needed:**

```typescript
// Asset type
chain: 'ethereum' | 'base' | 'arbitrum' | 'polygon' | 'bitcoin' | 'solana'
type: 'native' | 'erc20' | 'erc721' | 'erc1155' | 'btc' | 'ethscription' | 'ordinal' | 'spl-token' | 'solana-nft'

// QueuedWalletSession
walletType: 'evm' | 'btc' | 'solana'

// UserData
connectedWallets: {
  evm: string[]
  btc?: string
  solana?: string[]  // Add Solana addresses
}
```

---

## 📦 Dependencies to Add

```json
{
  "dependencies": {
    "@solana/web3.js": "^1.95.2",
    "@solana/wallet-adapter-base": "^0.9.23",
    "@solana/wallet-adapter-react": "^0.15.35",
    "@solana/wallet-adapter-react-ui": "^0.9.35",
    "@solana/wallet-adapter-wallets": "^0.19.32",
    "@solana/wallet-adapter-phantom": "^0.9.32",
    "@solana/wallet-adapter-solflare": "^0.6.32"
  }
}
```

**CSS Import Required:**
```typescript
require('@solana/wallet-adapter-react-ui/styles.css')
```

---

## 🔧 Implementation Steps

### Phase 1: Setup & Dependencies
1. ✅ Install Solana dependencies
2. ✅ Create Solana provider component
3. ✅ Add provider to app layout
4. ✅ Test basic wallet connection

### Phase 2: Wallet Connection UI
1. ✅ Add Solana tab to WalletConnect component
2. ✅ Create SolanaWalletConnect component
3. ✅ Integrate with existing callback pattern
4. ✅ Test wallet connection flow

### Phase 3: Asset Loading
1. ✅ Create Solana portfolio API endpoint
2. ✅ Implement SOL balance fetching
3. ✅ Implement SPL token fetching
4. ✅ Implement NFT fetching
5. ✅ Test asset loading

### Phase 4: Integration
1. ✅ Update main page state management
2. ✅ Add Solana to asset loading logic
3. ✅ Update wallet selection UI
4. ✅ Test full flow (connect → load → allocate)

### Phase 5: PDF Generation
1. ✅ Update PDF generator for Solana
2. ✅ Add Solana chain display
3. ✅ Format Solana assets correctly
4. ✅ Test PDF generation with Solana assets

### Phase 6: Testing & Cleanup
1. ✅ Test with multiple Solana wallets
2. ✅ Test with various asset types
3. ✅ Test cleanup after PDF generation
4. ✅ Update documentation

---

## 🎨 UI/UX Design

### Wallet Connection Section

**Current:**
```
[EVM Tab] [Bitcoin Tab]
```

**New:**
```
[EVM Tab] [Bitcoin Tab] [Solana Tab]
```

**Solana Tab Content:**
- WalletMultiButton (from @solana/wallet-adapter-react-ui)
- Detected wallets list (Phantom, Solflare)
- Manual address input (optional, for read-only)
- Connection status display

### Connected Wallets Display

**Current:**
- Shows EVM wallets
- Shows Bitcoin wallet

**New:**
- Shows EVM wallets
- Shows Bitcoin wallet
- Shows Solana wallets (with distinct styling/icon)

### Asset Loading

**Current:**
- "Load Assets from Selected Wallet" button
- Wallet selection dropdown

**New:**
- Same UI, but includes Solana wallets in selection
- Solana assets appear alongside EVM/Bitcoin assets

---

## 🔐 Security Considerations

### Wallet Verification

**Current:** EVM wallets require signature verification  
**Question:** Should Solana wallets require signature verification?

**Recommendation:** Yes, for consistency and security
- Use Solana's `signMessage` functionality
- Similar flow to EVM verification
- Prevents unauthorized access

### API Keys

**Helius API Key:**
- Store in environment variable
- Use for Solana asset fetching
- Rate limit management

**RPC Endpoints:**
- Use public RPC as fallback
- Consider rate limiting
- May need multiple endpoints for reliability

---

## 📊 Asset Types to Support

### 1. Native SOL
- Balance in SOL (not lamports in UI)
- Display with 9 decimal places
- USD value calculation

### 2. SPL Tokens
- Token name and symbol
- Balance with correct decimals
- Token mint address
- Optional: Token logo/image

### 3. Solana NFTs
- NFT name
- NFT image
- Collection information
- Mint address
- Cannot be split (like EVM NFTs)

---

## 🧪 Testing Plan

### Unit Tests
- Solana wallet connection
- Asset fetching logic
- State management updates

### Integration Tests
- Full flow: Connect → Load → Allocate → PDF
- Multiple wallet types (EVM + Bitcoin + Solana)
- Cleanup after PDF generation

### Manual Testing
- Connect Phantom wallet
- Connect Solflare wallet
- Load assets from Solana wallet
- Generate PDF with Solana assets
- Verify cleanup works

---

## 🚨 Potential Issues & Solutions

### Issue 1: Wallet Adapter Conflicts
**Problem:** Solana wallet adapter might conflict with wagmi  
**Solution:** Wrap providers correctly, ensure no global state conflicts

### Issue 2: RPC Rate Limits
**Problem:** Public Solana RPC endpoints have rate limits  
**Solution:** Use Helius API when available, implement rate limiting, use multiple RPC endpoints

### Issue 3: NFT Metadata
**Problem:** Solana NFTs may not have metadata readily available  
**Solution:** Use Helius API for metadata, fallback to basic info if unavailable

### Issue 4: SPL Token Decimals
**Problem:** Different SPL tokens have different decimal places  
**Solution:** Fetch decimals from token metadata, format accordingly

---

## 📝 Documentation Updates

### Files to Update:
1. `LASTWISH_SOURCE_OF_TRUTH.md` - Update supported chains
2. `README.md` - Add Solana to supported chains
3. `PROJECT_STATUS.md` - Update feature list
4. User guide - Add Solana wallet connection instructions

---

## ✅ Success Criteria

### Must Have:
- ✅ Connect Solana wallets (Phantom, Solflare)
- ✅ Load SOL balance
- ✅ Load SPL tokens
- ✅ Load Solana NFTs
- ✅ Include in PDF generation
- ✅ Work within existing UI flow
- ✅ Cleanup after PDF generation

### Nice to Have:
- Manual Solana address input (read-only)
- Support for more Solana wallets
- Token logos/images
- Collection information for NFTs

---

## 🎯 Timeline Estimate

**Phase 1-2 (Setup & UI):** 2-3 hours  
**Phase 3 (Asset Loading):** 3-4 hours  
**Phase 4 (Integration):** 2-3 hours  
**Phase 5 (PDF):** 1-2 hours  
**Phase 6 (Testing):** 2-3 hours  

**Total Estimate:** 10-15 hours

---

## 📚 Resources

### Documentation:
- [Solana Web3.js Docs](https://solana-labs.github.io/solana-web3.js/)
- [Wallet Adapter Docs](https://github.com/solana-labs/wallet-adapter)
- [Helius API Docs](https://docs.helius.dev/)

### Example Code:
- Wallet adapter examples
- RPC usage examples
- NFT fetching examples

---

**End of Plan**

*This plan will be updated as implementation progresses.*

