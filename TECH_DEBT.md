# Tech Debt

Decisões arquiteturais pendentes, riscos conhecidos e trabalho intencionalmente adiado.
Atualizar este arquivo ao abrir ou fechar um item. Cada entrada deve ter contexto suficiente
para que alguém novo entenda o problema sem ler o histórico de PRs.

> Dívidas de backend em `/home/user/viu-backend/TECH_DEBT.md`.

---

## 🔴 Crítico

### Fluxo de convite designer ↔ cliente ausente na UI
**Risco:** o formulário de criação de projeto (`app/(dashboard)/projetos/new/page.tsx`) permite
selecionar qualquer usuário ativo como designer/cliente sem que a outra parte aceite.
Quando o backend implementar convites, a UI precisará de uma tela de "pendente de aceite" e
de um link de aprovação recebido por e-mail.

---

### Formulário de projeto não expõe equipeId
O backend já aceita `equipeId` em `POST /projetos` (Fase A — agrupamento visual), mas o
formulário de criação de projeto não tem campo para selecionar equipe. Um projeto criado via
API pode ter equipe, mas a UI não mostra nem permite definir essa relação.

Localização: `app/(dashboard)/projetos/new/page.tsx`.
Solução: adicionar `<ComboboxEquipes>` reutilizando a busca já implementada em
`app/(dashboard)/equipes/[id]/page.tsx`.

---

### Cards de projeto não exibem equipe vinculada
O endpoint `GET /projetos` já retorna `equipe { id, nome, slug }`, mas os cards na listagem
(`app/(dashboard)/projetos/page.tsx`) não exibem essa informação.

---

## 🟠 Alto

### Sem feedback visual para erros de autorização
Quando o backend retorna 403 ou 401, a maioria das páginas exibe uma mensagem genérica ou
não exibe nada. O usuário não sabe se o problema é de sessão expirada, falta de permissão
ou recurso inexistente.

Solução: interceptor global em `lib/api.ts` para 401 (redirecionar para login) e 403
(exibir toast explicativo e voltar para a rota anterior).

---

### Rate limiting não tratado na UI
Respostas 429 não são tratadas. O usuário vê um erro genérico. Implementar retry com
backoff exponencial para operações idempotentes e mensagem amigável para os demais.

---

### Upload sem progresso e sem validação client-side
`app/(dashboard)/artes/new/page.tsx` (ou equivalente): o upload envia o arquivo sem
barra de progresso e sem validar tipo/tamanho antes de enviar. Arquivo de 500 MB chega
ao servidor antes de qualquer feedback.

Itens:
- Validar `file.type` e `file.size` antes do `fetch`
- `XMLHttpRequest` com evento `progress` para barra de progresso
- Mostrar preview de imagem antes do upload

---

### Sem paginação real nas listagens
As páginas de projetos, artes e equipes usam paginação do backend, mas a UI não preserva
a página atual na URL (`?page=2`). Ao voltar do detalhe, o usuário volta para a página 1.

Solução: sincronizar `page` e `limit` com `useSearchParams` e `router.push`.

---

### Estados de loading inconsistentes
Algumas páginas usam `loading.tsx` do Next.js, outras usam estado local `isLoading`, outras
não têm fallback. O resultado é experiência visual fragmentada.

Padronizar: `loading.tsx` para navegação entre rotas; `<Skeleton>` para dados dentro da
página já carregada; `<Spinner>` apenas para ações do usuário (submit de formulário).

---

## 🟡 Médio

### Centro de notificações ausente
Quando o backend implementar notificações, a UI precisará de:
- Sino no header com badge de contagem
- Dropdown com lista de notificações recentes
- Página `/notificacoes` com histórico completo
- Marcar como lida (individual e "marcar todas")

---

### Busca global
Hoje cada seção tem sua própria busca local. Falta uma busca global (Cmd+K) que retorne
projetos, artes, clientes e equipes em uma única interface.

Bibliotecas candidatas: `cmdk` (já popular no ecossistema shadcn/ui).

---

### Equipes: picker de equipeId em projetos e formulários
Reutilizar o componente de busca de equipes (`app/(dashboard)/equipes/[id]/page.tsx`)
como `<ComboboxEquipes>` compartilhado para:
- Formulário de criação/edição de projeto
- Filtros da listagem de projetos

---

### Acessibilidade
- Formulários sem `aria-describedby` ligando campo ao erro
- Modais sem `aria-modal` e foco não aprisionado
- Tabelas de dados sem `<caption>` ou `scope` nas colunas
- Cores de status (badges) não passam em WCAG AA sem ícone de suporte

---

### Tema escuro incompleto
Algumas páginas têm variáveis de cor hardcoded (`text-gray-900`, `bg-white`) que não
respondem ao `dark:` modifier do Tailwind. Fazer um pass visual completo em dark mode.

---

### Formulários sem validação client-side
A maioria dos formulários depende do erro retornado pelo backend para mostrar mensagens.
Adicionar validação com `zod` + `react-hook-form` reutilizando os schemas de
`viu-backend/src/schemas/validation.ts` (publicar como pacote compartilhado ou copiar
os schemas relevantes para `lib/schemas.ts`).

---

### Sem testes de componente
Nenhuma cobertura de testes no frontend. Prioridade mínima:
- Testes unitários para funções utilitárias em `lib/`
- Testes de componente para formulários críticos (login, criação de projeto)
- Testes de integração E2E para o fluxo principal: login → criar projeto → upload de arte
  → feedback → aprovação

Ferramentas: Vitest + Testing Library para unitários; Playwright para E2E.

---

## 🟢 Futuro

### Editor de feedback posicional
Hoje feedbacks posicionais (`posicaoX`, `posicaoY`) existem no schema mas não há UI de
anotação sobre a imagem. Implementar canvas de anotação com pins clicáveis.

---

### Comparação de versões de arte
Quando versionamento de arte for implementado no backend, construir um viewer side-by-side
com slider de comparação.

---

### Integrações na UI
- Botão "Exportar para Google Drive"
- Preview de frames do Figma via embed
- Configuração de webhook de saída (Zapier/Make) no painel de projeto

---

### App mobile (PWA ou nativo)
O fluxo de aprovação de arte é naturalmente mobile — o cliente revisa em qualquer lugar.
PWA como primeiro passo (manifest + service worker); React Native como fase posterior se
houver demanda de notificações push e câmera para upload.

---

*Última atualização: 2026-07-04*
