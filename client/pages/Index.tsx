import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mic,
  MessageSquareText,
  ShieldCheck,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";

export default function Index() {
  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white">
        <div className="absolute -top-24 -right-24 size-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-black/10 blur-3xl" />
        <div className="relative p-10 md:p-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-sm mb-4">
              <Sparkles className="size-4" /> Novo • Dashboard de Artes
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              Gerencie artes e receba feedback de clientes com facilidade
            </h1>
            <p className="mt-4 text-white/90 text-lg">
              Plataforma completa para Designers e Clientes. Feedback por texto
              ou áudio, versão a versão, com visualização centralizada de
              alterações.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/login" className="inline-flex">
                <Button size="lg" className="w-full sm:w-auto">
                  Começar agora
                </Button>
              </Link>
              <Link to="/dashboard" className="inline-flex">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  Ver demonstração
                </Button>
              </Link>
            </div>
          </div>
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-0">
              <div className="aspect-video rounded-xl overflow-hidden">
                <div className="h-full w-full grid grid-cols-3">
                  <div className="col-span-1 p-4 border-r border-white/20">
                    <div className="h-6 w-24 bg-white/30 rounded mb-3" />
                    <div className="space-y-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-10 rounded bg-white/10" />
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2 p-4 grid grid-rows-2 gap-4">
                    <div className="rounded bg-white/10" />
                    <div className="rounded bg-white/10" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <div className="grid md:grid-cols-3 gap-6">
          <Feature
            icon={<MessageSquareText className="size-5" />}
            title="Feedback contextual"
          >
            Clientes comentam com texto ou gravam áudio diretamente na tela da
            arte.
          </Feature>
          <Feature
            icon={<Mic className="size-5" />}
            title="Gravação de áudio integrada"
          >
            Capture instruções rápidas sem sair do navegador, com reprodução e
            download.
          </Feature>
          <Feature
            icon={<ShieldCheck className="size-5" />}
            title="Controle de versões e aprovação"
          >
            Acompanhe status de cada versão e aprove alterações com segurança.
          </Feature>
        </div>
      </section>

      <section className="rounded-2xl border p-8 md:p-12 bg-gradient-to-br from-white to-indigo-50">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Para Designers e Clientes</h2>
            <p className="text-muted-foreground">
              Designers visualizam solicitações de mudança em um painel
              unificado; clientes dão feedback de forma simples e clara,
              evitando ruídos na comunicação.
            </p>
            <div className="pt-2">
              <Link to="/dashboard" className="inline-flex">
                <Button className="gap-2">
                  <LayoutDashboard className="size-4" /> Abrir Dashboard
                </Button>
              </Link>
            </div>
          </div>
          <ul className="grid gap-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="mt-1 size-2 rounded-full bg-primary" /> Lista de
              projetos e artes por versão
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 size-2 rounded-full bg-primary" /> Tela de
              feedback com texto e áudio
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 size-2 rounded-full bg-primary" /> Status:
              Em análise, Revisão, Aprovado
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 size-2 rounded-full bg-primary" /> Links
              compartilháveis somente leitura
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border p-6 bg-background">
      <div className="flex items-center gap-2 font-semibold">
        <span className="grid place-items-center size-8 rounded-lg bg-indigo-600/10 text-indigo-700">
          {icon}
        </span>
        {title}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
