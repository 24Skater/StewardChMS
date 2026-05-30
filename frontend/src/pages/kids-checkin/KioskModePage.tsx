import { useState, useEffect, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { apiRequest } from '@/lib/api'
import { Sun, Moon } from 'lucide-react'
import { useKioskTheme } from '@/hooks/useKioskTheme'

// Types for kiosk mode
interface Child {
  id: string
  firstName: string
  lastName: string
  allergies: string | null
  medicalNotes: string | null
}

interface Occurrence {
  id: string
  startsAt: string
  event: {
    id: string
    title: string
  }
}

interface CheckInLabel {
  childName: string
  eventName: string
  securityCode: string
  allergies: string | null
  medicalNotes: string | null
  checkedInAt: string
}

function Label({ data }: { data: CheckInLabel }) {
  return (
    <div className="p-6 border-2 border-dashed border-gray-400 bg-white text-black font-mono">
      <div className="text-center border-b-2 pb-4 mb-4">
        <div className="text-2xl font-bold">KIDS CHECK-IN</div>
        <div className="text-lg">{data.eventName}</div>
      </div>
      <div className="space-y-3">
        <div className="text-3xl font-bold text-center">{data.childName}</div>
        <div className="text-5xl font-bold text-center tracking-[0.5em] bg-gray-100 py-4 rounded-lg">
          {data.securityCode}
        </div>
        {data.allergies && (
          <div className="bg-red-100 text-red-800 p-3 rounded-lg text-lg">
            <strong>ALLERGIES:</strong> {data.allergies}
          </div>
        )}
        {data.medicalNotes && (
          <div className="bg-yellow-100 text-yellow-800 p-3 rounded-lg text-lg">
            <strong>MEDICAL:</strong> {data.medicalNotes}
          </div>
        )}
        <div className="text-sm text-gray-600 text-center pt-4 border-t">
          {new Date(data.checkedInAt).toLocaleString()}
        </div>
      </div>
    </div>
  )
}

export default function KioskModePage() {
  const [step, setStep] = useState<'phone' | 'select-child' | 'select-event' | 'confirm' | 'complete' | 'checkout'>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [children, setChildren] = useState<Child[]>([])
  const [occurrences, setOccurrences] = useState<Occurrence[]>([])
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(null)
  const [labelData, setLabelData] = useState<CheckInLabel | null>(null)
  const [checkoutCode, setCheckoutCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const labelRef = useRef<HTMLDivElement>(null)

  const { isDark, toggle } = useKioskTheme()

  const handlePrint = useReactToPrint({
    contentRef: labelRef,
    documentTitle: 'Check-in Label',
  })

  // Auto-reset after 60 seconds of inactivity
  useEffect(() => {
    const timer = setTimeout(() => {
      if (step !== 'phone') {
        resetToStart()
      }
    }, 60000)
    return () => clearTimeout(timer)
  }, [step, phoneNumber, selectedChild, selectedOccurrence])

  // Load occurrences on mount
  useEffect(() => {
    loadOccurrences()
  }, [])

  const loadOccurrences = async () => {
    try {
      const data = await apiRequest<Occurrence[]>('/kids-checkin/occurrences', { auth: false })
      setOccurrences(data)
    } catch (err) {
      console.error('Failed to load occurrences:', err)
    }
  }

  const resetToStart = () => {
    setStep('phone')
    setPhoneNumber('')
    setChildren([])
    setSelectedChild(null)
    setSelectedOccurrence(null)
    setLabelData(null)
    setCheckoutCode('')
    setError('')
  }

  const handlePhoneSubmit = async () => {
    if (phoneNumber.length < 10) {
      setError('Please enter a valid phone number')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Search for children by phone number (via household)
      const response = await apiRequest<{ children: Child[] }>(`/kids-checkin/lookup?phone=${encodeURIComponent(phoneNumber)}`, { auth: false })
      if (response.children.length === 0) {
        setError('No children found for this phone number. Please see a volunteer.')
        setLoading(false)
        return
      }
      setChildren(response.children)
      setStep('select-child')
    } catch {
      // Fallback: fetch all children (for demo purposes when lookup endpoint doesn't exist)
      try {
        const allChildren = await apiRequest<Child[]>('/kids-checkin/children', { auth: false })
        setChildren(allChildren.slice(0, 5)) // Limit for demo
        setStep('select-child')
      } catch {
        setError('Unable to find children. Please see a volunteer.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChildSelect = (child: Child) => {
    setSelectedChild(child)
    if (occurrences.length === 1) {
      setSelectedOccurrence(occurrences[0])
      setStep('confirm')
    } else if (occurrences.length > 1) {
      setStep('select-event')
    } else {
      setError('No events available today. Please see a volunteer.')
    }
  }

  const handleEventSelect = (occurrence: Occurrence) => {
    setSelectedOccurrence(occurrence)
    setStep('confirm')
  }

  const handleCheckIn = async () => {
    if (!selectedChild || !selectedOccurrence) return

    setLoading(true)
    setError('')

    try {
      const response = await apiRequest<{ label: CheckInLabel }>('/kids-checkin/checkin', {
        method: 'POST',
        body: {
          memberId: selectedChild.id,
          occurrenceId: selectedOccurrence.id,
        },
        auth: false,
      })
      setLabelData(response.label)
      setStep('complete')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Check-in failed. Please see a volunteer.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async () => {
    if (checkoutCode.length !== 4) {
      setError('Please enter a 4-character security code')
      return
    }

    setLoading(true)
    setError('')

    try {
      await apiRequest('/kids-checkin/checkout', {
        method: 'POST',
        body: { securityCode: checkoutCode },
        auth: false,
      })
      // Show success briefly then reset
      setError('')
      setTimeout(resetToStart, 2000)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid security code'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div data-testid="kiosk-root" className={`relative ${isDark ? 'dark' : ''}`}>
    <div className="min-h-screen bg-gradient-to-br from-[var(--st-primary)] via-purple-600 to-[var(--st-color-success)] flex items-center justify-center p-4">
      <Card className="w-full max-w-xl shadow-2xl bg-[var(--st-surface)] border-[var(--st-border)]">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-bold text-[var(--st-fg)]">Kids Check-In</CardTitle>
          <CardDescription className="text-lg text-[var(--st-muted)]">
            {step === 'phone' && 'Enter your phone number to get started'}
            {step === 'select-child' && 'Select your child'}
            {step === 'select-event' && 'Select the event'}
            {step === 'confirm' && 'Confirm check-in'}
            {step === 'complete' && 'Check-in complete!'}
            {step === 'checkout' && 'Enter security code to check out'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-[var(--st-color-danger)]/10 text-[var(--st-color-danger)] p-4 rounded-lg text-center text-lg border border-[var(--st-color-danger)]/30">
              {error}
            </div>
          )}

          {/* Phone Number Entry */}
          {step === 'phone' && (
            <div className="space-y-6">
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="(555) 123-4567"
                className="text-3xl text-center h-20 tracking-wider bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                maxLength={10}
                autoFocus
              />
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((num, i) => (
                  <Button
                    key={i}
                    variant={num === '' ? 'ghost' : 'outline'}
                    className="h-16 text-2xl font-bold border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
                    disabled={num === ''}
                    onClick={() => {
                      if (num === '⌫') {
                        setPhoneNumber((p) => p.slice(0, -1))
                      } else {
                        setPhoneNumber((p) => (p + num).slice(0, 10))
                      }
                    }}
                  >
                    {num}
                  </Button>
                ))}
              </div>
              <div className="flex gap-4">
                <Button
                  className="flex-1 h-16 text-xl bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]"
                  onClick={handlePhoneSubmit}
                  disabled={phoneNumber.length < 10 || loading}
                >
                  {loading ? 'Looking up...' : 'Check In'}
                </Button>
                <Button
                  variant="outline"
                  className="h-16 text-xl px-8 border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
                  onClick={() => setStep('checkout')}
                >
                  Check Out
                </Button>
              </div>
            </div>
          )}

          {/* Child Selection */}
          {step === 'select-child' && (
            <div className="space-y-4">
              {children.map((child) => (
                <Button
                  key={child.id}
                  variant="outline"
                  className="w-full h-20 text-xl justify-start px-6 border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
                  onClick={() => handleChildSelect(child)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[var(--st-primary)]/10 flex items-center justify-center text-2xl text-[var(--st-primary)]">
                      {child.firstName[0]}
                    </div>
                    <div className="text-left">
                      <div className="font-bold">{child.firstName} {child.lastName}</div>
                      {child.allergies && (
                        <div className="text-sm text-[var(--st-color-danger)]">Allergies</div>
                      )}
                    </div>
                  </div>
                </Button>
              ))}
              <Button variant="ghost" className="w-full text-[var(--st-muted)] hover:text-[var(--st-fg)]" onClick={resetToStart}>
                ← Back
              </Button>
            </div>
          )}

          {/* Event Selection */}
          {step === 'select-event' && (
            <div className="space-y-4">
              {occurrences.map((occ) => (
                <Button
                  key={occ.id}
                  variant="outline"
                  className="w-full h-16 text-lg border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]"
                  onClick={() => handleEventSelect(occ)}
                >
                  {occ.event.title} - {new Date(occ.startsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </Button>
              ))}
              <Button variant="ghost" className="w-full text-[var(--st-muted)] hover:text-[var(--st-fg)]" onClick={() => setStep('select-child')}>
                ← Back
              </Button>
            </div>
          )}

          {/* Confirmation */}
          {step === 'confirm' && selectedChild && selectedOccurrence && (
            <div className="space-y-6">
              <div className="bg-[var(--st-surface-muted)] border border-[var(--st-border)] p-6 rounded-lg space-y-2">
                <div className="text-2xl font-bold text-center text-[var(--st-fg)]">
                  {selectedChild.firstName} {selectedChild.lastName}
                </div>
                <div className="text-lg text-center text-[var(--st-muted)]">
                  {selectedOccurrence.event.title}
                </div>
                {selectedChild.allergies && (
                  <div className="bg-[var(--st-color-danger)]/10 text-[var(--st-color-danger)] p-3 rounded-lg text-center border border-[var(--st-color-danger)]/30">
                    Allergies: {selectedChild.allergies}
                  </div>
                )}
              </div>
              <Button
                className="w-full h-16 text-xl bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]"
                onClick={handleCheckIn}
                disabled={loading}
              >
                {loading ? 'Checking in...' : 'Confirm Check-In'}
              </Button>
              <Button variant="ghost" className="w-full text-[var(--st-muted)] hover:text-[var(--st-fg)]" onClick={() => setStep('select-child')}>
                ← Back
              </Button>
            </div>
          )}

          {/* Complete - Show Label */}
          {step === 'complete' && labelData && (
            <div className="space-y-6">
              <div className="text-center text-[var(--st-color-success)] text-xl font-bold">
                ✓ Check-in successful!
              </div>
              <div ref={labelRef}>
                <Label data={labelData} />
              </div>
              <div className="flex gap-4">
                <Button className="flex-1 h-16 text-lg bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]" onClick={() => handlePrint()}>
                  Print Label
                </Button>
                <Button variant="outline" className="flex-1 h-16 text-lg border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[var(--st-surface-hover)]" onClick={resetToStart}>
                  Done
                </Button>
              </div>
            </div>
          )}

          {/* Checkout */}
          {step === 'checkout' && (
            <div className="space-y-6">
              <Input
                value={checkoutCode}
                onChange={(e) => setCheckoutCode(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="XXXX"
                className="text-4xl text-center h-20 tracking-[0.5em] font-mono bg-[var(--st-surface)] border-[var(--st-border)] text-[var(--st-fg)]"
                maxLength={4}
                autoFocus
              />
              <Button
                className="w-full h-16 text-xl bg-[var(--st-primary)] text-[var(--st-fg-on-primary)] hover:bg-[var(--st-primary-hover)]"
                onClick={handleCheckout}
                disabled={checkoutCode.length !== 4 || loading}
              >
                {loading ? 'Checking out...' : 'Check Out'}
              </Button>
              <Button variant="ghost" className="w-full text-[var(--st-muted)] hover:text-[var(--st-fg)]" onClick={resetToStart}>
                ← Back to Check-In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print Dialog (hidden) */}
      <Dialog open={false}>
        <DialogContent className="bg-[var(--st-surface)] border-[var(--st-border)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--st-fg)]">Print Label</DialogTitle>
            <DialogDescription className="text-[var(--st-muted)]">
              Click print to print the check-in label
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
      {/* Theme toggle */}
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className={`absolute bottom-4 right-4 w-9 h-9 rounded-full flex items-center justify-center border shadow-md hover:opacity-80 transition-opacity ${
          isDark
            ? 'bg-white/20 backdrop-blur-sm border-white/30 text-white'
            : 'bg-white/90 border-gray-300 text-gray-700'
        }`}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </div>
  )
}

