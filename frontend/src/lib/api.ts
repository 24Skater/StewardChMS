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

