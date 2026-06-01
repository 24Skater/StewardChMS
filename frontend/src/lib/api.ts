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

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return apiRequest('/auth/forgot-password', { method: 'POST', body: { email } })
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return apiRequest('/auth/reset-password', { method: 'POST', body: { token, newPassword } })
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

// ============================================
// Message Template API Functions (Phase 4)
// ============================================

export type MessageChannel = 'email' | 'sms'
export type DeliveryStatus = 'pending' | 'sent' | 'failed'

export interface MessageTemplate {
  id: string
  name: string
  channel: MessageChannel
  subject: string | null
  body: string
  createdAt: string
  updatedAt: string
}

export interface MessageTemplateListResponse {
  templates: MessageTemplate[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface MessageTemplateSearchParams {
  channel?: MessageChannel
  page?: number
  limit?: number
}

export interface CreateMessageTemplateData {
  name: string
  channel: MessageChannel
  subject?: string | null
  body: string
}

export async function getMessageTemplates(params: MessageTemplateSearchParams = {}): Promise<MessageTemplateListResponse> {
  const searchParams = new URLSearchParams()
  if (params.channel) searchParams.set('channel', params.channel)
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.limit) searchParams.set('limit', params.limit.toString())
  
  const query = searchParams.toString()
  return apiRequest<MessageTemplateListResponse>(`/message-templates${query ? `?${query}` : ''}`)
}

export async function getMessageTemplate(id: string): Promise<MessageTemplate> {
  return apiRequest<MessageTemplate>(`/message-templates/${id}`)
}

export async function createMessageTemplate(data: CreateMessageTemplateData): Promise<MessageTemplate> {
  return apiRequest<MessageTemplate>('/message-templates', {
    method: 'POST',
    body: data,
  })
}

export async function updateMessageTemplate(id: string, data: Partial<CreateMessageTemplateData>): Promise<MessageTemplate> {
  return apiRequest<MessageTemplate>(`/message-templates/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteMessageTemplate(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/message-templates/${id}`, {
    method: 'DELETE',
  })
}

// ============================================
// Message API Functions (Phase 4)
// ============================================

export type MessageTargetType = 'all' | 'memberIds' | 'status'

export interface MessageTarget {
  type: MessageTargetType
  memberIds?: string[]
  status?: MemberStatus
}

export interface Message {
  id: string
  channel: MessageChannel
  subject: string | null
  body: string
  createdByUserId: string
  createdAt: string
  createdByUser?: {
    id: string
    name: string | null
    email: string
  }
  _count?: {
    recipients: number
  }
}

export interface MessageListResponse {
  messages: Message[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface MessageSearchParams {
  channel?: MessageChannel
  page?: number
  limit?: number
}

export interface CreateMessageData {
  channel: MessageChannel
  subject?: string | null
  body: string
  target: MessageTarget
}

export interface MessageRecipient {
  id: string
  messageId: string
  memberId: string | null
  guestContact: {
    name?: string
    email?: string
    phone?: string
  } | null
  deliveryStatus: DeliveryStatus
  deliveredAt: string | null
  errorMessage: string | null
  member?: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
  } | null
}

export interface RecipientListResponse {
  recipients: MessageRecipient[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface RecipientSearchParams {
  status?: DeliveryStatus
  page?: number
  limit?: number
}

export interface MessageStats {
  pending: number
  sent: number
  failed: number
  total: number
}

export async function getMessages(params: MessageSearchParams = {}): Promise<MessageListResponse> {
  const searchParams = new URLSearchParams()
  if (params.channel) searchParams.set('channel', params.channel)
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.limit) searchParams.set('limit', params.limit.toString())
  
  const query = searchParams.toString()
  return apiRequest<MessageListResponse>(`/messages${query ? `?${query}` : ''}`)
}

export async function getMessage(id: string): Promise<Message> {
  return apiRequest<Message>(`/messages/${id}`)
}

export async function getMessageRecipients(messageId: string, params: RecipientSearchParams = {}): Promise<RecipientListResponse> {
  const searchParams = new URLSearchParams()
  if (params.status) searchParams.set('status', params.status)
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.limit) searchParams.set('limit', params.limit.toString())
  
