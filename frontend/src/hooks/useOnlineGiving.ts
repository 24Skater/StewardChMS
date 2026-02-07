import { useQuery, useMutation } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'

// ============================================
// Types
// ============================================

export interface Fund {
  id: string
  name: string
  description: string | null
}

export interface GivingConfig {
  stripePublicKey: string | null
  givingEnabled: boolean
  churchName: string
  funds: Fund[]
}

export interface PaymentIntentResponse {
  clientSecret: string
  paymentIntentId: string
}

export interface OnlineGivingStats {
  monthlyTotal: number
  monthlyCount: number
  yearlyTotal: number
  yearlyCount: number
  recentDonations: {
    id: string
    amountCents: number
    receivedAt: string
    donorName: string
    fundName: string
  }[]
}

// ============================================
// Hooks
// ============================================

export function useGivingConfig() {
  return useQuery({
    queryKey: ['online-giving', 'config'],
    queryFn: () => apiRequest<GivingConfig>('/online-giving/config', { auth: false }),
  })
}

export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: (data: {
      amountCents: number
      fundId?: string
      email?: string
      name?: string
      memberId?: string
      note?: string
    }) =>
      apiRequest<PaymentIntentResponse>('/online-giving/create-payment-intent', {
        method: 'POST',
        body: data,
        auth: false,
      }),
  })
}

export function useOnlineGivingStats() {
  return useQuery({
    queryKey: ['online-giving', 'stats'],
    queryFn: () => apiRequest<OnlineGivingStats>('/online-giving/stats'),
  })
}

