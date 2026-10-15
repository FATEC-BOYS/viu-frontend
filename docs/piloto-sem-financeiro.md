# Piloto de revisão: comercial reservado ao ADM

O objetivo do piloto é validar projeto → arte → link → feedback → nova versão → aprovação. Designer e cliente não recebem ofertas de plano nem ferramentas financeiras.

## Interface

`lib/financeiro.ts` concentra a regra de papel. `AdminOnly` não monta componentes comerciais para os demais usuários. `FinancialRouteGate` protege as páginas financeiras do dashboard e redireciona acessos diretos para `/dashboard`, sem montar a página. `?tab=billing` abre a visão geral para quem não é ADM.

Ficam reservados ao ADM: planos, assinaturas, faturas/Pix, saldo, saques, extrato, disputas, dados fiscais, contratos e termos comerciais do projeto. Também são ocultados valores em formulários, cards, revisão do projeto, clientes, dashboard, agenda e selos de licença. Os componentes que carregavam financeiro junto com dados de revisão deixam de fazer essas consultas para designer e cliente.

Os dados existentes são preservados. Editar um projeto mantém o orçamento já carregado, mesmo que o campo fique oculto. O aceite de termos de uso e privacidade da plataforma continua disponível no cadastro e não se confunde com contrato entre designer e cliente.

## API

A alteração depende do backend: `FINANCEIRO_APENAS_ADMIN=true` é o padrão quando a variável não existe. As rotas comerciais exigem sessão e papel ADMIN. Permissões e escopo anteriores continuam valendo; o piloto não dá ao ADM o direito de aceitar contratos em nome de terceiros.

O middleware de plano deixa de limitar projetos e artes de designer/cliente. Limites de upload e proteções contra abuso continuam em vigor. O link público não informa licença derivada de pagamento. Avisos financeiros deixam de aparecer na listagem, contagem, filtros e detalhe de notificações desses usuários.

Webhooks continuam recebendo confirmações de transações anteriores. Ocultar a interface não cancela assinaturas existentes, não apaga faturas nem contratos e não altera históricos financeiros.

## Validação

Testes cobrem ausência dos menus por papel, bloqueio de páginas sem montar filhos, acesso do ADM, abas do projeto e preservação das aprovações semanais. No backend, a suíte do piloto cobre leitura e escrita direta nas APIs comerciais, contagem de avisos, acesso do ADM e continuidade de projetos/artes sem limites por plano. A suíte comercial anterior roda explicitamente no modo completo para preservar sua cobertura.
