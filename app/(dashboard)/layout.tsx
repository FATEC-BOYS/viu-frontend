// app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/layout/Sidebar'
import SignOutButton from '@/components/layout/SignOutButton'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Topbar simples com o botão de sair */}
        <div className="flex items-center justify-end p-4 border-b">
          <SignOutButton />
        </div>

        {children}
      </main>
    </div>
  )
}
