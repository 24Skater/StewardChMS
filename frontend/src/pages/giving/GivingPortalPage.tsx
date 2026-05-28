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
        className="w-full h-12 text-lg bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]"
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
      <div className="min-h-screen bg-gradient-to-br from-[var(--st-color-success)] via-[var(--st-primary)] to-[var(--st-primary-hover)] flex items-center justify-center">
        <Card className="w-full max-w-md border-[var(--st-border)] bg-[var(--st-surface)]">
          <CardContent className="py-12 text-center">
            <div className="animate-pulse text-xl text-[var(--st-fg)]">Loading...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!config?.givingEnabled || !config.stripePublicKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--st-color-success)] via-[var(--st-primary)] to-[var(--st-primary-hover)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-[var(--st-border)] bg-[var(--st-surface)]">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-[var(--st-fg)]">Online Giving</CardTitle>
            <CardDescription className="text-[var(--st-muted)]">
              Online giving is currently not available. Please contact the church office for other giving options.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--st-color-success)] via-[var(--st-primary)] to-[var(--st-primary-hover)] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl border-[var(--st-border)] bg-[var(--st-surface)]">
        <CardHeader className="text-center border-b border-[var(--st-border)] pb-6">
          <CardTitle className="text-2xl text-[var(--st-fg)]">{config.churchName}</CardTitle>
          <CardDescription className="text-lg text-[var(--st-muted)]">Online Giving Portal</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {error && (
            <div className="mb-6 p-4 bg-[var(--st-color-danger)]/10 text-[var(--st-color-danger)] rounded-lg border border-[var(--st-color-danger)]/30">
              {error}
            </div>
          )}

          {/* Step 1: Amount Selection */}
          {step === 'amount' && (
            <div className="space-y-6">
              <div>
                <Label className="text-base text-[var(--st-fg)]">Select Amount</Label>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {SUGGESTED_AMOUNTS.map((cents) => (
                    <Button
                      key={cents}
                      variant={amount === cents * 100 ? 'default' : 'outline'}
                      className={`h-14 text-lg ${amount === cents * 100 ? 'bg-[var(--st-primary)] text-[var(--st-fg-on-primary)]' : 'border-[var(--st-border)] text-[var(--st-fg)]'}`}
                      onClick={() => handleAmountSelect(cents * 100)}
                    >
                      ${cents}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="customAmount" className="text-[var(--st-fg)]">Or enter custom amount</Label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[var(--st-muted)]">$</span>
                  <Input
                    id="customAmount"
                    type="number"
                    min="1"
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="pl-8 h-14 text-xl bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                  />
                </div>
              </div>

              {config.funds.length > 0 && (
                <div>
                  <Label htmlFor="fund" className="text-[var(--st-fg)]">Designate to Fund (optional)</Label>
                  <Select value={selectedFund} onValueChange={setSelectedFund}>
                    <SelectTrigger className="mt-2 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]">
                      <SelectValue placeholder="Select a fund..." />
                    </SelectTrigger>
                    <SelectContent>
                      {config.funds.map((fund: Fund) => (
                        <SelectItem key={fund.id} value={fund.id}>
                          {fund.name}
                          {fund.description && (
                            <span className="text-[var(--st-muted)] ml-2">
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
                <div className="text-center py-4 bg-[var(--st-border)]/30 rounded-lg">
                  <div className="text-sm text-[var(--st-muted)]">Donation Amount</div>
                  <div className="text-3xl font-bold text-[var(--st-fg)]">{formatCurrency(amount)}</div>
                </div>
              )}

              <Button
                className="w-full h-12 text-lg bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]"
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
              <div className="text-center py-4 bg-[var(--st-border)]/30 rounded-lg mb-6">
                <div className="text-sm text-[var(--st-muted)]">Donation Amount</div>
                <div className="text-2xl font-bold text-[var(--st-fg)]">{formatCurrency(amount)}</div>
                <Button variant="link" onClick={() => setStep('amount')} className="text-[var(--st-primary)]">
                  Change amount
                </Button>
              </div>

              <div>
                <Label htmlFor="name" className="text-[var(--st-fg)]">Name (optional)</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="mt-2 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-[var(--st-fg)]">Email (for receipt) *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="mt-2 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                  required
                />
              </div>

              <div>
                <Label htmlFor="note" className="text-[var(--st-fg)]">Note (optional)</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note to your donation..."
                  className="mt-2 bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                  rows={3}
                />
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1 border-[var(--st-border)] text-[var(--st-fg)]"
                  onClick={() => setStep('amount')}
                >
                  Back
                </Button>
                <Button
                  className="flex-1 bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]"
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
              <div className="text-center py-4 bg-[var(--st-border)]/30 rounded-lg mb-6">
                <div className="text-sm text-[var(--st-muted)]">Donation Amount</div>
                <div className="text-2xl font-bold text-[var(--st-fg)]">{formatCurrency(amount)}</div>
              </div>

              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
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
                className="w-full text-[var(--st-muted)] hover:text-[var(--st-fg)]"
                onClick={() => setStep('details')}
              >
                ← Back to Details
              </Button>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="text-center space-y-6 py-8">
              <div>
                <h2 className="text-2xl font-bold text-[var(--st-color-success)]">Thank You!</h2>
                <p className="text-[var(--st-muted)] mt-2">
                  Your donation of {formatCurrency(amount)} has been received.
                </p>
                <p className="text-sm text-[var(--st-muted)] mt-1">
                  A receipt has been sent to {email}
                </p>
              </div>
              <Button onClick={handleStartOver} variant="outline" className="border-[var(--st-border)] text-[var(--st-fg)]">
                Make Another Donation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

