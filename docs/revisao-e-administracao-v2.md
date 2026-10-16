# Revisão por versão e administração da plataforma

A tela de revisão permite escolher uma entrega anterior, abrir seu arquivo e consultar os comentários daquela versão. Decisões de versões anteriores ficam somente para consulta. A entrega atual mantém o fluxo de comentar e decidir. Comentários recém-enviados são preservados ao alternar versões. Comentários legados sem versão aparecem identificados como tal na entrega inicial; não são atribuídos a uma versão posterior.

O envio de uma nova versão aceita um resumo opcional de até 2.000 caracteres. O resumo é enviado em `descricao`, preservado no histórico e exibido no visualizador. O histórico acessado por token usa `/preview/:token/versoes`, validando o mesmo link sem incrementar visitas. Esse link passa a permitir consultar os arquivos históricos da mesma arte, inclusive em modo somente leitura.

Falhas de artes, histórico e comentários deixam uma mensagem com nova tentativa. Histórico vazio continua sendo um resultado válido.

O administrador tem navegação própria de plataforma e operação financeira. Não recebe os menus nem as consultas de contadores do designer. O painel mostra contas habilitadas (não usuários online), designers, clientes, projetos, artes, designers sem projeto e e-mails pendentes. Aprovações paradas há 48h consideram somente a versão atual. Essas pendências dos clientes são indicadores; não são decisões que o administrador deva tomar por eles. A fila administrativa aponta para moderação de saques e disputas.

## Entrega e validação

- Publicar o backend antes do frontend: o histórico público e os indicadores precisam dos novos contratos. Nenhuma migração de schema é necessária.
- Frontend: suíte completa, TypeScript, lint sem erros e build de produção. Regressões cobrem troca de arquivo/comentários por versão, recuperação de falha, preservação de comentário novo e navegação administrativa.
- Backend: suíte completa, TypeScript e lint sem erros. Regressões cobrem validação do link antes de expor histórico, URL assinada sem chave bruta, ausência de contagem adicional de visitas, restauração de aprovação pendente excluída e preservação de decisão terminal.
- A jornada Playwright foi ampliada para resumo da entrega e consulta da v1 antes de aprovar a v2. Não executada localmente: o download do Chromium retornou arquivo inválido. A revisão visual de desktop/celular e os jobs de navegador/PostgreSQL no CI permanecem necessários antes do merge. Não houve teste contra Vercel/Railway publicados.
