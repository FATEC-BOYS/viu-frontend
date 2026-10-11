import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { recadoDoCliente, prazoEmAberto, type ProjetoDoCliente } from '../clientes';

/**
 * A frase substitui cinco cartões de número, um quadro de "Bandeiras & riscos"
 * e um "Resumo do relacionamento" em prosa — três superfícies dizendo o mesmo,
 * e que no celular viravam cinco telas de rolagem antes do primeiro projeto.
 *
 * A tela antiga também se contradizia: "Próximo prazo" só olhava projetos
 * EM_ANDAMENTO, então o prazo de um projeto pausado sumia; ao lado, "Prazo em
 * 7 dias" olhava todos e dizia "Atenção". Aqui a regra é uma só.
 */

const AGORA = new Date('2026-09-12T12:00:00.000Z');

function dias(n: number) {
  return new Date(AGORA.getTime() + n * 86400000).toISOString();
}

function projeto(over: Partial<ProjetoDoCliente> = {}): ProjetoDoCliente {
  return {
    id: 'p1',
    nome: 'Site',
    status: 'EM_ANDAMENTO',
    orcamento: 15000,
    prazo: null,
    criado_em: dias(-30),
    ...over,
  };
}

/**
 * Roda a mesma asserção nos dois fusos que importam.
 *
 * O container roda em UTC e o produto roda no Brasil. Foi essa diferença que
 * escondeu o bug: no cartão, `2025-10-01T00:00:00Z` aparecia como 01/10 aqui e
 * como 30/09 em São Paulo — todo prazo um dia antes, todo atraso um dia a
 * mais, para todo usuário brasileiro. Uma asserção que só roda em UTC não teria
 * visto, e é por isso que este arquivo troca o fuso de propósito.
 */
function nosDoisFusos(f: (fuso: string) => void) {
  const original = process.env.TZ;
  try {
    for (const fuso of ['UTC', 'America/Sao_Paulo']) {
      process.env.TZ = fuso;
      f(fuso);
    }
  } finally {
    process.env.TZ = original;
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(AGORA);
});
afterEach(() => vi.useRealTimers());

describe('recadoDoCliente', () => {
  it('reconhece o cliente sem projeto', () => {
    expect(recadoDoCliente([])).toBe('Nenhum projeto ainda.');
  });

  it('o atraso fala mais alto que a próxima entrega', () => {
    const itens = [projeto({ id: 'a', prazo: dias(-3) }), projeto({ id: 'b', prazo: dias(2) })];
    expect(recadoDoCliente(itens)).toBe('Um projeto com o prazo vencido.');
  });

  it('conta os atrasos no plural', () => {
    const itens = [projeto({ id: 'a', prazo: dias(-3) }), projeto({ id: 'b', prazo: dias(-9) })];
    expect(recadoDoCliente(itens)).toBe('2 projetos com o prazo vencido.');
  });

  /*
   * O caso exato do print: um projeto PAUSADO com prazo vencido. A tela antiga
   * mostrava "Próximo prazo: —" (porque filtrava por EM_ANDAMENTO) e, logo
   * abaixo, "Prazo em 7 dias: Atenção".
   */
  it('não perde o prazo vencido de um projeto pausado', () => {
    expect(recadoDoCliente([projeto({ status: 'PAUSADO', prazo: dias(-1) })])).toBe(
      'Um projeto com o prazo vencido.',
    );
  });

  it('projeto concluído não gera cobrança, mesmo com prazo no passado', () => {
    expect(recadoDoCliente([projeto({ status: 'CONCLUIDO', prazo: dias(-30) })])).toBe(
      'Projeto entregue. Nada em aberto.',
    );
  });

  it('nomeia a próxima entrega quando nada está atrasado', () => {
    const itens = [projeto({ id: 'a', nome: 'Marca', prazo: dias(9) }), projeto({ id: 'b', nome: 'Site', prazo: dias(3) })];
    expect(recadoDoCliente(itens)).toBe('Próxima entrega: Site, em 3 dias.');
  });

  it('diz quando tudo foi entregue, no plural', () => {
    const itens = [projeto({ id: 'a', status: 'CONCLUIDO' }), projeto({ id: 'b', status: 'CONCLUIDO' })];
    expect(recadoDoCliente(itens)).toBe('2 projetos entregues. Nada em aberto.');
  });

  it('admite o projeto em aberto sem prazo marcado', () => {
    expect(recadoDoCliente([projeto({ prazo: null })])).toBe(
      'Um projeto em aberto, sem prazo marcado.',
    );
  });

  /* Vencer hoje não é vencido — o dia ainda não acabou. */
  it('não chama de vencido o que vence hoje', () => {
    expect(recadoDoCliente([projeto({ prazo: '2026-09-12T09:00:00.000Z' })])).toBe(
      'Próxima entrega: Site, hoje.',
    );
  });

  /*
   * O caso acima passava por sorte: às 09:00 UTC o instante ainda cai no dia
   * certo em São Paulo. Mas o backend guarda prazo à MEIA-NOITE — é assim que
   * os dados reais são — e aí `2026-09-12T00:00:00Z` vira 21h de 11/09 no
   * Brasil, menor que a meia-noite de hoje. O prazo que vence HOJE era
   * anunciado como vencido, para quem usa o produto e não para quem roda os
   * testes.
   */
  it('nem quando o prazo de hoje chega à meia-noite, em qualquer fuso', () => {
    nosDoisFusos((fuso) => {
      expect(recadoDoCliente([projeto({ prazo: '2026-09-12T00:00:00.000Z' })]), fuso).toBe(
        'Próxima entrega: Site, hoje.',
      );
    });
  });
});

