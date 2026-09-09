import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import SignOutButton from '@/components/layout/SignOutButton'
import { EmailVerificationBanner } from '@/components/layout/EmailVerificationBanner'
import BuscaGlobal from '@/components/layout/BuscaGlobal'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-background">
      {/* Abaixo de `md` a barra sai do fluxo e vira gaveta — ver MobileNav. */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-auto">
        <div className="flex items-center gap-2 border-b p-3 sm:p-4">
          <MobileNav />
          <div className="ml-auto flex items-center gap-2">
            <BuscaGlobal />
            <SignOutButton />
          </div>
        </div>
        <EmailVerificationBanner />
        {children}
      </main>
    </div>
  )
}
