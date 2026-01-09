import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getInventorySummary,
  getInventoryTransactions,
  adjustInventory,
  InventorySummaryResponse,
  InventoryTransactionListResponse,
  InventoryTransaction,
  AdjustInventoryData,
  ApiClientError,
} from '../lib/api'

export function useInventorySummary(activeOnly?: boolean) {
  return useQuery<InventorySummaryResponse, ApiClientError>({
    queryKey: ['inventory', 'summary', activeOnly],
    queryFn: () => getInventorySummary(activeOnly),
  })
}

export function useInventoryTransactions(productId?: string, limit?: number) {
  return useQuery<InventoryTransactionListResponse, ApiClientError>({
    queryKey: ['inventory', 'transactions', productId, limit],
    queryFn: () => getInventoryTransactions(productId, limit),
  })
}

export function useAdjustInventory() {
  const queryClient = useQueryClient()
  return useMutation<InventoryTransaction, ApiClientError, AdjustInventoryData>({
    mutationFn: adjustInventory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

