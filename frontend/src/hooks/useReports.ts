import { useQuery } from '@tanstack/react-query'
import {
  getMembershipSummary,
  getAttendanceSummary,
  getGivingReport,
  getSalesSummary,
  getVolunteerSummary,
  MembershipSummaryResponse,
  AttendanceSummaryResponse,
  GivingReportResponse,
  SalesSummaryResponse,
  ApiClientError,
} from '../lib/api'

export function useMembershipSummary(dateFrom: string, dateTo: string, enabled = true) {
  return useQuery<MembershipSummaryResponse, ApiClientError>({
    queryKey: ['reports', 'membership', dateFrom, dateTo],
    queryFn: () => getMembershipSummary(dateFrom, dateTo) as Promise<MembershipSummaryResponse>,
    enabled: enabled && !!dateFrom && !!dateTo,
  })
}

export function useAttendanceSummary(dateFrom: string, dateTo: string, enabled = true) {
  return useQuery<AttendanceSummaryResponse, ApiClientError>({
    queryKey: ['reports', 'attendance', dateFrom, dateTo],
    queryFn: () => getAttendanceSummary(dateFrom, dateTo) as Promise<AttendanceSummaryResponse>,
    enabled: enabled && !!dateFrom && !!dateTo,
  })
}

export function useGivingReport(dateFrom: string, dateTo: string, enabled = true) {
  return useQuery<GivingReportResponse, ApiClientError>({
    queryKey: ['reports', 'giving', dateFrom, dateTo],
    queryFn: () => getGivingReport(dateFrom, dateTo) as Promise<GivingReportResponse>,
    enabled: enabled && !!dateFrom && !!dateTo,
  })
}

export function useSalesSummary(dateFrom: string, dateTo: string, enabled = true) {
  return useQuery<SalesSummaryResponse, ApiClientError>({
    queryKey: ['reports', 'sales', dateFrom, dateTo],
    queryFn: () => getSalesSummary(dateFrom, dateTo) as Promise<SalesSummaryResponse>,
    enabled: enabled && !!dateFrom && !!dateTo,
  })
}

export function useVolunteerSummary() {
  return useQuery<{ message: string; status: string; note: string }, ApiClientError>({
    queryKey: ['reports', 'volunteer'],
    queryFn: getVolunteerSummary,
  })
}


