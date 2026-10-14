# Auditoria de experiência e copy — 14/10/2026

Escopo: leitura do frontend e backend na branch principal, revisão dos seis pontos de produto e uma primeira passagem editorial pelas rotas ativas. Esta PR altera textos de interface; não implementa os seis recursos abaixo, não muda permissões, decisões de aprovação, cobrança ou contratos.

## Seis pontos verificados

| Ponto | O que existe | Lacuna e próximo passo |
|---|---|---|
| O que mudou nesta versão | `ArteVersao.descricao` no schema do backend; `uploadNovaVersao` recebe `descricao`. | `NovaVersaoDialog` e `createNovaVersao` não coletam/enviam resumo. Expor campo opcional, preservar o resumo na leitura das versões e exibi-lo ao cliente na versão correspondente. |
| Comparação de versões | Endpoint de versões e `VersoesList` com downloads na gestão de artes. | `ArteNaTela` monta uma lista sintética de uma versão; `ViewerShell` não oferece um comparador. `VersionTimeline` existir no repositório não prova que está integrado. Conectar versões reais, escolher duas e tratar imagens/documentos de forma explícita. |
| Andamento dos ajustes | Feedback aberto/resolvido e aprovação pendente/aprovada/com ajustes; cliente consulta suas decisões em `ProjetoDoCliente`. | Uma decisão de pedir ajustes não informa início de execução, prazo ou nova entrega. Não renomear esse estado como “em produção” sem dados que o comprovem. Definir responsável pela próxima ação antes de adicionar estados. |
| Histórico na versão certa | Aprovação e feedback guardam `versaoNumero`; tela do projeto mostra número/data/comentário. | Histórico de decisões não abre o arquivo correspondente. A miniatura vem da arte atual, não de um snapshot da versão julgada. Vincular a decisão ao arquivo histórico antes de prometer “ver o que aprovou”. |
| Arquivos finais | Download no `ArteQuickLookSheet` e em `VersoesList`. | Não há área de entrega final dedicada no visualizador/projeto do cliente. Aprovação não equivale a pagamento nem a licença de uso. Definir arquivos da entrega e regras de disponibilização preservando os controles existentes. |
| Acesso pelo link | Visualização pública; comentários e decisões exigem sessão/permissões. Login, cadastro e verificação preservam `next`. | A landing e o vazio de Artes prometiam comentar/aprovar sem conta. Corrigido nesta PR. A redução de etapas ainda precisa de teste real no celular; não remover autenticação nesta passagem editorial. |

Referências do frontend:
- `components/artes/NovaVersaoDialog.tsx`, `components/artes/VersoesList.tsx`, `lib/artes.ts`.
- `components/viewer/ArteNaTela.tsx`, `ViewerShell.tsx`, `versions/VersionTimeline.tsx`.
- `components/projetos/ProjetoDoCliente.tsx`, `lib/aprovacoesDoCliente.ts`.
- `app/(auth)/login/page.tsx`, `cadastro/page.tsx`, `verificar-email/page.tsx`.

Referências do backend (leitura; sem alteração nesta PR):
- `prisma/schema.prisma`: ArteVersao, Aprovacao e Feedback.
- `src/controllers/arteVersaoController.ts`, `src/services/arteVersaoService.ts`.
- `src/services/aprovacaoService.ts`, `src/controllers/arteController.ts`, `src/services/linkService.ts`.

## Direção editorial

Usar login e cadastro como referência de orientação: dizer onde a pessoa está, o que precisa informar/fazer e o que acontece depois. Preservar a identidade e os fluxos que já funcionam.

- Títulos curtos e ações com objeto quando o contexto exigir.
- Erros dizem o que não carregou e como tentar novamente.
- Estados vazios explicam como o conteúdo chega à tela.
- Não prometer recursos ausentes, acesso sem conta ou pagamento gratuito garantido.
- Preferir termos em português: Cartões, Quadro, e-mail e notificações no navegador.
- Para artes e aprovações, “Ajustes pedidos” acompanha a ação “Pedir ajustes”; o enum REJEITADO permanece intacto. Recusas de saques/convites continuam com seu significado específico.
- Não apresentar endpoints HTTP ao cliente como instrução de recuperação.
- Preservar regras e textos jurídicos; revisão editorial não altera termos, licença ou contrato.
- Nenhum estado “em ajuste” é inventado a partir de uma recusa.
- Não é necessário reescrever textos claros apenas para alterar todas as páginas.

## Cobertura das rotas

A tabela abaixo registra rotas alteradas e rotas preservadas. Em páginas compostas, a mensagem pode viver em um componente compartilhado. Rotas de redirecionamento não precisam de copy próprio.

| Rota | Resultado desta passagem |
|---|---|
| `/cadastro` | Referência editorial preservada. |
| `/callback` | Copy ajustado. |
| `/login` | Referência editorial preservada. |
| `/recuperar` | Copy ajustado. |
| `/recusar-cadastro` | Preservado nesta passagem. |
| `/reset` | Copy ajustado. |
| `/verificar-email` | Preservado nesta passagem. |
| `/admin/disputas` | Copy ajustado. |
| `/admin/financeiro` | Copy ajustado. |
| `/admin` | Painel administrativo composto; preservado. |
| `/admin/planos` | Copy ajustado. |
| `/admin/saques` | Copy ajustado. |
| `/admin/usuarios` | Copy ajustado. |
| `/artes` | Copy ajustado. |
| `/assinaturas` | Copy ajustado. |
| `/clientes/[id]` | Copy ajustado. |
| `/clientes` | Copy ajustado. |
| `/configuracoes` | Copy ajustado. |
| `/convites/[token]` | Preservado nesta passagem. |
| `/convites` | Copy ajustado. |
| `/dashboard` | Composição por papel já orienta a próxima ação; preservada. |
| `/disputas` | Copy ajustado. |
| `/equipes/[id]` | Preservado nesta passagem. |
| `/equipes/convites/[token]` | Copy ajustado. |
| `/equipes` | Copy ajustado. |
| `/extrato` | Copy ajustado. |
| `/faturas/[id]` | Preservado nesta passagem. |
| `/faturas` | Preservado nesta passagem. |
| `/feedbacks` | Copy ajustado. |
| `/links` | Copy ajustado. |
| `/notificacoes` | Copy ajustado. |
| `/pagamento/assinatura/confirmacao` | Preservado nesta passagem. |
| `/perfil` | Copy ajustado. |
| `/planos` | Copy ajustado. |
| `/prazos` | Preservado nesta passagem. |
| `/projetos/[id]` | Composição por papel já orienta a próxima ação; preservada. |
| `/projetos` | Copy ajustado. |
| `/saques` | Copy ajustado. |
| `/sessoes` | Copy ajustado. |
| `/status` | Copy ajustado. |
| `/tarefas` | Redireciona para Projetos; sem texto de página. |
| `/l/[token]` | Visualizador compartilhado revisado; lacunas de produto registradas acima. |
| `/` | Landing revisada nos componentes Hero e HowItWorks. |
| `/termos` | Conteúdo jurídico preservado; não reescrito. |
| `/viewer/arte/[id]` | Visualizador compartilhado revisado; lacunas de produto registradas acima. |

## Validação e limites

Testes automatizados e TypeScript conferem integridade de código e regressões existentes; não substituem a revisão visual. Esta passagem não afirma cobertura exaustiva de mensagens vindas do backend, e-mails, documentos gerados ou todos os diálogos aninhados. Conferir as telas em desktop e celular antes de publicar. Os seis recursos da auditoria permanecem propostas, não entregas desta PR.
