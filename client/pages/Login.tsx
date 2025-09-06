import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LogIn, Mail, Lock } from "lucide-react";
import { Link } from "react-router-dom";

export default function Login() {
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto size-12 rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 grid place-items-center text-white shadow-md">
            <LogIn className="size-6" />
          </div>
          <CardTitle className="mt-2">Entrar</CardTitle>
          <CardDescription>
            Clientes e Designers acessam com e-mail e senha
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">E-mail</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="voce@exemplo.com"
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Senha</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input type="password" placeholder="••••••••" className="pl-9" />
            </div>
          </div>
          <Button className="w-full">Entrar</Button>
          <p className="text-xs text-muted-foreground text-center">
            Dica: Esta é uma demonstração visual. Integração real pode usar
            Supabase/Auth.
          </p>
          <div className="text-center text-sm">
            <Link to="/dashboard" className="text-primary hover:underline">
              Ir para o Dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
