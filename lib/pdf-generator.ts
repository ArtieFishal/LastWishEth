import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { UserData, Asset, Beneficiary, Allocation } from '@/types'

// Helper function to fetch and embed image in PDF
async function fetchAndEmbedImage(pdfDoc: PDFDocument, imageUrl: string): Promise<any | null> {
  try {
    // Handle IPFS URLs
    let url = imageUrl
    if (imageUrl.startsWith('ipfs://')) {
      url = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/')
    } else if (imageUrl.startsWith('ipfs/')) {
      url = `https://ipfs.io/${imageUrl}`
    }
    
    // Fetch the image
    const response = await fetch(url, {
      headers: {
        'Accept': 'image/*',
      },
    })
    
    if (!response.ok) {
      console.warn(`Failed to fetch NFT image from ${url}: ${response.statusText}`)
      return null
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    // Try to embed as PNG first, then JPEG
    try {
      return await pdfDoc.embedPng(uint8Array)
    } catch {
      return await pdfDoc.embedJpg(uint8Array)
    }
  } catch (error) {
    console.warn(`Error embedding NFT image from ${imageUrl}:`, error)
    return null
  }
}

export async function generatePDF(
  userData: UserData, 
  assets: Asset[],
  walletProviders?: Record<string, string>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  let page = pdfDoc.addPage([612, 792]) // US Letter size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let yPosition = 750
  const margin = 50
  const lineHeight = 20
  const sectionSpacing = 30
  const minYPosition = 50 // Minimum Y position before creating new page
  
  // Document metadata
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  const docNumber = `DOC-${Date.now().toString().slice(-8)}`

  // Color scheme definitions
  const colors = {
    // Wallet colors (different color for each wallet)
    walletColors: [
      rgb(0.2, 0.4, 0.8),   // Blue
      rgb(0.8, 0.3, 0.2),   // Red/Orange
      rgb(0.2, 0.7, 0.4),   // Green
      rgb(0.7, 0.2, 0.7),   // Purple
      rgb(0.9, 0.6, 0.1),   // Gold
      rgb(0.1, 0.7, 0.8),   // Cyan
      rgb(0.8, 0.5, 0.1),   // Orange
      rgb(0.5, 0.2, 0.8),   // Violet
      rgb(0.2, 0.8, 0.6),   // Teal
      rgb(0.9, 0.3, 0.5),   // Pink
    ],
    // Asset type colors
    nft: rgb(0.8, 0.2, 0.6),        // Pink/Magenta for NFTs
    currency: rgb(0.2, 0.6, 0.3),   // Green for currencies
    native: rgb(0.3, 0.5, 0.9),     // Blue for native tokens
    // Section colors
    header: rgb(0.1, 0.2, 0.5),     // Dark blue for headers
    title: rgb(0.2, 0.3, 0.7),      // Medium blue for title
    warning: rgb(0.9, 0.5, 0.1),    // Orange for warnings
    success: rgb(0.1, 0.7, 0.3),    // Green for success
    beneficiary: rgb(0.6, 0.2, 0.7), // Purple for beneficiaries
    ens: rgb(0, 0.6, 0),             // Green for ENS names
    bitcoin: rgb(0.9, 0.6, 0.1),      // Gold/Orange for Bitcoin
  }

  // Helper function to add colored background box
  const addColoredBox = (x: number, y: number, width: number, height: number, color: any, opacity = 0.1) => {
    page.drawRectangle({
      x,
      y: y - height,
      width,
      height,
      color,
      opacity,
    })
  }

  // Helper function to sanitize text for PDF (remove unsupported characters)
  const sanitizeText = (text: string): string => {
    if (!text) return ''
    return String(text)
      .replace(/→/g, '->')
      .replace(/←/g, '<-')
      .replace(/—/g, '--')
      .replace(/–/g, '-')
      .replace(/"/g, '"')
      .replace(/"/g, '"')
      .replace(/'/g, "'")
      .replace(/'/g, "'")
      .replace(/…/g, '...')
      .split('')
      .map(char => {
        const code = char.charCodeAt(0)
        if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255)) {
          return char
        }
        if (char === '→') return '->'
        if (char === '←') return '<-'
        return ' '
      })
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Helper function to check if we need a new page
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition - requiredSpace < minYPosition) {
      page = pdfDoc.addPage([612, 792])
      yPosition = 750
      return true
    }
    return false
  }

  // Helper function to add text with word wrap and page breaks
  const addText = (
    text: string,
    x: number,
    y: number,
    size: number,
    isBold = false,
    color = rgb(0, 0, 0)
  ) => {
    const currentFont = isBold ? boldFont : font
    const sanitizedText = sanitizeText(text)
    const words = sanitizedText.split(' ')
    let line = ''
    let currentY = y

    for (const word of words) {
      const testLine = line + word + ' '
      const width = currentFont.widthOfTextAtSize(testLine, size)
      if (width > page.getWidth() - 2 * margin && line.length > 0) {
        // Check if we need new page before drawing line
        if (currentY - size < minYPosition) {
          page = pdfDoc.addPage([612, 792])
          currentY = 750
        }
        page.drawText(line, {
          x,
          y: currentY,
          size,
          font: currentFont,
          color,
        })
        line = word + ' '
        currentY -= size + 2
      } else {
        line = testLine
      }
    }
    if (line.length > 0) {
      // Check if we need new page before drawing last line
      if (currentY - size < minYPosition) {
        page = pdfDoc.addPage([612, 792])
        currentY = 750
      }
      page.drawText(line, {
        x,
        y: currentY,
        size,
        font: currentFont,
        color,
      })
    }
    return currentY - size - 2
  }

  // Title with colored background
  checkNewPage(60)
  addColoredBox(margin - 10, yPosition + 10, page.getWidth() - 2 * margin + 20, 50, colors.title, 0.15)
  yPosition = addText('CRYPTO ASSET INHERITANCE INSTRUCTIONS', margin, yPosition, 16, true, colors.title)
  yPosition -= sectionSpacing

  // Professional Legal Disclaimer
  checkNewPage(50)
  addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 45, colors.warning, 0.1)
  yPosition = addText('LEGAL DISCLAIMER AND IMPORTANT NOTICE', margin, yPosition, 12, true, colors.warning)
  yPosition -= lineHeight
  yPosition = addText(
    'This document is provided for informational purposes only and does not constitute legal, financial, or tax advice. The information contained herein is intended to assist the executor and beneficiaries in locating and accessing digital assets, but does not create any legal obligations or guarantees. The owner of these assets is solely responsible for ensuring the accuracy of the information provided. LastWish.eth is not a legal service provider, custodian, or executor of these instructions. Consult with qualified legal, financial, and tax professionals before taking any action based on this document. This document should be kept in a secure location and shared only with trusted parties.',
    margin,
    yPosition,
    9,
    false,
    rgb(0.3, 0.3, 0.3)
  )
  yPosition -= sectionSpacing

  // Owner Information with colored header
  checkNewPage(130)
  addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 25, colors.header, 0.1)
  yPosition = addText('OWNER INFORMATION', margin, yPosition, 14, true, colors.header)
  yPosition -= lineHeight
  yPosition = addText(`Full Legal Name: ${userData.ownerFullName || userData.ownerName}`, margin, yPosition, 12)
  yPosition -= lineHeight
  yPosition = addText(`Preferred Name: ${userData.ownerName}`, margin, yPosition, 12)
  yPosition -= lineHeight
  yPosition = addText(`Address: ${userData.ownerAddress}`, margin, yPosition, 12)
  yPosition -= lineHeight
  yPosition = addText(`City, State ZIP: ${userData.ownerCity}, ${userData.ownerState} ${userData.ownerZipCode}`, margin, yPosition, 12)
  yPosition -= lineHeight
  yPosition = addText(`Phone: ${userData.ownerPhone}`, margin, yPosition, 12)
  yPosition -= lineHeight
  addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 30, colors.header, 0.1)
  yPosition = addText('CONNECTED WALLETS & VERIFICATION STATUS', margin, yPosition, 14, true, colors.header)
  yPosition -= lineHeight
  yPosition = addText('All wallet addresses used in this document with signature verification status:', margin, yPosition, 10, false, rgb(0.3, 0.3, 0.3))
  yPosition -= lineHeight * 2
  
  // Show all EVM wallets with ENS names, addresses, and verification status - each wallet gets its own color!
  if (userData.connectedWallets.evm.length > 0) {
    userData.connectedWallets.evm.forEach((addr, index) => {
      checkNewPage(55)
      const ensName = userData.resolvedEnsNames?.[addr.toLowerCase()]
      const walletName = userData.walletNames?.[addr] || ensName
      const walletColor = colors.walletColors[index % colors.walletColors.length]
      
      // Add colored background for wallet section (more space for verification status)
      addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 45, walletColor, 0.12)
      
      yPosition = addText(`Wallet ${index + 1} (EVM) - VERIFIED`, margin, yPosition, 12, true, walletColor)
      yPosition -= lineHeight
      
      // Show verification badge with colored background
      addColoredBox(margin + 15, yPosition - 2, 100, 12, colors.success, 0.25)
      yPosition = addText('✓ Signature Verified', margin + 20, yPosition, 9, true, colors.success)
      yPosition -= lineHeight * 1.5
      
      // Always show the 0x address
      yPosition = addText(`   Address: ${addr}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
      yPosition -= lineHeight
      
      // Show ENS name if available
      if (ensName && ensName !== addr) {
        yPosition = addText(`   ENS Name: ${ensName}`, margin + 20, yPosition, 11, true, colors.ens)
        yPosition -= lineHeight
      } else if (walletName && walletName !== addr) {
        yPosition = addText(`   Name: ${walletName}`, margin + 20, yPosition, 10, false, rgb(0.4, 0.4, 0.4))
        yPosition -= lineHeight
      }
      
      yPosition -= lineHeight * 0.5
    })
  }
  
  // Show Bitcoin wallet if present - with Bitcoin gold color!
  if (userData.connectedWallets.btc) {
    checkNewPage(30)
    addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 25, colors.bitcoin, 0.08)
    yPosition = addText(`Bitcoin Wallet:`, margin, yPosition, 12, true, colors.bitcoin)
    yPosition -= lineHeight
    yPosition = addText(`   Address: ${userData.connectedWallets.btc}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
    yPosition -= lineHeight
  }
  yPosition -= sectionSpacing
  
  // Show all beneficiary wallets with ENS names prominently (after owner info) - simple, no colors
  const beneficiaryWallets = userData.beneficiaries.filter(b => b.walletAddress && b.walletAddress.startsWith('0x'))
  if (beneficiaryWallets.length > 0) {
    checkNewPage(70)
    addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 25, colors.header, 0.1)
    yPosition = addText('BENEFICIARY WALLETS (ENS)', margin, yPosition, 14, true, colors.header)
    yPosition -= lineHeight
    yPosition = addText('All beneficiary Ethereum wallet addresses with ENS names:', margin, yPosition, 10, false, rgb(0.3, 0.3, 0.3))
    yPosition -= lineHeight * 2
    beneficiaryWallets.forEach((ben) => {
      checkNewPage(35)
      if (ben.ensName) {
        yPosition = addText(`${ben.name}:`, margin, yPosition, 12, true, rgb(0.1, 0.1, 0.1))
        yPosition -= lineHeight
        yPosition = addText(`   ENS Name: ${ben.ensName}`, margin + 20, yPosition, 11, true, colors.ens)
        yPosition -= lineHeight
        yPosition = addText(`   Address: ${ben.walletAddress}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
      } else {
        yPosition = addText(`${ben.name}:`, margin, yPosition, 12, true, rgb(0.1, 0.1, 0.1))
        yPosition -= lineHeight
        yPosition = addText(`   Address: ${ben.walletAddress}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
      }
      yPosition -= lineHeight
    })
    yPosition -= sectionSpacing
  }

  // Executor with colored header
  checkNewPage(120)
  addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 25, colors.header, 0.1)
  yPosition = addText('EXECUTOR INFORMATION', margin, yPosition, 14, true, colors.header)
  yPosition -= lineHeight
  yPosition = addText(`Full Name: ${userData.executorName}`, margin, yPosition, 12, false, rgb(0.2, 0.2, 0.2))
  yPosition -= lineHeight
  
  // Show executor wallet with ENS name if available
  const executorEnsName = userData.resolvedEnsNames?.[userData.executorAddress.toLowerCase()]
  if (executorEnsName) {
    yPosition = addText(`ENS Name: ${executorEnsName}`, margin, yPosition, 12, true, colors.ens)
    yPosition -= lineHeight
    yPosition = addText(`Wallet Address: ${userData.executorAddress}`, margin, yPosition, 12, false, rgb(0.3, 0.3, 0.5))
  } else {
    yPosition = addText(`Wallet Address: ${userData.executorAddress}`, margin, yPosition, 12, false, rgb(0.3, 0.3, 0.5))
  }
  yPosition -= lineHeight
  yPosition = addText(`Phone: ${userData.executorPhone || 'Not provided'}`, margin, yPosition, 12, false, rgb(0.2, 0.2, 0.2))
  yPosition -= lineHeight
  yPosition = addText(`Email: ${userData.executorEmail || 'Not provided'}`, margin, yPosition, 12, false, rgb(0.2, 0.2, 0.2))
  if (userData.executorTwitter) {
    yPosition -= lineHeight
    yPosition = addText(`Twitter/X: ${userData.executorTwitter}`, margin, yPosition, 12, false, rgb(0.2, 0.2, 0.2))
  }
  if (userData.executorLinkedIn) {
    yPosition -= lineHeight
    yPosition = addText(`LinkedIn: ${userData.executorLinkedIn}`, margin, yPosition, 12, false, rgb(0.2, 0.2, 0.2))
  }
  yPosition -= sectionSpacing

  // Beneficiaries - Simple, no colors
  checkNewPage(70)
  addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 25, colors.header, 0.1)
  yPosition = addText('BENEFICIARIES', margin, yPosition, 14, true, colors.header)
  yPosition -= lineHeight
  userData.beneficiaries.forEach((ben, index) => {
    checkNewPage(50)
    yPosition = addText(`${index + 1}. ${ben.name}`, margin, yPosition, 12, true, rgb(0.1, 0.1, 0.1))
    yPosition -= lineHeight
    
    // Show ENS name prominently if available
    if (ben.ensName) {
      yPosition = addText(`   ENS Name: ${ben.ensName}`, margin + 20, yPosition, 11, true, colors.ens)
      yPosition -= lineHeight
      yPosition = addText(`   Wallet Address: ${ben.walletAddress}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
    } else {
      yPosition = addText(`   Wallet Address: ${ben.walletAddress}`, margin + 20, yPosition, 10, false, rgb(0.3, 0.3, 0.3))
    }
    yPosition -= lineHeight
  })
  yPosition -= sectionSpacing

  // EXECUTIVE SUMMARY: Clear allocation summary by wallet and chain
  checkNewPage(100)
  addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 30, colors.title, 0.15)
  yPosition = addText('EXECUTIVE SUMMARY: ASSET ALLOCATIONS BY WALLET & CHAIN', margin, yPosition, 14, true, colors.title)
  yPosition -= lineHeight * 2
  
  // Group assets by wallet address first, then by chain, preserving wallet provider info
  const walletGroups: Record<string, { chain: string; assets: Asset[]; provider?: string }[]> = {}
  
  assets.forEach((asset) => {
    // For Bitcoin assets, use walletAddress or contractAddress (which contains the Bitcoin address)
    let walletAddr = asset.walletAddress
    if (!walletAddr && asset.chain === 'bitcoin' && asset.contractAddress) {
      walletAddr = asset.contractAddress // Bitcoin address is stored in contractAddress
    }
    if (!walletAddr) {
      walletAddr = 'Unknown'
    }
    
    const provider = walletProviders?.[walletAddr] || asset.walletProvider || (asset.chain === 'bitcoin' ? 'Xverse' : 'Unknown Wallet')
    if (!walletGroups[walletAddr]) {
      walletGroups[walletAddr] = []
    }
    const chainGroup = walletGroups[walletAddr].find(g => g.chain === asset.chain)
    if (chainGroup) {
      chainGroup.assets.push(asset)
      // Update provider if not set
      if (!chainGroup.provider) {
        chainGroup.provider = provider
      }
    } else {
      walletGroups[walletAddr].push({ 
        chain: asset.chain, 
        assets: [asset],
        provider: provider
      })
    }
  })
  
  // Sort wallets by provider name, then by address
  const sortedWalletEntries = Object.entries(walletGroups).sort(([addrA, groupsA], [addrB, groupsB]) => {
    const providerA = groupsA[0]?.provider || ''
    const providerB = groupsB[0]?.provider || ''
    if (providerA !== providerB) {
      return providerA.localeCompare(providerB)
    }
    return addrA.localeCompare(addrB)
  })
  
  // Sort chains within each wallet
  sortedWalletEntries.forEach(([_, chainGroups]) => {
    chainGroups.sort((a, b) => a.chain.localeCompare(b.chain))
    // Sort assets within each chain
    chainGroups.forEach(group => {
      group.assets.sort((a, b) => {
        // Sort by symbol first, then by name
        if (a.symbol !== b.symbol) {
          return a.symbol.localeCompare(b.symbol)
        }
        return (a.name || '').localeCompare(b.name || '')
      })
    })
  })
  
  // Display summary organized by wallet -> chain -> asset -> beneficiary
  for (const [walletAddr, chainGroups] of sortedWalletEntries) {
    const walletIndex = sortedWalletEntries.findIndex(([addr]) => addr === walletAddr)
    const walletColor = colors.walletColors[walletIndex % colors.walletColors.length]
    const walletEnsName = userData.resolvedEnsNames?.[walletAddr.toLowerCase()] || userData.walletNames?.[walletAddr]
    const walletProvider = chainGroups[0]?.provider || 'Unknown Wallet'
    
    checkNewPage(60)
    addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 50, walletColor, 0.12)
    yPosition = addText(`WALLET ${walletIndex + 1}`, margin, yPosition, 13, true, walletColor)
    yPosition -= lineHeight
    yPosition = addText(`Wallet App: ${walletProvider}`, margin + 20, yPosition, 11, true, walletColor)
    yPosition -= lineHeight
    if (walletEnsName && walletEnsName !== walletAddr) {
      yPosition = addText(`ENS: ${walletEnsName}`, margin + 20, yPosition, 11, true, colors.ens)
      yPosition -= lineHeight
    }
    yPosition = addText(`Address: ${walletAddr}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
    yPosition -= lineHeight * 1.5
    
    for (const chainGroup of chainGroups) {
      const chainColor = colors.walletColors[walletGroups[walletAddr].indexOf(chainGroup) % colors.walletColors.length]
      checkNewPage(40)
      addColoredBox(margin + 15, yPosition + 3, page.getWidth() - 2 * margin - 30, 20, chainColor, 0.1)
      yPosition = addText(`  CHAIN: ${chainGroup.chain.toUpperCase()}`, margin + 20, yPosition, 11, true, chainColor)
      yPosition -= lineHeight
      
      for (const asset of chainGroup.assets) {
        const assetAllocations = userData.allocations.filter((a) => a.assetId === asset.id)
        if (assetAllocations.length === 0) continue
        
        // For NFTs, we need more space for the image
        const isNFT = asset.type === 'erc721' || asset.type === 'erc1155'
        checkNewPage(isNFT ? 100 : 30)
        
        // Determine asset color - NFTs are clearly marked as non-splittable
        let assetColor = colors.currency
        let assetBgColor = colors.currency
        if (isNFT) {
          assetColor = colors.nft
          assetBgColor = colors.nft
        } else if (asset.type === 'native') {
          assetColor = colors.native
          assetBgColor = colors.native
        }
        
        // Add colored background for asset
        addColoredBox(margin + 25, yPosition + 2, page.getWidth() - 2 * margin - 50, isNFT ? 90 : 25, assetBgColor, 0.08)
        
        // For NFTs, try to embed and display the image
        if (isNFT && asset.imageUrl) {
          try {
            const nftImage = await fetchAndEmbedImage(pdfDoc, asset.imageUrl)
            if (nftImage) {
              const imageSize = 60 // Size of the NFT image
              const imageX = margin + 30
              const imageY = yPosition - imageSize - 5
              
              // Draw the NFT image
              page.drawImage(nftImage, {
                x: imageX,
                y: imageY,
                width: imageSize,
                height: imageSize,
              })
              
              // Add text next to the image
              const textX = imageX + imageSize + 10
              yPosition = addText(
                `${asset.symbol} (${asset.name}) [NFT - NON-FUNGIBLE, CANNOT BE SPLIT]`,
                textX,
                yPosition,
                10,
                true,
                assetColor
              )
              yPosition -= lineHeight
              yPosition = addText(
                `Token ID: ${asset.tokenId || 'N/A'}`,
                textX,
                yPosition,
                9,
                false,
                rgb(0.3, 0.3, 0.3)
              )
              yPosition -= lineHeight
              yPosition = addText(
                `Contract: ${asset.contractAddress?.substring(0, 10)}...${asset.contractAddress?.substring(asset.contractAddress.length - 8)}`,
                textX,
                yPosition,
                8,
                false,
                rgb(0.4, 0.4, 0.4)
              )
              yPosition = imageY - 10 // Position below the image
            } else {
              // Image failed to load, show text only
              const assetTypeLabel = ' [NFT - NON-FUNGIBLE, CANNOT BE SPLIT]'
              yPosition = addText(
                `    ${asset.symbol} (${asset.name})${assetTypeLabel}`,
                margin + 30,
                yPosition,
                10,
                true,
                assetColor
              )
              yPosition -= lineHeight
              yPosition = addText(
                `    Token ID: ${asset.tokenId || 'N/A'}`,
                margin + 30,
                yPosition,
                9,
                false,
                rgb(0.3, 0.3, 0.3)
              )
              yPosition -= lineHeight
            }
          } catch (error) {
            console.warn('Error displaying NFT image:', error)
            // Fallback to text-only display
            const assetTypeLabel = ' [NFT - NON-FUNGIBLE, CANNOT BE SPLIT]'
            yPosition = addText(
              `    ${asset.symbol} (${asset.name})${assetTypeLabel}`,
              margin + 30,
              yPosition,
              10,
              true,
              assetColor
            )
            yPosition -= lineHeight
            yPosition = addText(
              `    Token ID: ${asset.tokenId || 'N/A'}`,
              margin + 30,
              yPosition,
              9,
              false,
              rgb(0.3, 0.3, 0.3)
            )
            yPosition -= lineHeight
          }
        } else {
          // Non-NFT asset or NFT without image
          const assetTypeLabel = isNFT ? ' [NFT - NON-FUNGIBLE, CANNOT BE SPLIT]' : ''
          yPosition = addText(
            `    ${asset.symbol} (${asset.name})${assetTypeLabel}`,
            margin + 30,
            yPosition,
            10,
            true,
            assetColor
          )
          yPosition -= lineHeight
          yPosition = addText(
            `    Balance: ${asset.balanceFormatted}`,
            margin + 30,
            yPosition,
            9,
            false,
            rgb(0.3, 0.3, 0.3)
          )
          yPosition -= lineHeight
        }
        
        // Show allocations - NFTs go to ONE beneficiary only
        assetAllocations.forEach((alloc) => {
          checkNewPage(15)
          const beneficiary = userData.beneficiaries.find((b) => b.id === alloc.beneficiaryId)
          const allocationText = isNFT
            ? `      -> ${beneficiary?.name} receives: ${asset.name}${asset.tokenId ? ` (Token ID: ${asset.tokenId})` : ''} [ENTIRE NFT]`
            : alloc.type === 'percentage'
            ? `      -> ${beneficiary?.name} receives: ${alloc.percentage}% (${alloc.percentage ? (parseFloat(asset.balance) * alloc.percentage / 100).toFixed(6) : '0'} ${asset.symbol})`
            : `      -> ${beneficiary?.name} receives: ${alloc.amount} ${asset.symbol}`
          yPosition = addText(allocationText, margin + 40, yPosition, 9, false, rgb(0.1, 0.1, 0.1))
          yPosition -= lineHeight
        })
        yPosition -= 3
      }
      yPosition -= lineHeight
    }
    yPosition -= sectionSpacing
  }
  yPosition -= sectionSpacing * 2

  // Detailed Asset Allocations (for reference)
  checkNewPage(70)
  addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 25, colors.header, 0.1)
  yPosition = addText('DETAILED ASSET ALLOCATIONS (BY CHAIN)', margin, yPosition, 14, true, colors.header)
  yPosition -= lineHeight

  // Group allocations by chain
  const chains = [...new Set(assets.map((a) => a.chain))]
  for (const chain of chains) {
    const chainAssets = assets.filter((a) => a.chain === chain)
    checkNewPage(50)
    const chainColor = colors.walletColors[chains.indexOf(chain) % colors.walletColors.length]
    addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 20, chainColor, 0.08)
    yPosition = addText(`Chain: ${chain.toUpperCase()}`, margin, yPosition, 12, true, chainColor)
    yPosition -= lineHeight

    for (const asset of chainAssets) {
      const assetAllocations = userData.allocations.filter((a) => a.assetId === asset.id)
      if (assetAllocations.length === 0) continue

      checkNewPage(35)
      
      // Determine asset color based on type - NFTs clearly marked
      let assetColor = colors.currency
      let assetBgColor = colors.currency
      const isNFT = asset.type === 'erc721' || asset.type === 'erc1155'
      if (isNFT) {
        assetColor = colors.nft
        assetBgColor = colors.nft
      } else if (asset.type === 'native') {
        assetColor = colors.native
        assetBgColor = colors.native
      }
      
      // Add colored background for asset
      addColoredBox(margin + 15, yPosition + 3, page.getWidth() - 2 * margin - 30, 30, assetBgColor, 0.06)
      
      // Show wallet address for this asset
      const walletAddr = asset.walletAddress || 'Unknown'
      const walletEnsName = userData.resolvedEnsNames?.[walletAddr.toLowerCase()] || userData.walletNames?.[walletAddr]
      const walletLabel = walletEnsName && walletEnsName !== walletAddr ? `${walletEnsName} (${walletAddr})` : walletAddr
      
      const assetTypeLabel = isNFT ? ' [NFT - NON-FUNGIBLE]' : ''
      yPosition = addText(
        `${asset.symbol} (${asset.name})${assetTypeLabel}`,
        margin + 20,
        yPosition,
        11,
        true,
        assetColor
      )
      yPosition -= lineHeight
      yPosition = addText(
        `From Wallet: ${walletLabel}`,
        margin + 20,
        yPosition,
        9,
        false,
        rgb(0.4, 0.4, 0.4)
      )
      yPosition -= lineHeight
      yPosition = addText(
        `Balance: ${asset.balanceFormatted}`,
        margin + 20,
        yPosition,
        9,
        false,
        rgb(0.3, 0.3, 0.3)
      )
      yPosition -= lineHeight

      assetAllocations.forEach((alloc) => {
        checkNewPage(15)
        const beneficiary = userData.beneficiaries.find((b) => b.id === alloc.beneficiaryId)
        const allocationText = isNFT
          ? `  -> ${beneficiary?.name} receives: ${asset.name}${asset.tokenId ? ` (Token ID: ${asset.tokenId})` : ''} [ENTIRE NFT - CANNOT BE SPLIT]`
          : alloc.type === 'percentage'
          ? `  -> ${beneficiary?.name}: ${alloc.percentage}%`
          : `  -> ${beneficiary?.name}: ${alloc.amount} ${asset.symbol}`
        yPosition = addText(allocationText, margin + 40, yPosition, 10, false, rgb(0.1, 0.1, 0.1))
        yPosition -= lineHeight
      })
      yPosition -= 5
    }
    yPosition -= sectionSpacing
  }

  // Key Access Instructions
  checkNewPage(100)
  yPosition = addText('INSTRUCTIONS FOR EXECUTOR', margin, yPosition, 14, true)
  yPosition -= lineHeight
  yPosition = addText(
    'The executor named above should already be aware of this document and know where to find it. The following instructions provide details for locating and accessing the crypto assets described in this document.',
    margin,
    yPosition,
    10,
    false,
    rgb(0.2, 0.2, 0.2)
  )
  yPosition -= lineHeight * 2
  
  // Split instructions into paragraphs if needed
  const instructions = userData.keyInstructions || 'No instructions provided.'
  const instructionParagraphs = instructions.split('\n').filter(p => p.trim())
  instructionParagraphs.forEach((paragraph) => {
    checkNewPage(30)
    yPosition = addText(paragraph.trim(), margin, yPosition, 11)
    yPosition -= lineHeight
  })
  yPosition -= sectionSpacing * 2

  // Professional Notary Section
  checkNewPage(250)
  addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 30, colors.header, 0.1)
  yPosition = addText('ACKNOWLEDGMENT AND NOTARIZATION', margin, yPosition, 14, true, colors.header)
  yPosition -= lineHeight * 2
  
  const state = userData.ownerState || 'STATE'
  const county = '_________________'
  yPosition = addText(`State of ${state}`, margin, yPosition, 12, true)
  yPosition -= lineHeight
  yPosition = addText(`County of ${county}`, margin, yPosition, 12)
  yPosition -= lineHeight * 2
  
  // Professional notary acknowledgment text
  const ownerName = userData.ownerFullName || userData.ownerName || 'the Owner'
  yPosition = addText(
    `On this _____ day of ___________, 20____, before me, a Notary Public in and for the State of ${state}, County of ${county}, personally appeared ${ownerName}, known to me (or proved to me on the basis of satisfactory evidence) to be the person whose name is subscribed to this instrument, and acknowledged that he/she/they executed the same as their free and voluntary act for the purposes therein contained.`,
    margin,
    yPosition,
    10,
    false,
    rgb(0.1, 0.1, 0.1)
  )
  yPosition -= lineHeight * 3
  
  yPosition = addText('WITNESS my hand and official seal.', margin, yPosition, 11, true)
  yPosition -= lineHeight * 4
  
  // Signature blocks with proper spacing
  yPosition = addText('OWNER ACKNOWLEDGMENT', margin, yPosition, 11, true, colors.header)
  yPosition -= lineHeight * 2
  yPosition = addText('Date: _________________', margin, yPosition, 11)
  yPosition -= lineHeight * 2
  yPosition = addText('Owner Signature: _________________', margin, yPosition, 11)
  yPosition -= lineHeight * 2
  yPosition = addText(`Printed Name: ${ownerName}`, margin, yPosition, 11)
  yPosition -= lineHeight * 3
  
  yPosition = addText('NOTARY PUBLIC ACKNOWLEDGMENT', margin, yPosition, 11, true, colors.header)
  yPosition -= lineHeight * 2
  yPosition = addText('Notary Public Signature: _________________', margin, yPosition, 11)
  yPosition -= lineHeight * 2
  yPosition = addText('Notary Printed Name: _________________', margin, yPosition, 11)
  yPosition -= lineHeight * 2
  yPosition = addText('Notary Commission Number: _________________', margin, yPosition, 11)
  yPosition -= lineHeight * 2
  yPosition = addText('Notary Commission Expires: _________________', margin, yPosition, 11)
  yPosition -= lineHeight * 3
  
  // Notary seal area
  addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 80, rgb(0.95, 0.95, 0.95), 0.3)
  yPosition = addText('NOTARY STAMP / SEAL AREA', margin, yPosition, 12, true, colors.header)
  yPosition -= lineHeight * 2
  yPosition = addText('(Place notary stamp or seal in this area)', margin, yPosition, 10, false, rgb(0.5, 0.5, 0.5))
  yPosition -= lineHeight * 3
  // Draw a box for the seal
  page.drawRectangle({
    x: margin,
    y: yPosition - 50,
    width: page.getWidth() - 2 * margin,
    height: 50,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 1,
  })
  yPosition -= 55

  // Professional Footer on last page
  const footerY = 30
  page.drawLine({
    start: { x: margin, y: footerY + 15 },
    end: { x: page.getWidth() - margin, y: footerY + 15 },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  })
  addText(
    `Document Number: ${docNumber} | Generated by LastWish.eth on ${currentDate}`,
    margin,
    footerY,
    8,
    false,
    rgb(0.5, 0.5, 0.5)
  )
  addText(
    'This document is informational only and does not constitute legal, financial, or tax advice.',
    margin,
    footerY - 12,
    7,
    false,
    rgb(0.5, 0.5, 0.5)
  )

  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}
