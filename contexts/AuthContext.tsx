'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export type UserProfile = {
  id: string
  nome: string
  email: string
  avatar?: string | null
  tipo: 'DESIGNER' | 'CLIENTE'
  emailVerificado?: boolean
}

type AuthContextType = {
  user: UserProfile | null
  token: string | null
  signIn: (email: string, senha: string) => Promise<void>
  completeTwoFactorLogin: (userId: string, code: string) => Promise<void>
  signOut: () => void
  updateUser: (patch: Partial<UserProfile>) => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// TODO(security): migrate tokens from localStorage to HttpOnly cookies to prevent XSS token theft.
// Risk: localStorage is accessible to any JS running on the page — an XSS attack can read TOKEN_KEY
// and impersonate the user indefinitely.
// Migration path:
//   1. Backend: on /auth/login and /auth/2fa-login, set `Set-Cookie: viu_token=...; HttpOnly; SameSite=Strict; Secure`
//      and remove token from the JSON response body. Do the same for refreshToken.
//   2. Backend: CORS must allow credentials (`credentials: true`, explicit origin — no wildcard).
//   3. Frontend (this file): remove TOKEN_KEY / USER_KEY / REFRESH_KEY localStorage reads and writes;
//      remove the Authorization header injection in lib/api.ts (browser sends cookie automatically);
//      `storeSession` becomes a no-op (only persist non-sensitive user profile if needed).
//   4. Backend /auth/logout: clear the cookie with `Set-Cookie: viu_token=; Max-Age=0; HttpOnly`.
//   5. Update all fetch/axios calls to pass `credentials: 'include'` (withCredentials: true).
const TOKEN_KEY = 'viu_token'
const USER_KEY = 'viu_user'
const REFRESH_KEY = 'viu_refresh_token'
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const segment = token.split('.')[1]
    return JSON.parse(atob(segment.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

function loadFromStorage(): { token: string | null; user: UserProfile | null } {
  if (typeof window === 'undefined') return { token: null, user: null }
  const token = localStorage.getItem(TOKEN_KEY)
  const raw = localStorage.getItem(USER_KEY)
  if (!token || !raw) return { token: null, user: null }

  const payload = decodeJwtPayload(token)
  const exp = payload?.exp as number | undefined
  if (!exp || exp * 1000 < Date.now()) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    return { token: null, user: null }
  }

  try {
    return { token, user: JSON.parse(raw) as UserProfile }
  } catch {
    return { token: null, user: null }
  }
}

function storeSession(token: string, refreshToken: string | undefined, usuario: UserProfile) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(usuario))
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const { token: t, user: u } = loadFromStorage()
    setToken(t)
    setUser(u)
    setLoading(false)
  }, [])

  const signIn = useCallback(async (email: string, senha: string) => {
    const res = await api.post<{
      data: { token?: string; refreshToken?: string; usuario?: UserProfile; requires2FA?: boolean; userId?: string }
      success: boolean
    }>('/auth/login', { email, senha })

    const data = res.data
    if (data.requires2FA) {
      const err: any = new Error('2FA_REQUIRED')
      err.userId = data.userId
      throw err
    }

    storeSession(data.token!, data.refreshToken, data.usuario!)
    setToken(data.token!)
    setUser(data.usuario!)
  }, [])

  const completeTwoFactorLogin = useCallback(async (userId: string, code: string) => {
    const res = await api.post<{ data: { token: string; refreshToken: string; usuario: UserProfile }; success: boolean }>(
      '/auth/2fa-login',
      { userId, code }
    )
    const { token: newToken, refreshToken, usuario } = res.data
    storeSession(newToken, refreshToken, usuario)
    setToken(newToken)
    setUser(usuario)
  }, [])

  const updateUser = useCallback((patch: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev
      const updated = { ...prev, ...patch }
      localStorage.setItem(USER_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const signOut = useCallback(() => {
    const currentToken = localStorage.getItem(TOKEN_KEY)
    if (currentToken) {
      fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
      }).catch(() => {})
    }
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(REFRESH_KEY)
    setToken(null)
    setUser(null)
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider value={{ user, token, signIn, completeTwoFactorLogin, signOut, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  return ctx
}