  const query = searchParams.toString()
  return apiRequest<RecipientListResponse>(`/messages/${messageId}/recipients${query ? `?${query}` : ''}`)
}

export async function getMessageStats(messageId: string): Promise<MessageStats> {
  return apiRequest<MessageStats>(`/messages/${messageId}/stats`)
}

export async function sendMessage(data: CreateMessageData): Promise<Message> {
  return apiRequest<Message>('/messages', {
    method: 'POST',
    body: data,
  })
}

// ============================================
// Opt-In Preference API Functions (Phase 4)
// ============================================

export interface MemberOptInPreferences {
  email: boolean
  sms: boolean
}

export async function getMemberOptIn(memberId: string): Promise<MemberOptInPreferences> {
  return apiRequest<MemberOptInPreferences>(`/members/${memberId}/opt-in`)
}

export async function updateMemberOptIn(memberId: string, data: Partial<MemberOptInPreferences>): Promise<MemberOptInPreferences> {
  return apiRequest<MemberOptInPreferences>(`/members/${memberId}/opt-in`, {
    method: 'PUT',
    body: data,
  })
}

// ============================================
// Accounting + Giving API Functions (Phase 5)
// ============================================

// --- Funds ---

export interface Fund {
  id: string
  name: string
  description: string | null
  isRestricted: boolean
  createdAt: string
  updatedAt: string
}

export interface FundListResponse {
  funds: Fund[]
  total: number
}

export interface CreateFundData {
  name: string
  description?: string | null
  isRestricted?: boolean
}

export async function getFunds(): Promise<FundListResponse> {
  return apiRequest<FundListResponse>('/funds')
}

export async function getFund(id: string): Promise<Fund> {
  return apiRequest<Fund>(`/funds/${id}`)
}

export async function createFund(data: CreateFundData): Promise<Fund> {
  return apiRequest<Fund>('/funds', {
    method: 'POST',
    body: data,
  })
}

export async function updateFund(id: string, data: Partial<CreateFundData>): Promise<Fund> {
  return apiRequest<Fund>(`/funds/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteFund(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/funds/${id}`, {
    method: 'DELETE',
  })
}

// --- Donations ---

export type PaymentMethod = 'cash' | 'check' | 'card' | 'online' | 'other'

export interface Donation {
  id: string
  memberId: string | null
  guestName: string | null
  amountCents: number
  currency: string
  fundId: string | null
  method: PaymentMethod
  receivedAt: string
  note: string | null
  createdAt: string
  member?: {
    id: string
    firstName: string
    lastName: string
  } | null
  fund?: {
    id: string
    name: string
  } | null
}

export interface DonationListResponse {
  donations: Donation[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface DonationSearchParams {
  dateFrom?: string
  dateTo?: string
  fundId?: string
  memberId?: string
  page?: number
  limit?: number
}

export interface CreateDonationData {
  memberId?: string | null
  guestName?: string | null
  amountCents: number
  currency?: string
  fundId?: string | null
  method: PaymentMethod
  receivedAt: string
  note?: string | null
}

export async function getDonations(params: DonationSearchParams = {}): Promise<DonationListResponse> {
  const searchParams = new URLSearchParams()
  if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom)
  if (params.dateTo) searchParams.set('dateTo', params.dateTo)
  if (params.fundId) searchParams.set('fundId', params.fundId)
  if (params.memberId) searchParams.set('memberId', params.memberId)
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.limit) searchParams.set('limit', params.limit.toString())
  
