import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useGivingConfig, useCreatePaymentIntent, type Fund } from '@/hooks/useOnlineGiving'

// Suggested amounts
const SUGGESTED_AMOUNTS = [25, 50, 100, 250, 500, 1000]

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

// Payment Form Component
function PaymentForm({
  onSuccess,
  onError,
}: {
  onSuccess: () => void
  onError: (message: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/give/thank-you`,
      },
      redirect: 'if_required',
    })

    if (error) {
      onError(error.message || 'Payment failed')
      setIsProcessing(false)
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button
        type="submit"
        className="w-full h-12 text-lg"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? 'Processing...' : 'Complete Donation'}
      </Button>
    </form>
  )
}

// Main Giving Portal
export default function GivingPortalPage() {
  const [step, setStep] = useState<'amount' | 'details' | 'payment' | 'success'>('amount')
  const [amount, setAmount] = useState<number>(0)
  const [customAmount, setCustomAmount] = useState('')
  const [selectedFund, setSelectedFund] = useState<string>('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null)
  const [error, setError] = useState('')

  const { data: config, isLoading: loadingConfig } = useGivingConfig()
  const createPaymentIntent = useCreatePaymentIntent()

  // Initialize Stripe when config loads
  useEffect(() => {
    if (config?.stripePublicKey) {
      setStripePromise(loadStripe(config.stripePublicKey))
    }
  }, [config?.stripePublicKey])

  // Set default fund
  useEffect(() => {
    if (config?.funds && config.funds.length > 0 && !selectedFund) {
      setSelectedFund(config.funds[0].id)
    }
  }, [config?.funds, selectedFund])

  const handleAmountSelect = (cents: number) => {
    setAmount(cents)
    setCustomAmount('')
  }

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value)
    const dollars = parseFloat(value)
    if (!isNaN(dollars) && dollars > 0) {
      setAmount(Math.round(dollars * 100))
    } else {
      setAmount(0)
    }
  }

  const handleContinueToDetails = () => {
    if (amount < 100) {
      setError('Minimum donation is $1.00')
      return
    }
    setError('')
    setStep('details')
  }

  const handleContinueToPayment = async () => {
    if (!email) {
      setError('Email is required for receipt')
      return
    }
    setError('')

    try {
      const result = await createPaymentIntent.mutateAsync({
        amountCents: amount,
        fundId: selectedFund || undefined,
        email,
        name: name || undefined,
        note: note || undefined,
      })
      setClientSecret(result.clientSecret)
      setStep('payment')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment'
      setError(errorMessage)
    }
  }

  const handlePaymentSuccess = () => {
    setStep('success')
  }

  const handlePaymentError = (message: string) => {
    setError(message)
  }

  const handleStartOver = () => {
    setStep('amount')
    setAmount(0)
    setCustomAmount('')
    setName('')
    setEmail('')
    setNote('')
    setClientSecret(null)
    setError('')
  }

  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <div className="animate-pulse text-xl">Loading...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!config?.givingEnabled || !config.stripePublicKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Online Giving</CardTitle>
            <CardDescription>
              Online giving is currently not available. Please contact the church office for other giving options.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center border-b pb-6">
          <div className="text-4xl mb-2">💝</div>
          <CardTitle className="text-2xl">{config.churchName}</CardTitle>
          <CardDescription className="text-lg">Online Giving Portal</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          {/* Step 1: Amount Selection */}
          {step === 'amount' && (
            <div className="space-y-6">
              <div>
                <Label className="text-base">Select Amount</Label>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {SUGGESTED_AMOUNTS.map((cents) => (
                    <Button
                      key={cents}
                      variant={amount === cents * 100 ? 'default' : 'outline'}
                      className="h-14 text-lg"
                      onClick={() => handleAmountSelect(cents * 100)}
                    >
                      ${cents}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="customAmount">Or enter custom amount</Label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">$</span>
                  <Input
                    id="customAmount"
                    type="number"
                    min="1"
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="pl-8 h-14 text-xl"
                  />
                </div>
              </div>

              {config.funds.length > 0 && (
                <div>
                  <Label htmlFor="fund">Designate to Fund (optional)</Label>
                  <Select value={selectedFund} onValueChange={setSelectedFund}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select a fund..." />
                    </SelectTrigger>
                    <SelectContent>
                      {config.funds.map((fund: Fund) => (
                        <SelectItem key={fund.id} value={fund.id}>
                          {fund.name}
                          {fund.description && (
                            <span className="text-muted-foreground ml-2">
                              - {fund.description}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {amount > 0 && (
                <div className="text-center py-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Donation Amount</div>
                  <div className="text-3xl font-bold">{formatCurrency(amount)}</div>
                </div>
              )}

              <Button
                className="w-full h-12 text-lg"
                onClick={handleContinueToDetails}
                disabled={amount < 100}
              >
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: Donor Details */}
          {step === 'details' && (
            <div className="space-y-6">
              <div className="text-center py-4 bg-muted rounded-lg mb-6">
                <div className="text-sm text-muted-foreground">Donation Amount</div>
                <div className="text-2xl font-bold">{formatCurrency(amount)}</div>
                <Button variant="link" onClick={() => setStep('amount')}>
                  Change amount
                </Button>
              </div>

              <div>
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="email">Email (for receipt) *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="note">Note (optional)</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note to your donation..."
                  className="mt-2"
                  rows={3}
                />
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep('amount')}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleContinueToPayment}
                  disabled={createPaymentIntent.isPending}
                >
                  {createPaymentIntent.isPending ? 'Loading...' : 'Continue to Payment'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 'payment' && clientSecret && stripePromise && (
            <div className="space-y-6">
              <div className="text-center py-4 bg-muted rounded-lg mb-6">
                <div className="text-sm text-muted-foreground">Donation Amount</div>
                <div className="text-2xl font-bold">{formatCurrency(amount)}</div>
              </div>

              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#059669',
                    },
                  },
                }}
              >
                <PaymentForm
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </Elements>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep('details')}
              >
                ← Back to Details
              </Button>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="text-center space-y-6 py-8">
              <div className="text-6xl">🙏</div>
              <div>
                <h2 className="text-2xl font-bold text-green-600">Thank You!</h2>
                <p className="text-muted-foreground mt-2">
                  Your donation of {formatCurrency(amount)} has been received.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  A receipt has been sent to {email}
                </p>
              </div>
              <Button onClick={handleStartOver} variant="outline">
                Make Another Donation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

