import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import TrilhaInicial from '../TrilhaInicial'

/**
 * A trilha até a primeira entrega.
 *
 * O defeito que motivou a reescrita: `<Button asChild disabled>` faz o Button
 * virar o `<a>`, e âncora não tem `disabled` — o atributo era descartado e o
 * passo "bloqueado" abria normalmente. Aqui o teste central é justamente esse:
 * passo travado não tem link nenhum para clicar.
 */

vi.mock('next/link', () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))
vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))

import { api } from '@/lib/api'

/** Respostas de `/usuarios?tipo=CLIENTE` e `/links`, nessa ordem. */
function respondeCom({ clientes, links }: { clientes: number; links: number }) {
  vi.mocked(api.get).mockImplementation(((rota: string) =>
    Promise.resolve(
      rota.includes('/usuarios')
        ? { pagination: { total: clientes } }
        : { pagination: { total: links } },
    )) as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  respondeCom({ clientes: 0, links: 0 })
})

const link = (nome: RegExp) => screen.queryByRole('link', { name: nome })

describe('passo travado', () => {
  it('não oferece link para clicar', async () => {
    render(<TrilhaInicial temProjeto={false} temArte={false} />)

    // O primeiro passo é o único acionável; os demais dependem dele.
    expect(await screen.findByRole('link', { name: /cadastrar cliente/i })).toBeInTheDocument()
    expect(link(/criar projeto/i)).not.toBeInTheDocument()
    expect(link(/enviar arte/i)).not.toBeInTheDocument()
    expect(link(/gerar link/i)).not.toBeInTheDocument()
  })

  it('explica o que falta em vez de só apagar o botão', async () => {
    render(<TrilhaInicial temProjeto={false} temArte={false} />)

    expect(await screen.findByText(/cadastre um cliente primeiro/i)).toBeInTheDocument()
    expect(screen.getByText(/crie um projeto primeiro/i)).toBeInTheDocument()
  })
})

/**
 * Os destinos vinham copiados dos cartões antigos e apontavam para rotas que
 * não existem: `/clientes/novo` e `/projetos/novo` casavam com a rota
 * dinâmica `[id]`, e o app respondia "Cliente não encontrado na sua carteira".
 * Clicar no primeiro passo da trilha dava erro.
 */
describe('destinos', () => {
  it('manda para as rotas que existem, abrindo o cadastro direto', async () => {
    render(<TrilhaInicial temProjeto={false} temArte={false} />)

    expect(await screen.findByRole('link', { name: /cadastrar cliente/i })).toHaveAttribute(
      'href',
      '/clientes?novo=1',
    )
  })

  it('vale também para o projeto', async () => {
    respondeCom({ clientes: 1, links: 0 })
    render(<TrilhaInicial temProjeto={false} temArte={false} />)

    expect(await screen.findByRole('link', { name: /criar projeto/i })).toHaveAttribute(
      'href',
      '/projetos?novo=1',
    )
  })
})

describe('progresso', () => {
  it('destaca só o próximo passo pendente', async () => {
    respondeCom({ clientes: 1, links: 0 })
    render(<TrilhaInicial temProjeto temArte={false} />)

    // Cliente e projeto feitos → o passo da vez é a arte, e só ele tem ação.
    expect(await screen.findByRole('link', { name: /enviar arte/i })).toBeInTheDocument()
    expect(link(/cadastrar cliente/i)).not.toBeInTheDocument()
    expect(link(/gerar link/i)).not.toBeInTheDocument()
  })

  it('conta os passos concluídos', async () => {
    respondeCom({ clientes: 1, links: 0 })
    render(<TrilhaInicial temProjeto temArte />)

    expect(await screen.findByText(/passo 4 de 4/i)).toBeInTheDocument()
  })

  it('leva a arte para o projeto que já existe', async () => {
    respondeCom({ clientes: 1, links: 0 })
    render(<TrilhaInicial temProjeto temArte={false} projetoId="p1" />)

    expect(await screen.findByRole('link', { name: /enviar arte/i })).toHaveAttribute(
      'href',
      '/projetos/p1?tab=artes',
    )
  })
})

/**
 * Depois do link enviado quem age é o cliente. Mostrar isso como passo
 * pendente colocaria na conta do designer algo que ele não pode fazer.
 */
describe('tudo feito', () => {
  it('vira estado de espera, não mais um passo', async () => {
    respondeCom({ clientes: 1, links: 1 })
    render(<TrilhaInicial temProjeto temArte clienteNome="João" />)

    expect(await screen.findByText(/aguardando joão revisar/i)).toBeInTheDocument()
    expect(screen.queryByText(/passo \d de \d/i)).not.toBeInTheDocument()
  })

  it('funciona sem saber o nome do cliente', async () => {
    respondeCom({ clientes: 1, links: 1 })
    render(<TrilhaInicial temProjeto temArte />)

    expect(await screen.findByText(/aguardando a revisão do cliente/i)).toBeInTheDocument()
  })
})

describe('carregamento', () => {
  it('não pisca a trilha antes de saber o progresso', async () => {
    vi.mocked(api.get).mockImplementation((() => new Promise(() => {})) as never)
    const { container } = render(<TrilhaInicial temProjeto temArte />)

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    await waitFor(() => expect(link(/cadastrar cliente/i)).not.toBeInTheDocument())
  })
})
