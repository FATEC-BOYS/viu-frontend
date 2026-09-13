'use client';

import { FadeIn } from '@/components/layout/Motion';
import EmptyState from '@/components/layout/EmptyState';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { pagamentosApi, type Plano, type PlanoEntrada } from '@/lib/pagamentos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Layers, Loader2, Pencil, Plus } from 'lucide-react';

/**
 * Cadastro de planos.
 *
 * Sem esta tela, habilitar assinaturas dependia de alguém rodar um `curl`:
 * `POST /planos` é ADMIN e nenhuma tela chamava. O resultado é que a tabela
 * `planos` está vazia, `GET /planos` devolve `[]`, a tela de Planos mostra o
 * estado vazio, e `POST /assinaturas` não tem `planoId` que receber — o
 * produto tem o mecanismo de assinatura inteiro e nada para assinar.
 *
 * O campo que exige mais cuidado é a taxa. No banco ela é fração (0.10 = 10%)
 * e vai crua para `faturaService`, que calcula quanto o designer recebe de
 * cada fatura. Ninguém digita "0,10" pensando em taxa — digita "10". Então o
 * formulário fala em por cento, converte na hora de enviar, e mostra o efeito
 * em dinheiro antes de salvar.
 */

const TAXA_PADRAO_PCT = 10;

type Rascunho = {
  nome: string;
  tipo: 'DESIGNER' | 'CLIENTE';
  precoMensalReais: string;
  taxaPercentual: string;
  limitesProjetos: string;
  limitesArtes: string;
  limitesStorageMb: string;
  descricao: string;
  ativo: boolean;
};

const VAZIO: Rascunho = {
  nome: '',
  tipo: 'DESIGNER',
  precoMensalReais: '',
  taxaPercentual: String(TAXA_PADRAO_PCT),
  limitesProjetos: '',
  limitesArtes: '',
  limitesStorageMb: '',
  descricao: '',
  ativo: true,
};

