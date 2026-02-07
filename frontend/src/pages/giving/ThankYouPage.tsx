import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ThankYouPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const paymentIntentStatus = searchParams.get('redirect_status')
    
    if (paymentIntentStatus === 'succeeded') {
      setStatus('success')
      setMessage('Your donation has been processed successfully.')
    } else if (paymentIntentStatus === 'processing') {
      setStatus('success')
      setMessage('Your payment is being processed. You will receive confirmation shortly.')
    } else if (paymentIntentStatus === 'requires_payment_method') {
      setStatus('error')
      setMessage('Payment was not completed. Please try again.')
    } else {
      // No redirect status means we arrived here directly (e.g., non-redirect flow)
      setStatus('success')
      setMessage('Thank you for your generous donation!')
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          {status === 'loading' && (
            <>
              <div className="text-6xl mb-4">⏳</div>
              <CardTitle>Processing...</CardTitle>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="text-6xl mb-4">🙏</div>
              <CardTitle className="text-2xl text-green-600">Thank You!</CardTitle>
              <CardDescription className="text-lg mt-2">
                {message}
              </CardDescription>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="text-6xl mb-4">❌</div>
              <CardTitle className="text-2xl text-red-600">Payment Issue</CardTitle>
              <CardDescription className="text-lg mt-2">
                {message}
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button asChild>
            <Link to="/give">Make Another Donation</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">Return to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

