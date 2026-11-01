'use client'

import { useState } from 'react'

interface PayButtonProps {
  invoiceId: string
  onError: (message: string) => void
}

export default function PayButton({ invoiceId, onError }: PayButtonProps) {
  const [loading, setLoading] = useState(false)

  const handlePay = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceId }),
      })

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        onError(data.error || 'Failed to initiate payment')
      }
    } catch (error) {
      console.error('Payment error:', error)
      onError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50"
    >
      {loading ? 'Processing...' : 'Pay by Card'}
    </button>
  )
}
