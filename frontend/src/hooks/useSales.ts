import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSales,
  getSale,
  createSale,
  voidSale,
  Sale,
  SaleListResponse,
  SaleSearchParams,
  CreateSaleData,
  ApiClientError,
} from '../lib/api'

export function useSales(params?: SaleSearchParams) {
  return useQuery<SaleListResponse, ApiClientError>({
    queryKey: ['sales', params],
    queryFn: () => getSales(params),
  })
}

export function useSale(id: string) {
  return useQuery<Sale, ApiClientError>({
    queryKey: ['sales', id],
    queryFn: () => getSale(id),
    enabled: !!id,
  })
}

export function useCreateSale() {
  const queryClient = useQueryClient()
  return useMutation<Sale, ApiClientError, CreateSaleData>({
    mutationFn: createSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useVoidSale() {
  const queryClient = useQueryClient()
  return useMutation<Sale, ApiClientError, string>({
    mutationFn: voidSale,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['sales', id] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}