  const query = searchParams.toString()
  return apiRequest<DonationListResponse>(`/donations${query ? `?${query}` : ''}`)
}

export async function getDonation(id: string): Promise<Donation> {
  return apiRequest<Donation>(`/donations/${id}`)
}

export async function createDonation(data: CreateDonationData): Promise<Donation> {
  return apiRequest<Donation>('/donations', {
    method: 'POST',
    body: data,
  })
}

export async function updateDonation(id: string, data: Partial<CreateDonationData>): Promise<Donation> {
  return apiRequest<Donation>(`/donations/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteDonation(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/donations/${id}`, {
    method: 'DELETE',
  })
}

// --- Pledges ---

export type PledgeStatus = 'active' | 'completed' | 'canceled'

export interface Pledge {
  id: string
  memberId: string
  fundId: string | null
  amountCents: number
  startDate: string | null
  endDate: string | null
  status: PledgeStatus
  createdAt: string
  updatedAt: string
  member?: {
    id: string
    firstName: string
    lastName: string
  }
  fund?: {
    id: string
    name: string
  } | null
}

export interface PledgeListResponse {
  pledges: Pledge[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PledgeSearchParams {
  status?: PledgeStatus
  memberId?: string
  fundId?: string
  page?: number
  limit?: number
}

export interface CreatePledgeData {
  memberId: string
  fundId?: string | null
  amountCents: number
  startDate?: string | null
  endDate?: string | null
  status?: PledgeStatus
}

export async function getPledges(params: PledgeSearchParams = {}): Promise<PledgeListResponse> {
  const searchParams = new URLSearchParams()
  if (params.status) searchParams.set('status', params.status)
  if (params.memberId) searchParams.set('memberId', params.memberId)
  if (params.fundId) searchParams.set('fundId', params.fundId)
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.limit) searchParams.set('limit', params.limit.toString())
  
  const query = searchParams.toString()
  return apiRequest<PledgeListResponse>(`/pledges${query ? `?${query}` : ''}`)
}

export async function getPledge(id: string): Promise<Pledge> {
  return apiRequest<Pledge>(`/pledges/${id}`)
}

export async function createPledge(data: CreatePledgeData): Promise<Pledge> {
  return apiRequest<Pledge>('/pledges', {
    method: 'POST',
    body: data,
  })
}

export async function updatePledge(id: string, data: Partial<CreatePledgeData>): Promise<Pledge> {
  return apiRequest<Pledge>(`/pledges/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deletePledge(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/pledges/${id}`, {
    method: 'DELETE',
  })
}

// --- Vendors ---

export interface Vendor {
  id: string
  name: string
  email: string | null
  phone: string | null
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
  createdAt: string
  updatedAt: string
}

export interface VendorListResponse {
  vendors: Vendor[]
  total: number
}

export interface CreateVendorData {
  name: string
  email?: string | null
  phone?: string | null
  street?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
}

export async function getVendors(): Promise<VendorListResponse> {
  return apiRequest<VendorListResponse>('/vendors')
}

export async function getVendor(id: string): Promise<Vendor> {
  return apiRequest<Vendor>(`/vendors/${id}`)
}

export async function createVendor(data: CreateVendorData): Promise<Vendor> {
  return apiRequest<Vendor>('/vendors', {
    method: 'POST',
    body: data,
  })
}

export async function updateVendor(id: string, data: Partial<CreateVendorData>): Promise<Vendor> {
  return apiRequest<Vendor>(`/vendors/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteVendor(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/vendors/${id}`, {
    method: 'DELETE',
  })
}

// --- Expenses ---

export interface Expense {
  id: string
  vendorId: string | null
  fundId: string | null
  amountCents: number
  currency: string
  expenseDate: string
  category: string | null
  note: string | null
  createdAt: string
  vendor?: {
    id: string
    name: string
  } | null
  fund?: {
    id: string
    name: string
  } | null
}

export interface ExpenseListResponse {
  expenses: Expense[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ExpenseSearchParams {
  dateFrom?: string
  dateTo?: string
  fundId?: string
  vendorId?: string
  page?: number
  limit?: number
}

export interface CreateExpenseData {
  vendorId?: string | null
  fundId?: string | null
  amountCents: number
  currency?: string
  expenseDate: string
  category?: string | null
  note?: string | null
}

export async function getExpenses(params: ExpenseSearchParams = {}): Promise<ExpenseListResponse> {
  const searchParams = new URLSearchParams()
  if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom)
  if (params.dateTo) searchParams.set('dateTo', params.dateTo)
  if (params.fundId) searchParams.set('fundId', params.fundId)
  if (params.vendorId) searchParams.set('vendorId', params.vendorId)
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.limit) searchParams.set('limit', params.limit.toString())
  
