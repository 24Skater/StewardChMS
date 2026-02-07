import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  Product,
  ProductListResponse,
  CreateProductData,
  ApiClientError,
} from '../lib/api'

export function useProducts(activeOnly?: boolean) {
  return useQuery<ProductListResponse, ApiClientError>({
    queryKey: ['products', activeOnly],
    queryFn: () => getProducts(activeOnly),
  })
}

export function useProduct(id: string) {
  return useQuery<Product, ApiClientError>({
    queryKey: ['products', id],
    queryFn: () => getProduct(id),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation<Product, ApiClientError, CreateProductData>({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation<Product, ApiClientError, { id: string; data: Partial<CreateProductData> }>({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products', id] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation<{ message: string; product: Product }, ApiClientError, string>({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}


