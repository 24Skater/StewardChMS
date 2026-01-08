/**
 * API Client with authentication support
 * 
 * Storage Strategy: localStorage
 * 
 * ⚠️ Security Note:
 * localStorage is vulnerable to XSS attacks. For production, consider:
 * - httpOnly cookies (requires backend changes)
 * - Secure flag on cookies
 * - SameSite cookie attribute
 * 
 * For this phase, localStorage is used for simplicity.
 * Token is stored under 'auth_token' key.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'auth_token'

// ============================================
// Token Management
// ============================================

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

// ============================================
// API Client
// ============================================

export interface ApiError {
  error: string
  message?: string
  details?: Record<string, string[]>
}

export class ApiClientError extends Error {
  status: number
  data: ApiError

  constructor(status: number, data: ApiError) {
    super(data.error || 'API Error')
    this.status = status
    this.data = data
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new ApiClientError(response.status, data)
  }
  return response.json()
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  auth?: boolean
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, auth = true } = options

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (auth) {
    const token = getToken()
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  })

  return handleResponse<T>(response)
}

// ============================================
// Auth API Functions
// ============================================

export interface LoginRequest {
  email: string
  password: string
}

export interface User {
  id: string
  email: string
  name: string | null
  roles: string[]
  permissions: string[]
}

export interface LoginResponse {
  token: string
  user: User
}

export interface UserSummary extends User {
  isActive: boolean
  createdAt: string
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: data,
    auth: false,
  })
  
  // Store token on successful login
  setToken(response.token)
  
  return response
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/auth/logout', { method: 'POST' })
  } finally {
    // Always remove token, even if API call fails
    removeToken()
  }
}

export async function getMe(): Promise<UserSummary> {
  return apiRequest<UserSummary>('/auth/me')
}

// ============================================
// Member API Functions
// ============================================

export type MemberStatus = 'active' | 'inactive' | 'visitor'

export interface Member {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
  dateOfBirth: string | null
  status: MemberStatus
  notes?: string | null
  profilePhotoUrl: string | null
  createdAt: string
  updatedAt: string
  households?: Array<{
    id: string
    householdId: string
    householdName: string | null
    relationshipType: string
  }>
}

export interface MemberListResponse {
  members: Member[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface MemberSearchParams {
  search?: string
  status?: MemberStatus
  page?: number
  limit?: number
}

export interface CreateMemberData {
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  street?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  dateOfBirth?: string | null
  status?: MemberStatus
  notes?: string | null
  profilePhotoUrl?: string | null
}

export async function getMembers(params: MemberSearchParams = {}): Promise<MemberListResponse> {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)
  if (params.status) searchParams.set('status', params.status)
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.limit) searchParams.set('limit', params.limit.toString())
  
  const query = searchParams.toString()
  return apiRequest<MemberListResponse>(`/members${query ? `?${query}` : ''}`)
}

export async function getMember(id: string): Promise<Member> {
  return apiRequest<Member>(`/members/${id}`)
}

export async function createMember(data: CreateMemberData): Promise<Member> {
  return apiRequest<Member>('/members', {
    method: 'POST',
    body: data,
  })
}

export async function updateMember(id: string, data: Partial<CreateMemberData>): Promise<Member> {
  return apiRequest<Member>(`/members/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteMember(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/members/${id}`, {
    method: 'DELETE',
  })
}

export interface CsvImportResult {
  success: number
  failed: number
  errors: Array<{ row: number; message: string }>
}

export async function importMembers(data: Array<Record<string, string>>): Promise<CsvImportResult> {
  return apiRequest<CsvImportResult>('/members/import', {
    method: 'POST',
    body: { data },
  })
}

// ============================================
// Household API Functions
// ============================================

export type RelationshipType = 'parent' | 'child' | 'spouse' | 'other'

export interface HouseholdMember {
  id: string
  memberId: string
  firstName: string
  lastName: string
  relationshipType: RelationshipType
}

export interface Household {
  id: string
  name: string | null
  createdAt: string
  updatedAt: string
  members: HouseholdMember[]
}

export interface HouseholdListResponse {
  households: Household[]
  total: number
}

export async function getHouseholds(): Promise<HouseholdListResponse> {
  return apiRequest<HouseholdListResponse>('/households')
}

export async function getHousehold(id: string): Promise<Household> {
  return apiRequest<Household>(`/households/${id}`)
}

export async function createHousehold(data: { name?: string | null }): Promise<Household> {
  return apiRequest<Household>('/households', {
    method: 'POST',
    body: data,
  })
}

export async function updateHousehold(id: string, data: { name?: string | null }): Promise<Household> {
  return apiRequest<Household>(`/households/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteHousehold(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/households/${id}`, {
    method: 'DELETE',
  })
}

export async function linkMemberToHousehold(
  householdId: string,
  memberId: string,
  relationshipType: RelationshipType
): Promise<HouseholdMember> {
  return apiRequest<HouseholdMember>(`/households/${householdId}/members`, {
    method: 'POST',
    body: { memberId, relationshipType },
  })
}

export async function unlinkMemberFromHousehold(
  householdId: string,
  memberId: string
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/households/${householdId}/members/${memberId}`, {
    method: 'DELETE',
  })
}

