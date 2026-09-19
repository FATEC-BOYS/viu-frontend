'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/login')
  }, [router])

  return (
    <div className="text-center">
      <p className="text-sm text-muted-foreground">Redirecionando…</p>
    </div>
  )
}
