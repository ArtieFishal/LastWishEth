import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { Asset } from '@/types'

// Reuse the image embedding function from the main PDF generator
async function fetchAndEmbedImage(pdfDoc: PDFDocument, imageUrl: string): Promise<any | null> {
  try {
    // Handle IPFS URLs
    let url = imageUrl
    if (imageUrl.startsWith('ipfs://')) {
      url = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/')
    } else if (imageUrl.startsWith('ipfs/')) {
      url = `https://ipfs.io/${imageUrl}`
    }
    
    // Handle ordinal proxy URLs
    if (url.includes('/api/ordinal-image')) {
      try {
        // Convert relative URL to absolute if needed
        let fullUrl = url
        if (url.startsWith('/')) {
          // In browser context, use window.location.origin
          if (typeof window !== 'undefined') {
            fullUrl = `${window.location.origin}${url}`
          } else {
            // Fallback for server-side (shouldn't happen in PDF generation)
            fullUrl = `http://localhost:3000${url}`
          }
        }
        
        const urlObj = new URL(fullUrl)
        const inscriptionId = urlObj.searchParams.get('id')
        if (inscriptionId) {
          // Try our proxy API first (it handles CORS and multiple sources)
          try {
            const proxyResponse = await fetch(fullUrl, {
              headers: { 'Accept': 'image/*' },
              signal: AbortSignal.timeout(10000),
            })
            if (proxyResponse.ok) {
              const contentType = proxyResponse.headers.get('content-type') || ''
              if (contentType.startsWith('image/')) {
                // Proxy worked, use it
                url = fullUrl
              } else {
                // Proxy returned non-image, try direct sources
                throw new Error('Proxy returned non-image')
              }
            } else {
              throw new Error('Proxy failed')
            }
          } catch {
            // Proxy failed, try direct sources
            console.log(`[PDF] Proxy failed for ordinal ${inscriptionId}, trying direct sources...`)
            const ordinalSources = [
              `https://ord.io/preview/${inscriptionId}`,
              `https://ord.io/content/${inscriptionId}`,
              `https://api.hiro.so/ordinals/v1/inscriptions/${inscriptionId}/content`,
              `https://ordinals.com/content/${inscriptionId}`,
            ]
            for (const sourceUrl of ordinalSources) {
              try {
                const testResponse = await fetch(sourceUrl, {
                  headers: { 'Accept': 'image/*' },
                  signal: AbortSignal.timeout(5000),
                })
                if (testResponse.ok) {
                  const contentType = testResponse.headers.get('content-type') || ''
                  if (contentType.startsWith('image/')) {
                    url = sourceUrl
                    break
                  }
                }
              } catch {
                continue
              }
            }
          }
        }
      } catch (error) {
        console.warn(`[PDF] Error handling ordinal proxy URL ${url}:`, error)
        // If parsing fails, try to convert relative to absolute and use as-is
        if (url.startsWith('/') && typeof window !== 'undefined') {
          url = `${window.location.origin}${url}`
        }
      }
    }
    
    // Fetch the image
    const response = await fetch(url, {
      headers: {
        'Accept': 'image/*',
      },
      signal: AbortSignal.timeout(10000),
    })
    
    if (!response.ok) {
      console.warn(`Failed to fetch NFT image from ${url}: ${response.statusText}`)
      return null
    }
    
    const contentType = response.headers.get('content-type') || ''
    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    // Handle different image formats
    if (contentType.includes('image/png')) {
      return await pdfDoc.embedPng(uint8Array)
    } else if (contentType.includes('image/jpeg') || contentType.includes('image/jpg')) {
      return await pdfDoc.embedJpg(uint8Array)
    } else if (contentType.includes('image/gif')) {
      try {
        return await pdfDoc.embedPng(uint8Array)
      } catch {
        try {
          return await pdfDoc.embedJpg(uint8Array)
        } catch {
          console.warn('GIF conversion failed, skipping GIF image in PDF')
          return null
        }
      }
    } else if (contentType.includes('image/webp')) {
      try {
        return await pdfDoc.embedPng(uint8Array)
      } catch {
        try {
          return await pdfDoc.embedJpg(uint8Array)
        } catch {
          console.warn('WebP image format not supported, skipping')
          return null
        }
      }
    } else {
      try {
        return await pdfDoc.embedPng(uint8Array)
      } catch {
        try {
          return await pdfDoc.embedJpg(uint8Array)
        } catch {
          console.warn(`Unsupported image format: ${contentType}`)
          return null
        }
      }
    }
  } catch (error) {
    console.warn(`Error embedding NFT image from ${imageUrl}:`, error)
    return null
  }
}

export interface InventoryData {
  ownerName?: string
  connectedWallets: {
    evm: string[]
    btc?: string
    solana?: string[]
  }
  walletNames?: Record<string, string>
  resolvedEnsNames?: Record<string, string>
  walletProviders?: Record<string, string>
}

