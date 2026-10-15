import FinancialRouteGate from '@/components/layout/FinancialRouteGate'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import SignOutButton from '@/components/layout/SignOutButton'
import { EmailVerificationBanner } from '@/components/layout/EmailVerificationBanner'
import BuscaGlobal from '@/components/layout/BuscaGlobal'
import { FaixaImpersonacao } from '@/components/layout/FaixaImpersonacao'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Abaixo de `md` a barra sai do fluxo e vira gaveta — ver MobileNav. */}
      <div className="hidden shrink-0 md:flex">
        <Sidebar />
      </div>
      <main className="relative flex min-w-0 flex-1 flex-col overflow-auto bg-[radial-gradient(circle_at_top_right,color-mix(in_oklch,var(--primary)_5%,transparent),transparent_34rem)]">
        {/* Acima de tudo, inclusive da barra superior: é o primeiro fato que a
            pessoa precisa saber ao olhar a tela. */}
        <FaixaImpersonacao />
        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-border/70 bg-background/85 px-4 py-3 backdrop-blur-xl sm:px-6">
          <MobileNav />
          <div className="ml-auto flex items-center gap-2">
            <BuscaGlobal />
            <SignOutButton />
          </div>
        </header>
        <EmailVerificationBanner />
        <div className="relative flex-1"><FinancialRouteGate>{children}</FinancialRouteGate></div>
      </main>
    </div>
  )
}