describe('prazoEmAberto', () => {
  it('cala quando não há projeto, ou nenhum tem prazo', () => {
    expect(prazoEmAberto([])).toBeNull();
    expect(prazoEmAberto([projeto()])).toBeNull();
  });

  it('mostra o prazo mais próximo entre os que ainda não acabaram', () => {
    const r = prazoEmAberto([
      projeto({ id: 'b', prazo: dias(10) }),
      projeto({ id: 'a', prazo: dias(3) }),
    ]);
    expect(r?.atrasado).toBe(false);
    expect(r?.dia).toBe('15/09/2026');
  });

  it('diz que passou quando passou', () => {
    expect(prazoEmAberto([projeto({ prazo: dias(-375) })])?.atrasado).toBe(true);
  });

  it('não chama de atrasado o que vence hoje', () => {
    expect(prazoEmAberto([projeto({ prazo: '2026-09-12T00:00:00.000Z' })])?.atrasado).toBe(false);
  });

  it('ignora o concluído, mesmo com prazo no passado', () => {
    expect(prazoEmAberto([projeto({ status: 'CONCLUIDO', prazo: dias(-30) })])).toBeNull();
  });

  /*
   * A divergência que motivou a função. O cartão filtrava `EM_ANDAMENTO`, e
   * um projeto pausado com prazo estourado sumia dele — enquanto o detalhe do
   * MESMO cliente, um clique adiante, dizia "Um projeto com o prazo vencido".
   * Pausado não é entregue; é exatamente o que precisa de atenção.
   */
  it('conta o projeto pausado, como a frase do detalhe já contava', () => {
    const pausado = [projeto({ status: 'PAUSADO', prazo: dias(-5) })];
    expect(prazoEmAberto(pausado)?.atrasado).toBe(true);
    expect(recadoDoCliente(pausado)).toBe('Um projeto com o prazo vencido.');
  });

  /*
   * O bug medido no navegador: mesmo projeto, 01/10 em UTC e 30/09 em São
   * Paulo, porque o cartão fazia `new Date(iso).toLocaleDateString()`.
   */
  it('escreve o mesmo dia no Brasil e em UTC', () => {
    const vistos = new Set<string>();
    nosDoisFusos((fuso) => {
      const r = prazoEmAberto([projeto({ prazo: '2025-10-01T00:00:00.000Z' })]);
      expect(r?.dia, fuso).toBe('01/10/2025');
      expect(r?.atrasado, fuso).toBe(true);
      vistos.add(r!.dia);
    });
    expect(vistos.size).toBe(1);
  });
});
