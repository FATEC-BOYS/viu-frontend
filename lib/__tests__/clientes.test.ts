import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { recadoDoCliente, type ProjetoDoCliente } from '../clientes';

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
});
