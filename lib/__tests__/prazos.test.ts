import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { agrupar, quandoPorExtenso, recadoDaAgenda, type Compromisso } from '../prazos';

/**
 * A agenda toda depende de comparar datas por dia, não por instante: um prazo
 * que vence às 9h de hoje não está "atrasado" às 14h. `meiaNoite` é quem
 * segura isso, e é o que estes testes exercitam por baixo.
 */

const AGORA = new Date('2026-09-12T15:00:00.000Z');

function dias(n: number) {
  return new Date(AGORA.getTime() + n * 86400000).toISOString();
}

function item(over: Partial<Compromisso> = {}): Compromisso {
  return {
    id: 'c1',
    tipo: 'projeto',
    titulo: 'Site Institucional',
    apoio: 'EcoLife',
    quando: dias(3),
    href: '/projetos/1',
    ...over,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(AGORA);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('quandoPorExtenso', () => {
  it('não chama de atrasado o que vence mais cedo hoje', () => {
    expect(quandoPorExtenso('2026-09-12T09:00:00.000Z')).toBe('hoje');
  });

  it('fala de ontem por extenso, sem contar dias', () => {
    expect(quandoPorExtenso(dias(-1))).toBe('atrasado desde ontem · 11/09');
  });

  it('conta os dias de atraso maiores', () => {
    expect(quandoPorExtenso(dias(-5))).toBe('atrasado há 5 dias · 07/09');
  });

  it('diz amanhã, e depois conta em dias até a semana', () => {
    expect(quandoPorExtenso(dias(1))).toBe('amanhã · 13/09');
    expect(quandoPorExtenso(dias(6))).toBe('em 6 dias · 18/09');
  });

  it('passa a data por extenso quando falta mais de uma semana', () => {
    expect(quandoPorExtenso(dias(30))).toBe('12 de outubro');
  });
});

describe('agrupar', () => {
  it('descarta as faixas vazias em vez de mostrar caixa sem conteúdo', () => {
    expect(agrupar([item({ quando: dias(2) })]).map((f) => f.chave)).toEqual(['semana']);
  });

  it('separa atrasado, hoje, semana e depois', () => {
    const faixas = agrupar([
      item({ id: 'a', quando: dias(-2) }),
      item({ id: 'b', quando: dias(0) }),
      item({ id: 'c', quando: dias(4) }),
      item({ id: 'd', quando: dias(40) }),
    ]);
    expect(faixas.map((f) => f.chave)).toEqual(['atrasado', 'hoje', 'semana', 'depois']);
  });

  it('no atraso põe o mais recente primeiro — o de ontem ainda dá para resolver', () => {
    const faixas = agrupar([
      item({ id: 'antigo', quando: dias(-300) }),
      item({ id: 'ontem', quando: dias(-1) }),
    ]);
    expect(faixas[0].itens.map((i) => i.id)).toEqual(['ontem', 'antigo']);
  });

  it('nas faixas futuras a ordem é a cronológica', () => {
    const faixas = agrupar([
      item({ id: 'depois', quando: dias(6) }),
      item({ id: 'antes', quando: dias(2) }),
    ]);
    expect(faixas[0].itens.map((i) => i.id)).toEqual(['antes', 'depois']);
  });

  it('o sétimo dia ainda é da semana; o oitavo é depois', () => {
    expect(agrupar([item({ quando: dias(7) })])[0].chave).toBe('semana');
    expect(agrupar([item({ quando: dias(8) })])[0].chave).toBe('depois');
  });
});

describe('recadoDaAgenda', () => {
  it('reconhece a agenda vazia', () => {
    expect(recadoDaAgenda([])).toBe('Nada com data marcada.');
  });

  it('o atraso fala mais alto que o próximo compromisso', () => {
    const itens = [item({ id: 'a', quando: dias(-3) }), item({ id: 'b', quando: dias(1) })];
    expect(recadoDaAgenda(itens)).toBe('1 compromisso passou da data.');
  });

  it('conta os atrasos no plural', () => {
    const itens = [item({ id: 'a', quando: dias(-3) }), item({ id: 'b', quando: dias(-9) })];
    expect(recadoDaAgenda(itens)).toBe('2 compromissos passaram da data.');
  });

  it('nomeia o que vence hoje e amanhã', () => {
    expect(recadoDaAgenda([item({ quando: dias(0) })])).toBe('Site Institucional vence hoje.');
    expect(recadoDaAgenda([item({ quando: dias(1) })])).toBe('Site Institucional vence amanhã.');
  });

  it('aponta o próximo quando nada está atrasado', () => {
    const itens = [item({ id: 'a', quando: dias(9) }), item({ id: 'b', quando: dias(4) })];
    expect(recadoDaAgenda(itens)).toBe('O próximo é Site Institucional, em 4 dias.');
  });
});
