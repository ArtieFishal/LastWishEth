'use client'

import { useState, useEffect } from 'react'
import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import axios from 'axios'

export function usePaymentVerification() {
  const [paymentRecipientAddress, setPaymentRecipientAddress] = useState<`0x${string}` | null>(null)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [paymentVerified, setPaymentVerified] = useState(false)
  const [verifyingPayment, setVerifyingPayment] = useState(false)
  const [discountCode, setDiscountCode] = useState('')
  const [discountApplied, setDiscountApplied] = useState(false)

  const { 
    data: sendTxHash, 
    sendTransaction, 
    isPending: isSendingPayment, 
    error: sendError, 
    reset: resetSendTransaction 
  } = useSendTransaction({
    mutation: {
      onError: (error) => {
        console.error('Send transaction error:', error)
      }
    }
  })

  const { isLoading: isConfirming, isSuccess: isPaymentSent } = useWaitForTransactionReceipt({
    hash: sendTxHash,
  })

  // Resolve payment recipient address (lastwish.eth)
  useEffect(() => {
    const resolvePaymentAddress = async () => {
      if (!paymentRecipientAddress) {
        try {
          const publicClient = createPublicClient({
            chain: mainnet,
            transport: http(),
          })
          const address = await publicClient.getEnsAddress({ name: 'lastwish.eth' })
          if (address) {
            setPaymentRecipientAddress(address as `0x${string}`)
          }
        } catch (error) {
          console.error('Error resolving payment address:', error)
        }
      }
    }
    resolvePaymentAddress()
  }, [paymentRecipientAddress])

  // Auto-verify payment after transaction is confirmed
  useEffect(() => {
    if (isPaymentSent && sendTxHash) {
      setPaymentVerified(true)
      // Try to verify via API in background
      setTimeout(async () => {
        if (invoiceId) {
          try {
            await axios.post('/api/invoice/status', {
              invoiceId,
            })
          } catch (error) {
            console.log('API verification failed, but transaction confirmed')
          }
        }
      }, 3000)
    }
  }, [isPaymentSent, sendTxHash, invoiceId])

  const createInvoice = async (): Promise<{ invoiceId: string; discountApplied: boolean }> => {
    try {
      const response = await axios.post('/api/invoice/create', {
        discountCode: discountCode.trim().toLowerCase(),
      })
      
      if (response.data?.invoice?.id) {
        setInvoiceId(response.data.invoice.id)
        if (response.data.discountApplied) {
          setDiscountApplied(true)
          setPaymentVerified(true)
        }
        return {
          invoiceId: response.data.invoice.id,
          discountApplied: response.data.discountApplied || false
        }
      }
      throw new Error('Failed to create invoice')
    } catch (error) {
      console.error('Error creating invoice:', error)
      throw error
    }
  }

  const sendPayment = async () => {
    if (!paymentRecipientAddress) {
      throw new Error('Payment address not resolved')
    }

    sendTransaction({
      to: paymentRecipientAddress,
      value: parseEther('0.000025'),
    })
  }

  const verifyPayment = async (fromAddress: string): Promise<boolean> => {
    if (!invoiceId) {
      throw new Error('No invoice ID')
    }

    setVerifyingPayment(true)
    try {
      const response = await axios.post('/api/invoice/status', {
        invoiceId,
        fromAddress,
      })
      
      if (response.data.status === 'paid') {
        setPaymentVerified(true)
        return true
      }
      return false
    } catch (error) {
      console.error('Error verifying payment:', error)
      return false
    } finally {
      setVerifyingPayment(false)
    }
  }

  const applyDiscountCode = (code: string): boolean => {
    const normalizedCode = code.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    if (normalizedCode === 'tryitfree') {
      setDiscountApplied(true)
      setDiscountCode(code)
      return true
    }
    return false
  }

  return {
    paymentRecipientAddress,
    invoiceId,
    paymentVerified,
    verifyingPayment,
    discountCode,
    discountApplied,
    sendTxHash,
    isSendingPayment,
    isConfirming,
    isPaymentSent,
    sendError,
    setDiscountCode,
    createInvoice,
    sendPayment,
    verifyPayment,
    applyDiscountCode,
    setPaymentVerified,
    resetSendTransaction,
  }
}