export async function generateInventoryPDF(
  inventoryData: InventoryData,
  assets: Asset[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pages: any[] = []
  let currentPageNumber = 0

  let page = pdfDoc.addPage([612, 792]) // US Letter size
  pages.push(page)
  currentPageNumber++

  let yPosition = 750
  const margin = 50
  const lineHeight = 20
  const sectionSpacing = 30
  const minYPosition = 50

  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  // Color scheme
  const colors = {
    header: rgb(0.2, 0.3, 0.7),
    title: rgb(0.1, 0.2, 0.5),
    wallet: rgb(0.3, 0.5, 0.9),
    nft: rgb(0.8, 0.2, 0.6),
    currency: rgb(0.2, 0.6, 0.3),
    bitcoin: rgb(0.9, 0.6, 0.1),
    border: rgb(0.7, 0.7, 0.7),
  }

  // Helper function to sanitize text
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
        return ' '
      })
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Helper to check if we need a new page
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition - requiredSpace < minYPosition) {
      page = pdfDoc.addPage([612, 792])
      pages.push(page)
      currentPageNumber++
      yPosition = 750
      addPageNumber(currentPageNumber)
      return true
    }
    return false
  }

  // Helper to add page number
  const addPageNumber = (pageNum: number) => {
    const footerY = 30
    const totalPages = pages.length
    page.drawLine({
      start: { x: margin, y: footerY + 10 },
      end: { x: page.getWidth() - margin, y: footerY + 10 },
      thickness: 0.5,
      color: colors.border,
    })
    const footerText = `Page ${pageNum} of ${totalPages} | Crypto Asset Inventory | Generated on ${currentDate}`
    page.drawText(footerText, {
      x: margin,
      y: footerY - 5,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    })
  }

  // Helper to add text with word wrap
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
        if (currentY - size < minYPosition) {
          page = pdfDoc.addPage([612, 792])
          pages.push(page)
          currentPageNumber++
          addPageNumber(currentPageNumber)
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
      if (currentY - size < minYPosition) {
        page = pdfDoc.addPage([612, 792])
        pages.push(page)
        currentPageNumber++
        addPageNumber(currentPageNumber)
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

  // Helper to center text
  const addCenteredText = (
    text: string,
    y: number,
    size: number,
    isBold = false,
    color = rgb(0, 0, 0)
  ) => {
    const currentFont = isBold ? boldFont : font
    const textWidth = currentFont.widthOfTextAtSize(text, size)
    const x = (page.getWidth() - textWidth) / 2
    page.drawText(text, {
      x,
      y,
      size,
      font: currentFont,
      color,
    })
    return y - size - 2
  }

  // ============================================
  // TITLE PAGE
  // ============================================
  page = pages[0]
  yPosition = 750

  // Decorative top border
  page.drawRectangle({
    x: margin - 10,
    y: yPosition + 20,
    width: page.getWidth() - 2 * margin + 20,
    height: 6,
    color: colors.title,
  })
  yPosition -= 50

  // Main Title
  yPosition = addCenteredText('CRYPTO ASSET INVENTORY', yPosition, 32, true, colors.title)
  yPosition -= 40

  // Decorative line
  page.drawLine({
    start: { x: margin + 50, y: yPosition },
    end: { x: page.getWidth() - margin - 50, y: yPosition },
    thickness: 2,
    color: colors.title,
  })
  yPosition -= 50

  // Owner Name (if provided)
  if (inventoryData.ownerName) {
    yPosition = addCenteredText(inventoryData.ownerName, yPosition, 20, true, rgb(0.2, 0.2, 0.2))
    yPosition -= 50
  }

  // Document details
  const detailY = yPosition - 100
  let detailStartY = detailY - 20
  detailStartY = addText('Date Generated:', margin + 50, detailStartY, 11, false, rgb(0.4, 0.4, 0.4))
  detailStartY = addText(currentDate, margin + 50, detailStartY, 11, true, rgb(0.1, 0.1, 0.1))
  detailStartY -= lineHeight * 1.5

  detailStartY = addText('Total Assets:', margin + 50, detailStartY, 11, false, rgb(0.4, 0.4, 0.4))
  detailStartY = addText(`${assets.length} asset${assets.length !== 1 ? 's' : ''}`, margin + 50, detailStartY, 11, true, rgb(0.1, 0.1, 0.1))
  detailStartY -= lineHeight * 1.5

  const totalWallets = inventoryData.connectedWallets.evm.length + 
    (inventoryData.connectedWallets.btc ? 1 : 0) + 
    (inventoryData.connectedWallets.solana?.length || 0)
  detailStartY = addText('Connected Wallets:', margin + 50, detailStartY, 11, false, rgb(0.4, 0.4, 0.4))
  detailStartY = addText(`${totalWallets}`, margin + 50, detailStartY, 11, true, rgb(0.1, 0.1, 0.1))

  yPosition = detailY - 100

  // Notice
  const noticeY = yPosition - 50
  let noticeTextY = noticeY
  noticeTextY = addText('PERSONAL INVENTORY DOCUMENT', margin, noticeTextY, 13, true, rgb(0.1, 0.1, 0.1))
  noticeTextY -= lineHeight
  noticeTextY = addText(
    'This document contains a personal inventory of your cryptocurrency assets. Use the blank sections to write in seed phrases, private keys, and passwords by hand. Keep this document secure.',
    margin,
    noticeTextY,
    10,
    false,
    rgb(0.3, 0.3, 0.3)
  )

  yPosition = noticeY - 60
  addPageNumber(1)

  // ============================================
  // WALLET INFORMATION
  // ============================================
  page = pdfDoc.addPage([612, 792])
  pages.push(page)
  currentPageNumber++
  yPosition = 750

  yPosition = addText('CONNECTED WALLETS', margin, yPosition, 18, true, colors.header)
  yPosition -= lineHeight * 2

  // EVM Wallets
  const uniqueEVMAddresses = Array.from(new Set(
    inventoryData.connectedWallets.evm.map(addr => addr.toLowerCase())
  )).map(addr => {
    return inventoryData.connectedWallets.evm.find(a => a.toLowerCase() === addr) || addr
  })

  if (uniqueEVMAddresses.length > 0) {
    yPosition = addText('EVM Wallets:', margin, yPosition, 14, true, rgb(0.1, 0.1, 0.1))
    yPosition -= lineHeight * 1.5

    uniqueEVMAddresses.forEach((addr, index) => {
      checkNewPage(60)
      const ensName = inventoryData.resolvedEnsNames?.[addr.toLowerCase()]
      const walletName = inventoryData.walletNames?.[addr] || ensName
      const provider = inventoryData.walletProviders?.[addr] || 'Unknown'

      yPosition = addText(`Wallet ${index + 1} (${provider})`, margin, yPosition, 12, true, colors.wallet)
      yPosition -= lineHeight

      if (ensName && ensName !== addr) {
        yPosition = addText(`ENS Name: ${ensName}`, margin + 20, yPosition, 11, false, rgb(0, 0.6, 0))
        yPosition -= lineHeight
        yPosition = addText(`Address: ${addr}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
      } else {
        yPosition = addText(`Address: ${addr}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
      }
      yPosition -= lineHeight * 1.5
    })
  }

  // Bitcoin Wallet
  if (inventoryData.connectedWallets.btc) {
    checkNewPage(40)
    yPosition = addText('Bitcoin Wallet:', margin, yPosition, 14, true, rgb(0.1, 0.1, 0.1))
    yPosition -= lineHeight * 1.5
    const provider = inventoryData.walletProviders?.[inventoryData.connectedWallets.btc] || 'Unknown'
    yPosition = addText(`Provider: ${provider}`, margin + 20, yPosition, 11, false, rgb(0.2, 0.2, 0.2))
    yPosition -= lineHeight
    yPosition = addText(`Address: ${inventoryData.connectedWallets.btc}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
    yPosition -= lineHeight * 1.5
  }

  // Solana Wallets
  if (inventoryData.connectedWallets.solana && inventoryData.connectedWallets.solana.length > 0) {
    checkNewPage(40)
    yPosition = addText('Solana Wallets:', margin, yPosition, 14, true, rgb(0.1, 0.1, 0.1))
    yPosition -= lineHeight * 1.5

    inventoryData.connectedWallets.solana.forEach((addr, index) => {
      checkNewPage(40)
      const provider = inventoryData.walletProviders?.[addr] || 'Unknown'
      yPosition = addText(`Wallet ${index + 1} (${provider})`, margin, yPosition, 12, true, colors.wallet)
      yPosition -= lineHeight
      yPosition = addText(`Address: ${addr}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
      yPosition -= lineHeight * 1.5
    })
  }

  yPosition -= sectionSpacing
  addPageNumber(2)

  // ============================================
  // ASSET CATALOG WITH IMAGES
  // ============================================
  page = pdfDoc.addPage([612, 792])
  pages.push(page)
  currentPageNumber++
  yPosition = 750

  yPosition = addText('ASSET CATALOG', margin, yPosition, 18, true, colors.header)
  yPosition -= lineHeight * 2

  // Group assets by wallet
  const walletGroups: Record<string, { chain: string; assets: Asset[]; provider?: string }[]> = {}
  
  assets.forEach((asset) => {
    let walletAddr = asset.walletAddress
    if (!walletAddr && asset.chain === 'bitcoin' && asset.contractAddress) {
      walletAddr = asset.contractAddress
    }
    if (!walletAddr) {
      walletAddr = 'Unknown'
    }
    
    const provider = inventoryData.walletProviders?.[walletAddr] || asset.walletProvider || 'Unknown Wallet'
    if (!walletGroups[walletAddr]) {
      walletGroups[walletAddr] = []
    }
    const chainGroup = walletGroups[walletAddr].find(g => g.chain === asset.chain)
    if (chainGroup) {
      chainGroup.assets.push(asset)
    } else {
      walletGroups[walletAddr].push({ 
        chain: asset.chain, 
        assets: [asset],
        provider: provider
      })
    }
  })

  // Sort wallets
  const sortedWalletEntries = Object.entries(walletGroups).sort(([addrA], [addrB]) => {
    return addrA.localeCompare(addrB)
  })

  // Display assets organized by wallet -> chain
  for (const [walletAddr, chainGroups] of sortedWalletEntries) {
    const walletIndex = sortedWalletEntries.findIndex(([addr]) => addr === walletAddr)
    const walletEnsName = inventoryData.resolvedEnsNames?.[walletAddr.toLowerCase()] || inventoryData.walletNames?.[walletAddr]
    const walletProvider = chainGroups[0]?.provider || 'Unknown Wallet'
    
    checkNewPage(80)
    yPosition = addText(`WALLET ${walletIndex + 1}`, margin, yPosition, 14, true, rgb(0.1, 0.1, 0.1))
    yPosition -= lineHeight
    yPosition = addText(`Provider: ${walletProvider}`, margin + 20, yPosition, 11, false, rgb(0.3, 0.5, 0.7))
    yPosition -= lineHeight
    
    // Always show ENS name if available, otherwise show address
    if (walletEnsName && walletEnsName !== walletAddr && walletAddr.startsWith('0x')) {
      yPosition = addText(`ENS Name: ${walletEnsName}`, margin + 20, yPosition, 11, true, rgb(0, 0.6, 0))
      yPosition -= lineHeight
      yPosition = addText(`Address: ${walletAddr}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
    } else {
      yPosition = addText(`Address: ${walletAddr}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
    }
    yPosition -= lineHeight * 1.5
    
    for (const chainGroup of chainGroups) {
      checkNewPage(45)
      yPosition = addText(`CHAIN: ${chainGroup.chain.toUpperCase()}`, margin + 20, yPosition, 12, true, rgb(0.1, 0.1, 0.1))
      yPosition -= lineHeight
      
      for (const asset of chainGroup.assets) {
        const isNFT = asset.type === 'erc721' || asset.type === 'erc1155' || asset.type === 'nft'
        const isEthscription = asset.type === 'ethscription'
        const isOrdinal = asset.type === 'ordinal'
        const estimatedSpace = isNFT || isEthscription || isOrdinal ? 200 : 40
        checkNewPage(estimatedSpace)
        
        // For NFTs, Ordinals, and Ethscriptions, try to embed and display the image
        const nftImageUrl = asset.imageUrl || asset.image
        if ((isNFT || isOrdinal || isEthscription) && nftImageUrl) {
          try {
            const nftImage = await fetchAndEmbedImage(pdfDoc, nftImageUrl)
            if (nftImage) {
              const imageSize = 80
              const imageX = margin + 30
              const imageY = yPosition - imageSize - 5
              
              page.drawImage(nftImage, {
                x: imageX,
                y: imageY,
                width: imageSize,
                height: imageSize,
              })
              
              const textX = imageX + imageSize + 15
              const textStartY = yPosition
              yPosition = addText(
                `${asset.symbol} (${asset.name})`,
                textX,
                textStartY,
                11,
                true,
                colors.nft
              )
              yPosition -= lineHeight
              if (asset.tokenId) {
                yPosition = addText(
                  `Token ID: ${asset.tokenId}`,
                  textX,
                  yPosition,
                  9,
                  false,
                  rgb(0.3, 0.3, 0.3)
                )
                yPosition -= lineHeight
              }
              if (asset.contractAddress) {
                yPosition = addText(
                  `Contract: ${asset.contractAddress}`,
                  textX,
                  yPosition,
                  8,
                  false,
                  rgb(0.4, 0.4, 0.4)
                )
                yPosition -= lineHeight
              }
              
              // Add collection name
              if (asset.metadata?.collection || asset.collectionName) {
                yPosition = addText(
                  `Collection: ${asset.metadata?.collection || asset.collectionName}`,
                  textX,
                  yPosition,
                  9,
                  false,
                  rgb(0.3, 0.3, 0.3)
                )
                yPosition -= lineHeight
              }
              
              // Add description
              if (asset.metadata?.description) {
                checkNewPage(30)
                yPosition = addText(
                  `Description: ${asset.metadata.description}`,
                  textX,
                  yPosition,
                  8,
                  false,
                  rgb(0.4, 0.4, 0.4)
                )
                yPosition -= lineHeight
              }
              
              // Add attributes/traits
              if (asset.metadata?.attributes && Array.isArray(asset.metadata.attributes) && asset.metadata.attributes.length > 0) {
                checkNewPage(asset.metadata.attributes.length * 12 + 20)
                yPosition = addText(
                  `Traits/Attributes (${asset.metadata.attributes.length}):`,
                  textX,
                  yPosition,
                  9,
                  true,
                  rgb(0.2, 0.2, 0.2)
                )
                yPosition -= lineHeight * 0.5
                asset.metadata.attributes.forEach((attr: any) => {
                  checkNewPage(12)
                  const traitName = attr.trait_type || attr.name || 'Trait'
                  const traitValue = attr.value || 'N/A'
                  yPosition = addText(
                    `  • ${traitName}: ${traitValue}`,
                    textX,
                    yPosition,
                    8,
                    false,
                    rgb(0.4, 0.4, 0.4)
                  )
                  yPosition -= lineHeight * 0.8
                })
              }
              
              yPosition = imageY - 15
            } else {
              yPosition = addText(
                `    ${asset.symbol} (${asset.name})`,
                margin + 30,
                yPosition,
                11,
                true,
                colors.nft
              )
              yPosition -= lineHeight
              
              // Add collection, description, and traits even if no image
              if (asset.metadata?.collection || asset.collectionName) {
                yPosition = addText(
                  `    Collection: ${asset.metadata?.collection || asset.collectionName}`,
                  margin + 30,
                  yPosition,
                  9,
                  false,
                  rgb(0.3, 0.3, 0.3)
                )
                yPosition -= lineHeight
              }
              
              if (asset.metadata?.description) {
                checkNewPage(30)
                yPosition = addText(
                  `    Description: ${asset.metadata.description}`,
                  margin + 30,
                  yPosition,
                  8,
                  false,
                  rgb(0.4, 0.4, 0.4)
                )
                yPosition -= lineHeight
              }
              
              if (asset.metadata?.attributes && Array.isArray(asset.metadata.attributes) && asset.metadata.attributes.length > 0) {
                checkNewPage(asset.metadata.attributes.length * 12 + 20)
                yPosition = addText(
                  `    Traits (${asset.metadata.attributes.length}):`,
                  margin + 30,
                  yPosition,
                  9,
                  true,
                  rgb(0.2, 0.2, 0.2)
                )
                yPosition -= lineHeight * 0.5
                asset.metadata.attributes.forEach((attr: any) => {
                  checkNewPage(12)
                  const traitName = attr.trait_type || attr.name || 'Trait'
                  const traitValue = attr.value || 'N/A'
                  yPosition = addText(
                    `      • ${traitName}: ${traitValue}`,
                    margin + 30,
                    yPosition,
                    8,
                    false,
                    rgb(0.4, 0.4, 0.4)
                  )
                  yPosition -= lineHeight * 0.8
                })
              }
            }
          } catch (error) {
            console.warn('Error displaying NFT image:', error)
            yPosition = addText(
              `    ${asset.symbol} (${asset.name})`,
              margin + 30,
              yPosition,
              11,
              true,
              colors.nft
            )
            yPosition -= lineHeight
            
            // Add collection, description, and traits even if image failed
            if (asset.metadata?.collection || asset.collectionName) {
              yPosition = addText(
                `    Collection: ${asset.metadata?.collection || asset.collectionName}`,
                margin + 30,
                yPosition,
                9,
                false,
                rgb(0.3, 0.3, 0.3)
              )
              yPosition -= lineHeight
            }
            
            if (asset.metadata?.description) {
              checkNewPage(30)
              yPosition = addText(
                `    Description: ${asset.metadata.description}`,
                margin + 30,
                yPosition,
                8,
                false,
                rgb(0.4, 0.4, 0.4)
              )
              yPosition -= lineHeight
            }
            
            if (asset.metadata?.attributes && Array.isArray(asset.metadata.attributes) && asset.metadata.attributes.length > 0) {
              checkNewPage(asset.metadata.attributes.length * 12 + 20)
              yPosition = addText(
                `    Traits (${asset.metadata.attributes.length}):`,
                margin + 30,
                yPosition,
                9,
                true,
                rgb(0.2, 0.2, 0.2)
              )
              yPosition -= lineHeight * 0.5
              asset.metadata.attributes.forEach((attr: any) => {
                checkNewPage(12)
                const traitName = attr.trait_type || attr.name || 'Trait'
                const traitValue = attr.value || 'N/A'
                yPosition = addText(
                  `      • ${traitName}: ${traitValue}`,
                  margin + 30,
                  yPosition,
                  8,
                  false,
                  rgb(0.4, 0.4, 0.4)
                )
                yPosition -= lineHeight * 0.8
              })
            }
          }
        } else if (isEthscription) {
          // Ethscription asset
          yPosition = addText(
            `    ${asset.symbol} (${asset.name})`,
            margin + 30,
            yPosition,
            11,
            true,
            rgb(0.1, 0.7, 0.3)
          )
          yPosition -= lineHeight
          
          if (asset.metadata?.ethscriptionNumber) {
            yPosition = addText(
              `    Ethscription #${asset.metadata.ethscriptionNumber}`,
              margin + 30,
              yPosition,
              9,
              false,
              rgb(0.3, 0.3, 0.3)
            )
            yPosition -= lineHeight
          }
          
          if (asset.ethscriptionId) {
            yPosition = addText(
              `    Transaction: ${asset.ethscriptionId}`,
              margin + 30,
              yPosition,
              8,
              false,
              rgb(0.4, 0.4, 0.4)
            )
            yPosition -= lineHeight
          }
          
          if (asset.metadata?.mimetype) {
            yPosition = addText(
              `    Content Type: ${asset.metadata.mimetype}`,
              margin + 30,
              yPosition,
              9,
              false,
              rgb(0.3, 0.3, 0.3)
            )
            yPosition -= lineHeight
          }
          
          if (asset.metadata?.creator) {
            yPosition = addText(
              `    Creator: ${asset.metadata.creator}`,
              margin + 30,
              yPosition,
              8,
              false,
              rgb(0.4, 0.4, 0.4)
            )
            yPosition -= lineHeight
          }
          
          if (asset.metadata?.currentOwner && asset.metadata.currentOwner !== asset.metadata?.creator) {
            yPosition = addText(
              `    Current Owner: ${asset.metadata.currentOwner}`,
              margin + 30,
              yPosition,
              8,
              false,
              rgb(0.4, 0.4, 0.4)
            )
            yPosition -= lineHeight
          }
          
          if (asset.metadata?.blockNumber) {
            yPosition = addText(
              `    Block: ${asset.metadata.blockNumber}`,
              margin + 30,
              yPosition,
              8,
              false,
              rgb(0.4, 0.4, 0.4)
            )
            yPosition -= lineHeight
          }
        } else if (isOrdinal) {
          // Ordinal asset - try to display image
          const ordinalImageUrl = asset.imageUrl || asset.image
          if (ordinalImageUrl) {
            try {
              const ordinalImage = await fetchAndEmbedImage(pdfDoc, ordinalImageUrl)
              if (ordinalImage) {
                const imageSize = 80
                const imageX = margin + 30
                const imageY = yPosition - imageSize - 5
                
                page.drawImage(ordinalImage, {
                  x: imageX,
                  y: imageY,
                  width: imageSize,
                  height: imageSize,
                })
                
                const textX = imageX + imageSize + 15
                const textStartY = yPosition
                yPosition = addText(
                  `${asset.symbol} (${asset.name})`,
                  textX,
                  textStartY,
                  11,
                  true,
                  rgb(0.9, 0.6, 0.1)
                )
                yPosition -= lineHeight
                
                if (asset.metadata?.inscriptionId || asset.tokenId) {
                  yPosition = addText(
                    `Inscription ID: ${asset.metadata?.inscriptionId || asset.tokenId}`,
                    textX,
                    yPosition,
                    9,
                    false,
                    rgb(0.3, 0.3, 0.3)
                  )
                  yPosition -= lineHeight
                }
                
                if (asset.metadata?.contentType) {
                  yPosition = addText(
                    `Content Type: ${asset.metadata.contentType}`,
                    textX,
                    yPosition,
                    9,
                    false,
                    rgb(0.3, 0.3, 0.3)
                  )
                  yPosition -= lineHeight
                }
                
                if (asset.metadata?.contentUrl) {
                  yPosition = addText(
                    `Content URL: ${asset.metadata.contentUrl}`,
                    textX,
                    yPosition,
                    8,
                    false,
                    rgb(0.4, 0.4, 0.4)
                  )
                  yPosition -= lineHeight
                }
                
                yPosition = imageY - 15
              } else {
                // No image available, show text only
                yPosition = addText(
                  `    ${asset.symbol} (${asset.name})`,
                  margin + 30,
                  yPosition,
                  11,
                  true,
                  rgb(0.9, 0.6, 0.1)
                )
                yPosition -= lineHeight
                
                if (asset.metadata?.inscriptionId || asset.tokenId) {
                  yPosition = addText(
                    `    Inscription ID: ${asset.metadata?.inscriptionId || asset.tokenId}`,
                    margin + 30,
                    yPosition,
                    9,
                    false,
                    rgb(0.3, 0.3, 0.3)
                  )
                  yPosition -= lineHeight
                }
                
                if (asset.metadata?.contentType) {
                  yPosition = addText(
                    `    Content Type: ${asset.metadata.contentType}`,
                    margin + 30,
                    yPosition,
                    9,
                    false,
                    rgb(0.3, 0.3, 0.3)
                  )
                  yPosition -= lineHeight
                }
                
                if (asset.metadata?.contentUrl) {
                  yPosition = addText(
                    `    Content URL: ${asset.metadata.contentUrl}`,
                    margin + 30,
                    yPosition,
                    8,
                    false,
                    rgb(0.4, 0.4, 0.4)
                  )
                  yPosition -= lineHeight
                }
              }
            } catch (error) {
              console.warn('Error displaying Ordinal image:', error)
              // Fall through to text-only display
              yPosition = addText(
                `    ${asset.symbol} (${asset.name})`,
                margin + 30,
                yPosition,
                11,
                true,
                rgb(0.9, 0.6, 0.1)
              )
              yPosition -= lineHeight
              
              if (asset.metadata?.inscriptionId || asset.tokenId) {
                yPosition = addText(
                  `    Inscription ID: ${asset.metadata?.inscriptionId || asset.tokenId}`,
                  margin + 30,
                  yPosition,
                  9,
                  false,
                  rgb(0.3, 0.3, 0.3)
                )
                yPosition -= lineHeight
              }
              
              if (asset.metadata?.contentType) {
                yPosition = addText(
                  `    Content Type: ${asset.metadata.contentType}`,
                  margin + 30,
                  yPosition,
                  9,
                  false,
                  rgb(0.3, 0.3, 0.3)
                )
                yPosition -= lineHeight
              }
              
              if (asset.metadata?.contentUrl) {
                yPosition = addText(
                  `    Content URL: ${asset.metadata.contentUrl}`,
                  margin + 30,
                  yPosition,
                  8,
                  false,
                  rgb(0.4, 0.4, 0.4)
                )
                yPosition -= lineHeight
              }
            }
          } else {
            // No image URL available
            yPosition = addText(
              `    ${asset.symbol} (${asset.name})`,
              margin + 30,
              yPosition,
              11,
              true,
              rgb(0.9, 0.6, 0.1)
            )
            yPosition -= lineHeight
            
            if (asset.metadata?.inscriptionId || asset.tokenId) {
              yPosition = addText(
                `    Inscription ID: ${asset.metadata?.inscriptionId || asset.tokenId}`,
                margin + 30,
                yPosition,
                9,
                false,
                rgb(0.3, 0.3, 0.3)
              )
              yPosition -= lineHeight
            }
            
            if (asset.metadata?.contentType) {
              yPosition = addText(
                `    Content Type: ${asset.metadata.contentType}`,
                margin + 30,
                yPosition,
                9,
                false,
                rgb(0.3, 0.3, 0.3)
              )
              yPosition -= lineHeight
            }
            
            if (asset.metadata?.contentUrl) {
              yPosition = addText(
                `    Content URL: ${asset.metadata.contentUrl}`,
                margin + 30,
                yPosition,
                8,
                false,
                rgb(0.4, 0.4, 0.4)
              )
              yPosition -= lineHeight
            }
          }
        } else {
          // Non-NFT asset (tokens, native coins, etc.)
          yPosition = addText(
            `    ${asset.symbol} (${asset.name})`,
            margin + 30,
            yPosition,
            11,
            true,
            rgb(0.1, 0.1, 0.1)
          )
          yPosition -= lineHeight
          
          if (asset.type === 'btc' && asset.metadata?.satsFormatted) {
            yPosition = addText(
              `    Balance: ${asset.balanceFormatted} BTC (${asset.metadata.satsFormatted} SATs)`,
              margin + 30,
              yPosition,
              10,
              false,
              rgb(0.3, 0.3, 0.3)
            )
          } else {
            yPosition = addText(
              `    Balance: ${asset.balanceFormatted}`,
              margin + 30,
              yPosition,
              10,
              false,
              rgb(0.3, 0.3, 0.3)
            )
          }
          yPosition -= lineHeight
          
          if (asset.contractAddress && asset.type !== 'native' && asset.type !== 'btc') {
            yPosition = addText(
              `    Contract: ${asset.contractAddress}`,
              margin + 30,
              yPosition,
              8,
              false,
              rgb(0.4, 0.4, 0.4)
            )
            yPosition -= lineHeight
          }
        }
        yPosition -= 5
      }
      yPosition -= lineHeight
    }
    yPosition -= sectionSpacing
  }

  // ============================================
  // BLANK WRITE-IN SECTIONS
  // ============================================
  
  // Seed Phrase Section (12 words)
  checkNewPage(200)
  yPosition = addText('SEED PHRASE - 12 WORDS', margin, yPosition, 16, true, colors.header)
  yPosition -= lineHeight * 2
  yPosition = addText('Write your 12-word seed phrase below:', margin, yPosition, 10, false, rgb(0.3, 0.3, 0.3))
  yPosition -= lineHeight * 2

  const wordsPerRow = 3
  const wordBoxWidth = (page.getWidth() - 2 * margin - (wordsPerRow - 1) * 10) / wordsPerRow
  const wordBoxHeight = 25
  let wordBoxY = yPosition

  for (let i = 0; i < 12; i++) {
    const row = Math.floor(i / wordsPerRow)
    const col = i % wordsPerRow
    const wordBoxX = margin + col * (wordBoxWidth + 10)

    if (row > 0 && col === 0) {
      wordBoxY -= wordBoxHeight + 10
      checkNewPage(wordBoxHeight + 20)
    }

    // Draw box
    page.drawRectangle({
      x: wordBoxX,
      y: wordBoxY - wordBoxHeight,
      width: wordBoxWidth,
      height: wordBoxHeight,
      borderColor: colors.border,
      borderWidth: 1,
    })

    // Add word number
    page.drawText(`${i + 1}.`, {
      x: wordBoxX + 5,
      y: wordBoxY - 15,
      size: 9,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    })
  }

  yPosition = wordBoxY - wordBoxHeight - 30

  // Seed Phrase Section (24 words)
  checkNewPage(300)
  yPosition = addText('SEED PHRASE - 24 WORDS', margin, yPosition, 16, true, colors.header)
  yPosition -= lineHeight * 2
  yPosition = addText('Write your 24-word seed phrase below:', margin, yPosition, 10, false, rgb(0.3, 0.3, 0.3))
  yPosition -= lineHeight * 2

  wordBoxY = yPosition
  for (let i = 0; i < 24; i++) {
    const row = Math.floor(i / wordsPerRow)
    const col = i % wordsPerRow
    const wordBoxX = margin + col * (wordBoxWidth + 10)

    if (row > 0 && col === 0) {
      wordBoxY -= wordBoxHeight + 10
      checkNewPage(wordBoxHeight + 20)
    }

    // Draw box
    page.drawRectangle({
      x: wordBoxX,
      y: wordBoxY - wordBoxHeight,
      width: wordBoxWidth,
      height: wordBoxHeight,
      borderColor: colors.border,
      borderWidth: 1,
    })

    // Add word number
    page.drawText(`${i + 1}.`, {
      x: wordBoxX + 5,
      y: wordBoxY - 15,
      size: 9,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    })
  }

  yPosition = wordBoxY - wordBoxHeight - 30

  // Private Keys Section
  checkNewPage(200)
  yPosition = addText('PRIVATE KEYS', margin, yPosition, 16, true, colors.header)
  yPosition -= lineHeight * 2
  yPosition = addText('Write your private keys below (one per box):', margin, yPosition, 10, false, rgb(0.3, 0.3, 0.3))
  yPosition -= lineHeight * 2

  const keyBoxHeight = 30
  const keyBoxWidth = page.getWidth() - 2 * margin

  for (let i = 0; i < 5; i++) {
    checkNewPage(keyBoxHeight + 20)
    page.drawRectangle({
      x: margin,
      y: yPosition - keyBoxHeight,
      width: keyBoxWidth,
      height: keyBoxHeight,
      borderColor: colors.border,
      borderWidth: 1,
    })
    page.drawText(`Private Key ${i + 1}:`, {
      x: margin + 5,
      y: yPosition - 20,
      size: 9,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    })
    yPosition -= keyBoxHeight + 15
  }

  // Passwords Section
  checkNewPage(200)
  yPosition = addText('PASSWORDS', margin, yPosition, 16, true, colors.header)
  yPosition -= lineHeight * 2
  yPosition = addText('Write your passwords below (include what each password is for):', margin, yPosition, 10, false, rgb(0.3, 0.3, 0.3))
  yPosition -= lineHeight * 2

  const passwordBoxHeight = 25
  const passwordBoxWidth = page.getWidth() - 2 * margin

  for (let i = 0; i < 8; i++) {
    checkNewPage(passwordBoxHeight + 20)
    page.drawRectangle({
      x: margin,
      y: yPosition - passwordBoxHeight,
      width: passwordBoxWidth,
      height: passwordBoxHeight,
      borderColor: colors.border,
      borderWidth: 1,
    })
    page.drawText(`Password ${i + 1} (for: _________________):`, {
      x: margin + 5,
      y: yPosition - 15,
      size: 9,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    })
    yPosition -= passwordBoxHeight + 15
  }

  // Notes Section
  checkNewPage(150)
  yPosition = addText('ADDITIONAL NOTES', margin, yPosition, 16, true, colors.header)
  yPosition -= lineHeight * 2

  const notesBoxHeight = 200
  const notesBoxWidth = page.getWidth() - 2 * margin
  checkNewPage(notesBoxHeight + 20)

  page.drawRectangle({
    x: margin,
    y: yPosition - notesBoxHeight,
    width: notesBoxWidth,
    height: notesBoxHeight,
    borderColor: colors.border,
    borderWidth: 1,
  })
  page.drawText('Use this space for any additional notes, recovery instructions, or important information:', {
    x: margin + 5,
    y: yPosition - 15,
    size: 9,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  })

  // Update all page numbers with correct total
  const totalPages = pages.length
  pages.forEach((p, index) => {
    const pageNum = index + 1
    const footerY = 30
    p.drawLine({
      start: { x: margin, y: footerY + 10 },
      end: { x: p.getWidth() - margin, y: footerY + 10 },
      thickness: 0.5,
      color: colors.border,
    })
    const footerText = `Page ${pageNum} of ${totalPages} | Crypto Asset Inventory | Generated on ${currentDate}`
    p.drawText(footerText, {
      x: margin,
      y: footerY - 5,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    })
  })

  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}

