import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { User, getToken, removeToken, setToken as saveToken, getMe, ApiClientError } from '@/lib/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  setToken: (token: string) => void
  logout: () => void
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    const token = getToken()
    
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }

    try {
      const userData = await getMe()
      setUser({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        roles: userData.roles,
        permissions: userData.permissions,
      })
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        // Token is invalid or expired
        removeToken()
      }
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    removeToken()
    setUser(null)
  }, [])

  const setToken = useCallback((token: string) => {
    saveToken(token)
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    setUser,
    setToken,
    logout,
    checkAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

