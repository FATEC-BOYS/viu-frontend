import { Sidebar } from '@/components/layout/Sidebar'
import SignOutButton from '@/components/layout/SignOutButton'
import { EmailVerificationBanner } from '@/components/layout/EmailVerificationBanner'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="flex items-center justify-end p-4 border-b">
          <SignOutButton />
        </div>
        <EmailVerificationBanner />
        {children}
      </main>
    </div>
  )
}
