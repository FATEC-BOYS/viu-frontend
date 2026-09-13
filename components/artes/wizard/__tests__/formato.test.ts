import { describe, it, expect } from 'vitest'
import { ACCEPT_ARTE, FORMATOS_ACEITOS, formatoDoArquivo, rotuloDoArquivo } from '../helpers'

function arquivo(nome: string, tipo = '') {
  return new File(['x'], nome, { type: tipo })
}

/**
 * O wizard pedia o formato no passo 1 e recusava no passo 2 quando não batia.
 * O campo nunca era enviado — o `FormData` leva arquivo, nome, projeto e
 * descrição, e o backend grava `tipo` a partir do mimetype do arquivo de
 * verdade. A pergunta existia só para validar o arquivo contra ela mesma, e o
 * erro que produzia era inventado.
 */
describe('ler o formato do arquivo', () => {
  it('reconhece pelo mimetype', () => {
    expect(formatoDoArquivo(arquivo('logo.png', 'image/png'))?.label).toBe('PNG')
  })

  it('reconhece pela extensão quando o mimetype vem vazio', () => {
    // Acontece com arquivo vindo de rede e em alguns celulares — e aí o nome é
    // tudo que sobra.
    expect(formatoDoArquivo(arquivo('capa.pdf'))?.label).toBe('PDF')
  })

  it('o mimetype manda quando os dois existem e discordam', () => {
    // Extensão é palpite de quem nomeou; mimetype é o que o navegador leu.
    expect(formatoDoArquivo(arquivo('foto.png', 'image/jpeg'))?.label).toBe('JPEG')
  })

  it('extensão em maiúscula funciona igual', () => {
    expect(formatoDoArquivo(arquivo('LOGO.PNG'))?.label).toBe('PNG')
  })

  it('jpg e jpeg são o mesmo formato', () => {
    expect(formatoDoArquivo(arquivo('a.jpg'))?.label).toBe('JPEG')
    expect(formatoDoArquivo(arquivo('b.jpeg'))?.label).toBe('JPEG')
  })

  it('formato não aceito devolve nulo em vez de chutar', () => {
    expect(formatoDoArquivo(arquivo('planilha.xlsx'))).toBeNull()
  })

  it('arquivo sem extensão nem tipo não vira palpite', () => {
    expect(formatoDoArquivo(arquivo('semnome'))).toBeNull()
  })
})

describe('como a recusa nomeia o que a pessoa escolheu', () => {
  it('usa a extensão quando o formato não é aceito', () => {
    // "Você selecionou XLSX" diz mais do que "tipo inválido".
    expect(rotuloDoArquivo(arquivo('planilha.xlsx'))).toBe('XLSX')
  })

  it('usa o nome do formato quando é aceito', () => {
    expect(rotuloDoArquivo(arquivo('logo.png', 'image/png'))).toBe('PNG')
  })

  it('sem extensão, cai no mimetype em vez de texto vazio', () => {
    expect(rotuloDoArquivo(arquivo('semnome', 'application/zip'))).toBe('application/zip')
  })

  it('nunca devolve vazio', () => {
    for (const f of [arquivo('a.xlsx'), arquivo('semnome'), arquivo('b', 'application/zip')]) {
      expect(rotuloDoArquivo(f).length).toBeGreaterThan(0)
    }
  })
})

describe('o que o seletor do sistema oferece', () => {
  it('leva extensão e mimetype — o navegador usa uma ou outra', () => {
    expect(ACCEPT_ARTE).toContain('.png')
    expect(ACCEPT_ARTE).toContain('image/png')
  })

  it('cobre todos os formatos aceitos, sem lista escrita à mão', () => {
    for (const rotulo of FORMATOS_ACEITOS.split(', ')) {
      expect(rotulo.length).toBeGreaterThan(0)
    }
    expect(ACCEPT_ARTE).toContain('.pdf')
    expect(ACCEPT_ARTE).toContain('.mp4')
  })

  it('não oferece o que o servidor não aceita', () => {
    expect(ACCEPT_ARTE).not.toContain('.xlsx')
    expect(ACCEPT_ARTE).not.toContain('.zip')
  })
})
