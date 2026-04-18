import { ref, computed, type Ref } from 'vue'

interface User {
  id: number
  name: string
  email: string
  blood_group: string
  phone: string
  address: string
  lat: number
  lng: number
}

interface LoginCredentials {
  email: string
  password: string
}

interface RegisterData {
  name: string
  email: string
  password: string
  blood_group: string
  phone: string
  address: string
  lat: number
  lng: number
}

interface AuthState {
  user: Ref<User | null>
  token: Ref<string | null>
  refreshToken: Ref<string | null>
  isAuthenticated: Ref<boolean>
  loading: Ref<boolean>
  error: Ref<string | null>
}

const API_BASE = import.meta.env.VITE_API_BASE || ''

// Global auth state
const user = ref<User | null>(null)
const token = ref<string | null>(null)
const refreshToken = ref<string | null>(null)
const loading = ref<boolean>(false)
const error = ref<string | null>(null)

// Check if there's a stored token on initialization
const initAuth = () => {
  const storedToken = localStorage.getItem('auth_token')
  const storedRefreshToken = localStorage.getItem('auth_refresh_token')
  const storedUser = localStorage.getItem('auth_user')
  
  if (storedToken && storedUser) {
    token.value = storedToken
    refreshToken.value = storedRefreshToken
    try {
      user.value = JSON.parse(storedUser)
    } catch (e) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_refresh_token')
      localStorage.removeItem('auth_user')
    }
  }
}

// Initialize on module load
initAuth()

export const useAuth = () => {
  const isAuthenticated = computed(() => !!user.value && !!token.value)

  // Refresh access token using refresh token
  const refreshAccessToken = async (): Promise<boolean> => {
    if (!refreshToken.value) return false
    
    try {
      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: refreshToken.value })
      })

      if (!response.ok) return false

      const data = await response.json()
      token.value = data.token
      refreshToken.value = data.refreshToken
      
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('auth_refresh_token', data.refreshToken)
      
      return true
    } catch {
      return false
    }
  }

  const login = async (credentials: LoginCredentials): Promise<void> => {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Login failed')
      }

      const data = await response.json()
      
      user.value = data.user
      token.value = data.token
      refreshToken.value = data.refreshToken
      
      // Store in localStorage
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('auth_refresh_token', data.refreshToken)
      localStorage.setItem('auth_user', JSON.stringify(data.user))
      
      loading.value = false
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      error.value = errorMessage
      loading.value = false
      throw err
    }
  }

  const register = async (data: RegisterData): Promise<void> => {
    loading.value = true
    error.value = null
    
    console.log('Register attempt with data:', data)
    console.log('API endpoint:', `${API_BASE}/api/auth/register`)
    
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      console.log('Register response status:', response.status)
      console.log('Register response headers:', response.headers)

      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        console.log('Response content-type:', contentType)
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Registration failed')
        } else {
          const textResponse = await response.text()
          console.error('Non-JSON response:', textResponse)
          throw new Error('Server returned an error. Please check the console.')
        }
      }

      const result = await response.json()
      
      user.value = result.user
      token.value = result.token
      refreshToken.value = result.refreshToken
      
      // Store in localStorage
      localStorage.setItem('auth_token', result.token)
      localStorage.setItem('auth_refresh_token', result.refreshToken)
      localStorage.setItem('auth_user', JSON.stringify(result.user))
      
      loading.value = false
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed'
      error.value = errorMessage
      loading.value = false
      throw err
    }
  }

  const logout = (): void => {
    user.value = null
    token.value = null
    refreshToken.value = null
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_refresh_token')
    localStorage.removeItem('auth_user')
  }

  const updateUserProfile = async (updates: Partial<User>): Promise<void> => {
    if (!token.value) throw new Error('Not authenticated')
    
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch(`${API_BASE}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.value}`
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Profile update failed')
      }

      const updatedUser = await response.json()
      user.value = updatedUser
      localStorage.setItem('auth_user', JSON.stringify(updatedUser))
      
      loading.value = false
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Profile update failed'
      error.value = errorMessage
      loading.value = false
      throw err
    }
  }

  return {
    user,
    token,
    refreshToken,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    updateUserProfile,
    refreshAccessToken
  }
}