function reaisParaCentavos(v: string): number {
  const n = Number(v.replace(/\./g, '').replace(',', '.').trim());
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function centavosParaReais(c: number): string {
  return (c / 100).toFixed(2).replace('.', ',');
}

function inteiroOuNulo(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function formatBRL(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AdminPlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Plano | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho>(VAZIO);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const res = await pagamentosApi.getPlanosAdmin();
      setPlanos(res.data ?? []);
      setErro(null);
    } catch (e: unknown) {
      setErro((e as { message?: string })?.message ?? 'Não foi possível carregar os planos.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function abrirNovo() {
    setEditando(null);
    setRascunho(VAZIO);
    setAberto(true);
  }

  function abrirEdicao(p: Plano) {
    setEditando(p);
    setRascunho({
      nome: p.nome,
      tipo: p.tipo,
      precoMensalReais: centavosParaReais(p.precoMensal),
      // A fração vira por cento para a pessoa ler o que escreveu.
      taxaPercentual: String(Math.round(p.taxaPlataforma * 1000) / 10),
      limitesProjetos: p.limitesProjetos != null ? String(p.limitesProjetos) : '',
      limitesArtes: p.limitesArtes != null ? String(p.limitesArtes) : '',
      limitesStorageMb: p.limitesStorageMb != null ? String(p.limitesStorageMb) : '',
      descricao: p.descricao ?? '',
      ativo: p.ativo,
    });
    setAberto(true);
  }

  const precoCentavos = reaisParaCentavos(rascunho.precoMensalReais);
  const taxaPct = Number(rascunho.taxaPercentual.replace(',', '.'));
  const taxaValida = Number.isFinite(taxaPct) && taxaPct >= 0 && taxaPct <= 100;
  const podeSalvar = rascunho.nome.trim().length >= 2 && taxaValida && !salvando;

  async function salvar() {
    const dados: PlanoEntrada = {
      nome: rascunho.nome.trim(),
      tipo: rascunho.tipo,
      precoMensal: precoCentavos,
      // Por cento vira fração aqui, e em nenhum outro lugar: é a única
      // conversão, e ela existe porque o banco guarda 0.10 e a pessoa pensa 10.
      taxaPlataforma: Math.round(taxaPct * 100) / 10000,
      limitesProjetos: inteiroOuNulo(rascunho.limitesProjetos),
      limitesArtes: inteiroOuNulo(rascunho.limitesArtes),
      limitesStorageMb: inteiroOuNulo(rascunho.limitesStorageMb),
      descricao: rascunho.descricao.trim() || null,
      ativo: rascunho.ativo,
    };

    setSalvando(true);
    try {
      if (editando) {
        await pagamentosApi.atualizarPlano(editando.id, dados);
        toast.success('Plano atualizado.');
      } else {
        await pagamentosApi.criarPlano(dados);
        toast.success('Plano criado. Já aparece para quem vai assinar.');
      }
      setAberto(false);
      await carregar();
    } catch (e: unknown) {
      // O servidor valida a taxa e o preço; repetir a mensagem dele é o que
      // diz qual campo recusar.
      toast.error((e as { message?: string })?.message ?? 'Não foi possível salvar o plano.');
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
        <span className="sr-only">Carregando planos…</span>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground">{erro}</p>
        <Button onClick={() => { setCarregando(true); void carregar(); }}>Tentar de novo</Button>
      </div>
    );
  }

  return (
    <FadeIn className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <h1 className="text-2xl font-semibold tracking-tight">Planos ✦</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {planos.length === 0
              ? 'Sem plano cadastrado, ninguém consegue assinar.'
              : 'A taxa de cada plano decide quanto o designer recebe por fatura.'}
          </p>
        </div>
        <Button onClick={abrirNovo} className="shrink-0">
          <Plus className="mr-1 h-4 w-4" /> Novo plano
        </Button>
      </div>

      {planos.length === 0 ? (
        <EmptyState
          icon={Layers}
          tom="lavanda"
          title="Nenhum plano cadastrado"
          description="O mecanismo de assinatura está pronto — falta o que assinar. Um plano gratuito já habilita o fluxo sem depender do Mercado Pago."
          actionLabel="Criar o primeiro plano"
          onAction={abrirNovo}
        />
      ) : (
        <section className="flex flex-col gap-1 rounded-xl border bg-card p-4">
          <h2 className="flex items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
            <span>Cadastrados</span>
            <span className="tabular-nums">{planos.length}</span>
          </h2>

          <ul className="flex flex-col">
            {planos.map((p) => (
              <li key={p.id} className="border-b last:border-b-0">
                <div className={`flex items-stretch gap-3 py-2.5 ${p.ativo ? '' : 'opacity-60'}`}>
                  <span
                    aria-hidden
                    className={`w-[3px] shrink-0 rounded-full ${p.ativo ? 'bg-pastel-menta' : 'bg-border'}`}
                  />
                  <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
                    <div className="min-w-0 flex-1 basis-52">
                      <p className="truncate text-sm font-medium">
                        {p.nome}
                        {!p.ativo && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            inativo
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.tipo === 'DESIGNER' ? 'para designers' : 'para clientes'}
                        {' · '}
                        {p.precoMensal === 0 ? 'gratuito' : `${formatBRL(p.precoMensal)}/mês`}
                      </p>
                    </div>
                    <p className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                      taxa {p.taxaPlataformaFormatada}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => abrirEdicao(p)}
                    aria-label={`Editar ${p.nome}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-lg">
          <DialogHeader className="shrink-0">
            <DialogTitle>{editando ? 'Editar plano' : 'Novo plano'}</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={rascunho.nome}
                onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })}
                placeholder="Essencial, Pro, Estúdio…"
              />
            </div>

            <div className="space-y-2">
              <Label>Para quem</Label>
              <div className="flex gap-2">
                {(['DESIGNER', 'CLIENTE'] as const).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    size="sm"
                    variant={rascunho.tipo === t ? 'default' : 'outline'}
                    onClick={() => setRascunho({ ...rascunho, tipo: t })}
                  >
                    {t === 'DESIGNER' ? 'Designers' : 'Clientes'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="preco">Mensalidade (R$)</Label>
                <Input
                  id="preco"
                  inputMode="decimal"
                  value={rascunho.precoMensalReais}
                  onChange={(e) => setRascunho({ ...rascunho, precoMensalReais: e.target.value })}
                  placeholder="0,00"
                />
                <p className="text-xs text-muted-foreground">
                  {precoCentavos === 0
                    ? 'Gratuito: a assinatura ativa na hora, sem passar pelo Mercado Pago.'
                    : 'Cobrado por recorrência no Mercado Pago.'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxa">Taxa da plataforma (%)</Label>
                <Input
                  id="taxa"
                  inputMode="decimal"
                  value={rascunho.taxaPercentual}
                  onChange={(e) => setRascunho({ ...rascunho, taxaPercentual: e.target.value })}
                  aria-invalid={!taxaValida || undefined}
                />
                {!taxaValida && (
                  <p className="text-xs text-destructive">Use um número entre 0 e 100.</p>
                )}
              </div>
            </div>

            {/*
              A taxa é o número que mais importa e o mais fácil de errar: ela
              sai daqui direto para o cálculo do que o designer recebe. Mostrar
              o efeito em dinheiro antes de salvar é mais honesto do que
              confiar que quem digitou entendeu a unidade.
            */}
            {taxaValida && (
              <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                Numa fatura de <b className="text-foreground">R$ 1.000,00</b>, a plataforma retém{' '}
                <b className="text-foreground">{formatBRL(Math.round(100000 * (taxaPct / 100)))}</b>{' '}
                e o designer recebe{' '}
                <b className="text-foreground">
                  {formatBRL(100000 - Math.round(100000 * (taxaPct / 100)))}
                </b>
                .
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="lim-proj">Projetos</Label>
                <Input
                  id="lim-proj"
                  inputMode="numeric"
                  value={rascunho.limitesProjetos}
                  onChange={(e) => setRascunho({ ...rascunho, limitesProjetos: e.target.value })}
                  placeholder="sem limite"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lim-artes">Artes</Label>
                <Input
                  id="lim-artes"
                  inputMode="numeric"
                  value={rascunho.limitesArtes}
                  onChange={(e) => setRascunho({ ...rascunho, limitesArtes: e.target.value })}
                  placeholder="sem limite"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lim-storage">Armazenamento (MB)</Label>
                <Input
                  id="lim-storage"
                  inputMode="numeric"
                  value={rascunho.limitesStorageMb}
                  onChange={(e) => setRascunho({ ...rascunho, limitesStorageMb: e.target.value })}
                  placeholder="sem limite"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Campo em branco significa sem limite. Nada no produto lê estes números por
              enquanto — eles ficam registrados no plano.
            </p>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                rows={2}
                value={rascunho.descricao}
                onChange={(e) => setRascunho({ ...rascunho, descricao: e.target.value })}
                placeholder="A frase que aparece na tela de Planos."
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Disponível para assinar</p>
                <p className="text-xs text-muted-foreground">
                  Desligado, o plano some da tela de Planos. Quem já assinou continua como está.
                </p>
              </div>
              <Switch
                checked={rascunho.ativo}
                onCheckedChange={(v) => setRascunho({ ...rascunho, ativo: v })}
              />
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setAberto(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={!podeSalvar}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editando ? 'Salvar' : 'Criar plano'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </FadeIn>
  );
}
