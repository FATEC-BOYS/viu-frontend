import { redirect } from "next/navigation";

/**
 * Tarefas está escondida, não removida.
 *
 * Não existe criador de tarefa em lugar nenhum do produto: o botão "Nova" do
 * cabeçalho e o "Criar tarefa" do estado vazio tinham um comentário no lugar do
 * onClick, e o único caminho real é "Criar tarefa" sobre um feedback. Uma tela
 * de listagem cujo próprio botão de criar não cria é pior que a ausência dela.
 *
 * As tarefas continuam visíveis onde de fato vivem — dentro do projeto, na aba
 * Tarefas, que tem kanban funcionando. Por isso o destino aqui é Projetos.
 *
 * A tela inteira está preservada em `_desativada/TelaTarefas.tsx`. A pasta com
 * `_` é privada no App Router, então o arquivo compila e não vira rota. Para
 * voltar atrás: mover o arquivo de volta para `page.tsx`, apagar este, e
 * repor o item no Sidebar.
 */
export default function TarefasRedirect() {
  redirect("/projetos");
}
