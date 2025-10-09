// app/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mic,
  MessageSquareText,
  ShieldCheck,
  LayoutDashboard,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/* =========================
   Helpers de animação
   ========================= */

function SectionFade({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

/** Card com mock “deitadinho” (sem sombras) e fundo xadrez */
function TiltHeroPreview() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // leve tilt conforme scroll (sem box-shadow)
  const rotateX = useTransform(scrollYProgress, [0, 1], [6, 0]);
  const rotateY = useTransform(scrollYProgress, [0, 1], [-6, 0]);
  const z = useTransform(scrollYProgress, [0, 1], [40, 0]);
  const rx = useSpring(rotateX, { stiffness: 120, damping: 20, mass: 0.3 });
  const ry = useSpring(rotateY, { stiffness: 120, damping: 20, mass: 0.3 });
  const tz = useSpring(z, { stiffness: 120, damping: 20, mass: 0.3 });

  return (
    <Card
      // xadrezinho
      className={[
        "border-border",
        "bg-[linear-gradient(45deg,#0000_25%,rgba(0,0,0,0.04)_0,rgba(0,0,0,0.04)_50%,#0000_0,#0000_75%,rgba(0,0,0,0.04)_0),linear-gradient(45deg,rgba(0,0,0,0.04)_25%,#0000_0,#0000_50%,rgba(0,0,0,0.04)_0,rgba(0,0,0,0.04)_75%,#0000_0)]",
        "bg-[size:20px_20px] bg-[position:0_0,10px_10px]",
      ].join(" ")}
    >
      <CardContent className="p-0">
        <motion.div
          ref={ref}
          style={{ rotateX: rx, rotateY: ry, translateZ: tz, transformStyle: "preserve-3d" }}
          className="aspect-video rounded-xl overflow-hidden border border-border bg-background"
        >
          {/* mock do app (neutro) */}
          <div className="h-full w-full grid grid-cols-3">
            <div className="col-span-1 p-4 border-r border-border/60 bg-muted/40">
              <div className="h-6 w-24 bg-foreground/10 rounded mb-3" />
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-10 rounded bg-foreground/5" />
                ))}
              </div>
            </div>
            <div className="col-span-2 p-4 grid grid-rows-2 gap-4 bg-muted/20">
              <div className="rounded bg-foreground/5" />
              <div className="rounded bg-foreground/5" />
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
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
    <div className="card rounded-xl border border-border p-6 bg-card">
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

