/**
 * O estado de um link compartilhado, derivado do que o banco guarda.
 *
 * Mora fora de `app/(dashboard)/links/page.tsx` porque o Next não deixa um
 * arquivo de página exportar nada além do componente — e estas funções são
 * justamente a parte que precisa de teste. O bug que motivou a reescrita era
 * aqui dentro: a tela lia `expiraEm` e não lia `revogado`, então um link morto
 * aparecia como "Permanente" e ia parar no WhatsApp do cliente.
 */

export type LinkCompartilhado = {
  id: string;
  token: string;
  arte: {
    nome: string;
    projeto: { nome: string; cliente: { nome: string; telefone: string | null } };
  } | null;
  somenteLeitura: boolean;
  expiraEm: string | null;
  revogado: boolean;
  limiteTentativas: number | null;
  acessos: number;
  criadoEm: string;
};

export type Faixa = 'esperando' | 'aberto' | 'morto';

export const TITULO: Record<Faixa, string> = {
  esperando: 'Esperando o cliente abrir',
  aberto: 'Já abriram',
  morto: 'Não valem mais',
};

/**
 * A cor segue a do resto do produto: pêssego é o que espera resposta de fora,
 * menta é o que andou, e o que morreu não ganha tinta.
 */
export const PINO: Record<Faixa, string> = {
  esperando: 'bg-pastel-pessego',
  aberto: 'bg-pastel-menta',
  morto: 'bg-border',
};

function diasDesde(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

function dataCurta(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/**
 * A ordem importa: um link pode estar revogado E expirado E no limite. O que
 * se diz é a primeira causa, porque é a que o designer precisa desfazer.
 */
export function estadoDoLink(l: LinkCompartilhado): { faixa: Faixa; rotulo: string } {
  if (l.revogado) return { faixa: 'morto', rotulo: 'revogado' };

  if (l.expiraEm && new Date(l.expiraEm) < new Date()) {
    return { faixa: 'morto', rotulo: `expirou em ${dataCurta(l.expiraEm)}` };
  }

  if (l.limiteTentativas !== null && l.acessos >= l.limiteTentativas) {
    return { faixa: 'morto', rotulo: `limite de ${l.limiteTentativas} acessos atingido` };
  }

  if (l.acessos === 0) {
    const d = diasDesde(l.criadoEm);
    const espera = d === 0 ? 'enviado hoje' : d === 1 ? 'há 1 dia' : `há ${d} dias`;
    return { faixa: 'esperando', rotulo: `ainda não abriu · ${espera}` };
  }

  return {
    faixa: 'aberto',
    rotulo: l.acessos === 1 ? 'aberto 1 vez' : `aberto ${l.acessos} vezes`,
  };
}

/**
 * O aviso de validade só aparece quando falta pouco — um link que vence em
 * três meses não é notícia, e repetir a data em toda linha é ruído.
 */
export function avisoDeValidade(l: LinkCompartilhado): string | null {
  if (!l.expiraEm || l.revogado) return null;
  const dias = Math.ceil((new Date(l.expiraEm).getTime() - Date.now()) / 86400000);
  if (dias < 0 || dias > 3) return null;
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  return `vence em ${dias} dias`;
}

type Grupo = { faixa: Faixa; itens: LinkCompartilhado[] };

/**
 * Dentro de "esperando" a ordem é do mais antigo para o mais novo: quem espera
 * há duas semanas é quem precisa de um empurrão. Nas outras faixas vale o
 * inverso — o recente é o relevante.
 */
export function agrupar(itens: LinkCompartilhado[]): Grupo[] {
  const por: Record<Faixa, LinkCompartilhado[]> = { esperando: [], aberto: [], morto: [] };
  for (const l of itens) por[estadoDoLink(l).faixa].push(l);

  por.esperando.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  por.aberto.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  por.morto.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  return (['esperando', 'aberto', 'morto'] as Faixa[])
    .map((faixa) => ({ faixa, itens: por[faixa] }))
    .filter((g) => g.itens.length > 0);
}

/** A frase do topo: o que está pendurado, ou o alívio de não haver nada. */
export function recadoDosLinks(itens: LinkCompartilhado[]): string {
  if (itens.length === 0) return 'Nenhum link enviado ainda.';

  const esperando = itens.filter((l) => estadoDoLink(l).faixa === 'esperando');
  if (esperando.length === 0) {
    return 'Todo link que você mandou já foi aberto.';
  }

  const parados = esperando.filter((l) => diasDesde(l.criadoEm) >= 7);
  if (parados.length === 1) return '1 link esperando há mais de uma semana.';
  if (parados.length > 1) return `${parados.length} links esperando há mais de uma semana.`;

  return esperando.length === 1
    ? '1 link ainda não foi aberto.'
    : `${esperando.length} links ainda não foram abertos.`;
}