  const query = searchParams.toString()
  return apiRequest<ExpenseListResponse>(`/expenses${query ? `?${query}` : ''}`)
}

export async function getExpense(id: string): Promise<Expense> {
  return apiRequest<Expense>(`/expenses/${id}`)
}

export async function createExpense(data: CreateExpenseData): Promise<Expense> {
  return apiRequest<Expense>('/expenses', {
    method: 'POST',
    body: data,
  })
}

export async function updateExpense(id: string, data: Partial<CreateExpenseData>): Promise<Expense> {
  return apiRequest<Expense>(`/expenses/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteExpense(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/expenses/${id}`, {
    method: 'DELETE',
  })
}

// --- Invoices ---

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void'

export interface InvoiceItem {
  id: string
  invoiceId: string
  description: string
  quantity: number
  unitPriceCents: number
  lineTotalCents: number
  sortOrder: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  vendorId: string | null
  billToName: string | null
  issueDate: string
  dueDate: string | null
  status: InvoiceStatus
  subtotalCents: number
  taxCents: number
  totalCents: number
  note: string | null
  createdAt: string
  updatedAt: string
  vendor?: {
    id: string
    name: string
  } | null
  items?: InvoiceItem[]
}

export interface InvoiceListResponse {
  invoices: Invoice[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface InvoiceSearchParams {
  status?: InvoiceStatus
  vendorId?: string
  page?: number
  limit?: number
}

export interface InvoiceItemInput {
  description: string
  quantity: number
  unitPriceCents: number
}

export interface CreateInvoiceData {
  vendorId?: string | null
  billToName?: string | null
  issueDate: string
  dueDate?: string | null
  status?: InvoiceStatus
  taxCents?: number
  note?: string | null
  items?: InvoiceItemInput[]
}

export async function getInvoices(params: InvoiceSearchParams = {}): Promise<InvoiceListResponse> {
  const searchParams = new URLSearchParams()
  if (params.status) searchParams.set('status', params.status)
  if (params.vendorId) searchParams.set('vendorId', params.vendorId)
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.limit) searchParams.set('limit', params.limit.toString())
  
  const query = searchParams.toString()
  return apiRequest<InvoiceListResponse>(`/invoices${query ? `?${query}` : ''}`)
}

export async function getInvoice(id: string): Promise<Invoice> {
  return apiRequest<Invoice>(`/invoices/${id}`)
}

export async function createInvoice(data: CreateInvoiceData): Promise<Invoice> {
  return apiRequest<Invoice>('/invoices', {
    method: 'POST',
    body: data,
  })
}

export async function updateInvoice(id: string, data: Partial<CreateInvoiceData>): Promise<Invoice> {
  return apiRequest<Invoice>(`/invoices/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteInvoice(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/invoices/${id}`, {
    method: 'DELETE',
  })
}

export async function addInvoiceItem(invoiceId: string, data: InvoiceItemInput & { sortOrder?: number }): Promise<InvoiceItem> {
  return apiRequest<InvoiceItem>(`/invoices/${invoiceId}/items`, {
    method: 'POST',
    body: data,
  })
}

export async function updateInvoiceItem(itemId: string, data: Partial<InvoiceItemInput & { sortOrder?: number }>): Promise<InvoiceItem> {
  return apiRequest<InvoiceItem>(`/invoices/items/${itemId}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteInvoiceItem(itemId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/invoices/items/${itemId}`, {
    method: 'DELETE',
  })
}

// --- Purchase Orders ---

export type PurchaseOrderStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'closed' | 'void'

export interface PurchaseOrderItem {
  id: string
  purchaseOrderId: string
  description: string
  quantity: number
  unitPriceCents: number
  lineTotalCents: number
  sortOrder: number
}

export interface PurchaseOrder {
  id: string
  poNumber: string
  vendorId: string | null
  requestorUserId: string | null
  issueDate: string
  status: PurchaseOrderStatus
  subtotalCents: number
  taxCents: number
  totalCents: number
  note: string | null
  createdAt: string
  updatedAt: string
  vendor?: {
    id: string
    name: string
  } | null
  requestorUser?: {
    id: string
    name: string | null
    email: string
  } | null
  items?: PurchaseOrderItem[]
}

export interface PurchaseOrderListResponse {
  purchaseOrders: PurchaseOrder[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PurchaseOrderSearchParams {
  status?: PurchaseOrderStatus
  vendorId?: string
  page?: number
  limit?: number
}

export interface PurchaseOrderItemInput {
  description: string
  quantity: number
  unitPriceCents: number
}

export interface CreatePurchaseOrderData {
  vendorId?: string | null
  issueDate: string
  status?: PurchaseOrderStatus
  taxCents?: number
  note?: string | null
  items?: PurchaseOrderItemInput[]
}

export async function getPurchaseOrders(params: PurchaseOrderSearchParams = {}): Promise<PurchaseOrderListResponse> {
  const searchParams = new URLSearchParams()
  if (params.status) searchParams.set('status', params.status)
  if (params.vendorId) searchParams.set('vendorId', params.vendorId)
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.limit) searchParams.set('limit', params.limit.toString())
  
  const query = searchParams.toString()
  return apiRequest<PurchaseOrderListResponse>(`/purchase-orders${query ? `?${query}` : ''}`)
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>(`/purchase-orders/${id}`)
}

export async function createPurchaseOrder(data: CreatePurchaseOrderData): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>('/purchase-orders', {
    method: 'POST',
    body: data,
  })
}

export async function updatePurchaseOrder(id: string, data: Partial<CreatePurchaseOrderData>): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>(`/purchase-orders/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deletePurchaseOrder(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/purchase-orders/${id}`, {
    method: 'DELETE',
  })
}

export async function addPurchaseOrderItem(poId: string, data: PurchaseOrderItemInput & { sortOrder?: number }): Promise<PurchaseOrderItem> {
  return apiRequest<PurchaseOrderItem>(`/purchase-orders/${poId}/items`, {
    method: 'POST',
    body: data,
  })
}

export async function updatePurchaseOrderItem(itemId: string, data: Partial<PurchaseOrderItemInput & { sortOrder?: number }>): Promise<PurchaseOrderItem> {
  return apiRequest<PurchaseOrderItem>(`/purchase-orders/items/${itemId}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deletePurchaseOrderItem(itemId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/purchase-orders/items/${itemId}`, {
    method: 'DELETE',
  })
}

// --- Reports ---

export interface FundBalance {
  fundId: string | null
  fundName: string | null
  incomeCents: number
  expensesCents: number
  netCents: number
}

export interface FundSummaryResponse {
  dateFrom: string
  dateTo: string
  funds: FundBalance[]
  totals: {
    incomeCents: number
    expensesCents: number
    netCents: number
  }
}

export interface DonorGiving {
  memberId: string | null
  memberName: string | null
  guestName: string | null
  totalCents: number
  donationCount: number
}

export interface GivingSummaryResponse {
  dateFrom: string
  dateTo: string
  donors: DonorGiving[]
  totalCents: number
  totalDonations: number
}

export interface DonorStatementDonation {
  id: string
  receivedAt: string
  amountCents: number
  fundName: string | null
  method: PaymentMethod
}

export interface DonorStatementResponse {
  member: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    street: string | null
    city: string | null
    state: string | null
    zip: string | null
  }
  year: number
  donations: DonorStatementDonation[]
  totalCents: number
}

export async function getFundsSummary(dateFrom: string, dateTo: string): Promise<FundSummaryResponse> {
  return apiRequest<FundSummaryResponse>(`/reports/funds-summary?dateFrom=${dateFrom}&dateTo=${dateTo}`)
}

export async function getGivingSummary(dateFrom: string, dateTo: string, memberId?: string): Promise<GivingSummaryResponse> {
  let url = `/reports/giving-summary?dateFrom=${dateFrom}&dateTo=${dateTo}`
  if (memberId) url += `&memberId=${memberId}`
  return apiRequest<GivingSummaryResponse>(url)
}

export async function getDonorStatement(memberId: string, year: number): Promise<DonorStatementResponse> {
  return apiRequest<DonorStatementResponse>(`/reports/donor-statement?memberId=${memberId}&year=${year}`)
}

// ============================================
// Phase 6: Products, Inventory, Sales, Reports
// ============================================

// --- Products ---

export interface Product {
  id: string
  name: string
  description: string | null
  sku: string | null
  priceCents: number
  currency: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductListResponse {
  products: Product[]
}

export interface CreateProductData {
  name: string
  description?: string | null
  sku?: string | null
  priceCents: number
  currency?: string
  isActive?: boolean
}

export async function getProducts(activeOnly?: boolean): Promise<ProductListResponse> {
  const params = new URLSearchParams()
  if (activeOnly !== undefined) params.set('active', String(activeOnly))
  const query = params.toString()
  return apiRequest<ProductListResponse>(`/products${query ? `?${query}` : ''}`)
}

export async function getProduct(id: string): Promise<Product> {
  return apiRequest<Product>(`/products/${id}`)
}

export async function createProduct(data: CreateProductData): Promise<Product> {
  return apiRequest<Product>('/products', {
    method: 'POST',
    body: data,
  })
}

export async function updateProduct(id: string, data: Partial<CreateProductData>): Promise<Product> {
  return apiRequest<Product>(`/products/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteProduct(id: string): Promise<{ message: string; product: Product }> {
  return apiRequest<{ message: string; product: Product }>(`/products/${id}`, {
    method: 'DELETE',
  })
}

// --- Inventory ---

export type InventoryTransactionType = 'adjustment' | 'purchase' | 'sale' | 'return'

export interface InventoryTransaction {
  id: string
  productId: string
  type: InventoryTransactionType
  quantityDelta: number
  note: string | null
  createdAt: string
  product?: {
    id: string
    name: string
    sku: string | null
  }
}

export interface InventorySummaryItem {
  productId: string
  productName: string
  sku: string | null
  priceCents: number
  isActive: boolean
  onHand: number
}

export interface InventorySummaryResponse {
  inventory: InventorySummaryItem[]
}

export interface InventoryTransactionListResponse {
  transactions: InventoryTransaction[]
}

export interface AdjustInventoryData {
  productId: string
  quantityDelta: number
  note?: string
}

export async function getInventorySummary(activeOnly?: boolean): Promise<InventorySummaryResponse> {
  const params = new URLSearchParams()
  if (activeOnly) params.set('activeOnly', 'true')
  const query = params.toString()
  return apiRequest<InventorySummaryResponse>(`/inventory/summary${query ? `?${query}` : ''}`)
}

export async function getInventoryTransactions(productId?: string, limit?: number): Promise<InventoryTransactionListResponse> {
  const params = new URLSearchParams()
  if (productId) params.set('productId', productId)
  if (limit) params.set('limit', String(limit))
  const query = params.toString()
  return apiRequest<InventoryTransactionListResponse>(`/inventory/transactions${query ? `?${query}` : ''}`)
}

export async function adjustInventory(data: AdjustInventoryData): Promise<InventoryTransaction> {
  return apiRequest<InventoryTransaction>('/inventory/adjust', {
    method: 'POST',
    body: data,
  })
}

// --- Sales ---

export type SaleStatus = 'completed' | 'void'

export interface SaleItem {
  id: string
  saleId: string
  productId: string
  quantity: number
  unitPriceCents: number
  lineTotalCents: number
  sortOrder: number
  product?: {
    id: string
    name: string
    sku: string | null
  }
}

export interface Sale {
  id: string
  saleNumber: string
  memberId: string | null
  guestName: string | null
  status: SaleStatus
  subtotalCents: number
  taxCents: number
  totalCents: number
  soldAt: string
  createdByUserId: string
  createdAt: string
  member?: {
    id: string
    firstName: string
    lastName: string
  } | null
  createdByUser?: {
    id: string
    name: string | null
    email: string
  }
  items?: SaleItem[]
  _count?: {
    items: number
  }
}

export interface SaleListResponse {
  sales: Sale[]
}

export interface SaleSearchParams {
  dateFrom?: string
  dateTo?: string
  status?: SaleStatus
  limit?: number
}

export interface SaleItemInput {
  productId: string
  quantity: number
}

export interface CreateSaleData {
  memberId?: string | null
  guestName?: string | null
  taxCents?: number
  items: SaleItemInput[]
}

export async function getSales(params: SaleSearchParams = {}): Promise<SaleListResponse> {
  const searchParams = new URLSearchParams()
  if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom)
  if (params.dateTo) searchParams.set('dateTo', params.dateTo)
  if (params.status) searchParams.set('status', params.status)
  if (params.limit) searchParams.set('limit', params.limit.toString())
  
  const query = searchParams.toString()
  return apiRequest<SaleListResponse>(`/sales${query ? `?${query}` : ''}`)
}

export async function getSale(id: string): Promise<Sale> {
  return apiRequest<Sale>(`/sales/${id}`)
}

export async function createSale(data: CreateSaleData): Promise<Sale> {
  return apiRequest<Sale>('/sales', {
    method: 'POST',
    body: data,
  })
}

export async function voidSale(id: string): Promise<Sale> {
  return apiRequest<Sale>(`/sales/${id}/void`, {
    method: 'POST',
  })
}

// --- Phase 6 Reports ---

export interface MembershipSummaryResponse {
  dateFrom: string
  dateTo: string
  byStatus: {
    active: number
    inactive: number
    visitor: number
  }
  newMembersInPeriod: number
  missingFields: {
    email: number
    phone: number
  }
  totalMembers: number
}

export interface AttendanceOccurrence {
  occurrenceId: string
  eventTitle: string
  startsAt: string
  checkIns: number
}

export interface TopEvent {
  eventId: string
  title: string
  checkIns: number
}

export interface AttendanceSummaryResponse {
  dateFrom: string
  dateTo: string
  totalCheckIns: number
  occurrenceCount: number
  topEvents: TopEvent[]
  occurrences: AttendanceOccurrence[]
}

export interface GivingReportFund {
  fundId: string | null
  fundName: string
  totalCents: number
  donationCount: number
}

export interface GivingReportResponse {
  dateFrom: string
  dateTo: string
  fundTotals: GivingReportFund[]
  totalCents: number
  totalDonations: number
}

export interface TopProduct {
  productId: string
  name: string
  quantity: number
  revenueCents: number
}

export interface SalesSummaryResponse {
  dateFrom: string
  dateTo: string
  totalSales: number
  totalRevenueCents: number
  totalTaxCents: number
  topProducts: TopProduct[]
}

export async function getMembershipSummary(dateFrom: string, dateTo: string, format?: 'csv'): Promise<MembershipSummaryResponse | string> {
  const params = new URLSearchParams({ dateFrom, dateTo })
  if (format) params.set('format', format)
  return apiRequest<MembershipSummaryResponse | string>(`/reports/membership-summary?${params.toString()}`)
}

export async function getAttendanceSummary(dateFrom: string, dateTo: string, format?: 'csv'): Promise<AttendanceSummaryResponse | string> {
  const params = new URLSearchParams({ dateFrom, dateTo })
  if (format) params.set('format', format)
  return apiRequest<AttendanceSummaryResponse | string>(`/reports/attendance-summary?${params.toString()}`)
}

export async function getGivingReport(dateFrom: string, dateTo: string, format?: 'csv'): Promise<GivingReportResponse | string> {
  const params = new URLSearchParams({ dateFrom, dateTo })
  if (format) params.set('format', format)
  return apiRequest<GivingReportResponse | string>(`/reports/giving-report?${params.toString()}`)
}

export async function getSalesSummary(dateFrom: string, dateTo: string, format?: 'csv'): Promise<SalesSummaryResponse | string> {
  const params = new URLSearchParams({ dateFrom, dateTo })
  if (format) params.set('format', format)
  return apiRequest<SalesSummaryResponse | string>(`/reports/sales-summary?${params.toString()}`)
}

export async function getVolunteerSummary(): Promise<{ message: string; status: string; note: string }> {
  return apiRequest<{ message: string; status: string; note: string }>('/reports/volunteer-summary')
}

