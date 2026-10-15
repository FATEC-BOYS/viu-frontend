# Confiabilidade do ciclo de revisão

## Escopo

O piloto trabalha com um designer responsável e um cliente principal por projeto. O wizard tem dados e revisão. Participantes adicionais e regras de múltiplos aprovadores foram retirados: eram coletados na tela, mas não eram enviados pelas funções de criação/edição. A regra apresentada agora corresponde à API: o designer solicita a aprovação de uma entrega e o cliente principal aprova ou pede ajustes com motivo.

O controle “Notificar ao enviar” do upload também foi removido: não havia chamada nem campo enviado que implementasse essa preferência. A solicitação de aprovação continua notificando pelo fluxo existente do backend.

## Versões e histórico

O backend atribui a numeração sob um bloqueio de linha na arte, dentro da transação. Upload e restauração usam o mesmo bloqueio. Cada upload tem chave própria no armazenamento, independente do número da versão. A entrega atual é preservada em snapshot se ainda não existia no histórico — inclusive a v1 legada. Restaurar cria uma única entrega nova com o arquivo escolhido e não pula números.

Toda entrega nova começa em EM_ANALISE, inclusive depois de uma aprovação. As decisões anteriores são preservadas e não são reutilizadas. A interface associa decisões pelo número da versão, usando `lib/revisao.ts`; decisões legadas sem número pertencem à v1. A aba do projeto mostra a rodada atual; o painel do viewer mantém o histórico e só permite decidir sobre o arquivo mostrado. O cabeçalho atualiza depois da resposta confirmada da API.

Uma falha de gravação tenta remover apenas o objeto novo, sem tocar nos arquivos anteriores. Um encerramento abrupto do processo entre upload e gravação ainda pode deixar objeto órfão; isso não equivale a uma versão salva e demanda uma futura rotina de limpeza.

## Consultas e contratos

Falhas de resumo, artes, aprovações, prévia e linha do tempo são propagadas e exibidas com opção de tentar novamente. As decisões não viram lista vazia em caso de erro. As aprovações da arte seguem a paginação até o fim; a lista do projeto usa `page` e o total da resposta do backend.

O contrato tipado de aprovação por projeto inclui versão julgada e versão atual da arte. Isso evita juntar respostas da v1 e da v2 como se fossem uma única rodada. A regra compartilhada cobre os pontos alterados; não foi feita uma reescrita de todos os adapters antigos.

## Validação

- `npm test`: testes de unidade/componentes, incluindo wizard, decisão por versão, erro e recuperação, histórico e paginação.
- `npm run test:e2e`: três jornadas Playwright em viewport de celular (criação/upload/link/aprovação/recarregamento; ajustes/v2/novo aceite; erro de consulta e recuperação). A API destas jornadas é uma implementação simulada determinística em `e2e/support/api.mjs`. Esses testes validam a interface e suas chamadas; não substituem teste integrado contra o backend publicado ou cookies entre Vercel e Railway.
- A suíte do backend cobre reabertura de revisão, preservação da v1, chaves exclusivas, limpeza após erro e restauração.
- `tests/concorrencia/versoesDeArte.test.ts` roda em PostgreSQL real pelo job existente `npm run test:db`. Apenas o armazenamento externo é simulado. O teste verifica dois uploads concorrentes, sequência v1/v2/v3, arquivos distintos, preservação do aceite e restauração pendente. Não foi executado localmente: o ambiente não permite iniciar o PostgreSQL sob um usuário não root. Conferir o resultado desse job na PR.

As fontes Inter e Bricolage Grotesque vêm de pacotes Fontsource versionados no lockfile e são servidas por `next/font/local`. O build e as jornadas não dependem de baixar fontes do Google. O CI inclui o job de navegador com trace em caso de falha e fixa TZ=UTC para os testes de calendário.
