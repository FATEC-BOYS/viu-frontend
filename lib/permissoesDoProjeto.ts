// lib/permissoesDoProjeto.ts

/**
 * Quem pode o quê num projeto — uma vez, para as telas não discordarem.
 *
 * Estas regras nasceram espalhadas: a tela do projeto tinha a sua
 * (`podeSolicitarAprovacao`, depois `ehDesignerDoProjeto`), a lista ganhou
 * outra quando as ações dela foram trancadas, e as duas já divergiam na
 * primeira semana — a lista abria exceção para ADMIN e a tela do projeto não,
 * então o admin via "Editar" num lugar e não no outro.
 *
 * Duas cópias da mesma verdade divergem; é a forma de defeito que este
 * produto mais produz. Aqui elas são uma.
 */

type Pessoa = { id: string; tipo?: string | null } | null | undefined
type ProjetoComDesigner = { designer?: { id: string } | null } | null | undefined

/**
 * Mexer no projeto — editar, pausar, cancelar, apagar, subir arte.
 *
 * "O designer DO PROJETO", e não "quem tem o papel DESIGNER": um designer
 * convidado para outro projeto não mexe neste. Numa lista, a regra é por
 * projeto, porque a mesma pessoa pode ser designer de um e não de outro.
 *
 * Sem exceção para ADMIN, embora `requireDesignerDoProjeto` no servidor a
 * tenha. A tela do projeto nunca ofereceu estas ações ao admin, e fazer a
 * lista oferecer criaria justamente a divergência que este arquivo existe
 * para fechar. O caminho do admin é a área dele.
 */
export function podeMexerNoProjeto(pessoa: Pessoa, projeto: ProjetoComDesigner): boolean {
  return !!pessoa && !!projeto?.designer?.id && projeto.designer.id === pessoa.id
}

/**
 * Abrir um projeto novo.
 *
 * Quem abre trabalho é quem foi contratado. O backend recusa o cliente como
 * designer do projeto — "Clientes só podem criar projetos onde são o
 * cliente" —, então oferecer a criação a ele é prometer o que o servidor
 * nega.
 *
 * `false` enquanto a sessão não carregou: no escuro não se oferece.
 */
export function podeCriarProjeto(pessoa: Pessoa): boolean {
  return !!pessoa && pessoa.tipo !== 'CLIENTE'
}
