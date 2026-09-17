import { describe, expect, it } from 'vitest'
import { passoDaCobranca, type EstadoDaCobranca } from '../passoDaCobranca'

/**
 * A sequência da aba de Fatura em forma de tabela.
 *
 * Vale testar aqui e não na tela porque é aqui que a regra mora: com cada seção
 * decidindo sozinha, a mesma pendência aparecia em três avisos e dois botões
 * cheios disputavam a atenção. O que estes testes protegem é a unicidade — um
 * passo de cada vez, e a vez certa para cada papel.
 */

const designer: EstadoDaCobranca = {
  podeCobrar: true,
  termosFaltantes: [],
  temContrato: false,
  contratoDesatualizado: false,
  faltamAceitar: [],
  possoAceitar: false,
  fatura: 'NENHUMA',
  souPagador: false,
}

const cliente: EstadoDaCobranca = { ...designer, podeCobrar: false }

describe('passoDaCobranca', () => {
  it('manda o designer combinar enquanto faltarem termos', () => {
    const r = passoDaCobranca({ ...designer, termosFaltantes: ['licencaTerritorio'] })
    expect(r.passo).toBe('COMBINAR')
    expect(r.pendente).toBe(true)
  })

  it('nomeia os campos quando são poucos e cala a lista quando são muitos', () => {
    const poucos = passoDaCobranca({
      ...designer,
      termosFaltantes: ['licencaTerritorio', 'exclusividade'],
    })
    expect(poucos.frase).toContain('território')

    const muitos = passoDaCobranca({
      ...designer,
      termosFaltantes: ['licencaTerritorio', 'exclusividade', 'arquivosFonte'],
    })
    // O formulário logo abaixo já mostra quais campos estão vazios; repetir a
    // lista inteira na frase virava três linhas dizendo o que a tela mostra.
    expect(muitos.frase).not.toContain('território')
  })

  it('não dá passo ao cliente enquanto a vez é do designer', () => {
    const semTermos = passoDaCobranca({ ...cliente, termosFaltantes: ['exclusividade'] })
    expect(semTermos.passo).toBeNull()
    expect(semTermos.pendente).toBe(false)

    const semContrato = passoDaCobranca(cliente)
    expect(semContrato.passo).toBeNull()
  })

  it('combinado e sem contrato, o passo é gerar', () => {
    expect(passoDaCobranca(designer).passo).toBe('GERAR')
  })

  it('quem ainda não aceitou, aceita — os dois papéis', () => {
    const base = { temContrato: true, possoAceitar: true, faltamAceitar: ['CLIENTE' as const] }
    expect(passoDaCobranca({ ...designer, ...base }).passo).toBe('ACEITAR')
    expect(passoDaCobranca({ ...cliente, ...base }).passo).toBe('ACEITAR')
  })

  it('quem já aceitou apenas espera o outro, sem alarme', () => {
    const r = passoDaCobranca({
      ...designer,
      temContrato: true,
      possoAceitar: false,
      faltamAceitar: ['CLIENTE'],
    })
    expect(r.passo).toBeNull()
    expect(r.pendente).toBe(false)
  })

  it('tudo aceito, o designer cobra e o cliente espera', () => {
    const pronto = { temContrato: true, possoAceitar: false, faltamAceitar: [] }
    expect(passoDaCobranca({ ...designer, ...pronto }).passo).toBe('COBRAR')
    expect(passoDaCobranca({ ...cliente, ...pronto }).passo).toBeNull()
  })

  it('com fatura pendente, só o pagador tem passo', () => {
    const emitida: EstadoDaCobranca = {
      ...designer,
      temContrato: true,
      fatura: 'PENDENTE',
      nomeDoCliente: 'João Santos',
    }
    expect(passoDaCobranca(emitida).passo).toBeNull()
    expect(passoDaCobranca(emitida).frase).toContain('João Santos')
    expect(passoDaCobranca({ ...emitida, podeCobrar: false, souPagador: true }).passo).toBe('PAGAR')
  })

  describe('resumo que já não descreve o combinado', () => {
    /*
     * Mudar os termos depois do aceite. A tela dizia "Combinado e aceito pelas
     * duas partes. Pode cobrar." sobre um documento que descreve outro acordo —
     * e é ele que decide de quem é a peça se a conta não for paga.
     */
    const velho = { temContrato: true, contratoDesatualizado: true }

    it('manda o designer gerar a versão nova', () => {
      const r = passoDaCobranca({ ...designer, ...velho, faltamAceitar: [] })
      expect(r.passo).toBe('GERAR')
      expect(r.pendente).toBe(true)
    })

    it('não oferece aceite, mesmo para quem ainda não aceitou', () => {
      // Aceitar congelaria a concordância no texto errado — é o passo errado,
      // não um passo a mais.
      const r = passoDaCobranca({ ...cliente, ...velho, possoAceitar: true })
      expect(r.passo).not.toBe('ACEITAR')
      expect(r.passo).toBeNull()
    })

    it('não deixa cobrar dizendo que está tudo aceito', () => {
      const r = passoDaCobranca({ ...designer, ...velho, faltamAceitar: [], possoAceitar: false })
      expect(r.passo).not.toBe('COBRAR')
      expect(r.frase).not.toMatch(/aceito pelas duas partes/i)
    })

    it('mas uma fatura já emitida passa na frente', () => {
      // Uma vez cobrado, mexer no resumo não desfaz a cobrança: mandar regerar
      // seria mandar arrumar o que já passou.
      const r = passoDaCobranca({
        ...designer,
        ...velho,
        fatura: 'PENDENTE',
        nomeDoCliente: 'João Santos',
      })
      expect(r.passo).toBeNull()
      expect(r.frase).toContain('João Santos')
    })
  })

  it('projeto pago não pede mais que se combine nada', () => {
    // A ordem importa: sem a fatura vindo primeiro, um projeto já pago com
    // termos incompletos mandaria a pessoa arrumar o que já passou.
    const r = passoDaCobranca({
      ...designer,
      fatura: 'PAGA',
      termosFaltantes: ['exclusividade'],
    })
    expect(r.passo).toBeNull()
    expect(r.frase).toBe('Este projeto já foi pago.')
  })
})
