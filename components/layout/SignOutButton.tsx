'use client'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await supabase.auth.signOut()
        router.push('/login')
      }}
    >
      Sair
    </Button>
  )
}
