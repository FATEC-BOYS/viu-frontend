'use client';

import { FadeIn } from "@/components/layout/Motion";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getAll } from '@/lib/api';
import { pagamentosApi } from '@/lib/pagamentos';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Loader2 } from 'lucide-react';

/**
 * Uma agenda de entregas — o que vence, e quando.
 *
 * Esta tela era sete cartões de peso igual, e quatro deles respondiam o que
 * outra tela já responde: "Feedbacks abertos" duplicava a fila do Dashboard e
 * a tela de Feedbacks, "Aprovações pendentes" duplicava a aba do projeto, e
 * "Resumo" repetia em quatro caixinhas os números dos cartões logo acima dele.
 *
 * Pior: os três cartões principais eram de TAREFA — "Tarefas cuja data é
 * hoje", "Priorize estas tarefas" — num produto onde não existe criador de
 * tarefa e a tela de Tarefas está escondida. Uma tela inteira organizada em
 * volta do que o produto quase não tem.
 *
 * Sobrou o que só aqui existe: o calendário e as datas. Aprovação e feedback
 * não entram porque não têm data nenhuma no schema — marcá-los numa agenda
 * exigiria inventar um "quando" que não existe.
 */

import {
  PINO,
  ROTULO,
  agrupar,
  meiaNoite,
  mesmoDia,
  quandoPorExtenso,
  recadoDaAgenda,
  type Compromisso,
} from '@/lib/prazos';

export default function PrazosPage() {
  const { user } = useAuth();
  const usuarioId = (user as { id?: string } | null)?.id;
  const ehDesigner = (user as { tipo?: string } | null)?.tipo === 'DESIGNER';

  const [itens, setItens] = useState<Compromisso[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [diaEscolhido, setDiaEscolhido] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (!usuarioId) return;
    let vivo = true;

    (async () => {
      setLoading(true);
      setErro(null);
      try {
        const [projetos, tarefasPendentes, tarefasAndamento, faturas] = await Promise.all([
          getAll<any>('/projetos'),
          getAll<any>('/tarefas?status=PENDENTE'),
          getAll<any>('/tarefas?status=EM_ANDAMENTO'),
          pagamentosApi
            .getFaturas(ehDesigner ? 'designer' : 'cliente')
            .then((r) => r.data ?? [])
            .catch(() => []),
        ]);
        if (!vivo) return;

        const lista: Compromisso[] = [
          ...projetos
            .filter((p: any) => p.prazo)
            .map((p: any) => ({
              id: `projeto-${p.id}`,
              tipo: 'projeto' as const,
              titulo: p.nome,
              apoio: p.cliente?.nome ?? 'Sem cliente',
              quando: p.prazo,
              href: `/projetos/${p.id}`,
            })),
          ...[...tarefasPendentes, ...tarefasAndamento]
            .filter((t: any) => t.prazo)
            .map((t: any) => ({
              id: `tarefa-${t.id}`,
              tipo: 'tarefa' as const,
              titulo: t.titulo,
              apoio: t.projeto?.nome ?? 'Sem projeto',
              quando: t.prazo,
              // A tarefa mora dentro do projeto — /tarefas hoje só redireciona.
              href: t.projeto?.id ? `/projetos/${t.projeto.id}?tab=tasks` : '/projetos',
            })),
          ...faturas
            .filter((f: any) => f.status === 'PENDENTE' && f.dataVencimento)
            .map((f: any) => ({
              id: `fatura-${f.id}`,
              tipo: 'fatura' as const,
              titulo: f.projeto?.nome ? `Fatura · ${f.projeto.nome}` : 'Fatura',
              apoio: f.valorFormatado ?? '',
              quando: f.dataVencimento,
              href: `/faturas/${f.id}`,
            })),
        ];

        setItens(lista);
      } catch (e: any) {
        if (vivo) setErro(e?.message ?? 'Não foi possível carregar os prazos.');
      } finally {
        if (vivo) setLoading(false);
      }
    })();

    return () => {
      vivo = false;
    };
  }, [usuarioId, ehDesigner]);

  /** Os dias que têm alguma coisa — é o que o calendário marca. */
  const diasComItem = useMemo(
    () => itens.map((i) => meiaNoite(new Date(i.quando))),
    [itens],
  );

  const visiveis = useMemo(
    () =>
      diaEscolhido
        ? itens.filter((i) => mesmoDia(new Date(i.quando), diaEscolhido))
        : itens,
    [itens, diaEscolhido],
  );

  const faixas = useMemo(() => agrupar(visiveis), [visiveis]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        <span className="sr-only">Carregando prazos…</span>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">{erro}</p>
        <Button onClick={() => location.reload()}>Recarregar</Button>
      </div>
    );
  }

  return (
    <FadeIn className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Prazos ✦</h1>
        <p className="mt-1 text-sm text-muted-foreground">{recadoDaAgenda(itens)}</p>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* A agenda */}
        <div className="flex flex-col gap-4">
          {faixas.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed bg-pastel-menta/15 p-5">
              <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-pastel-menta text-base">
                ✓
              </span>
              <div>
                <p className="text-sm font-medium">
                  {diaEscolhido ? 'Nada neste dia' : 'Nenhuma data marcada'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {diaEscolhido
                    ? 'Escolha outro dia no calendário, ou limpe o filtro.'
                    : 'Prazo de projeto, tarefa com data e fatura a vencer aparecem aqui.'}
                </p>
              </div>
            </div>
          ) : (
            faixas.map((faixa) => (
              <section key={faixa.chave} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
                <h2 className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
                  <span className={faixa.chave === 'atrasado' ? 'text-destructive' : undefined}>
                    {faixa.titulo}
                  </span>
                  <span className="tabular-nums">{faixa.itens.length}</span>
                </h2>

                <ul className="flex flex-col">
                  {faixa.itens.map((item) => (
                    <li key={item.id} className="border-b last:border-b-0">
                      <Link
                        href={item.href}
                        className="flex items-stretch gap-3 rounded-md py-2.5 transition-colors hover:bg-muted/50"
                      >
                        <span aria-hidden className={`w-[3px] shrink-0 rounded-full ${PINO[item.tipo]}`} />
                        {/*
                          `flex-wrap` com base de 13rem no título: no desktop a
                          data fica à direita, e no celular ela desce para a
                          própria linha em vez de espremer o nome do projeto
                          até virar "Site Institucionа…".
                        */}
                        <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
                          <span className="min-w-0 flex-1 basis-52">
                            <span className="block truncate text-sm font-medium">{item.titulo}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {ROTULO[item.tipo]}
                              {item.apoio ? ` · ${item.apoio}` : ''}
                            </span>
                          </span>
                          <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                            {quandoPorExtenso(item.quando)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        {/* O calendário: dá a forma do mês e filtra um dia */}
        <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
            Calendário
          </h2>
          <Calendar
            mode="single"
            selected={diaEscolhido}
            onSelect={setDiaEscolhido}
            // Marca os dias que têm compromisso: sem isto o calendário é um
            // seletor às cegas, e quem clica descobre o vazio depois.
            modifiers={{ temItem: diasComItem }}
            modifiersClassNames={{ temItem: 'font-semibold underline decoration-primary decoration-2 underline-offset-4' }}
            className="w-full p-0"
          />
          {diaEscolhido && (
            <Button variant="outline" size="sm" onClick={() => setDiaEscolhido(undefined)}>
              Limpar filtro
            </Button>
          )}
        </section>
      </div>
    </FadeIn>
  );
}
