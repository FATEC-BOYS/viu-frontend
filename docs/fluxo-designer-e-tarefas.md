# Painel do designer e execução dos ajustes

O painel acompanha comentários abertos de terceiros e pedidos de ajuste em aprovações da versão atual nos projetos em que a pessoa é designer. Comentário aberto não significa comentário sem resposta: a conversa pode ter respostas e continuar em execução.

Listas paginadas são lidas até o fim. O endpoint de links não é paginado e é consultado uma única vez. O teto defensivo de páginas agora gera erro explícito em vez de devolver dados parciais. Falhas de consulta não viram lista vazia nem um falso Tudo em dia. O financeiro tem tratamento de falha próprio.

Aguardando decisão deriva de solicitações pendentes da versão atual, uma linha por arte. Link criado e acesso registrado não provam envio, leitura por uma pessoa específica ou revisão. Pedidos de ajuste da versão atual aparecem como ação do designer.

## Cliente

A rota /projetos monta uma lista própria para contas CLIENTE, inclusive com view=board ou view=calendar. Exibe nome, designer, prazo e situação. Não monta quadro, calendário, filtros de produção, criação ou edição do designer. O botão Voltar do projeto continua levando a esta rota.

Esta correção é de interface. Os controles de acesso do backend continuam sendo a autoridade.

## Tarefas dentro do projeto

Comentários registram o pedido de revisão. Uma tarefa organiza o trabalho para atendê-lo ou preparar a próxima entrega.

- Tarefas saem da fila do dashboard e do bloco da visão geral.
- A aba Tarefas mostra título, descrição, responsável e prazo, quando existentes.
- O designer responsável pode adicionar uma tarefa e iniciar, concluir ou retomar as existentes.
- Transições: PENDENTE → EM_ANDAMENTO → CONCLUIDA; CONCLUIDA → EM_ANDAMENTO.
- Concluir tarefa não resolve comentário, publica versão ou aprova arte automaticamente.
- A mudança só aparece após confirmação do servidor; falha mantém o estado anterior.
- Dados existentes e criação a partir de feedback são preservados.

O novo formulário coleta título e projeto. Atribuição e prazo são exibidos quando já registrados; não foram acrescentados ao formulário nesta etapa.

## Continuidade

A fila abre a arte com o comentário destacado, inclusive na gaveta móvel. O designer responsável recebe no visualizador uma ação Nova versão e aprovação que abre a gestão da arte selecionada e aproveita os diálogos existentes.

## Validação

Regressões cobrem roteamento do cliente com view=board, lista do cliente, falha e recuperação do painel, comentários próprios/resolvidos, aprovação de versão antiga, pedido de ajuste sem comentário separado, paginação e teto, foco do comentário e criação/transições/erro/permissão de tarefas.

A validação visual não foi concluída: o download do Chromium para Playwright falhou no ambiente. Conferir o preview em celular e desktop antes do merge.
