# Tech Debt

Decisões arquiteturais pendentes, riscos conhecidos e trabalho intencionalmente adiado.
Atualizar este arquivo ao abrir ou fechar um item. Cada entrada deve ter contexto suficiente
para que alguém novo entenda o problema sem ler o histórico de PRs.

> Dívidas de backend em `/home/user/viu-backend/TECH_DEBT.md`.

---

## 🔴 Crítico

### Token de sessão em `localStorage`
**Risco:** qualquer XSS na aplicação lê o token e passa a agir como o usuário, sem prazo para
acabar.

O plano de migração para cookie `HttpOnly` está escrito em `contexts/AuthContext.tsx:30`, com
os cinco passos (cookie no login, CORS com credenciais, remoção das leituras de
`localStorage`, logout limpando o cookie, `credentials: 'include'` nas chamadas).

É também o que destrava server actions autenticadas: sem cookie, o servidor Next não tem como
falar com o backend em nome do usuário — foi por isso que as server actions do viewer foram
removidas em vez de corrigidas.

---

## 🟠 Alto

### Google OAuth: botão pronto, backend ausente
`components/auth/SocialAuthButtons.tsx` está pronto e há `TODO` nas telas de login e cadastro,
mas o backend não tem nenhuma rota OAuth. Enquanto isso não existir do outro lado, o
componente não deve ser exibido — botão que promete e não entrega é pior que ausência.

Ver a entrada equivalente no TECH_DEBT do backend.

---

### Upload sem barra de progresso e sem limite de tamanho
`components/artes/wizard/StepUpload.tsx` já valida o tipo do arquivo contra o que a pessoa
selecionou e mostra preview de imagem. Falta:
- Validar `file.size` antes do envio — hoje um arquivo enorme sobe até o backend recusar
- Progresso real de upload (`XMLHttpRequest` com evento `progress`); em
  `NovaVersaoDialog.tsx` a barra é falsa, com um comentário admitindo isso

---

### Estados de loading inconsistentes
Algumas páginas usam `loading.tsx` do Next, outras estado local `isLoading`, outras não têm
fallback. O resultado é uma experiência visual fragmentada.

Padronizar: `loading.tsx` para navegação entre rotas; `<Skeleton>` para dados dentro da página
já carregada; `<Spinner>` apenas para ações do usuário (submit de formulário).

---

## 🟡 Médio

### Centro de notificações no header
Existe a página `/notificacoes` e o contador na sidebar. Falta o sino no topo com dropdown das
mais recentes, para não exigir uma troca de página só para ver o que chegou.

---

### Busca global cobre só projetos e artes
A paleta Ctrl/Cmd+K (`components/layout/BuscaGlobal.tsx`) consome `GET /buscar`, que indexa
apenas `projetos` e `artes`. Equipes, clientes e feedbacks ficam de fora — a limitação é do
endpoint, não da interface.

---

### Acessibilidade
- Formulários: login e criação de projeto já ligam campo e erro por `aria-describedby`; o
  resto ainda não
- Modais sem `aria-modal` e sem foco aprisionado
- Tabelas de dados sem `<caption>` ou `scope` nas colunas
- Cores de status (badges) não passam em WCAG AA sem ícone de apoio

---

### Tema escuro incompleto
Ainda há cores fixas (`text-gray-900`, `bg-white`) que não respondem ao `dark:` do Tailwind.
Falta um passe visual completo em modo escuro.

---

### Validação client-side nos demais formulários
`lib/schemas.ts` espelha os schemas do backend e já cobre login e criação de projeto. Faltam:
recuperação de senha, edição de perfil, criação de equipe, tarefas e faturas.

Ao mudar uma regra em `viu-backend/src/schemas/validation.ts`, mudar aqui também — não há nada
que force isso automaticamente.

---

### Cobertura de testes desequilibrada
Existem testes de `lib/` (api, schemas, helpers, viewerApi) e do viewer (FeedbackViewer,
FeedbackPanel, IdentityGate, useAudioRecorder). Não há teste de nenhuma tela do dashboard nem
E2E.

Prioridade: E2E do fluxo principal (login → criar projeto → upload de arte → feedback →
aprovação) com Playwright.

---

### Componentes sem uso
`components/viewer/versions/VersionTimeline.tsx`, `components/feedback/FeedbackPanel.tsx` e
`components/feedback/ReplyThread.tsx` não são importados por ninguém. Decidir entre ligar à
API real ou remover, como já foi feito com as server actions do viewer, o `AudioRecorder`, o
`ApprovalBar` e o `ViewerIdentityGate`.

---

## 🟢 Futuro

### Editor de feedback posicional
`posicaoX`/`posicaoY` existem no schema e o viewer já envia coordenadas, mas não há UI de
anotação sobre a imagem com pins clicáveis.

---

### Comparação de versões de arte
O backend tem `ArteVersao` com histórico e restauração; falta o viewer lado a lado com slider
de comparação.

---

### Integrações na UI
- Botão "Exportar para Google Drive"
- Preview de frames do Figma via embed
- Configuração de webhook de saída (Zapier/Make) no painel do projeto

---

### App mobile (PWA ou nativo)
O fluxo de aprovação é naturalmente mobile — o cliente revisa em qualquer lugar. PWA como
primeiro passo (manifest + service worker); React Native depois, se houver demanda de push e
câmera.

---

## ✅ Resolvido

- **Fluxo de convite na interface**: `/convites` lista as pendências (projeto e equipe) e
  `/convites/:token` e `/equipes/convites/:token` são o destino dos e-mails. O painel
  "Pessoas" do projeto envia convites contra a API real.
- **Retorno do checkout de assinatura**: `/pagamento/assinatura/confirmacao`, o `back_url` do
  Mercado Pago, consultando `/assinaturas/minha` até o webhook chegar.
- **Equipe em projetos**: seletor no formulário (`equipeId`) e badge no card da listagem.
- **Busca global**: paleta Ctrl/Cmd+K sobre `GET /buscar`.
- **Extrato financeiro**: `/extrato` sobre `GET /ledger` — o saldo agora mostra de onde vem.
- **403 e 429 na interface**: `lib/api.ts` trata os dois, repete 429 com backoff só em
  GET/HEAD (respeitando `Retry-After`) e leva ao login preservando a rota quando a sessão
  expira.
- **Paginação**: `listProjetos` mandava `offset`, que o backend ignora — toda página trazia a
  primeira e a lista parava nos 100 primeiros. Filtros e visualização agora vivem na URL.
- **Status de projeto**: `ProjetoStatus` listava três valores; faltavam `RASCUNHO` e
  `CANCELADO`, justamente os do fluxo de convite.

---

*Última atualização: 2026-08-21*