/* =========================
   Página
   ========================= */

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
      {/* Header (sem sombras) */}
      <header className="border-b border-border sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
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

      {/* Main */}
      <main className="container mx-auto px-4 py-16">
        <div className="space-y-20">
          {/* HERO (texto preto, sem sombras; botões laranja; card com xadrezinho) */}
          <section className="relative overflow-hidden rounded-2xl border border-border bg-card">
            <div className="relative p-10 md:p-16 grid md:grid-cols-2 gap-10 items-center">
              <SectionFade>
                <div className="max-w-xl">
                  <div className="inline-flex items-center gap-2 bg-muted text-foreground rounded-full px-3 py-1 text-sm mb-4">
                    <Sparkles className="size-4" /> Novo • Dashboard de Artes
                  </div>

                  {/* título e subtítulo em preto/foreground, sem drop-shadows */}
                  <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
                    Gerencie artes e receba feedback de clientes com facilidade
                  </h1>

                  <p className="mt-4 text-base/7 text-muted-foreground">
                    Feedback por texto ou áudio, versão a versão, com visualização centralizada de alterações.
                  </p>

                  {/* CTAs laranja */}
                  <div className="mt-8 flex flex-col sm:flex-row gap-3">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-orange-500 text-white hover:bg-orange-600"
                      asChild
                    >
                      <Link href={isAuthed ? "/dashboard" : "/cadastro"}>
                        Começar agora
                      </Link>
                    </Button>

                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto border-orange-500 text-orange-600 hover:bg-orange-50"
                      onClick={goToDashboardOrLogin}
                    >
                      Ver demonstração
                    </Button>
                  </div>
                </div>
              </SectionFade>

              <SectionFade delay={0.06}>
                <TiltHeroPreview />
              </SectionFade>
            </div>
          </section>

          {/* Passos / Linha do tempo (mantido) */}
          <section className="relative">
            <div className="text-center mb-12">
              <SectionFade>
                <h2 className="section-title text-3xl font-bold mb-3">Como funciona</h2>
                <p className="text-lg text-muted-foreground">
                  Um fluxo simples — do upload à aprovação final
                </p>
              </SectionFade>
            </div>

            <div className="relative mx-auto max-w-4xl">
              {/* Linha central */}
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-border" />

              <ul className="space-y-10">
                {[
                  {
                    title: "1. Envie a arte",
                    desc: "Crie uma arte dentro de um projeto e gere versões conforme evolui.",
                    icon: <LayoutDashboard className="size-4" />,
                  },
                  {
                    title: "2. Receba feedback",
                    desc: "O cliente comenta por texto ou áudio, inclusive marcando pontos na arte.",
                    icon: <MessageSquareText className="size-4" />,
                  },
                  {
                    title: "3. Controle de status",
                    desc: "Acompanhe estados (Em análise, Pendente, Aprovado / Rejeitado) por versão.",
                    icon: <ShieldCheck className="size-4" />,
                  },
                  {
                    title: "4. Aprove e compartilhe",
                    desc: "Aprovações registradas e links somente leitura para compartilhar entregas.",
                    icon: <CheckCircle2 className="size-4" />,
                  },
                ].map((step, i) => (
                  <SectionFade key={i} delay={i * 0.05}>
                    <li className="relative grid md:grid-cols-2 gap-6 items-center">
                      {/* Bullet */}
                      <div className="absolute left-1/2 -translate-x-1/2 size-3 rounded-full bg-primary outline outline-4 outline-background" />

                      {/* Esquerda */}
                      <div
                        className={`md:pr-10 ${
                          i % 2 === 0 ? "md:col-start-1" : "md:col-start-2 md:order-2 md:pl-10"
                        }`}
                      >
                        <div className="card rounded-xl border border-border p-5 bg-card">
                          <div className="flex items-center gap-3 font-semibold mb-2">
                            <span className="grid place-items-center size-8 rounded-lg bg-primary/10 text-primary">
                              {step.icon}
                            </span>
                            <span className="text-base">{step.title}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{step.desc}</p>
                        </div>
                      </div>

                      {/* Direita (mock simples alternando) */}
                      <div className={`${i % 2 === 0 ? "md:col-start-2" : "md:col-start-1 md:order-1"}`}>
                        <Card className="bg-muted/30">
                          <CardContent className="p-0">
                            <div className="aspect-[16/8] rounded-xl overflow-hidden grid grid-cols-5">
                              <div className="col-span-2 p-4 border-r border-border/60">
                                <div className="h-5 w-24 bg-foreground/10 rounded mb-3" />
                                <div className="space-y-2">
                                  {Array.from({ length: 4 }).map((_, j) => (
                                    <div key={j} className="h-8 rounded bg-foreground/5" />
                                  ))}
                                </div>
                              </div>
                              <div className="col-span-3 p-4 grid gap-3">
                                <div className="rounded h-16 bg-foreground/5" />
                                <div className="rounded h-16 bg-foreground/5" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </li>
                  </SectionFade>
                ))}
              </ul>
            </div>
          </section>

          {/* Features principais */}
          <section>
            <div className="text-center mb-12">
              <SectionFade>
                <h2 className="section-title text-3xl font-bold mb-4">Funcionalidades Principais</h2>
                <p className="text-lg text-muted-foreground">
                  Tudo que você precisa para gerenciar projetos de design com eficiência
                </p>
              </SectionFade>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <SectionFade>
                <Feature icon={<MessageSquareText className="size-5" />} title="Feedback contextual">
                  Clientes comentam com texto ou gravam áudio diretamente na tela da arte.
                </Feature>
              </SectionFade>
              <SectionFade delay={0.05}>
                <Feature icon={<Mic className="size-5" />} title="Gravação de áudio integrada">
                  Capture instruções rápidas sem sair do navegador, com reprodução e download.
                </Feature>
              </SectionFade>
              <SectionFade delay={0.1}>
                <Feature icon={<ShieldCheck className="size-5" />} title="Controle de versões e aprovação">
                  Acompanhe status de cada versão e aprove alterações com segurança.
                </Feature>
              </SectionFade>
            </div>
          </section>

          {/* CTA final */}
          <section className="card rounded-2xl border border-border p-8 md:p-12 bg-[oklch(var(--card))]">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <SectionFade>
                <div className="space-y-4">
                  <h2 className="section-title text-3xl font-bold">Para Designers e Clientes</h2>
                  <p className="text-muted-foreground text-lg">
                    Designers visualizam solicitações em um painel unificado; clientes dão feedback de forma clara,
                    evitando ruídos na comunicação.
                  </p>
                  <div className="pt-2">
                    <Button
                      size="lg"
                      className="gap-2 bg-orange-500 text-white hover:bg-orange-600"
                      onClick={goToDashboardOrLogin}
                    >
                      <LayoutDashboard className="size-4" /> Abrir Dashboard
                    </Button>
                  </div>
                </div>
              </SectionFade>
              <SectionFade delay={0.05}>
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
              </SectionFade>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
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
            <p>&copy; {new Date().getFullYear()} VIU. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
