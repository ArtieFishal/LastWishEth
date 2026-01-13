import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { UserData, Asset, Beneficiary, Allocation } from '@/types'

// Enhanced helper function to fetch and embed image in PDF
// Converts GIFs to static PNG for PDF (but keeps them animated on website)
async function fetchAndEmbedImage(pdfDoc: PDFDocument, imageUrl: string): Promise<any | null> {
  try {
    // Handle IPFS URLs
    let url = imageUrl
    if (imageUrl.startsWith('ipfs://')) {
      url = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/')
    } else if (imageUrl.startsWith('ipfs/')) {
      url = `https://ipfs.io/${imageUrl}`
    }
    
    // Handle ordinal proxy URLs - need to resolve them to direct URLs
    if (url.includes('/api/ordinal-image')) {
      // Extract inscription ID and try direct sources
      try {
        const urlObj = new URL(url, 'http://localhost') // Base URL for parsing
        const inscriptionId = urlObj.searchParams.get('id')
        if (inscriptionId) {
          // Try direct ordinal sources (better for server-side fetching)
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
                url = sourceUrl
                break
              }
            } catch {
              continue
            }
          }
        }
      } catch {
        // If parsing fails, try the URL as-is
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
      // For GIFs in PDF, we need to convert to static PNG
      // Since pdf-lib doesn't support GIFs, we'll extract the first frame
      // Note: This is a simplified approach - for production, consider using sharp or canvas
      try {
        // Try to embed as PNG (might work if it's a single-frame GIF or browser handles it)
        // Most browsers can decode GIFs, so we'll try embedding the first frame
        return await pdfDoc.embedPng(uint8Array)
      } catch (pngError) {
        // If PNG embedding fails, try JPEG
        try {
          return await pdfDoc.embedJpg(uint8Array)
        } catch (jpgError) {
          console.warn('GIF conversion failed, skipping GIF image in PDF:', pngError)
          // For proper GIF-to-PNG conversion, you'd need a library like 'sharp' on the server
          // For now, we'll skip the image
          return null
        }
      }
    } else if (contentType.includes('image/webp')) {
      // WebP support - try as PNG first
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
      // Try PNG first, then JPEG as fallback for unknown formats
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

export async function generatePDF(
  userData: UserData, 
  assets: Asset[],
  walletProviders?: Record<string, string>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Track pages for numbering
  const pages: any[] = []
  let currentPageNumber = 0

  let page = pdfDoc.addPage([612, 792]) // US Letter size
  pages.push(page)
  currentPageNumber++

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
      pages.push(page)
      currentPageNumber++
      yPosition = 750
      addPageNumber(currentPageNumber)
      return true
    }
    return false
  }

  // Helper function to add page number
  const addPageNumber = (pageNum: number) => {
    const footerY = 30
    const totalPages = pages.length // Will be updated at the end
    page.drawLine({
      start: { x: margin, y: footerY + 10 },
      end: { x: page.getWidth() - margin, y: footerY + 10 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    })
    const footerText = `Page ${pageNum} | Document Number: ${docNumber} | Generated by LastWishCrypto on ${currentDate}`
    page.drawText(footerText, {
      x: margin,
      y: footerY - 5,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    })
    page.drawText(
      'This document is informational only and does not constitute legal, financial, or tax advice.',
      {
        x: margin,
        y: footerY - 15,
        size: 7,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      }
    )
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
      // Check if we need new page before drawing last line
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

  // Main Title - Large and Centered
  yPosition = addCenteredText('UNIFORM DIGITAL ASSET INTENT PACKET', yPosition, 28, true, colors.title)
  yPosition -= 30
  yPosition = addCenteredText('(LastWish Instructions)', yPosition, 18, false, rgb(0.3, 0.3, 0.3))
  yPosition -= 60

  // Decorative line
  page.drawLine({
    start: { x: margin + 50, y: yPosition },
    end: { x: page.getWidth() - margin - 50, y: yPosition },
    thickness: 2,
    color: colors.title,
  })
  yPosition -= 50

  // Owner Name (centered)
  const ownerName = userData.ownerFullName || userData.ownerName || 'Owner'
  yPosition = addCenteredText(ownerName, yPosition, 20, true, rgb(0.2, 0.2, 0.2))
  
  // Show owner ENS if available
  if (userData.ownerEnsName) {
    yPosition -= lineHeight
    yPosition = addCenteredText(userData.ownerEnsName, yPosition, 14, false, colors.ens)
  }
  yPosition -= 50

  // Document details - no boxes, just text
  const boxY = yPosition - 100
  const boxHeight = 120
  const boxWidth = page.getWidth() - 2 * margin - 100
  const boxX = margin + 50

  let detailY = boxY - 20
  detailY = addText('Date Generated:', boxX + 20, detailY, 11, false, rgb(0.4, 0.4, 0.4))
  detailY = addText(currentDate, boxX + 20, detailY, 11, true, rgb(0.1, 0.1, 0.1))
  detailY -= lineHeight * 1.5

  detailY = addText('Total Assets:', boxX + 20, detailY, 11, false, rgb(0.4, 0.4, 0.4))
  detailY = addText(`${assets.length} asset${assets.length !== 1 ? 's' : ''}`, boxX + 20, detailY, 11, true, rgb(0.1, 0.1, 0.1))
  detailY -= lineHeight * 1.5

  detailY = addText('Total Beneficiaries:', boxX + 20, detailY, 11, false, rgb(0.4, 0.4, 0.4))
  detailY = addText(`${userData.beneficiaries.length}`, boxX + 20, detailY, 11, true, rgb(0.1, 0.1, 0.1))
  detailY -= lineHeight * 1.5

  const totalWallets = userData.connectedWallets.evm.length + (userData.connectedWallets.btc ? 1 : 0)
  detailY = addText('Connected Wallets:', boxX + 20, detailY, 11, false, rgb(0.4, 0.4, 0.4))
  detailY = addText(`${totalWallets}`, boxX + 20, detailY, 11, true, rgb(0.1, 0.1, 0.1))

  yPosition = boxY - boxHeight - 50

  // Confidential notice - no boxes
  const noticeY = yPosition - 50
  let noticeTextY = noticeY
  noticeTextY = addText('CONFIDENTIAL DOCUMENT', margin, noticeTextY, 13, true, rgb(0.1, 0.1, 0.1))
  noticeTextY -= lineHeight
  noticeTextY = addText(
    'This document contains sensitive financial information. Keep secure and share only with authorized parties.',
    margin,
    noticeTextY,
    10,
    false,
    rgb(0.3, 0.3, 0.3)
  )

  yPosition = noticeY - 60

  // Add page number to title page
  addPageNumber(1)

  // ============================================
  // TABLE OF CONTENTS
  // ============================================
  page = pdfDoc.addPage([612, 792])
  pages.push(page)
  currentPageNumber++
  yPosition = 750

  yPosition = addText('TABLE OF CONTENTS', margin, yPosition, 18, true, rgb(0.1, 0.1, 0.1))
  yPosition -= lineHeight * 3

  // TOC sections (page numbers will be approximate)
  const tocSections = [
    { title: 'Legal Disclaimer and Important Notice', page: 3 },
    { title: 'Owner Information', page: 4 },
    { title: 'Connected Wallets & Verification Status', page: 4 },
    { title: 'Beneficiary Wallets', page: 5 },
    { title: 'Executor Information', page: 5 },
    { title: 'Beneficiaries', page: 6 },
    { title: 'Executive Summary: Asset Allocations', page: 7 },
    { title: 'Detailed Asset Allocations', page: 8 },
    { title: 'Instructions for Executor', page: 9 },
    { title: 'Acknowledgment and Notarization', page: 10 },
  ]

  tocSections.forEach((section) => {
    checkNewPage(25)
    const titleWidth = font.widthOfTextAtSize(section.title, 12)
    const pageNumText = section.page.toString()
    const pageNumWidth = font.widthOfTextAtSize(pageNumText, 12)
    
    // Draw title
    page.drawText(section.title, {
      x: margin,
      y: yPosition,
      size: 12,
      font: font,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    // Draw dots
    const dotsStartX = margin + titleWidth + 10
    const dotsEndX = page.getWidth() - margin - pageNumWidth - 10
    const availableWidth = dotsEndX - dotsStartX
    const dotCount = Math.max(1, Math.floor(availableWidth / 6))
    const dots = '.'.repeat(dotCount)
    page.drawText(dots, {
      x: dotsStartX,
      y: yPosition,
      size: 12,
      font: font,
      color: rgb(0.6, 0.6, 0.6),
    })
    
    // Draw page number
    page.drawText(pageNumText, {
      x: page.getWidth() - margin - pageNumWidth,
      y: yPosition,
      size: 12,
      font: font,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    yPosition -= lineHeight * 2.2
  })

  addPageNumber(2)

  // ============================================
  // LEGAL DISCLAIMER AND UNIFORM 50-STATE NOTICE
  // ============================================
  checkNewPage(200)
  yPosition = addText('LEGAL DISCLAIMER AND IMPORTANT NOTICE', margin, yPosition, 14, true, rgb(0.1, 0.1, 0.1))
  yPosition -= lineHeight * 1.5
  
  // Uniform 50-State Notice
  yPosition = addText('UNIFORM DIGITAL ASSET INTENT PACKET', margin, yPosition, 12, true, rgb(0.2, 0.3, 0.6))
  yPosition -= lineHeight * 1.5
  yPosition = addText(
    'This document is a Uniform Digital Asset Intent Packet designed to work in all 50 U.S. states. This document supplements, but does not replace, a formal will or estate plan.',
    margin,
    yPosition,
    10,
    false,
    rgb(0.1, 0.1, 0.1)
  )
  yPosition -= lineHeight * 2
  
  // Executor Packet Framing
  yPosition = addText('EXECUTOR PACKET FRAMING', margin, yPosition, 11, true, rgb(0.2, 0.3, 0.6))
  yPosition -= lineHeight * 1.5
  yPosition = addText(
    'This document can be used in two ways:',
    margin,
    yPosition,
    10,
    false,
    rgb(0.1, 0.1, 0.1)
  )
  yPosition -= lineHeight * 1.5
  yPosition = addText(
    '1. As a Standalone Letter of Instruction: This document can serve as a complete Letter of Instruction for executors, providing all necessary information to locate and access digital assets. It is legally valid as an instruction document in all 50 U.S. states.',
    margin,
    yPosition,
    10,
    false,
    rgb(0.1, 0.1, 0.1)
  )
  yPosition -= lineHeight * 2
  yPosition = addText(
    '2. As Exhibit A to a Formal Will: This document can be explicitly referenced and attached as "Exhibit A" to a formal will. When used this way, reference this document in your will with language such as: "I direct my executor to follow the instructions contained in Exhibit A, my Digital Asset Intent Packet, dated [DATE]."',
    margin,
    yPosition,
    10,
    false,
    rgb(0.1, 0.1, 0.1)
  )
  yPosition -= lineHeight * 2
  yPosition = addText(
    'RECOMMENDATION: For maximum legal protection, we recommend using this document as Exhibit A attached to a formal will. However, this document is legally valid as a standalone Letter of Instruction if you do not yet have a formal will. Consult with an estate attorney to determine the best approach for your situation.',
    margin,
    yPosition,
    10,
    true,
    colors.warning
  )
  yPosition -= lineHeight * 2
  
  // RUFADAA Reference
  yPosition = addText('RUFADAA (Revised Uniform Fiduciary Access to Digital Assets Act) Reference', margin, yPosition, 11, true, rgb(0.2, 0.3, 0.6))
  yPosition -= lineHeight * 1.5
  yPosition = addText(
    'This document references concepts from the Revised Uniform Fiduciary Access to Digital Assets Act (RUFADAA), which has been adopted in most U.S. states. RUFADAA provides a legal framework for fiduciaries (executors, trustees, etc.) to access digital assets. This document does not over-claim RUFADAA authority but provides instructions that align with RUFADAA principles. The executor should consult with legal counsel to understand how RUFADAA applies in the specific state of jurisdiction.',
    margin,
    yPosition,
    10,
    false,
    rgb(0.1, 0.1, 0.1)
  )
  yPosition -= lineHeight * 2
  
  // General Disclaimer
  yPosition = addText('General Disclaimer', margin, yPosition, 11, true, rgb(0.1, 0.1, 0.1))
  yPosition -= lineHeight * 1.5
  yPosition = addText(
    'This document is provided for informational purposes only and does not constitute legal, financial, or tax advice. The information contained herein is intended to assist the executor and beneficiaries in locating and accessing digital assets, but does not create any legal obligations or guarantees. The owner of these assets is solely responsible for ensuring the accuracy of the information provided. LastWishCrypto is not a legal service provider, custodian, or executor of these instructions. Consult with qualified legal, financial, and tax professionals before taking any action based on this document. This document should be kept in a secure location and shared only with trusted parties.',
    margin,
    yPosition,
    10,
    false,
    rgb(0.3, 0.3, 0.3)
  )
  yPosition -= sectionSpacing * 1.5

  // ============================================
  // OWNER INFORMATION
  // ============================================
  checkNewPage(140)
  yPosition = addText('OWNER INFORMATION', margin, yPosition, 16, true, rgb(0.1, 0.1, 0.1))
  yPosition -= lineHeight * 1.5
  yPosition = addText(`Full Legal Name: ${userData.ownerFullName || userData.ownerName}`, margin, yPosition, 12)
  yPosition -= lineHeight
  if (userData.ownerEnsName) {
    yPosition = addText(`ENS Address: ${userData.ownerEnsName}`, margin, yPosition, 12, false, colors.ens)
    yPosition -= lineHeight
  }
  yPosition = addText(`Address: ${userData.ownerAddress}`, margin, yPosition, 12)
  yPosition -= lineHeight
  yPosition = addText(`City, State ZIP: ${userData.ownerCity}, ${userData.ownerState} ${userData.ownerZipCode}`, margin, yPosition, 12)
  yPosition -= lineHeight
  yPosition = addText(`Phone: ${userData.ownerPhone}`, margin, yPosition, 12)
  yPosition -= lineHeight * 1.5

  // Connected Wallets Section
  yPosition = addText('CONNECTED WALLETS & VERIFICATION STATUS', margin, yPosition, 14, true, rgb(0.1, 0.1, 0.1))
  yPosition -= lineHeight
  yPosition = addText('All wallet addresses used in this document with signature verification status:', margin, yPosition, 10, false, rgb(0.3, 0.3, 0.3))
  yPosition -= lineHeight * 2
  
  // Show all EVM wallets with ENS names, addresses, and verification status
  // Deduplicate EVM addresses (case-insensitive)
  const uniqueEVMAddresses = Array.from(new Set(userData.connectedWallets.evm.map(addr => addr.toLowerCase())))
    .map(addr => {
      // Find the original case version
      return userData.connectedWallets.evm.find(a => a.toLowerCase() === addr) || addr
    })
  
  if (uniqueEVMAddresses.length > 0) {
    uniqueEVMAddresses.forEach((addr, index) => {
      checkNewPage(60)
      const ensName = userData.resolvedEnsNames?.[addr.toLowerCase()]
      const walletName = userData.walletNames?.[addr] || ensName
      
      yPosition = addText(`Wallet ${index + 1} (EVM) - VERIFIED`, margin, yPosition, 13, true, rgb(0.1, 0.1, 0.1))
      yPosition -= lineHeight
      yPosition = addText('✓ Signature Verified', margin + 20, yPosition, 10, true, rgb(0.1, 0.7, 0.3))
      yPosition -= lineHeight * 1.5
      
      // Show address format: "Hex Address Resolves to 'eth address'"
      if (ensName && ensName !== addr) {
        yPosition = addText(`${addr}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
        yPosition -= lineHeight * 0.5
        yPosition = addText(`Resolves to: ${ensName}`, margin + 20, yPosition, 11, true, colors.ens)
      } else {
        yPosition = addText(`${addr}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
      }
      yPosition -= lineHeight
      
      yPosition -= lineHeight * 0.5
    })
  }
  
  // Show Bitcoin wallet if present
  if (userData.connectedWallets.btc) {
    checkNewPage(35)
    yPosition = addText(`Bitcoin Wallet:`, margin, yPosition, 13, true, rgb(0.1, 0.1, 0.1))
    yPosition -= lineHeight
    yPosition = addText(`   Address: ${userData.connectedWallets.btc}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
    yPosition -= lineHeight
  }
  yPosition -= sectionSpacing
  
  // Show all beneficiary wallets with ENS names
  const beneficiaryWallets = userData.beneficiaries.filter(b => b.walletAddress && b.walletAddress.startsWith('0x'))
  if (beneficiaryWallets.length > 0) {
    checkNewPage(80)
    yPosition = addText('BENEFICIARY WALLETS (ENS)', margin, yPosition, 14, true, rgb(0.1, 0.1, 0.1))
    yPosition -= lineHeight
    yPosition = addText('All beneficiary Ethereum wallet addresses with ENS names:', margin, yPosition, 10, false, rgb(0.3, 0.3, 0.3))
    yPosition -= lineHeight * 2
    beneficiaryWallets.forEach((ben) => {
      checkNewPage(40)
      if (ben.ensName) {
        yPosition = addText(`${ben.name}:`, margin, yPosition, 12, true, rgb(0.1, 0.1, 0.1))
        yPosition -= lineHeight
        yPosition = addText(`   ENS Name: ${ben.ensName}`, margin + 20, yPosition, 11, true, colors.ens)
        yPosition -= lineHeight
        yPosition = addText(`   Wallet Address: ${ben.walletAddress || 'Not provided'}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
      } else {
        yPosition = addText(`${ben.name}:`, margin, yPosition, 12, true, rgb(0.1, 0.1, 0.1))
        yPosition -= lineHeight
        yPosition = addText(`   Wallet Address: ${ben.walletAddress || 'Not provided'}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
      }
      // Display physical address if provided
      if (ben.address || ben.city || ben.state || ben.zipCode) {
        yPosition -= lineHeight
        const addressParts = [
          ben.address,
          ben.city,
          ben.state,
          ben.zipCode
        ].filter(Boolean)
        if (addressParts.length > 0) {
          yPosition = addText(`   Physical Address: ${addressParts.join(', ')}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
        }
      }
      yPosition -= lineHeight
    })
    yPosition -= sectionSpacing
  }

  // ============================================
  // EXECUTOR INFORMATION
  // ============================================
  checkNewPage(130)
  yPosition = addText('EXECUTOR INFORMATION', margin, yPosition, 16, true, rgb(0.1, 0.1, 0.1))
  yPosition -= lineHeight * 1.5
  yPosition = addText(`Full Name: ${userData.executorName}`, margin, yPosition, 12, false, rgb(0.2, 0.2, 0.2))
  yPosition -= lineHeight
  
  // Show executor wallet with ENS name if available (executorAddress is optional)
  if (userData.executorAddress) {
    const executorEnsName = userData.resolvedEnsNames?.[userData.executorAddress.toLowerCase()]
    if (executorEnsName) {
      yPosition = addText(`ENS Name: ${executorEnsName}`, margin, yPosition, 12, true, colors.ens)
      yPosition -= lineHeight
      yPosition = addText(`Wallet Address: ${userData.executorAddress}`, margin, yPosition, 12, false, rgb(0.3, 0.3, 0.5))
    } else {
      yPosition = addText(`Wallet Address: ${userData.executorAddress}`, margin, yPosition, 12, false, rgb(0.3, 0.3, 0.5))
    }
    yPosition -= lineHeight
  } else {
    yPosition = addText(`Wallet Address: Not provided`, margin, yPosition, 12, false, rgb(0.5, 0.5, 0.5))
    yPosition -= lineHeight
  }
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

  // ============================================
  // BENEFICIARIES
  // ============================================
  checkNewPage(80)
  yPosition = addText('BENEFICIARIES', margin, yPosition, 16, true, rgb(0.1, 0.1, 0.1))
  yPosition -= lineHeight * 1.5
  userData.beneficiaries.forEach((ben, index) => {
    checkNewPage(55)
    yPosition = addText(`${index + 1}. ${ben.name}`, margin, yPosition, 13, true, rgb(0.1, 0.1, 0.1))
    yPosition -= lineHeight
    
    // Show ENS name prominently if available
    if (ben.ensName) {
      yPosition = addText(`   ENS Name: ${ben.ensName}`, margin + 20, yPosition, 11, true, colors.ens)
      yPosition -= lineHeight
      yPosition = addText(`   Wallet Address: ${ben.walletAddress || 'Not provided'}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
    } else {
      yPosition = addText(`   Wallet Address: ${ben.walletAddress || 'Not provided'}`, margin + 20, yPosition, 10, false, rgb(0.3, 0.3, 0.3))
    }
    // Display physical address if provided
    if (ben.address || ben.city || ben.state || ben.zipCode) {
      yPosition -= lineHeight
      const addressParts = [
        ben.address,
        ben.city,
        ben.state,
        ben.zipCode
      ].filter(Boolean)
      if (addressParts.length > 0) {
        yPosition = addText(`   Physical Address: ${addressParts.join(', ')}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
      }
    }
    if (ben.phone) {
      yPosition -= lineHeight
      yPosition = addText(`   Phone: ${ben.phone}`, margin + 20, yPosition, 10, false, rgb(0.4, 0.4, 0.4))
    }
    if (ben.email) {
      yPosition -= lineHeight
      yPosition = addText(`   Email: ${ben.email}`, margin + 20, yPosition, 10, false, rgb(0.4, 0.4, 0.4))
    }
    if (ben.notes) {
      yPosition -= lineHeight
      yPosition = addText(`   Notes: ${ben.notes}`, margin + 20, yPosition, 9, false, rgb(0.5, 0.5, 0.5))
    }
    yPosition -= lineHeight * 0.5
  })
  yPosition -= sectionSpacing

  // ============================================
  // EXECUTIVE SUMMARY: ASSET ALLOCATIONS
  // ============================================
  checkNewPage(100)
  yPosition = addText('EXECUTIVE SUMMARY: ASSET ALLOCATIONS BY WALLET & CHAIN', margin, yPosition, 15, true, rgb(0.1, 0.1, 0.1))
  yPosition -= lineHeight * 2
  
  // Group assets by wallet address first, then by chain
  const walletGroups: Record<string, { chain: string; assets: Asset[]; provider?: string }[]> = {}
  
  assets.forEach((asset) => {
    // For Bitcoin assets, use walletAddress or contractAddress
    let walletAddr = asset.walletAddress
    if (!walletAddr && asset.chain === 'bitcoin' && asset.contractAddress) {
      walletAddr = asset.contractAddress
    }
    if (!walletAddr) {
      walletAddr = 'Unknown'
    }
    
    const provider = walletProviders?.[walletAddr] || asset.walletProvider || 
      (asset.chain === 'bitcoin' ? 'Xverse' : 
       asset.chain === 'solana' ? 'Solana Wallet' : 
       'Unknown Wallet')
    if (!walletGroups[walletAddr]) {
      walletGroups[walletAddr] = []
    }
    const chainGroup = walletGroups[walletAddr].find(g => g.chain === asset.chain)
    if (chainGroup) {
      chainGroup.assets.push(asset)
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
    chainGroups.forEach(group => {
      group.assets.sort((a, b) => {
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
    const walletGroup = userData.walletGroups?.[walletAddr.toLowerCase()] || 'unassigned'
    const groupLabels: Record<string, string> = {
      'long-term': 'Long-term',
      'active-trading': 'Active trading',
      'cold-storage': 'Cold storage',
      'unassigned': 'Unassigned'
    }
    const groupLabel = groupLabels[walletGroup] || 'Unassigned'
    
    checkNewPage(80)
    yPosition = addText(`WALLET ${walletIndex + 1}`, margin, yPosition, 14, true, rgb(0.1, 0.1, 0.1))
    yPosition -= lineHeight
    yPosition = addText(`Group: ${groupLabel}`, margin + 20, yPosition, 11, true, rgb(0.3, 0.5, 0.7))
    yPosition -= lineHeight
    yPosition = addText(`Wallet App: ${walletProvider}`, margin + 20, yPosition, 12, true, rgb(0.1, 0.1, 0.1))
    yPosition -= lineHeight
    // Show address format: "Hex Address Resolves to 'eth address'"
    if (walletEnsName && walletEnsName !== walletAddr && walletAddr.startsWith('0x')) {
      yPosition = addText(`${walletAddr}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
      yPosition -= lineHeight * 0.5
      yPosition = addText(`Resolves to: ${walletEnsName}`, margin + 20, yPosition, 11, true, colors.ens)
    } else {
      yPosition = addText(`${walletAddr}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
    }
    yPosition -= lineHeight * 1.5
    
    for (const chainGroup of chainGroups) {
      checkNewPage(45)
      yPosition = addText(`CHAIN: ${chainGroup.chain.toUpperCase()}`, margin + 20, yPosition, 12, true, rgb(0.1, 0.1, 0.1))
      yPosition -= lineHeight
      
      for (const asset of chainGroup.assets) {
        const assetAllocations = userData.allocations.filter((a) => a.assetId === asset.id)
        if (assetAllocations.length === 0) continue
        
        const isNFT = asset.type === 'erc721' || asset.type === 'erc1155' || asset.type === 'nft'
        checkNewPage(isNFT ? 100 : 35)
        
        // Determine asset color (for text only, no boxes)
        let assetColor = rgb(0.1, 0.1, 0.1)
        if (isNFT) {
          assetColor = rgb(0.1, 0.1, 0.1)
        } else if (asset.type === 'native') {
          assetColor = rgb(0.1, 0.1, 0.1)
        } else if (asset.type === 'btc') {
          assetColor = rgb(0.1, 0.1, 0.1)
        }
        
        // For NFTs, try to embed and display the image
        const nftImageUrl = asset.imageUrl || asset.image // Support both imageUrl and image (Solana uses image)
        if (isNFT && nftImageUrl) {
          try {
            const nftImage = await fetchAndEmbedImage(pdfDoc, nftImageUrl)
            if (nftImage) {
              const imageSize = 60
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
                `${asset.symbol} (${asset.name}) [NFT - NON-FUNGIBLE, CANNOT BE SPLIT]`,
                textX,
                textStartY,
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
              // Position below the image, aligned with left edge
              yPosition = imageY - 15
            } else {
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
          // Non-NFT asset
          const assetTypeLabel = isNFT ? ' [NFT - NON-FUNGIBLE, CANNOT BE SPLIT]' : ''
          yPosition = addText(
            `    ${asset.symbol} (${asset.name})${assetTypeLabel}`,
            margin + 30,
            yPosition,
            11,
            true,
            assetColor
          )
          yPosition -= lineHeight
          
          // For Bitcoin, show SATs
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
        }
        
        // Show allocations
        assetAllocations.forEach((alloc) => {
          checkNewPage(18)
          const beneficiary = userData.beneficiaries.find((b) => b.id === alloc.beneficiaryId)
          let allocationText = ''
          
          if (isNFT) {
            allocationText = `      -> ${beneficiary?.name} receives: ${asset.name}${asset.tokenId ? ` (Token ID: ${asset.tokenId})` : ''} [ENTIRE NFT]`
          } else if (alloc.type === 'percentage') {
            const percentage = alloc.percentage || 0
            let amountText = ''
            if (asset.type === 'btc') {
              // For Bitcoin, calculate SATs
              const satsAmount = Math.floor((parseFloat(asset.balance) * percentage) / 100)
              amountText = `(${satsAmount.toLocaleString('en-US')} SATs)`
            } else {
              const calculatedAmount = (parseFloat(asset.balance) * percentage / 100).toFixed(6)
              amountText = `(${calculatedAmount} ${asset.symbol})`
            }
            allocationText = `      -> ${beneficiary?.name} receives: ${percentage}% ${amountText}`
          } else {
            let amountText = alloc.amount || ''
            if (asset.type === 'btc' && alloc.amount) {
              // Show SATs for Bitcoin
              const btcAmount = parseFloat(alloc.amount)
              if (!isNaN(btcAmount)) {
                const satsAmount = Math.floor(btcAmount * 100000000)
                amountText = `${alloc.amount} BTC (${satsAmount.toLocaleString('en-US')} SATs)`
              }
            } else {
              amountText = `${alloc.amount} ${asset.symbol}`
            }
            allocationText = `      -> ${beneficiary?.name} receives: ${amountText}`
          }
          
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

  // ============================================
  // DETAILED ASSET ALLOCATIONS
  // ============================================
  checkNewPage(80)
  yPosition = addText('DETAILED ASSET ALLOCATIONS (BY CHAIN)', margin, yPosition, 15, true, rgb(0.1, 0.1, 0.1))
  yPosition -= lineHeight * 1.5

  // Group allocations by chain
  const chains = [...new Set(assets.map((a) => a.chain))]
  for (const chain of chains) {
    const chainAssets = assets.filter((a) => a.chain === chain)
    checkNewPage(55)
    yPosition = addText(`Chain: ${chain.toUpperCase()}`, margin, yPosition, 13, true, rgb(0.1, 0.1, 0.1))
    yPosition -= lineHeight

    for (const asset of chainAssets) {
      const assetAllocations = userData.allocations.filter((a) => a.assetId === asset.id)
      if (assetAllocations.length === 0) continue

      checkNewPage(40)
      
      // Determine asset color (for text only, no boxes)
      let assetColor = rgb(0.1, 0.1, 0.1)
      const isNFT = asset.type === 'erc721' || asset.type === 'erc1155'
      
      // Show wallet address for this asset
      const walletAddr = asset.walletAddress || asset.contractAddress || 'Unknown'
      const walletEnsName = userData.resolvedEnsNames?.[walletAddr.toLowerCase()] || userData.walletNames?.[walletAddr]
      const walletLabel = walletEnsName && walletEnsName !== walletAddr ? `${walletEnsName} (${walletAddr})` : walletAddr
      
      const assetTypeLabel = isNFT ? ' [NFT - NON-FUNGIBLE]' : ''
      yPosition = addText(
        `${asset.symbol} (${asset.name})${assetTypeLabel}`,
        margin + 20,
        yPosition,
        12,
        true,
        assetColor
      )
      yPosition -= lineHeight
      yPosition = addText(
        `From Wallet: ${walletLabel}`,
        margin + 20,
        yPosition,
        10,
        false,
        rgb(0.4, 0.4, 0.4)
      )
      yPosition -= lineHeight
      
      // For Bitcoin, show SATs
      if (asset.type === 'btc' && asset.metadata?.satsFormatted) {
        yPosition = addText(
          `Balance: ${asset.balanceFormatted} BTC (${asset.metadata.satsFormatted} SATs)`,
          margin + 20,
          yPosition,
          10,
          false,
          rgb(0.3, 0.3, 0.3)
        )
      } else {
        yPosition = addText(
          `Balance: ${asset.balanceFormatted}`,
          margin + 20,
          yPosition,
          10,
          false,
          rgb(0.3, 0.3, 0.3)
        )
      }
      yPosition -= lineHeight

      assetAllocations.forEach((alloc) => {
        checkNewPage(18)
        const beneficiary = userData.beneficiaries.find((b) => b.id === alloc.beneficiaryId)
        let allocationText = ''
        
        if (isNFT) {
          allocationText = `  -> ${beneficiary?.name} receives: ${asset.name}${asset.tokenId ? ` (Token ID: ${asset.tokenId})` : ''} [ENTIRE NFT - CANNOT BE SPLIT]`
        } else if (alloc.type === 'percentage') {
          const percentage = alloc.percentage || 0
          if (asset.type === 'btc') {
            const satsAmount = Math.floor((parseFloat(asset.balance) * percentage) / 100)
            allocationText = `  -> ${beneficiary?.name}: ${percentage}% (${satsAmount.toLocaleString('en-US')} SATs)`
          } else {
            allocationText = `  -> ${beneficiary?.name}: ${percentage}%`
          }
        } else {
          if (asset.type === 'btc' && alloc.amount) {
            const btcAmount = parseFloat(alloc.amount)
            if (!isNaN(btcAmount)) {
              const satsAmount = Math.floor(btcAmount * 100000000)
              allocationText = `  -> ${beneficiary?.name}: ${alloc.amount} BTC (${satsAmount.toLocaleString('en-US')} SATs)`
            } else {
              allocationText = `  -> ${beneficiary?.name}: ${alloc.amount} ${asset.symbol}`
            }
          } else {
            allocationText = `  -> ${beneficiary?.name}: ${alloc.amount} ${asset.symbol}`
          }
        }
        
        yPosition = addText(allocationText, margin + 40, yPosition, 10, false, rgb(0.1, 0.1, 0.1))
        yPosition -= lineHeight
      })
      yPosition -= 5
    }
    yPosition -= sectionSpacing
  }

  // ============================================
  // CONDITIONAL EXECUTOR BOOKLET SECTIONS
  // ============================================
  
  // Detect asset types for conditional sections
  const hasBitcoinWallets = assets.some(a => a.chain === 'bitcoin' || a.type === 'btc' || a.type === 'ordinal')
  const hasNFTs = assets.some(a => a.type === 'erc721' || a.type === 'erc1155' || a.type === 'nft')
  const hasExchanges = false // Placeholder - could detect exchange addresses in future
  
  // Section 1: Bitcoin Recovery (if Bitcoin wallets present)
  if (hasBitcoinWallets) {
    checkNewPage(200)
    yPosition = addText('BITCOIN WALLET RECOVERY INSTRUCTIONS', margin, yPosition, 16, true, rgb(0.1, 0.1, 0.1))
    yPosition -= lineHeight * 1.5
    yPosition = addText(
      'IMPORTANT: Bitcoin wallets require special handling. The following information is critical for accessing Bitcoin assets:',
      margin,
      yPosition,
      11,
      true,
      colors.warning
    )
    yPosition -= lineHeight * 2
    
    const btcInstructions = [
      '1. Bitcoin wallets may contain both regular Bitcoin (BTC) and Ordinals (inscribed SATs).',
      '2. Access to Bitcoin wallets typically requires:',
      '   - Private keys or seed phrases (12/24 word mnemonic)',
      '   - Wallet software (e.g., Xverse, Electrum, Bitcoin Core)',
      '   - Hardware wallet devices (if applicable)',
      '3. Ordinals (inscribed SATs) require special handling:',
      '   - They are stored on specific SATs within Bitcoin transactions',
      '   - Use Ordinal-compatible wallets (e.g., Xverse, Hiro Wallet)',
      '   - Transferring Bitcoin may move Ordinals - exercise caution',
      '4. Test transactions are recommended before moving large amounts.',
      '5. Bitcoin transactions are irreversible - verify all addresses carefully.'
    ]
    
    btcInstructions.forEach((instruction) => {
      checkNewPage(25)
      yPosition = addText(instruction, margin, yPosition, 10, false, rgb(0.1, 0.1, 0.1))
      yPosition -= lineHeight * 1.2
    })
    yPosition -= sectionSpacing
  }
  
  // Section 2: NFT Marketplace and Royalty Notes (if NFTs detected)
  if (hasNFTs) {
    checkNewPage(250)
    yPosition = addText('NFT MARKETPLACE AND ROYALTY INFORMATION', margin, yPosition, 16, true, rgb(0.1, 0.1, 0.1))
    yPosition -= lineHeight * 1.5
    yPosition = addText(
      'IMPORTANT: Non-Fungible Tokens (NFTs) have unique characteristics that executors should understand:',
      margin,
      yPosition,
      11,
      true,
      colors.warning
    )
    yPosition -= lineHeight * 2
    
    const nftInstructions = [
      '1. NFTs are unique digital assets that cannot be split or divided.',
      '2. Each NFT is allocated to a specific beneficiary as a whole unit.',
      '3. NFT Marketplaces:',
      '   - OpenSea (Ethereum, Polygon, Base, Arbitrum)',
      '   - Blur (Ethereum)',
      '   - Magic Eden (Solana, Bitcoin Ordinals)',
      '   - LooksRare (Ethereum)',
      '   - Rarible (Multiple chains)',
      '4. Royalty Information:',
      '   - Some NFTs generate ongoing royalties for creators',
      '   - Royalties are typically paid automatically when NFTs are sold',
      '   - Check the NFT contract for royalty percentage (usually 2.5-10%)',
      '   - Royalties may continue to benefit heirs if NFTs are held',
      '5. Valuation Considerations:',
      '   - NFT values are highly volatile',
      '   - Use reputable marketplaces for price discovery',
      '   - Consider professional appraisals for high-value collections',
      '6. Transfer Process:',
      '   - NFTs are transferred via blockchain transactions',
      '   - Gas fees apply on Ethereum and other chains',
      '   - Verify recipient wallet addresses before transferring',
      '7. Storage: NFTs are stored on-chain, but access requires wallet control.'
    ]
    
    nftInstructions.forEach((instruction) => {
      checkNewPage(25)
      yPosition = addText(instruction, margin, yPosition, 10, false, rgb(0.1, 0.1, 0.1))
      yPosition -= lineHeight * 1.2
    })
    yPosition -= sectionSpacing
  }
  
  // Section 3: Exchange KYC and Probate Warning (if exchanges detected)
  if (hasExchanges) {
    checkNewPage(200)
    yPosition = addText('EXCHANGE ACCOUNT ACCESS AND PROBATE CONSIDERATIONS', margin, yPosition, 16, true, rgb(0.1, 0.1, 0.1))
    yPosition -= lineHeight * 1.5
    yPosition = addText(
      'WARNING: Assets held on cryptocurrency exchanges require special probate procedures:',
      margin,
      yPosition,
      11,
      true,
      colors.warning
    )
    yPosition -= lineHeight * 2
    
    const exchangeInstructions = [
      '1. Know Your Customer (KYC) Requirements:',
      '   - Exchanges require identity verification',
      '   - Executors may need to provide death certificates',
      '   - Legal documentation proving executor authority is typically required',
      '   - Process can take weeks to months',
      '2. Exchange-Specific Procedures:',
      '   - Each exchange has different probate procedures',
      '   - Contact exchange support immediately upon account holder\'s death',
      '   - Provide all requested documentation promptly',
      '3. Account Freezing:',
      '   - Exchanges may freeze accounts upon notification of death',
      '   - This protects assets but delays access',
      '   - Work with exchange legal/compliance teams',
      '4. Recommended Exchanges (with probate support):',
      '   - Coinbase (has established probate process)',
      '   - Kraken (requires legal documentation)',
      '   - Gemini (has estate planning resources)',
      '5. Consider transferring assets to self-custody wallets before death to avoid delays.'
    ]
    
    exchangeInstructions.forEach((instruction) => {
      checkNewPage(25)
      yPosition = addText(instruction, margin, yPosition, 10, false, rgb(0.1, 0.1, 0.1))
      yPosition -= lineHeight * 1.2
    })
    yPosition -= sectionSpacing
  }

  // ============================================
  // INSTRUCTIONS FOR EXECUTOR
  // ============================================
  checkNewPage(110)
  yPosition = addText('INSTRUCTIONS FOR EXECUTOR', margin, yPosition, 16, true, rgb(0.1, 0.1, 0.1))
  yPosition -= lineHeight * 1.5
  yPosition = addText(
    'The executor named above should already be aware of this document and know where to find it. The following instructions provide details for locating and accessing the crypto assets described in this document.',
    margin,
    yPosition,
    11,
    false,
    rgb(0.2, 0.2, 0.2)
  )
  yPosition -= lineHeight * 2
  
  // Split instructions into paragraphs
  const instructions = userData.keyInstructions || 'No instructions provided.'
  const instructionParagraphs = instructions.split('\n').filter(p => p.trim())
  instructionParagraphs.forEach((paragraph) => {
    checkNewPage(35)
    yPosition = addText(paragraph.trim(), margin, yPosition, 11, false, rgb(0.1, 0.1, 0.1))
    yPosition -= lineHeight * 1.5
  })
  yPosition -= sectionSpacing * 2

  // ============================================
  // ACKNOWLEDGMENT AND NOTARIZATION
  // ============================================
  checkNewPage(260)
  yPosition = addText('ACKNOWLEDGMENT AND NOTARIZATION', margin, yPosition, 16, true, rgb(0.1, 0.1, 0.1))
  yPosition -= lineHeight * 2
  
  const state = userData.ownerState || 'STATE'
  const county = '_________________'
  yPosition = addText(`State of ${state}`, margin, yPosition, 13, true, rgb(0.1, 0.1, 0.1))
  yPosition -= lineHeight
  yPosition = addText(`County of ${county}`, margin, yPosition, 13, false, rgb(0.2, 0.2, 0.2))
  yPosition -= lineHeight * 2
  
  // Professional notary acknowledgment text
  const ownerNameForNotary = userData.ownerFullName || userData.ownerName || 'the Owner'
  yPosition = addText(
    `On this _____ day of ___________, 20____, before me, a Notary Public in and for the State of ${state}, County of ${county}, personally appeared ${ownerNameForNotary}, known to me (or proved to me on the basis of satisfactory evidence) to be the person whose name is subscribed to this instrument, and acknowledged that he/she/they executed the same as their free and voluntary act for the purposes therein contained.`,
    margin,
    yPosition,
    10,
    false,
    rgb(0.1, 0.1, 0.1)
  )
  yPosition -= lineHeight * 3
  
  yPosition = addText('WITNESS my hand and official seal.', margin, yPosition, 12, true, rgb(0.1, 0.1, 0.1))
  yPosition -= lineHeight * 4
  
  // Signature blocks
  yPosition = addText('OWNER ACKNOWLEDGMENT', margin, yPosition, 12, true, rgb(0.1, 0.1, 0.1))
  yPosition -= lineHeight * 2
  yPosition = addText('Date: _________________', margin, yPosition, 11, false, rgb(0.2, 0.2, 0.2))
  yPosition -= lineHeight * 2
  yPosition = addText('Owner Signature: _________________', margin, yPosition, 11, false, rgb(0.2, 0.2, 0.2))
  yPosition -= lineHeight * 2
  yPosition = addText(`Printed Name: ${ownerNameForNotary}`, margin, yPosition, 11, false, rgb(0.2, 0.2, 0.2))
  yPosition -= lineHeight * 3
  
  yPosition = addText('NOTARY PUBLIC ACKNOWLEDGMENT', margin, yPosition, 12, true, rgb(0.1, 0.1, 0.1))
  yPosition -= lineHeight * 2
  yPosition = addText('Notary Public Signature: _________________', margin, yPosition, 11, false, rgb(0.2, 0.2, 0.2))
  yPosition -= lineHeight * 2
  yPosition = addText('Notary Printed Name: _________________', margin, yPosition, 11, false, rgb(0.2, 0.2, 0.2))
  yPosition -= lineHeight * 2
  yPosition = addText('Notary Commission Number: _________________', margin, yPosition, 11, false, rgb(0.2, 0.2, 0.2))
  yPosition -= lineHeight * 2
  yPosition = addText('Notary Commission Expires: _________________', margin, yPosition, 11, false, rgb(0.2, 0.2, 0.2))
  yPosition -= lineHeight * 3
  
  // Notary seal area
  yPosition = addText('NOTARY STAMP / SEAL AREA', margin, yPosition, 13, true, rgb(0.1, 0.1, 0.1))
  yPosition -= lineHeight * 2
  yPosition = addText('(Place notary stamp or seal in this area)', margin, yPosition, 10, false, rgb(0.5, 0.5, 0.5))
  yPosition -= lineHeight * 2
  
  // Draw a prominent box for the seal
  page.drawRectangle({
    x: margin + 50,
    y: yPosition - 50,
    width: page.getWidth() - 2 * margin - 100,
    height: 50,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 2,
  })
  yPosition -= 60

  // Update all page numbers with correct total
  const totalPages = pages.length
  pages.forEach((p, index) => {
    const pageNum = index + 1
    const footerY = 30
    p.drawLine({
      start: { x: margin, y: footerY + 10 },
      end: { x: p.getWidth() - margin, y: footerY + 10 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    })
    const footerText = `Page ${pageNum} of ${totalPages} | Document Number: ${docNumber} | Generated by LastWishCrypto on ${currentDate}`
    p.drawText(footerText, {
      x: margin,
      y: footerY - 5,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    })
    p.drawText(
      'This document is informational only and does not constitute legal, financial, or tax advice.',
      {
        x: margin,
        y: footerY - 15,
        size: 7,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      }
    )
  })

  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}
