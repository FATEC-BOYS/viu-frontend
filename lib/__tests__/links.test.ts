import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { estadoDoLink, avisoDeValidade, agrupar, recadoDosLinks } from '@/lib/links';

/**
 * O bug que motivou a reescrita era exatamente aqui: a tela lia `expiraEm` e
 * não lia `revogado`, então um link morto aparecia como "Permanente ✓" e ia
 * parar no WhatsApp do cliente. A precedência entre as causas de morte é o que
 * estes testes seguram.
 */

const AGORA = new Date('2026-09-12T12:00:00.000Z');

function link(over: Partial<Parameters<typeof estadoDoLink>[0]> = {}) {
  return {
    id: 'l1',
    token: 'abc123',
    arte: {
      nome: 'Capa',
      projeto: { nome: 'Site', cliente: { nome: 'Ana', telefone: null } },
    },
    somenteLeitura: true,
    expiraEm: null,
    revogado: false,
    limiteTentativas: null,
    acessos: 0,
    criadoEm: '2026-09-12T09:00:00.000Z',
    ...over,
  };
}

function dias(n: number) {
  return new Date(AGORA.getTime() + n * 86400000).toISOString();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(AGORA);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('estadoDoLink', () => {
  it('põe link revogado fora do ar, mesmo sem validade vencida', () => {
    const r = estadoDoLink(link({ revogado: true, expiraEm: dias(30) }));
    expect(r.faixa).toBe('morto');
    expect(r.rotulo).toBe('revogado');
  });

  it('diz "revogado" quando o link está revogado E expirado — é a causa que se desfaz', () => {
    expect(estadoDoLink(link({ revogado: true, expiraEm: dias(-5) })).rotulo).toBe('revogado');
  });

  it('reconhece link expirado e mostra a data', () => {
    const r = estadoDoLink(link({ expiraEm: '2026-09-01T12:00:00.000Z' }));
    expect(r.faixa).toBe('morto');
    expect(r.rotulo).toBe('expirou em 01/09');
  });

  it('reconhece o limite de acessos atingido', () => {
    const r = estadoDoLink(link({ limiteTentativas: 3, acessos: 3 }));
    expect(r.faixa).toBe('morto');
    expect(r.rotulo).toBe('limite de 3 acessos atingido');
  });

  it('não mata o link enquanto o limite não é alcançado', () => {
    expect(estadoDoLink(link({ limiteTentativas: 3, acessos: 2 })).faixa).toBe('aberto');
  });

  it('espera quando ninguém abriu, contando desde a criação', () => {
    const r = estadoDoLink(link({ criadoEm: dias(-5) }));
    expect(r.faixa).toBe('esperando');
    expect(r.rotulo).toBe('ainda não abriu · há 5 dias');
  });

  it('diz "enviado hoje" no dia da criação', () => {
    expect(estadoDoLink(link()).rotulo).toBe('ainda não abriu · enviado hoje');
  });

  it('conta as aberturas no singular e no plural', () => {
    expect(estadoDoLink(link({ acessos: 1 })).rotulo).toBe('aberto 1 vez');
    expect(estadoDoLink(link({ acessos: 4 })).rotulo).toBe('aberto 4 vezes');
  });
});

describe('avisoDeValidade', () => {
  it('cala sobre validade distante — não é notícia', () => {
    expect(avisoDeValidade(link({ expiraEm: dias(20) }))).toBeNull();
  });

  it('avisa quando falta pouco', () => {
    expect(avisoDeValidade(link({ expiraEm: dias(2) }))).toBe('vence em 2 dias');
  });

  it('não avisa sobre link já revogado — a causa é outra', () => {
    expect(avisoDeValidade(link({ revogado: true, expiraEm: dias(1) }))).toBeNull();
  });

  it('cala sobre link sem validade', () => {
    expect(avisoDeValidade(link())).toBeNull();
  });
});

describe('agrupar', () => {
  it('separa as três faixas e descarta as vazias', () => {
    const g = agrupar([
      link({ id: 'a', acessos: 2 }),
      link({ id: 'b', acessos: 0 }),
    ]);
    expect(g.map((x) => x.faixa)).toEqual(['esperando', 'aberto']);
  });

  it('põe quem espera há mais tempo no topo — é quem precisa de empurrão', () => {
    const g = agrupar([
      link({ id: 'novo', criadoEm: dias(-1) }),
      link({ id: 'velho', criadoEm: dias(-14) }),
    ]);
    expect(g[0].itens.map((i) => i.id)).toEqual(['velho', 'novo']);
  });

  it('nas outras faixas o recente vem primeiro', () => {
    const g = agrupar([
      link({ id: 'antigo', acessos: 1, criadoEm: dias(-14) }),
      link({ id: 'recente', acessos: 1, criadoEm: dias(-1) }),
    ]);
    expect(g[0].itens.map((i) => i.id)).toEqual(['recente', 'antigo']);
  });
});

describe('recadoDosLinks', () => {
  it('reconhece a lista vazia', () => {
    expect(recadoDosLinks([])).toBe('Nenhum link enviado ainda.');
  });

  it('dá a boa notícia quando tudo foi aberto', () => {
    expect(recadoDosLinks([link({ acessos: 3 })])).toBe(
      'Todo link que você mandou já foi aberto.',
    );
  });

  it('destaca o que espera há mais de uma semana', () => {
    const itens = [link({ id: 'a', criadoEm: dias(-9) }), link({ id: 'b', criadoEm: dias(-10) })];
    expect(recadoDosLinks(itens)).toBe('2 links esperando há mais de uma semana.');
  });

  it('conta os não abertos quando nenhum passou da semana', () => {
    expect(recadoDosLinks([link({ criadoEm: dias(-2) })])).toBe('1 link ainda não foi aberto.');
  });

  it('não conta link morto como espera', () => {
    expect(recadoDosLinks([link({ revogado: true }), link({ id: 'x', acessos: 1 })])).toBe(
      'Todo link que você mandou já foi aberto.',
    );
  });
});
