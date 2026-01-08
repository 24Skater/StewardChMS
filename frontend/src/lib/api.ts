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

// ============================================
// Event API Functions (Phase 3)
// ============================================

export interface Event {
  id: string
  title: string
  description: string | null
  location: string | null
  category: string | null
  ministryId: string | null
  isRecurring: boolean
  recurrenceRule: string | null
  startDatetime: string | null
  endDatetime: string | null
  createdAt: string
  updatedAt: string
  occurrences?: EventOccurrence[]
}

export interface EventOccurrence {
  id: string
  eventId: string
  startsAt: string
  endsAt: string | null
  status: 'scheduled' | 'canceled'
  notes: string | null
  event?: {
    id: string
    title: string
    description: string | null
    location: string | null
    category: string | null
  }
}

export interface EventListResponse {
  events: Event[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface EventSearchParams {
  dateFrom?: string
  dateTo?: string
  category?: string
  page?: number
  limit?: number
}

export interface CreateEventData {
  title: string
  description?: string | null
  location?: string | null
  category?: string | null
  ministryId?: string | null
  isRecurring?: boolean
  recurrenceRule?: string | null
  startDatetime?: string | null
  endDatetime?: string | null
}

export async function getEvents(params: EventSearchParams = {}): Promise<EventListResponse> {
  const searchParams = new URLSearchParams()
  if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom)
  if (params.dateTo) searchParams.set('dateTo', params.dateTo)
  if (params.category) searchParams.set('category', params.category)
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.limit) searchParams.set('limit', params.limit.toString())
  
  const query = searchParams.toString()
  return apiRequest<EventListResponse>(`/events${query ? `?${query}` : ''}`)
}

export async function getEvent(id: string): Promise<Event> {
  return apiRequest<Event>(`/events/${id}`)
}

export async function createEvent(data: CreateEventData): Promise<Event> {
  return apiRequest<Event>('/events', {
    method: 'POST',
    body: data,
  })
}

export async function updateEvent(id: string, data: Partial<CreateEventData>): Promise<Event> {
  return apiRequest<Event>(`/events/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteEvent(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/events/${id}`, {
    method: 'DELETE',
  })
}

export interface GenerateOccurrencesResult {
  message: string
  created: number
  skipped: number
}

export async function generateOccurrences(eventId: string, daysAhead: number = 90): Promise<GenerateOccurrencesResult> {
  return apiRequest<GenerateOccurrencesResult>(`/events/${eventId}/generate-occurrences`, {
    method: 'POST',
    body: { daysAhead },
  })
}

// ============================================
// Occurrence API Functions
// ============================================

export interface OccurrenceListResponse {
  occurrences: EventOccurrence[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface OccurrenceSearchParams {
  dateFrom?: string
  dateTo?: string
  eventId?: string
  page?: number
  limit?: number
}

export interface OccurrenceDetail extends EventOccurrence {
  registrations: Registration[]
  checkIns: CheckIn[]
  worshipPlan: WorshipPlan | null
}

export async function getOccurrences(params: OccurrenceSearchParams = {}): Promise<OccurrenceListResponse> {
  const searchParams = new URLSearchParams()
  if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom)
  if (params.dateTo) searchParams.set('dateTo', params.dateTo)
  if (params.eventId) searchParams.set('eventId', params.eventId)
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.limit) searchParams.set('limit', params.limit.toString())
  
  const query = searchParams.toString()
  return apiRequest<OccurrenceListResponse>(`/occurrences${query ? `?${query}` : ''}`)
}

export async function getOccurrence(id: string): Promise<OccurrenceDetail> {
  return apiRequest<OccurrenceDetail>(`/occurrences/${id}`)
}

export async function updateOccurrence(id: string, data: {
  startsAt?: string
  endsAt?: string | null
  status?: 'scheduled' | 'canceled'
  notes?: string | null
}): Promise<EventOccurrence> {
  return apiRequest<EventOccurrence>(`/occurrences/${id}`, {
    method: 'PUT',
    body: data,
  })
}

// ============================================
// Registration API Functions
// ============================================

export interface Registration {
  id: string
  eventOccurrenceId: string
  memberId: string | null
  guestName: string | null
  guestEmail: string | null
  guestPhone: string | null
  partySize: number
  status: 'registered' | 'canceled'
  createdAt: string
  member?: {
    id: string
    firstName: string
    lastName: string
  } | null
}

export interface CreateRegistrationData {
  memberId?: string | null
  guestName?: string | null
  guestEmail?: string | null
  guestPhone?: string | null
  partySize?: number
}

export async function getRegistrations(occurrenceId: string): Promise<{ registrations: Registration[] }> {
  return apiRequest<{ registrations: Registration[] }>(`/occurrences/${occurrenceId}/registrations`)
}

export async function createRegistration(occurrenceId: string, data: CreateRegistrationData): Promise<Registration> {
  return apiRequest<Registration>(`/occurrences/${occurrenceId}/registrations`, {
    method: 'POST',
    body: data,
  })
}

