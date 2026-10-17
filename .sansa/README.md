# SANSA Agents — piloto no VIU

Esta integração é uma primeira versão **manual, sem VPS, sem deploy e sem commits de código gerados por IA**. Um humano precisa revisar cada alteração proposta.

## Arquitetura

1. GitHub Actions `workflow_dispatch` recebe uma tarefa técnica e o booleano `implement`.
2. **Claude Code** lê o frontend e grava um relatório em `.sansa-output/audit.md`.
3. Opcionalmente, **Codex** lê esse relatório, verifica o código e tenta produzir um patch local.
4. GitHub Actions rejeita arquivos fora dos diretórios permitidos, roda lint, typecheck, testes e build.
5. Relatório e patch ficam disponíveis como **artifacts** da execução por 7 dias. Nada é aplicado automaticamente; não há PR de correção automática nesta versão.

## Antes de usar

Em **Settings → Secrets and variables → Actions**, um administrador precisa cadastrar secrets de repositório:

- `ANTHROPIC_API_KEY` — necessário para Claude Code.
- `OPENAI_API_KEY` — necessário só para executar a etapa opcional Codex.

Crie chaves limitadas, use limites de gastos nas plataformas dos modelos e não inclua segredos no campo da tarefa. As assinaturas de ChatGPT/Claude não devem ser presumidas como crédito de API. As ações de terceiros devem ser auditadas e, para operação madura, fixadas por commit SHA.

## Como executar

Em **Actions → SANSA Agents (piloto manual) → Run workflow**, selecione a branch `feat/sansa-agents-pilot`, preencha uma tarefa e marque `implement` apenas quando desejar código experimental.

Sugestão para a primeira execução:

> Auditar o fluxo de criação de projeto/cliente e explicar como evitar que um modal fique sobreposto ao outro. Verificar como o cadastro de cliente deve ocorrer na criação do projeto e listar testes de regressão. Não alterar código.

Comece com `implement=false`, confira o relatório nos artifacts, depois experimente um escopo pequeno com o Codex. Em uma eventual correção, aplique o patch manualmente em uma branch separada e crie um PR após inspeção.

## Guardrails

- Apenas acionamento manual, sem eventos de issues, comentários ou PRs.
- Permissões de token GitHub: `contents: read`; checkout sem credenciais persistentes.
- Claude não recebe Bash, Edit ou WebSearch; só deve escrever o relatório.
- Codex não tem credenciais de GitHub para publicar alterações e não executa deploy.
- Mudanças fora de `app/`, `components/`, `contexts/`, `lib/`, `e2e/`, `hooks/` e `styles/` falham.
- CI não publica resultados de código e não modifica produção. Um patch não inclui automaticamente arquivos novos não versionados; avalie-os antes de qualquer adoção.
- **Atenção:** a checagem de escopo e os testes não equivalem a uma revisão de segurança; a saída dos modelos deve ser inspecionada antes de qualquer aplicação.
- O workflow não lê o backend automaticamente: alterações cross-repo exigem uma segunda integração.

## Próximas fases (não implementadas)

- Gateway com fila e status no painel privado SANSA.
- Integração de backend do VIU.
- PRs automáticos em rascunho com aprovação humana obrigatória.
- Limites de custo e observabilidade por tarefa.
