import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getWorshipPlan,
  createWorshipPlan,
  updateWorshipPlan,
  createWorshipPlanItem,
  updateWorshipPlanItem,
  deleteWorshipPlanItem,
  reorderWorshipPlanItems,
  CreateWorshipPlanData,
  CreateWorshipPlanItemData,
} from '../lib/api'

export function useWorshipPlan(occurrenceId: string | undefined) {
  return useQuery({
    queryKey: ['worship-plans', occurrenceId],
    queryFn: () => getWorshipPlan(occurrenceId!),
    enabled: !!occurrenceId,
    retry: false, // Don't retry on 404 (plan may not exist yet)
  })
}

export function useCreateWorshipPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ occurrenceId, data }: { occurrenceId: string; data?: CreateWorshipPlanData }) =>
      createWorshipPlan(occurrenceId, data),
    onSuccess: (_, { occurrenceId }) => {
      queryClient.invalidateQueries({ queryKey: ['worship-plans', occurrenceId] })
      queryClient.invalidateQueries({ queryKey: ['occurrences', occurrenceId] })
    },
  })
}

export function useUpdateWorshipPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateWorshipPlanData; occurrenceId: string }) =>
      updateWorshipPlan(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['worship-plans', variables.occurrenceId] })
    },
  })
}

export function useCreateWorshipPlanItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: CreateWorshipPlanItemData; occurrenceId: string }) =>
      createWorshipPlanItem(planId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['worship-plans', variables.occurrenceId] })
    },
  })
}

export function useUpdateWorshipPlanItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: Partial<CreateWorshipPlanItemData>; occurrenceId: string }) =>
      updateWorshipPlanItem(itemId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['worship-plans', variables.occurrenceId] })
    },
  })
}

export function useDeleteWorshipPlanItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId }: { itemId: string; occurrenceId: string }) =>
      deleteWorshipPlanItem(itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['worship-plans', variables.occurrenceId] })
    },
  })
}

export function useReorderWorshipPlanItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ planId, items }: { planId: string; items: Array<{ id: string; sortOrder: number }>; occurrenceId: string }) =>
      reorderWorshipPlanItems(planId, items),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['worship-plans', variables.occurrenceId] })
    },
  })
}

