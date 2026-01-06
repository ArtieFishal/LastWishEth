/**
 * User-friendly error message utilities
 * Converts technical errors into messages users can understand and act on
 */

export interface UserFriendlyError {
  title: string
  message: string
  action?: string
  details?: string
}

export function getUserFriendlyError(error: any): UserFriendlyError {
  const errorMessage = error?.message || error?.toString() || 'An unknown error occurred'
  const errorString = errorMessage.toLowerCase()

  // Network errors
  if (errorString.includes('network') || errorString.includes('fetch') || errorString.includes('failed to fetch')) {
    return {
      title: 'Connection Problem',
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      action: 'Check your internet connection',
      details: 'This usually means your device is offline or the server is temporarily unavailable.'
    }
  }

  // Timeout errors
  if (errorString.includes('timeout') || errorString.includes('aborted')) {
    return {
      title: 'Request Timed Out',
      message: 'The request took too long to complete. This might be due to network congestion.',
      action: 'Please try again in a moment',
      details: 'The server may be experiencing high traffic. Waiting a few seconds and retrying usually works.'
    }
  }

  // Wallet connection errors
  if (errorString.includes('user rejected') || errorString.includes('user denied') || errorString.includes('rejected')) {
    return {
      title: 'Transaction Cancelled',
      message: 'You cancelled the transaction in your wallet.',
      action: 'Click the button again to retry',
      details: 'No action needed - you can try again whenever you\'re ready.'
    }
  }

  // Wallet not connected
  if (errorString.includes('not connected') || errorString.includes('no wallet')) {
    return {
      title: 'Wallet Not Connected',
      message: 'Please connect your wallet to continue.',
      action: 'Go to the Connect step and connect your wallet',
      details: 'You need to connect a wallet to load assets and complete the process.'
    }
  }

  // Gas errors
  if (errorString.includes('gas') || errorString.includes('insufficient funds')) {
    return {
      title: 'Transaction Failed',
      message: 'There was a problem with the transaction. This might be due to insufficient funds or gas estimation issues.',
      action: 'Make sure you have enough ETH for gas fees',
      details: 'You need ETH in your wallet to pay for transaction fees. Try refreshing and reconnecting your wallet.'
    }
  }

  // Chain errors
  if (errorString.includes('chain') || errorString.includes('network')) {
    return {
      title: 'Wrong Network',
      message: 'Please make sure you\'re connected to the correct blockchain network.',
      action: 'Switch to Ethereum Mainnet in your wallet',
      details: 'This app requires Ethereum Mainnet. Check your wallet settings to switch networks.'
    }
  }

  // API errors
  if (errorString.includes('api') || errorString.includes('500') || errorString.includes('server error')) {
    return {
      title: 'Server Error',
      message: 'The server encountered an error. This is usually temporary.',
      action: 'Please try again in a few moments',
      details: 'If the problem persists, the service may be experiencing issues. Try again later.'
    }
  }

  // Rate limiting
  if (errorString.includes('rate limit') || errorString.includes('too many requests')) {
    return {
      title: 'Too Many Requests',
      message: 'You\'re making requests too quickly. Please wait a moment before trying again.',
      action: 'Wait a few seconds and try again',
      details: 'This helps prevent server overload. A short wait usually resolves this.'
    }
  }

  // Validation errors
  if (errorString.includes('invalid') || errorString.includes('validation')) {
    return {
      title: 'Invalid Input',
      message: 'Please check your input and make sure all required fields are filled correctly.',
      action: 'Review the form and correct any errors',
      details: 'Some fields may be missing or contain invalid data. Check the highlighted fields.'
    }
  }

  // Payment verification errors
  if (errorString.includes('payment') || errorString.includes('invoice')) {
    return {
      title: 'Payment Verification Failed',
      message: 'We couldn\'t verify your payment. Make sure you sent the correct amount from your connected wallet.',
      action: 'Check your transaction and try verifying again',
      details: 'The payment may still be processing. Wait a moment and try verifying again.'
    }
  }

  // Default error
  return {
    title: 'Something Went Wrong',
    message: errorMessage.length > 100 ? errorMessage.substring(0, 100) + '...' : errorMessage,
    action: 'Please try again or refresh the page',
    details: 'If the problem continues, try refreshing the page or contact support.'
  }
}

export function formatErrorForDisplay(error: any): string {
  const friendly = getUserFriendlyError(error)
  return `${friendly.title}: ${friendly.message}`
}

