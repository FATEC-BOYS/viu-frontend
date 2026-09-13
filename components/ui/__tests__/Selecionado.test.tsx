import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Selecionado } from '../Selecionado'

/**
 * O efeito é visual e não se prova em teste — o que se prova aqui é o que
 * quebraria sem ninguém ver: o conteúdo sumir, a decoração ser lida em voz
 * alta, ou o componente deixar de ser autocontido.
 */
describe('o destaque em caixa selecionada', () => {
  it('o conteúdo continua sendo o conteúdo', () => {
    render(<Selecionado>R$ 1.234,56</Selecionado>)
    expect(screen.getByText('R$ 1.234,56')).toBeInTheDocument()
  })

  it('a decoração não é lida por leitor de tela', () => {
    /*
     * Moldura e alças são `aria-hidden`: quem usa leitor ouve o número, não
     * "traço, ponto, traço". Sem isso o destaque roubaria a fala do dado.
     */
    const { container } = render(<Selecionado>R$ 10,00</Selecionado>)
    const decorativos = container.querySelectorAll('[aria-hidden="true"]')
    expect(decorativos.length).toBeGreaterThan(0)
    for (const el of decorativos) {
      expect(el.textContent).toBe('')
    }
  })

  it('sem alças, sobra a moldura — e o conteúdo segue intacto', () => {
    const { container } = render(<Selecionado alcas={false}>42</Selecionado>)
    expect(screen.getByText('42')).toBeInTheDocument()
    // Uma única camada decorativa: a moldura.
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1)
  })

  it('nada é posicionado para fora da caixa do componente', () => {
    /*
     * A primeira versão usava `inset` negativo e as alças ficavam além da
     * borda; num `<p>` colado na margem do card, a alça esquerda era cortada e
     * o efeito aparecia manco de um lado só. O espaço lateral virou padding de
     * verdade — este teste trava a volta do `-left-`/`-right-`.
     */
    const { container } = render(<Selecionado>x</Selecionado>)
    const classes = Array.from(container.querySelectorAll('*'))
      .flatMap((el) => Array.from(el.classList))
    const negativas = classes.filter((c) => /^-(left|right|inset-x)-/.test(c))
    expect(negativas).toEqual([])
  })

  it('as medidas são relativas à fonte, não fixas em pixel', () => {
    // É o que deixa o mesmo componente servir a um título grande e a um número
    // de tabela sem uma variante para cada.
    const { container } = render(<Selecionado>x</Selecionado>)
    const classes = Array.from(container.querySelectorAll('*'))
      .flatMap((el) => Array.from(el.classList))
      .join(' ')
    expect(classes).toMatch(/em\]/)
  })
})
