// app/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mic,
  MessageSquareText,
  ShieldCheck,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function HomePage() {
  const router = useRouter();
  const { user, profile, signOut, loading } = useAuth();
  const isAuthed = !!user && !!profile;

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        Carregando…
      </div>
    );
  }

  const goToDashboardOrLogin = () => {
    router.push(isAuthed ? "/dashboard" : "/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header/Navigation */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <LayoutDashboard className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">VIU</span>
          </div>

          <div className="flex items-center gap-3">
            {!isAuthed ? (
              <>
                <Button variant="outline" asChild>
                  <Link href="/login">Entrar</Link>
                </Button>
                <Button asChild>
                  <Link href="/cadastro">Criar Conta</Link>
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => router.push("/dashboard")}>
                  Ir para o Dashboard
                </Button>
                <Button variant="ghost" onClick={signOut}>
                  Sair
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="space-y-16">
          {/* Hero Section */}
          <section
            className="
              relative overflow-hidden rounded-2xl border border-border
              card
              bg-gradient-to-br
              from-[oklch(var(--primary))]
              via-[color-mix(in_oklab,oklch(var(--primary))_60%,oklch(var(--foreground))_40%)]
              to-[oklch(var(--foreground))]
              text-primary-foreground
            "
          >
            <div className="absolute -top-24 -right-24 size-72 rounded-full bg-foreground/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-background/10 blur-3xl" />
            <div className="relative p-10 md:p-16 grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-background/15 text-foreground/95 rounded-full px-3 py-1 text-sm mb-4">
                  <Sparkles className="size-4" /> Novo • Dashboard de Artes
                </div>
                <h1 className="section-title text-4xl md:text-5xl font-extrabold leading-tight">
                  Gerencie artes e receba feedback de clientes com facilidade
                </h1>
                <p className="mt-4 text-base/7 opacity-90">
                  Plataforma completa para Designers e Clientes. Feedback por texto
                  ou áudio, versão a versão, com visualização centralizada de
                  alterações.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Button size="lg" className="w-full sm:w-auto bg-card text-foreground hover:bg-card/90" asChild>
                    <Link href={isAuthed ? "/dashboard" : "/cadastro"}>
                      {isAuthed ? "Abrir Dashboard" : "Começar agora"}
                    </Link>
                  </Button>

                  <Button
                    size="lg"
                    variant="secondary"
                    className="w-full sm:w-auto bg-background/20 border border-border text-primary-foreground hover:bg-background/30"
                    onClick={goToDashboardOrLogin}
                  >
                    Ver demonstração
                  </Button>
                </div>
              </div>

              <Card className="bg-card/60 border-border">
                <CardContent className="p-0">
                  <div className="aspect-video rounded-xl overflow-hidden">
                    <div className="h-full w-full grid grid-cols-3">
                      <div className="col-span-1 p-4 border-r border-border/60">
                        <div className="h-6 w-24 bg-foreground/20 rounded mb-3" />
                        <div className="space-y-2">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-10 rounded bg-foreground/10" />
                          ))}
                        </div>
                      </div>
                      <div className="col-span-2 p-4 grid grid-rows-2 gap-4">
                        <div className="rounded bg-foreground/10" />
                        <div className="rounded bg-foreground/10" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Features Section */}
          <section>
            <div className="text-center mb-12">
              <h2 className="section-title text-3xl font-bold mb-4">Funcionalidades Principais</h2>
              <p className="text-lg text-muted-foreground">
                Tudo que você precisa para gerenciar projetos de design com eficiência
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <Feature icon={<MessageSquareText className="size-5" />} title="Feedback contextual">
                Clientes comentam com texto ou gravam áudio diretamente na tela da arte.
              </Feature>
              <Feature icon={<Mic className="size-5" />} title="Gravação de áudio integrada">
                Capture instruções rápidas sem sair do navegador, com reprodução e download.
              </Feature>
              <Feature icon={<ShieldCheck className="size-5" />} title="Controle de versões e aprovação">
                Acompanhe status de cada versão e aprove alterações com segurança.
              </Feature>
            </div>
          </section>

          {/* CTA Section */}
          <section className="card rounded-2xl border border-border p-8 md:p-12 bg-[oklch(var(--card))]">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <h2 className="section-title text-3xl font-bold">Para Designers e Clientes</h2>
                <p className="text-muted-foreground text-lg">
                  Designers visualizam solicitações de mudança em um painel
                  unificado; clientes dão feedback de forma simples e clara,
                  evitando ruídos na comunicação.
                </p>
                <div className="pt-2">
                  <Button size="lg" className="gap-2" onClick={goToDashboardOrLogin}>
                    <LayoutDashboard className="size-4" /> Abrir Dashboard
                  </Button>
                </div>
              </div>
              <ul className="grid gap-4 text-sm">
                {[
                  "Lista de projetos e artes por versão",
                  "Tela de feedback com texto e áudio",
                  "Status: Em análise, Revisão, Aprovado",
                  "Links compartilháveis somente leitura",
                  "Gestão completa de clientes e projetos",
                  "Notificações em tempo real",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mt-1 size-2 rounded-full bg-primary flex-shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Additional Features */}
          <section>
            <div className="text-center mb-12">
              <h2 className="section-title text-3xl font-bold mb-4">Mais Funcionalidades</h2>
              <p className="text-lg text-muted-foreground">
                Um sistema completo de gestão de projetos de design
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FooterFeature
                icon={<LayoutDashboard className="w-6 h-6 text-primary" />}
                title="Dashboard Intuitivo"
                desc="Visão geral de todos os projetos e estatísticas"
              />
              <FooterFeature
                icon={<ShieldCheck className="w-6 h-6 text-primary" />}
                title="Links Seguros"
                desc="Compartilhe artes com controle de acesso"
              />
              <FooterFeature
                icon={<MessageSquareText className="w-6 h-6 text-primary" />}
                title="Comunicação Clara"
                desc="Feedbacks organizados e centralizados"
              />
              <FooterFeature
                icon={<Mic className="w-6 h-6 text-primary" />}
                title="Áudio Integrado"
                desc="Grave e reproduza feedbacks em áudio"
              />
            </div>
          </section>
        </div>
      </main>

      {/* Footer (corrigido, sem conflitos de merge) */}
      <footer className="border-t border-border bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                  <LayoutDashboard className="w-3 h-3 text-primary-foreground" />
                </div>
                <span className="font-semibold">VIU</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Plataforma completa para gestão de projetos de design e feedback de clientes.
              </p>
            </div>

            {/* Links do produto — proteja as rotas se não estiver logado */}
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href={isAuthed ? "/dashboard" : "/login"} className="hover:text-foreground">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href={isAuthed ? "/projetos" : "/login"} className="hover:text-foreground">
                    Projetos
                  </Link>
                </li>
                <li>
                  <Link href={isAuthed ? "/artes" : "/login"} className="hover:text-foreground">
                    Artes
                  </Link>
                </li>
                <li>
                  <Link href={isAuthed ? "/feedbacks" : "/login"} className="hover:text-foreground">
                    Feedbacks
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Sobre</a></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
                <li><a href="#" className="hover:text-foreground">Carreiras</a></li>
                <li><a href="#" className="hover:text-foreground">Contato</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Conta</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {!isAuthed ? (
                  <>
                    <li><Link href="/login" className="hover:text-foreground">Entrar</Link></li>
                    <li><Link href="/cadastro" className="hover:text-foreground">Criar Conta</Link></li>
                  </>
                ) : (
                  <>
                    <li><Link href="/perfil" className="hover:text-foreground">Perfil</Link></li>
                    <li><Link href="/configuracoes" className="hover:text-foreground">Configurações</Link></li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 VIU. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
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
    <div className="card rounded-xl border border-border p-6 bg-card hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 font-semibold mb-3">
        <span className="grid place-items-center size-10 rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="text-lg">{title}</span>
      </div>
      <p className="text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function FooterFeature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="text-center p-6 rounded-xl border border-border bg-card card">
      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
