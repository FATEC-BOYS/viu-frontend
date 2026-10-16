# Comentário de voz com conferência antes de publicar

## Experiência

Gravar → parar → ouvir e conferir o texto → editar → enviar. Parar a gravação não cria feedback, não conta rodada e não notifica o designer. O limite de gravação da interface é de dois minutos.

A gravação permanece no navegador até o envio. Descartar libera a URL local sem publicar. Se a transcrição falhar, é possível tentar novamente, escrever o comentário ou confirmar só o áudio. Se o envio falhar, o áudio e o texto ficam no rascunho. Ao navegar ou sair da página, o rascunho local é perdido.

O texto conferido é o conteúdo do comentário. A transcrição original é guardada separadamente, com o áudio original, e não substitui a edição do autor na interface. Não há reescrita nem extração de tarefas por IA.

## Contratos

- `POST /feedbacks/audio/rascunho`: multipart autenticado, acesso ao projeto.
- `POST /links/:token/feedbacks/audio/rascunho`: multipart autenticado, link válido que permita comentários.
- Campos: `audio`, `arteId` (na rota direta), `versaoNumero`.
- Resposta: `data.transcricao` e `data.recibo`.
- Não há gravação no banco nem no bucket nesta etapa.
- O recibo HMAC tem propósito distinto da autenticação e validade de 30 minutos. Vincula áudio, autor, arte, versão e transcrição original. O envio reutiliza a transcrição assinada sem nova chamada ao provedor.
- Ao confirmar, a rota de áudio existente recebe `revisado=true`, `conteudoRevisado`, `versaoNumero` e o recibo quando disponível. Sem recibo, permite texto manual/áudio sem tentar transcrever automaticamente. As rotas antigas mantêm a transcrição automática para clientes que não enviam `revisado`.
- Alteração da versão impede o envio do rascunho. O servidor valida novamente acesso/link no envio.

## Operação

Requer `OPENAI_API_KEY` somente no backend (Railway), conforme a integração já existente. O serviço usa `whisper-1`, português, o formato real do navegador (`webm` ou `m4a`) e timeout de 30 segundos sem retentativa automática do provedor. Transcrições de rascunho são limitadas por credencial a 10 por hora. O backend limita o áudio a 25 MiB e o texto a 10.000 caracteres.

Aplicar o backend antes do frontend. Sem migração de banco. Nenhuma chave, variável do Railway ou configuração de produção foi alterada nesta entrega.

## Validação

Testes cobrem o rascunho sem publicação, edição e confirmação, descarte, falha e retentativa, preservação após falha de envio, vínculo/expiração do recibo, formato Safari, upload multipart autenticado, bloqueio de anônimos, projeto alheio, versão antiga e link somente leitura. OpenAI e armazenamento são simulados nos testes; não houve chamada paga nem validação com microfone real em produção.
