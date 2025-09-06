import { Link, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Palette, LayoutDashboard, LogIn } from "lucide-react";
import { PropsWithChildren } from "react";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
    isActive
      ? "bg-secondary text-secondary-foreground"
      : "text-muted-foreground hover:text-foreground hover:bg-accent",
  );

export default function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr,auto] bg-gradient-to-br from-white via-white to-indigo-50">
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 grid place-items-center text-white shadow-md">
              <Palette className="size-5" />
            </div>
            <span className="font-extrabold tracking-tight text-lg">
              ArteFlow
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" className={navLinkClass} end>
              Início
            </NavLink>
            <NavLink to="/dashboard" className={navLinkClass}>
              <span className="inline-flex items-center gap-2">
                <LayoutDashboard className="size-4" />
                Dashboard
              </span>
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <LogIn className="size-4" /> Entrar
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-8">{children}</main>

      <footer className="border-t bg-background/60">
        <div className="container py-6 text-sm text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-3">
          <p>
            © {new Date().getFullYear()} ArteFlow. Plataforma de gestão de
            artes e feedback.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-foreground">
              Privacidade
            </a>
            <a href="#" className="hover:text-foreground">
              Termos
            </a>
            <a href="#" className="hover:text-foreground">
              Suporte
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
