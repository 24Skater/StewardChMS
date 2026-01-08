import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMessageTemplates,
  getMessageTemplate,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  getMessages,
  getMessage,
  getMessageRecipients,
  getMessageStats,
  sendMessage,
  getMemberOptIn,
  updateMemberOptIn,
  MessageTemplateSearchParams,
  CreateMessageTemplateData,
  MessageSearchParams,
  CreateMessageData,
  RecipientSearchParams,
  MemberOptInPreferences,
} from '../lib/api'

// ============================================
// Message Template Hooks
// ============================================

export function useMessageTemplates(params: MessageTemplateSearchParams = {}) {
  return useQuery({
    queryKey: ['messageTemplates', params],
    queryFn: () => getMessageTemplates(params),
  })
}

export function useMessageTemplate(id: string) {
  return useQuery({
    queryKey: ['messageTemplate', id],
    queryFn: () => getMessageTemplate(id),
    enabled: !!id,
  })
}

export function useCreateMessageTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateMessageTemplateData) => createMessageTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageTemplates'] })
    },
  })
}

export function useUpdateMessageTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateMessageTemplateData> }) =>
      updateMessageTemplate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['messageTemplates'] })
      queryClient.invalidateQueries({ queryKey: ['messageTemplate', id] })
    },
  })
}

export function useDeleteMessageTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => deleteMessageTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageTemplates'] })
    },
  })
}

// ============================================
// Message Hooks
// ============================================

export function useMessages(params: MessageSearchParams = {}) {
  return useQuery({
    queryKey: ['messages', params],
    queryFn: () => getMessages(params),
  })
}

export function useMessage(id: string) {
  return useQuery({
    queryKey: ['message', id],
    queryFn: () => getMessage(id),
    enabled: !!id,
  })
}

export function useMessageRecipients(messageId: string, params: RecipientSearchParams = {}) {
  return useQuery({
    queryKey: ['messageRecipients', messageId, params],
    queryFn: () => getMessageRecipients(messageId, params),
    enabled: !!messageId,
  })
}

export function useMessageStats(messageId: string) {
  return useQuery({
    queryKey: ['messageStats', messageId],
    queryFn: () => getMessageStats(messageId),
    enabled: !!messageId,
    // Refetch every 5 seconds while viewing to update delivery status
    refetchInterval: 5000,
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateMessageData) => sendMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })
}

// ============================================
// Opt-In Preference Hooks
// ============================================

export function useMemberOptIn(memberId: string) {
  return useQuery({
    queryKey: ['memberOptIn', memberId],
    queryFn: () => getMemberOptIn(memberId),
    enabled: !!memberId,
  })
}

export function useUpdateMemberOptIn() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: Partial<MemberOptInPreferences> }) =>
      updateMemberOptIn(memberId, data),
    onSuccess: (_, { memberId }) => {
      queryClient.invalidateQueries({ queryKey: ['memberOptIn', memberId] })
    },
  })
}

