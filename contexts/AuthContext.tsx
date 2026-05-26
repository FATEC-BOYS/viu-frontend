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
}

type AuthContextType = {
  user: UserProfile | null
  token: string | null
  signIn: (email: string, senha: string) => Promise<void>
  signOut: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'viu_token'
const USER_KEY = 'viu_user'

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
    const res = await api.post<{ data: { token: string; usuario: UserProfile }; success: boolean }>(
      '/auth/login',
      { email, senha }
    )
    const { token: newToken, usuario } = res.data
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(usuario))
    setToken(newToken)
    setUser(usuario)
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider value={{ user, token, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  return ctx
}
