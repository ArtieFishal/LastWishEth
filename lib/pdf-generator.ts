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
    const footerText = `Page ${pageNum} | Document Number: ${docNumber} | Generated by LastWish.eth on ${currentDate}`
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
  yPosition = addCenteredText('CRYPTO ASSET', yPosition, 32, true, colors.title)
  yPosition -= 10
  yPosition = addCenteredText('INHERITANCE INSTRUCTIONS', yPosition, 32, true, colors.title)
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
  yPosition -= 50

  // Document details box with professional styling
  const boxY = yPosition - 100
  const boxHeight = 140
  const boxWidth = page.getWidth() - 2 * margin - 100
  const boxX = margin + 50

  // Outer border
  page.drawRectangle({
    x: boxX,
    y: boxY - boxHeight,
    width: boxWidth,
    height: boxHeight,
    borderColor: colors.title,
    borderWidth: 2,
  })

  // Inner background
  addColoredBox(boxX + 2, boxY + 2, boxWidth - 4, boxHeight - 4, rgb(0.98, 0.98, 0.98), 0.5)

  let detailY = boxY - 20
  detailY = addText('Document Number:', boxX + 20, detailY, 11, false, rgb(0.4, 0.4, 0.4))
  detailY = addText(docNumber, boxX + 20, detailY, 11, true, rgb(0.1, 0.1, 0.1))
  detailY -= lineHeight * 1.5

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

  // Confidential notice with professional styling
  const noticeY = yPosition - 50
  addColoredBox(margin, noticeY + 5, page.getWidth() - 2 * margin, 50, colors.warning, 0.15)
  page.drawRectangle({
    x: margin,
    y: noticeY - 45,
    width: page.getWidth() - 2 * margin,
    height: 50,
    borderColor: colors.warning,
    borderWidth: 1.5,
  })
  
  let noticeTextY = noticeY
  noticeTextY = addText('CONFIDENTIAL DOCUMENT', margin + 20, noticeTextY, 13, true, colors.warning)
  noticeTextY -= lineHeight
  noticeTextY = addText(
    'This document contains sensitive financial information. Keep secure and share only with authorized parties.',
    margin + 20,
    noticeTextY,
    10,
    false,
    rgb(0.4, 0.4, 0.4)
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

  addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 35, colors.header, 0.15)
  page.drawRectangle({
    x: margin - 5,
    y: yPosition - 30,
    width: page.getWidth() - 2 * margin + 10,
    height: 35,
    borderColor: colors.header,
    borderWidth: 1,
  })
  yPosition = addText('TABLE OF CONTENTS', margin, yPosition, 18, true, colors.header)
  yPosition -= lineHeight * 2

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
    const titleWidth = font.widthOfTextAtSize(section.title, 11)
    const pageNumText = section.page.toString()
    const pageNumWidth = font.widthOfTextAtSize(pageNumText, 11)
    
    // Draw title
    page.drawText(section.title, {
      x: margin,
      y: yPosition,
      size: 11,
      font: font,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    // Draw dots
    const dotsStartX = margin + titleWidth + 10
    const dotsEndX = page.getWidth() - margin - pageNumWidth - 10
    const availableWidth = dotsEndX - dotsStartX
    const dotCount = Math.max(1, Math.floor(availableWidth / 6))
    const dots = '.'.repeat(dotCount)
    const dotsWidth = font.widthOfTextAtSize(dots, 11)
    page.drawText(dots, {
      x: dotsStartX,
      y: yPosition,
      size: 11,
      font: font,
      color: rgb(0.6, 0.6, 0.6),
    })
    
    // Draw page number
    page.drawText(pageNumText, {
      x: page.getWidth() - margin - pageNumWidth,
      y: yPosition,
      size: 11,
      font: font,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    yPosition -= lineHeight * 1.8
  })

  addPageNumber(2)

  // ============================================
  // LEGAL DISCLAIMER
  // ============================================
  checkNewPage(60)
  addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 30, colors.warning, 0.12)
  page.drawRectangle({
    x: margin - 5,
    y: yPosition - 25,
    width: page.getWidth() - 2 * margin + 10,
    height: 30,
    borderColor: colors.warning,
    borderWidth: 1,
  })
  yPosition = addText('LEGAL DISCLAIMER AND IMPORTANT NOTICE', margin, yPosition, 14, true, colors.warning)
  yPosition -= lineHeight * 1.5
  yPosition = addText(
    'This document is provided for informational purposes only and does not constitute legal, financial, or tax advice. The information contained herein is intended to assist the executor and beneficiaries in locating and accessing digital assets, but does not create any legal obligations or guarantees. The owner of these assets is solely responsible for ensuring the accuracy of the information provided. LastWish.eth is not a legal service provider, custodian, or executor of these instructions. Consult with qualified legal, financial, and tax professionals before taking any action based on this document. This document should be kept in a secure location and shared only with trusted parties.',
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
  addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 30, colors.header, 0.12)
  page.drawRectangle({
    x: margin - 5,
    y: yPosition - 25,
    width: page.getWidth() - 2 * margin + 10,
    height: 30,
    borderColor: colors.header,
    borderWidth: 1,
  })
  yPosition = addText('OWNER INFORMATION', margin, yPosition, 16, true, colors.header)
  yPosition -= lineHeight * 1.5
  yPosition = addText(`Full Legal Name: ${userData.ownerFullName || userData.ownerName}`, margin, yPosition, 12)
  yPosition -= lineHeight
  yPosition = addText(`Preferred Name: ${userData.ownerName}`, margin, yPosition, 12)
  yPosition -= lineHeight
  yPosition = addText(`Address: ${userData.ownerAddress}`, margin, yPosition, 12)
  yPosition -= lineHeight
  yPosition = addText(`City, State ZIP: ${userData.ownerCity}, ${userData.ownerState} ${userData.ownerZipCode}`, margin, yPosition, 12)
  yPosition -= lineHeight
  yPosition = addText(`Phone: ${userData.ownerPhone}`, margin, yPosition, 12)
  yPosition -= lineHeight * 1.5

  // Connected Wallets Section
  addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 30, colors.header, 0.12)
  page.drawRectangle({
    x: margin - 5,
    y: yPosition - 25,
    width: page.getWidth() - 2 * margin + 10,
    height: 30,
    borderColor: colors.header,
    borderWidth: 1,
  })
  yPosition = addText('CONNECTED WALLETS & VERIFICATION STATUS', margin, yPosition, 14, true, colors.header)
  yPosition -= lineHeight
  yPosition = addText('All wallet addresses used in this document with signature verification status:', margin, yPosition, 10, false, rgb(0.3, 0.3, 0.3))
  yPosition -= lineHeight * 2
  
  // Show all EVM wallets with ENS names, addresses, and verification status
  if (userData.connectedWallets.evm.length > 0) {
    userData.connectedWallets.evm.forEach((addr, index) => {
      checkNewPage(60)
      const ensName = userData.resolvedEnsNames?.[addr.toLowerCase()]
      const walletName = userData.walletNames?.[addr] || ensName
      const walletColor = colors.walletColors[index % colors.walletColors.length]
      
      // Add colored background for wallet section with border
      addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 50, walletColor, 0.12)
      page.drawRectangle({
        x: margin - 5,
        y: yPosition - 45,
        width: page.getWidth() - 2 * margin + 10,
        height: 50,
        borderColor: walletColor,
        borderWidth: 1,
      })
      
      yPosition = addText(`Wallet ${index + 1} (EVM) - VERIFIED`, margin, yPosition, 13, true, walletColor)
      yPosition -= lineHeight
      
      // Show verification badge
      addColoredBox(margin + 15, yPosition - 2, 120, 14, colors.success, 0.25)
      page.drawRectangle({
        x: margin + 15,
        y: yPosition - 14,
        width: 120,
        height: 14,
        borderColor: colors.success,
        borderWidth: 0.5,
      })
      yPosition = addText('✓ Signature Verified', margin + 20, yPosition, 10, true, colors.success)
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
  
  // Show Bitcoin wallet if present
  if (userData.connectedWallets.btc) {
    checkNewPage(35)
    addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 30, colors.bitcoin, 0.12)
    page.drawRectangle({
      x: margin - 5,
      y: yPosition - 25,
      width: page.getWidth() - 2 * margin + 10,
      height: 30,
      borderColor: colors.bitcoin,
      borderWidth: 1,
    })
    yPosition = addText(`Bitcoin Wallet:`, margin, yPosition, 13, true, colors.bitcoin)
    yPosition -= lineHeight
    yPosition = addText(`   Address: ${userData.connectedWallets.btc}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
    yPosition -= lineHeight
  }
  yPosition -= sectionSpacing
  
  // Show all beneficiary wallets with ENS names
  const beneficiaryWallets = userData.beneficiaries.filter(b => b.walletAddress && b.walletAddress.startsWith('0x'))
  if (beneficiaryWallets.length > 0) {
    checkNewPage(80)
    addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 30, colors.header, 0.12)
    page.drawRectangle({
      x: margin - 5,
      y: yPosition - 25,
      width: page.getWidth() - 2 * margin + 10,
      height: 30,
      borderColor: colors.header,
      borderWidth: 1,
    })
    yPosition = addText('BENEFICIARY WALLETS (ENS)', margin, yPosition, 14, true, colors.header)
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

  // ============================================
  // EXECUTOR INFORMATION
  // ============================================
  checkNewPage(130)
  addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 30, colors.header, 0.12)
  page.drawRectangle({
    x: margin - 5,
    y: yPosition - 25,
    width: page.getWidth() - 2 * margin + 10,
    height: 30,
    borderColor: colors.header,
    borderWidth: 1,
  })
  yPosition = addText('EXECUTOR INFORMATION', margin, yPosition, 16, true, colors.header)
  yPosition -= lineHeight * 1.5
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

  // ============================================
  // BENEFICIARIES
  // ============================================
  checkNewPage(80)
  addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 30, colors.header, 0.12)
  page.drawRectangle({
    x: margin - 5,
    y: yPosition - 25,
    width: page.getWidth() - 2 * margin + 10,
    height: 30,
    borderColor: colors.header,
    borderWidth: 1,
  })
  yPosition = addText('BENEFICIARIES', margin, yPosition, 16, true, colors.header)
  yPosition -= lineHeight * 1.5
  userData.beneficiaries.forEach((ben, index) => {
    checkNewPage(55)
    // Add subtle background for each beneficiary
    addColoredBox(margin, yPosition - 2, page.getWidth() - 2 * margin, 50, rgb(0.95, 0.95, 0.95), 0.3)
    yPosition = addText(`${index + 1}. ${ben.name}`, margin + 10, yPosition, 13, true, rgb(0.1, 0.1, 0.1))
    yPosition -= lineHeight
    
    // Show ENS name prominently if available
    if (ben.ensName) {
      yPosition = addText(`   ENS Name: ${ben.ensName}`, margin + 20, yPosition, 11, true, colors.ens)
      yPosition -= lineHeight
      yPosition = addText(`   Wallet Address: ${ben.walletAddress}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
    } else {
      yPosition = addText(`   Wallet Address: ${ben.walletAddress}`, margin + 20, yPosition, 10, false, rgb(0.3, 0.3, 0.3))
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
  addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 35, colors.title, 0.15)
  page.drawRectangle({
    x: margin - 5,
    y: yPosition - 30,
    width: page.getWidth() - 2 * margin + 10,
    height: 35,
    borderColor: colors.title,
    borderWidth: 1.5,
  })
  yPosition = addText('EXECUTIVE SUMMARY: ASSET ALLOCATIONS BY WALLET & CHAIN', margin, yPosition, 15, true, colors.title)
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
    
    const provider = walletProviders?.[walletAddr] || asset.walletProvider || (asset.chain === 'bitcoin' ? 'Xverse' : 'Unknown Wallet')
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
    
    checkNewPage(70)
    addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 60, walletColor, 0.12)
    page.drawRectangle({
      x: margin - 5,
      y: yPosition - 55,
      width: page.getWidth() - 2 * margin + 10,
      height: 60,
      borderColor: walletColor,
      borderWidth: 1.5,
    })
    yPosition = addText(`WALLET ${walletIndex + 1}`, margin, yPosition, 14, true, walletColor)
    yPosition -= lineHeight
    yPosition = addText(`Wallet App: ${walletProvider}`, margin + 20, yPosition, 12, true, walletColor)
    yPosition -= lineHeight
    if (walletEnsName && walletEnsName !== walletAddr) {
      yPosition = addText(`ENS: ${walletEnsName}`, margin + 20, yPosition, 11, true, colors.ens)
      yPosition -= lineHeight
    }
    yPosition = addText(`Address: ${walletAddr}`, margin + 20, yPosition, 10, false, rgb(0.2, 0.2, 0.2))
    yPosition -= lineHeight * 1.5
    
    for (const chainGroup of chainGroups) {
      const chainColor = colors.walletColors[walletGroups[walletAddr].indexOf(chainGroup) % colors.walletColors.length]
      checkNewPage(45)
      addColoredBox(margin + 15, yPosition + 3, page.getWidth() - 2 * margin - 30, 25, chainColor, 0.12)
      page.drawRectangle({
        x: margin + 15,
        y: yPosition - 22,
        width: page.getWidth() - 2 * margin - 30,
        height: 25,
        borderColor: chainColor,
        borderWidth: 1,
      })
      yPosition = addText(`  CHAIN: ${chainGroup.chain.toUpperCase()}`, margin + 20, yPosition, 12, true, chainColor)
      yPosition -= lineHeight
      
      for (const asset of chainGroup.assets) {
        const assetAllocations = userData.allocations.filter((a) => a.assetId === asset.id)
        if (assetAllocations.length === 0) continue
        
        const isNFT = asset.type === 'erc721' || asset.type === 'erc1155'
        checkNewPage(isNFT ? 100 : 35)
        
        // Determine asset color
        let assetColor = colors.currency
        let assetBgColor = colors.currency
        if (isNFT) {
          assetColor = colors.nft
          assetBgColor = colors.nft
        } else if (asset.type === 'native') {
          assetColor = colors.native
          assetBgColor = colors.native
        } else if (asset.type === 'btc') {
          assetColor = colors.bitcoin
          assetBgColor = colors.bitcoin
        }
        
        // Add colored background for asset with border
        addColoredBox(margin + 25, yPosition + 2, page.getWidth() - 2 * margin - 50, isNFT ? 90 : 30, assetBgColor, 0.1)
        page.drawRectangle({
          x: margin + 25,
          y: yPosition - (isNFT ? 88 : 28),
          width: page.getWidth() - 2 * margin - 50,
          height: isNFT ? 90 : 30,
          borderColor: assetBgColor,
          borderWidth: 0.5,
        })
        
        // For NFTs, try to embed and display the image
        if (isNFT && asset.imageUrl) {
          try {
            const nftImage = await fetchAndEmbedImage(pdfDoc, asset.imageUrl)
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
              yPosition = imageY - 10
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
  addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 30, colors.header, 0.12)
  page.drawRectangle({
    x: margin - 5,
    y: yPosition - 25,
    width: page.getWidth() - 2 * margin + 10,
    height: 30,
    borderColor: colors.header,
    borderWidth: 1,
  })
  yPosition = addText('DETAILED ASSET ALLOCATIONS (BY CHAIN)', margin, yPosition, 15, true, colors.header)
  yPosition -= lineHeight * 1.5

  // Group allocations by chain
  const chains = [...new Set(assets.map((a) => a.chain))]
  for (const chain of chains) {
    const chainAssets = assets.filter((a) => a.chain === chain)
    checkNewPage(55)
    const chainColor = colors.walletColors[chains.indexOf(chain) % colors.walletColors.length]
    addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 25, chainColor, 0.12)
    page.drawRectangle({
      x: margin - 5,
      y: yPosition - 20,
      width: page.getWidth() - 2 * margin + 10,
      height: 25,
      borderColor: chainColor,
      borderWidth: 1,
    })
    yPosition = addText(`Chain: ${chain.toUpperCase()}`, margin, yPosition, 13, true, chainColor)
    yPosition -= lineHeight

    for (const asset of chainAssets) {
      const assetAllocations = userData.allocations.filter((a) => a.assetId === asset.id)
      if (assetAllocations.length === 0) continue

      checkNewPage(40)
      
      // Determine asset color
      let assetColor = colors.currency
      let assetBgColor = colors.currency
      const isNFT = asset.type === 'erc721' || asset.type === 'erc1155'
      if (isNFT) {
        assetColor = colors.nft
        assetBgColor = colors.nft
      } else if (asset.type === 'native') {
        assetColor = colors.native
        assetBgColor = colors.native
      } else if (asset.type === 'btc') {
        assetColor = colors.bitcoin
        assetBgColor = colors.bitcoin
      }
      
      // Add colored background for asset
      addColoredBox(margin + 15, yPosition + 3, page.getWidth() - 2 * margin - 30, 35, assetBgColor, 0.08)
      page.drawRectangle({
        x: margin + 15,
        y: yPosition - 32,
        width: page.getWidth() - 2 * margin - 30,
        height: 35,
        borderColor: assetBgColor,
        borderWidth: 0.5,
      })
      
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
  // INSTRUCTIONS FOR EXECUTOR
  // ============================================
  checkNewPage(110)
  addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 30, colors.header, 0.12)
  page.drawRectangle({
    x: margin - 5,
    y: yPosition - 25,
    width: page.getWidth() - 2 * margin + 10,
    height: 30,
    borderColor: colors.header,
    borderWidth: 1,
  })
  yPosition = addText('INSTRUCTIONS FOR EXECUTOR', margin, yPosition, 16, true, colors.header)
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
    // Add subtle background for each paragraph
    addColoredBox(margin, yPosition - 2, page.getWidth() - 2 * margin, 25, rgb(0.98, 0.98, 0.98), 0.3)
    yPosition = addText(paragraph.trim(), margin + 10, yPosition, 11, false, rgb(0.1, 0.1, 0.1))
    yPosition -= lineHeight * 1.5
  })
  yPosition -= sectionSpacing * 2

  // ============================================
  // ACKNOWLEDGMENT AND NOTARIZATION
  // ============================================
  checkNewPage(260)
  addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 35, colors.header, 0.12)
  page.drawRectangle({
    x: margin - 5,
    y: yPosition - 30,
    width: page.getWidth() - 2 * margin + 10,
    height: 35,
    borderColor: colors.header,
    borderWidth: 1.5,
  })
  yPosition = addText('ACKNOWLEDGMENT AND NOTARIZATION', margin, yPosition, 16, true, colors.header)
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
  
  // Signature blocks with professional styling
  addColoredBox(margin, yPosition + 5, page.getWidth() - 2 * margin, 80, rgb(0.97, 0.97, 0.97), 0.5)
  page.drawRectangle({
    x: margin,
    y: yPosition - 75,
    width: page.getWidth() - 2 * margin,
    height: 80,
    borderColor: colors.header,
    borderWidth: 1,
  })
  
  yPosition = addText('OWNER ACKNOWLEDGMENT', margin + 20, yPosition, 12, true, colors.header)
  yPosition -= lineHeight * 2
  yPosition = addText('Date: _________________', margin + 20, yPosition, 11, false, rgb(0.2, 0.2, 0.2))
  yPosition -= lineHeight * 2
  yPosition = addText('Owner Signature: _________________', margin + 20, yPosition, 11, false, rgb(0.2, 0.2, 0.2))
  yPosition -= lineHeight * 2
  yPosition = addText(`Printed Name: ${ownerNameForNotary}`, margin + 20, yPosition, 11, false, rgb(0.2, 0.2, 0.2))
  yPosition -= lineHeight * 3
  
  addColoredBox(margin, yPosition + 5, page.getWidth() - 2 * margin, 100, rgb(0.97, 0.97, 0.97), 0.5)
  page.drawRectangle({
    x: margin,
    y: yPosition - 95,
    width: page.getWidth() - 2 * margin,
    height: 100,
    borderColor: colors.header,
    borderWidth: 1,
  })
  
  yPosition = addText('NOTARY PUBLIC ACKNOWLEDGMENT', margin + 20, yPosition, 12, true, colors.header)
  yPosition -= lineHeight * 2
  yPosition = addText('Notary Public Signature: _________________', margin + 20, yPosition, 11, false, rgb(0.2, 0.2, 0.2))
  yPosition -= lineHeight * 2
  yPosition = addText('Notary Printed Name: _________________', margin + 20, yPosition, 11, false, rgb(0.2, 0.2, 0.2))
  yPosition -= lineHeight * 2
  yPosition = addText('Notary Commission Number: _________________', margin + 20, yPosition, 11, false, rgb(0.2, 0.2, 0.2))
  yPosition -= lineHeight * 2
  yPosition = addText('Notary Commission Expires: _________________', margin + 20, yPosition, 11, false, rgb(0.2, 0.2, 0.2))
  yPosition -= lineHeight * 3
  
  // Notary seal area with professional styling
  addColoredBox(margin - 5, yPosition + 5, page.getWidth() - 2 * margin + 10, 90, rgb(0.95, 0.95, 0.95), 0.4)
  page.drawRectangle({
    x: margin - 5,
    y: yPosition - 85,
    width: page.getWidth() - 2 * margin + 10,
    height: 90,
    borderColor: colors.header,
    borderWidth: 2,
  })
  yPosition = addText('NOTARY STAMP / SEAL AREA', margin, yPosition, 13, true, colors.header)
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
    const footerText = `Page ${pageNum} of ${totalPages} | Document Number: ${docNumber} | Generated by LastWish.eth on ${currentDate}`
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
