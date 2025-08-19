import { Link, NavLink } from "react-router-dom"
import { Bell, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

// Se você já tiver um hook de auth (ex.: Firebase, Supabase, NextAuth),
// troque este `AuthState`/props por `const { status, user } = useAuth()`
type AuthStatus = "loading" | "unauthenticated" | "authenticated"
type User = { name?: string; avatarUrl?: string }

type NavbarProps = {
  status: AuthStatus
  user?: User | null
}

const marketingLinks = [
  { to: "/features", label: "Recursos" },
  { to: "/pricing", label: "Preços" },
  { to: "/about", label: "Sobre" },
  { to: "/contact", label: "Contato" },
]

const appLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/projects", label: "Projetos" },
  { to: "/clients", label: "Clientes" },
  { to: "/reports", label: "Relatórios" },
]

export function Navbar({ status, user }: NavbarProps) {
  const isAuthed = status === "authenticated"

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "VI"

  return (
    <div className="min-h-16 bg-background">
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center space-x-2">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient">Viu</span>
            </Link>
          </div>

          {/* Links (centro) */}
          <div className="hidden md:flex items-center space-x-8">
            {status === "loading" && (
              <div className="h-4 w-40 rounded bg-muted animate-pulse" />
            )}

            {status !== "loading" &&
              (isAuthed ? (
                appLinks.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      [
                        "text-sm font-medium transition-colors",
                        isActive
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      ].join(" ")
                    }
                  >
                    {label}
                  </NavLink>
                ))
              ) : (
                marketingLinks.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      [
                        "text-sm font-medium transition-colors",
                        isActive
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      ].join(" ")
                    }
                  >
                    {label}
                  </NavLink>
                ))
              ))}
          </div>

          {/* Ações (direita) */}
          <div className="flex items-center space-x-4">
            {status === "loading" && (
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                <div className="h-8 w-24 rounded bg-muted animate-pulse" />
              </div>
            )}

            {status !== "loading" && isAuthed && (
              <>
                <Button variant="ghost" size="sm">
                  <Bell className="w-4 h-4" />
                </Button>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.avatarUrl || ""} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </>
            )}

            {status !== "loading" && !isAuthed && (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Entrar</Button>
                </Link>
                <Link to="/dashboard">
                  <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                    Começar Agora
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </div>
  )
}
