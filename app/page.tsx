// app/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mic,
  MessageSquareText,
  ShieldCheck,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header/Navigation */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">VIU</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="outline">Entrar</Button>
            </Link>
            <Link href="/cadastro">
              <Button>Criar Conta</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="space-y-16">
          {/* Hero Section */}
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
                  <Link href="/cadastro" className="inline-flex">
                    <Button size="lg" className="w-full sm:w-auto bg-white text-primary hover:bg-white/90">
                      Começar agora
                    </Button>
                  </Link>
                  <Link href="/dashboard" className="inline-flex">
                    <Button
                      size="lg"
                      variant="secondary"
                      className="w-full sm:w-auto bg-white/10 border-white/20 text-white hover:bg-white/20"
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

          {/* Features Section */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Funcionalidades Principais</h2>
              <p className="text-lg text-muted-foreground">
                Tudo que você precisa para gerenciar projetos de design com eficiência
              </p>
            </div>
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

          {/* CTA Section */}
          <section className="rounded-2xl border p-8 md:p-12 bg-gradient-to-br from-white to-indigo-50">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold">Para Designers e Clientes</h2>
                <p className="text-muted-foreground text-lg">
                  Designers visualizam solicitações de mudança em um painel
                  unificado; clientes dão feedback de forma simples e clara,
                  evitando ruídos na comunicação.
                </p>
                <div className="pt-2">
                  <Link href="/dashboard" className="inline-flex">
                    <Button size="lg" className="gap-2">
                      <LayoutDashboard className="size-4" /> Abrir Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
              <ul className="grid gap-4 text-sm">
                <li className="flex items-start gap-3">
                  <span className="mt-1 size-2 rounded-full bg-primary flex-shrink-0" />
                  <span>Lista de projetos e artes por versão</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 size-2 rounded-full bg-primary flex-shrink-0" />
                  <span>Tela de feedback com texto e áudio</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 size-2 rounded-full bg-primary flex-shrink-0" />
                  <span>Status: Em análise, Revisão, Aprovado</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 size-2 rounded-full bg-primary flex-shrink-0" />
                  <span>Links compartilháveis somente leitura</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 size-2 rounded-full bg-primary flex-shrink-0" />
                  <span>Gestão completa de clientes e projetos</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 size-2 rounded-full bg-primary flex-shrink-0" />
                  <span>Notificações em tempo real</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Additional Features */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Mais Funcionalidades</h2>
              <p className="text-lg text-muted-foreground">
                Um sistema completo de gestão de projetos de design
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <LayoutDashboard className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">Dashboard Intuitivo</h3>
                <p className="text-sm text-muted-foreground">
                  Visão geral de todos os projetos e estatísticas
                </p>
              </div>
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Links Seguros</h3>
                <p className="text-sm text-muted-foreground">
                  Compartilhe artes com controle de acesso
                </p>
              </div>
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <MessageSquareText className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">Comunicação Clara</h3>
                <p className="text-sm text-muted-foreground">
                  Feedbacks organizados e centralizados
                </p>
              </div>
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Mic className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-semibold mb-2">Áudio Integrado</h3>
                <p className="text-sm text-muted-foreground">
                  Grave e reproduza feedbacks em áudio
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
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
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
                <li><Link href="/projetos" className="hover:text-foreground">Projetos</Link></li>
                <li><Link href="/artes" className="hover:text-foreground">Artes</Link></li>
                <li><Link href="/feedbacks" className="hover:text-foreground">Feedbacks</Link></li>
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
                <li><Link href="/login" className="hover:text-foreground">Entrar</Link></li>
                <li><Link href="/cadastro" className="hover:text-foreground">Criar Conta</Link></li>
                <li><Link href="/perfil" className="hover:text-foreground">Perfil</Link></li>
                <li><Link href="/configuracoes" className="hover:text-foreground">Configurações</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
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
    <div className="rounded-xl border p-6 bg-background hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 font-semibold mb-3">
        <span className="grid place-items-center size-10 rounded-lg bg-indigo-600/10 text-indigo-700">
          {icon}
        </span>
        <span className="text-lg">{title}</span>
      </div>
      <p className="text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}