export async function cancelRegistration(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/registrations/${id}`, {
    method: 'DELETE',
  })
}

// ============================================
// Check-In API Functions
// ============================================

export interface CheckIn {
  id: string
  eventOccurrenceId: string
  memberId: string | null
  guestName: string | null
  checkedInAt: string
  method: string
  member?: {
    id: string
    firstName: string
    lastName: string
  } | null
}

export interface CreateCheckInData {
  memberId?: string | null
  guestName?: string | null
  method?: string
}

export async function getCheckIns(occurrenceId: string): Promise<{ checkIns: CheckIn[] }> {
  return apiRequest<{ checkIns: CheckIn[] }>(`/occurrences/${occurrenceId}/checkins`)
}

export async function createCheckIn(occurrenceId: string, data: CreateCheckInData): Promise<CheckIn> {
  return apiRequest<CheckIn>(`/occurrences/${occurrenceId}/checkins`, {
    method: 'POST',
    body: data,
  })
}

// ============================================
// Song API Functions
// ============================================

export interface Song {
  id: string
  title: string
  artist: string | null
  defaultKey: string | null
  bpm: number | null
  lyrics: string | null
  createdAt: string
  updatedAt: string
}

export interface SongListResponse {
  songs: Song[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface SongSearchParams {
  search?: string
  page?: number
  limit?: number
}

export interface CreateSongData {
  title: string
  artist?: string | null
  defaultKey?: string | null
  bpm?: number | null
  lyrics?: string | null
}

export async function getSongs(params: SongSearchParams = {}): Promise<SongListResponse> {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.limit) searchParams.set('limit', params.limit.toString())
  
  const query = searchParams.toString()
  return apiRequest<SongListResponse>(`/songs${query ? `?${query}` : ''}`)
}

export async function getSong(id: string): Promise<Song> {
  return apiRequest<Song>(`/songs/${id}`)
}

export async function createSong(data: CreateSongData): Promise<Song> {
  return apiRequest<Song>('/songs', {
    method: 'POST',
    body: data,
  })
}

export async function updateSong(id: string, data: Partial<CreateSongData>): Promise<Song> {
  return apiRequest<Song>(`/songs/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteSong(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/songs/${id}`, {
    method: 'DELETE',
  })
}

// ============================================
// Worship Plan API Functions
// ============================================

export interface WorshipPlanItem {
  id: string
  worshipPlanId: string
  sortOrder: number
  itemType: 'song' | 'scripture' | 'announcement' | 'sermon' | 'prayer' | 'other'
  title: string
  details: string | null
  songId: string | null
  assignedMemberId: string | null
  durationMinutes: number | null
  song?: {
    id: string
    title: string
    artist: string | null
    defaultKey: string | null
  } | null
  assignedMember?: {
    id: string
    firstName: string
    lastName: string
  } | null
}

export interface WorshipPlan {
  id: string
  eventOccurrenceId: string
  title: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  items: WorshipPlanItem[]
}

export interface CreateWorshipPlanData {
  title?: string | null
  notes?: string | null
}

export interface CreateWorshipPlanItemData {
  sortOrder: number
  itemType: 'song' | 'scripture' | 'announcement' | 'sermon' | 'prayer' | 'other'
  title: string
  details?: string | null
  songId?: string | null
  assignedMemberId?: string | null
  durationMinutes?: number | null
}

export async function getWorshipPlan(occurrenceId: string): Promise<WorshipPlan> {
  return apiRequest<WorshipPlan>(`/occurrences/${occurrenceId}/worship-plan`)
}

export async function createWorshipPlan(occurrenceId: string, data: CreateWorshipPlanData = {}): Promise<WorshipPlan> {
  return apiRequest<WorshipPlan>(`/occurrences/${occurrenceId}/worship-plan`, {
    method: 'POST',
    body: data,
  })
}

export async function updateWorshipPlan(id: string, data: CreateWorshipPlanData): Promise<WorshipPlan> {
  return apiRequest<WorshipPlan>(`/worship-plans/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function createWorshipPlanItem(planId: string, data: CreateWorshipPlanItemData): Promise<WorshipPlanItem> {
  return apiRequest<WorshipPlanItem>(`/worship-plans/${planId}/items`, {
    method: 'POST',
    body: data,
  })
}

export async function updateWorshipPlanItem(itemId: string, data: Partial<CreateWorshipPlanItemData>): Promise<WorshipPlanItem> {
  return apiRequest<WorshipPlanItem>(`/worship-plans/items/${itemId}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteWorshipPlanItem(itemId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/worship-plans/items/${itemId}`, {
    method: 'DELETE',
  })
}

export async function reorderWorshipPlanItems(planId: string, items: Array<{ id: string; sortOrder: number }>): Promise<WorshipPlan> {
  return apiRequest<WorshipPlan>(`/worship-plans/${planId}/reorder`, {
    method: 'PUT',
    body: { items },
  })
}

