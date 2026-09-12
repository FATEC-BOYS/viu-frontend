import { quandoPorExtenso } from '@/lib/prazos';

/**
 * O estado do trabalho com um cliente.
 *
 * Mora fora de `app/(dashboard)/clientes/[id]/page.tsx` porque um arquivo de
 * página do Next não pode exportar nada além do componente — `next build` no
 * webpack recusa. É também o que deixa a frase de estado ser testada, que é a
 * parte com regra de verdade.
 */

export type ProjetoStatus = 'EM_ANDAMENTO' | 'CONCLUIDO' | 'PAUSADO';

export type ProjetoDoCliente = {
  id: string;
  nome: string;
  descricao?: string | null;
  status: ProjetoStatus;
  orcamento: number | null;
  prazo?: string | null;
  criado_em: string;
};

/** A cor segue a do resto do produto: menta anda, pêssego espera, cinza acabou. */
export const PINO: Record<ProjetoStatus, string> = {
  EM_ANDAMENTO: 'bg-pastel-menta',
  PAUSADO: 'bg-pastel-pessego',
  CONCLUIDO: 'bg-border',
};

export const ROTULO: Record<ProjetoStatus, string> = {
  EM_ANDAMENTO: 'em andamento',
  PAUSADO: 'pausado',
  CONCLUIDO: 'concluído',
};

/**
 * Como está o trabalho com esta pessoa, em uma frase.
 *
 * Isto substitui cinco cartões de número, um quadro de "Bandeiras & riscos" e
 * um "Resumo do relacionamento" que repetia os mesmos números em prosa. Os
 * cinco cartões viravam cinco telas de rolagem no celular para dizer "um
 * projeto, parado".
 *
 * O atraso fala mais alto porque é a única coisa aqui que pede ação hoje.
 */
export function recadoDoCliente(projetos: ProjetoDoCliente[]): string {
  if (projetos.length === 0) return 'Nenhum projeto ainda.';

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const abertos = projetos.filter((p) => p.status !== 'CONCLUIDO');
  const atrasados = abertos.filter((p) => p.prazo && new Date(p.prazo) < hoje);

  if (atrasados.length === 1) return 'Um projeto com o prazo vencido.';
  if (atrasados.length > 1) return `${atrasados.length} projetos com o prazo vencido.`;

  const proximo = abertos
    .filter((p) => p.prazo)
    .sort((a, b) => a.prazo!.localeCompare(b.prazo!))[0];
  if (proximo) {
    /*
     * `quandoPorExtenso` devolve "em 3 dias · 15/09" — o sufixo de data serve
     * na linha da lista, onde não há espaço para escrever por extenso. No meio
     * de uma frase ele vira "em 3 dias · 15/09.", e a data já aparece logo
     * abaixo, no projeto.
     */
    const quando = quandoPorExtenso(proximo.prazo!).split(' · ')[0];
    return `Próxima entrega: ${proximo.nome}, ${quando}.`;
  }

  if (abertos.length === 0) {
    return projetos.length === 1
      ? 'Projeto entregue. Nada em aberto.'
      : `${projetos.length} projetos entregues. Nada em aberto.`;
  }
  return abertos.length === 1 ? 'Um projeto em aberto, sem prazo marcado.' : `${abertos.length} projetos em aberto, sem prazo marcado.`;
}
