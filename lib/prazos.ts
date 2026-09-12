/**
 * A agenda de entregas: o que é um compromisso, quando ele vence e como os
 * vencimentos se agrupam.
 *
 * Mora fora de `app/(dashboard)/prazos/page.tsx` porque um arquivo de página
 * do Next não pode exportar nada além do componente — `next build` recusa
 * ("agrupar is not a valid Page export field"). Isso não aparecia aqui porque
 * o projeto builda com `--turbopack`, que não roda essa validação; o webpack
 * roda. Ficar num módulo também é o que deixa estas funções serem testadas.
 */

export type Tipo = 'projeto' | 'tarefa' | 'fatura';

export type Compromisso = {
  id: string;
  tipo: Tipo;
  titulo: string;
  apoio: string;
  /** ISO. Só entra na agenda quem tem data — é o que a agenda é. */
  quando: string;
  href: string;
};

/**
 * A cor segue a do resto do produto: menta é prazo, lavanda é tarefa, pêssego
 * é o que espera dinheiro ou resposta de fora.
 */
export const PINO: Record<Tipo, string> = {
  projeto: 'bg-pastel-menta',
  tarefa: 'bg-pastel-lavanda',
  fatura: 'bg-pastel-pessego',
};

export const ROTULO: Record<Tipo, string> = {
  projeto: 'Entrega do projeto',
  tarefa: 'Tarefa',
  fatura: 'Fatura',
};

export function meiaNoite(d: Date = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function mesmoDia(a: Date, b: Date) {
  return meiaNoite(a).getTime() === meiaNoite(b).getTime();
}

function diasAte(iso: string) {
  return Math.round((meiaNoite(new Date(iso)).getTime() - meiaNoite().getTime()) / 86400000);
}

/** A frase de quando, escrita como se fala. */
export function quandoPorExtenso(iso: string): string {
  const d = diasAte(iso);
  const data = new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  if (d < -1) return `atrasado há ${-d} dias · ${data}`;
  if (d === -1) return `atrasado desde ontem · ${data}`;
  if (d === 0) return `hoje`;
  if (d === 1) return `amanhã · ${data}`;
  if (d <= 7) return `em ${d} dias · ${data}`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

export type Faixa = { chave: string; titulo: string; itens: Compromisso[] };

/**
 * Agrupa por urgência, não por data: quem abre quer saber o que já passou e o
 * que é hoje, não navegar um calendário mentalmente. Dentro de "atrasado" a
 * ordem é do mais recente para o mais antigo — o que venceu ontem ainda dá
 * para resolver; o de um ano atrás é história.
 */
export function agrupar(itens: Compromisso[]): Faixa[] {
  const hoje = meiaNoite();
  const fimDaSemana = new Date(hoje.getTime() + 7 * 86400000);

  const atrasados = itens.filter((i) => meiaNoite(new Date(i.quando)) < hoje);
  const deHoje = itens.filter((i) => mesmoDia(new Date(i.quando), hoje));
  const daSemana = itens.filter((i) => {
    const d = meiaNoite(new Date(i.quando));
    return d > hoje && d <= fimDaSemana;
  });
  const depois = itens.filter((i) => meiaNoite(new Date(i.quando)) > fimDaSemana);

  const porData = (a: Compromisso, b: Compromisso) => a.quando.localeCompare(b.quando);

  return [
    { chave: 'atrasado', titulo: 'Atrasado', itens: [...atrasados].sort((a, b) => porData(b, a)) },
    { chave: 'hoje', titulo: 'Hoje', itens: [...deHoje].sort(porData) },
    { chave: 'semana', titulo: 'Próximos 7 dias', itens: [...daSemana].sort(porData) },
    { chave: 'depois', titulo: 'Depois', itens: [...depois].sort(porData) },
  ].filter((f) => f.itens.length > 0);
}

/** A frase do topo: o próximo compromisso, ou o atraso mais recente. */
export function recadoDaAgenda(itens: Compromisso[]): string {
  if (itens.length === 0) return 'Nada com data marcada.';
  const hoje = meiaNoite();
  const atrasados = itens.filter((i) => meiaNoite(new Date(i.quando)) < hoje);
  if (atrasados.length > 0) {
    return atrasados.length === 1
      ? '1 compromisso passou da data.'
      : `${atrasados.length} compromissos passaram da data.`;
  }
  const proximo = [...itens].sort((a, b) => a.quando.localeCompare(b.quando))[0];
  const d = diasAte(proximo.quando);
  if (d === 0) return `${proximo.titulo} vence hoje.`;
  if (d === 1) return `${proximo.titulo} vence amanhã.`;
  return `O próximo é ${proximo.titulo}, em ${d} dias.`;
}
