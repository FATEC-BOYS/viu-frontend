'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export type UserProfile = {
  id: string
  nome: string
  email: string
  avatar?: string | null
  // ADMIN existe no backend (o seed cria admin@viu.com) e faltava aqui, então
  // qualquer checagem por admin no front era erro de tipo.
  tipo: 'DESIGNER' | 'CLIENTE' | 'ADMIN'
  emailVerificado?: boolean
}

type AuthContextType = {
  user: UserProfile | null
  signIn: (email: string, senha: string) => Promise<void>
  completeTwoFactorLogin: (userId: string, code: string) => Promise<void>
  signOut: () => void
  updateUser: (patch: Partial<UserProfile>) => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Sessão do usuário.
 *
 * A credencial vive em cookie HttpOnly gravado pelo backend — este arquivo não
 * tem acesso a ela, e é esse o ponto: um XSS na página não encontra token
 * nenhum para roubar.
 *
 * O que fica no localStorage é só o perfil (nome, e-mail, tipo), para a
 * interface não piscar deslogada enquanto `/auth/me` responde. Não é
 * credencial: apagá-lo não derruba a sessão, e mantê-lo não sustenta nenhuma.
 */
const USER_KEY = 'viu_user'
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function lerPerfilEmCache(): UserProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch {
    return null
  }
}

function guardarPerfil(usuario: UserProfile | null) {
  try {
    if (usuario) localStorage.setItem(USER_KEY, JSON.stringify(usuario))
    else localStorage.removeItem(USER_KEY)
  } catch {
    // Modo privado ou storage indisponível: só perdemos a hidratação otimista.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let ativo = true

    // Mostra o perfil em cache de imediato e confirma com o servidor: só ele
    // sabe se o cookie ainda vale. Cache sem sessão vira interface logada que
    // toma 401 na primeira ação.
    setUser(lerPerfilEmCache())

    // `redirecionarNo401: false`: esta chamada é uma pergunta, não uma ação.
    // Um 401 aqui significa "visitante anônimo" e precisa virar `setUser(null)`
    // — sem isso o cliente HTTP mandava a pessoa para /login em toda página
    // pública, e como o redirect empilha histórico, o botão Voltar não saía.
    api
      .get<{ data: UserProfile }>('/auth/me', { redirecionarNo401: false })
      .then((res) => {
        if (!ativo) return
        setUser(res.data)
        guardarPerfil(res.data)
      })
      .catch(() => {
        if (!ativo) return
        setUser(null)
        guardarPerfil(null)
      })
      .finally(() => {
        if (ativo) setLoading(false)
      })

    return () => {
      ativo = false
    }
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

    // A resposta traz só o usuário: o token vem nos cookies do Set-Cookie.
    setUser(data.usuario!)
    guardarPerfil(data.usuario!)
  }, [])

  const completeTwoFactorLogin = useCallback(async (userId: string, code: string) => {
    const res = await api.post<{ data: { usuario: UserProfile }; success: boolean }>(
      '/auth/2fa/login',
      { userId, code }
    )
    setUser(res.data.usuario)
    guardarPerfil(res.data.usuario)
  }, [])

  const updateUser = useCallback((patch: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev
      const updated = { ...prev, ...patch }
      guardarPerfil(updated)
      return updated
    })
  }, [])

  const signOut = useCallback(() => {
    // Quem apaga os cookies é o servidor; daqui não há como remover um
    // HttpOnly. Sem esta chamada a sessão continuaria válida no backend.
    fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {})

    guardarPerfil(null)
    setUser(null)
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider value={{ user, signIn, completeTwoFactorLogin, signOut, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  return ctx
}
