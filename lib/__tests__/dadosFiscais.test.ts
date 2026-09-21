import { describe, it, expect } from 'vitest'
import {
  mascararDocumento,
  mascararCep,
  rotuloDoNome,
  rotuloDoDocumento,
  faltaPreencher,
  type DadosFiscaisEntrada,
} from '@/lib/dadosFiscais'

function completo(extra: Partial<DadosFiscaisEntrada> = {}): DadosFiscaisEntrada {
  return {
    tipoPessoa: 'JURIDICA',
    documento: '11.222.333/0001-81',
    razaoSocial: 'Estúdio Acme Ltda',
    cep: '01310-100',
    logradouro: 'Avenida Paulista',
    numero: '1000',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    uf: 'SP',
    ...extra,
  }
}

/*
 * As máscaras são forma, não validação. Quem confere os dígitos verificadores
 * é o servidor — copiar o algoritmo aqui seriam duas verdades sobre o que é um
 * CNPJ válido, com a divergência aparecendo numa nota recusada.
 */
describe('As máscaras ajudam a digitar', () => {
  it('escreve CNPJ conforme a pessoa digita', () => {
    expect(mascararDocumento('11', 'JURIDICA')).toBe('11')
    expect(mascararDocumento('11222', 'JURIDICA')).toBe('11.222')
    expect(mascararDocumento('11222333', 'JURIDICA')).toBe('11.222.333')
    expect(mascararDocumento('112223330001', 'JURIDICA')).toBe('11.222.333/0001')
    expect(mascararDocumento('11222333000181', 'JURIDICA')).toBe('11.222.333/0001-81')
  })

  it('escreve CPF conforme a pessoa digita', () => {
    expect(mascararDocumento('529', 'FISICA')).toBe('529')
    expect(mascararDocumento('529982', 'FISICA')).toBe('529.982')
    expect(mascararDocumento('52998224725', 'FISICA')).toBe('529.982.247-25')
  })

  /* Passar do tamanho é erro de digitação, e cortar é mais gentil do que
     deixar crescer até o servidor recusar. */
  it('não deixa passar do tamanho do documento', () => {
    expect(mascararDocumento('529982247259999', 'FISICA')).toBe('529.982.247-25')
    expect(mascararDocumento('112223330001819999', 'JURIDICA')).toBe('11.222.333/0001-81')
  })

  it('ignora o que não é dígito', () => {
    expect(mascararDocumento('abc529982247zz25', 'FISICA')).toBe('529.982.247-25')
  })

  it('escreve o CEP com hífen só quando há dígito depois', () => {
    expect(mascararCep('01310')).toBe('01310')
    expect(mascararCep('013101')).toBe('01310-1')
    expect(mascararCep('01310100')).toBe('01310-100')
  })
})

/* Pedir "razão social" a uma pessoa física é pedir o que ela não tem. */
describe('Os rótulos seguem o tipo de pessoa', () => {
  it('troca nome e documento conforme quem preenche', () => {
    expect(rotuloDoNome('FISICA')).toBe('Nome completo')
    expect(rotuloDoNome('JURIDICA')).toBe('Razão social')
    expect(rotuloDoDocumento('FISICA')).toBe('CPF')
    expect(rotuloDoDocumento('JURIDICA')).toBe('CNPJ')
  })
})

/*
 * Isto checa se o formulário está completo, não se está correto — a diferença
 * importa, porque a segunda pergunta é do servidor.
 */
describe('O que falta preencher', () => {
  it('deixa enviar quando o conjunto está completo', () => {
    expect(faltaPreencher(completo())).toBe(false)
  })

  it('segura o envio enquanto falta qualquer campo obrigatório', () => {
    for (const campo of [
      'documento', 'razaoSocial', 'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'uf',
    ] as const) {
      expect(faltaPreencher(completo({ [campo]: '' })), campo).toBe(true)
    }
  })

  /* Complemento, nome fantasia e inscrição municipal são opcionais de
     verdade: nem todo endereço tem complemento, nem todo município exige IM. */
  it('não exige os campos que são mesmo opcionais', () => {
    expect(faltaPreencher(completo({ complemento: '', nomeFantasia: '', inscricaoMunicipal: '' }))).toBe(false)
  })
})
