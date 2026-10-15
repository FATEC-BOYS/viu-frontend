'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { podeVerFinanceiro, rotaFinanceira } from '@/lib/financeiro'

export default function FinancialRouteGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const bloqueada = rotaFinanceira(pathname) && !podeVerFinanceiro(user?.tipo)
  useEffect(() => {
    if (!loading && bloqueada) router.replace('/dashboard')
  }, [loading, bloqueada, router])
  if (bloqueada) return null
  return <>{children}</>
}
