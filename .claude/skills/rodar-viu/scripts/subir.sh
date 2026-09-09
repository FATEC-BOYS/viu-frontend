#!/usr/bin/env bash
# Sobe o VIU inteiro localmente: Postgres efêmero + viu-backend + viu-frontend.
#
# É idempotente o bastante para rodar de novo depois que o container reciclou
# os processos: o que já está de pé é reaproveitado, o que morreu volta.
#
# Uso:  bash .claude/skills/rodar-viu/scripts/subir.sh
# Nada é instalado nem alterado nos repositórios além dos arquivos de ambiente
# (.env / .env.local), e esses levam marca de gerado — ver AVISO abaixo.
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# .../<repo>/.claude/skills/rodar-viu/scripts → sobe até o repositório e pega o irmão.
RAIZ_SKILL="$(cd "$AQUI/../../../.." && pwd)"
PAI="$(dirname "$RAIZ_SKILL")"
BACK="${VIU_BACKEND:-$PAI/viu-backend}"
FRONT="${VIU_FRONTEND:-$PAI/viu-frontend}"

PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
RUN="${VIU_RUN_DIR:-/tmp/viu-dev}"
PGPORT="${PGPORT:-55440}"
PORTA_API="${PORTA_API:-3001}"
PORTA_APP="${PORTA_APP:-3000}"
MARCA="# gerado por .claude/skills/rodar-viu — apague à vontade"

erro() { echo "✗ $*" >&2; exit 1; }
passo() { echo "→ $*"; }

[ -f "$BACK/package.json" ] || erro "viu-backend não encontrado em $BACK (defina VIU_BACKEND)"
[ -f "$FRONT/package.json" ] || erro "viu-frontend não encontrado em $FRONT (defina VIU_FRONTEND)"

porta_viva() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

esperar_porta() {
  local porta="$1" nome="$2" limite="${3:-90}" i=0
  while ! porta_viva "$porta"; do
    i=$((i + 1))
    [ "$i" -ge "$limite" ] && erro "$nome não respondeu na porta $porta em ${limite}s — veja $RUN/$nome.log"
    sleep 1
  done
}

# Só sobrescreve arquivo de ambiente que este script gerou. Um .env de verdade
# (credenciais reais de R2, chaves do Mercado Pago) não pode ser perdido por
# alguém querendo só abrir o app.
escrever_env() {
  local destino="$1"
  if [ -f "$destino" ] && ! grep -qF "$MARCA" "$destino"; then
    erro "$destino já existe e não foi gerado aqui — mova ou apague antes de continuar"
  fi
  cat > "$destino"
}

mkdir -p "$RUN"

# ── Postgres ────────────────────────────────────────────────────────────────
if porta_viva "$PGPORT"; then
  passo "Postgres já de pé na porta $PGPORT"
else
  [ -x "$PGBIN/initdb" ] || erro "PostgreSQL não encontrado em $PGBIN (defina PGBIN)"
  passo "subindo Postgres efêmero na porta $PGPORT"
  rm -rf "$RUN/data"
  mkdir -p "$RUN/data"

  # initdb recusa rodar como root, e em container quase sempre somos root.
  if [ "$(id -u)" = "0" ]; then
    chown -R postgres:postgres "$RUN"
    COMO_PG="setpriv --reuid=postgres --regid=postgres --clear-groups"
  else
    COMO_PG=""
  fi

  $COMO_PG "$PGBIN/initdb" -D "$RUN/data" -U postgres --auth=trust >/dev/null
  # -k joga o socket para dentro de $RUN: sem isso colide com o socket do
  # Postgres do sistema, quando existe um.
  $COMO_PG "$PGBIN/pg_ctl" -D "$RUN/data" -o "-p $PGPORT -k $RUN" -l "$RUN/postgres.log" start >/dev/null
  esperar_porta "$PGPORT" postgres 30
  $COMO_PG "$PGBIN/createdb" -h 127.0.0.1 -p "$PGPORT" -U postgres viu
fi

BANCO="postgresql://postgres@127.0.0.1:$PGPORT/viu"

# ── Ambiente do backend ─────────────────────────────────────────────────────
# JWT_SECRET é sorteado a cada montagem: chave fixa em arquivo de exemplo tem
# o costume de virar chave de produção. Numa segunda subida o segredo anterior
# é reaproveitado — trocá-lo derrubaria as sessões abertas no navegador.
SEGREDO=""
# O `-f` antes do sed não é zelo: com `pipefail`, o sed falhando por arquivo
# inexistente derruba a atribuição inteira e, com `set -e`, o script junto —
# no caminho mais comum, que é a primeira subida.
if [ -f "$BACK/.env" ]; then
  SEGREDO="$(sed -n 's/^JWT_SECRET="\(.*\)"$/\1/p' "$BACK/.env" | head -1)"
fi
if [ -z "$SEGREDO" ]; then
  SEGREDO="$(node -e 'console.log(require("crypto").randomBytes(48).toString("hex"))')"
fi

escrever_env "$BACK/.env" <<ENV
$MARCA
NODE_ENV=development
PORT=$PORTA_API
HOST=0.0.0.0
DATABASE_URL="$BANCO"
JWT_SECRET="$SEGREDO"
ALLOWED_ORIGINS=http://localhost:$PORTA_APP
FRONTEND_URL=http://localhost:$PORTA_APP
COOKIE_SAMESITE=lax
# O limite de produção (100 req / 15 min) estoura em duas ou três navegações
# automatizadas, e o 429 se disfarça de bug do app. Aqui é folga de teste.
RATE_LIMIT_MAX=100000
RATE_LIMIT_WINDOW=15 minutes
# O schema exige as variáveis do R2 para o servidor subir, mas nenhum fluxo de
# revisão depende do bucket: as imagens do seed vêm quebradas e está tudo bem.
# Upload de arte de verdade é o único caminho que precisa de credencial real.
R2_ENDPOINT=http://127.0.0.1:9/r2-indisponivel-em-dev
R2_ACCESS_KEY_ID=dev
R2_SECRET_ACCESS_KEY=dev
R2_BUCKET=viu
ENV

# ── Banco: schema e dados ───────────────────────────────────────────────────
passo "aplicando migrações e semeando"
(
  cd "$BACK"
  npx prisma generate >"$RUN/prisma.log" 2>&1 || erro "prisma generate falhou — veja $RUN/prisma.log"
  # migrate deploy, nunca db push: o repositório tem histórico versionado e um
  # job de CI que aplica do zero.
  npx prisma migrate deploy >>"$RUN/prisma.log" 2>&1 || erro "migrate deploy falhou — veja $RUN/prisma.log"
  # O seed é escrita de estado, não configuração: rodar por cima de um banco já
  # semeado duplicaria projetos e artes. A pergunta certa é "há usuário aqui?",
  # e não "acabei de subir o Postgres" — o cluster pode estar de pé de uma
  # tentativa anterior que morreu antes de semear, e aí o login do seed falha
  # com 401 sem nada explicar por quê.
  # Procura a conta do próprio seed, e não "algum usuário": contas criadas
  # durante um teste anterior fariam o banco parecer semeado, e o login do
  # designer voltaria 401 sem nada na tela explicando por quê.
  SEMEADO="$("$PGBIN/psql" "$BANCO" -tAc \
    "select count(*) from usuarios where email = 'designer@viu.com'" 2>/dev/null || echo 0)"
  if [ "${SEMEADO:-0}" = "0" ] && [ -z "${VIU_SEM_SEED:-}" ]; then
    npm run db:seed >"$RUN/seed.log" 2>&1 || erro "seed falhou — veja $RUN/seed.log"
  fi
)

# ── Ambiente do frontend ────────────────────────────────────────────────────
escrever_env "$FRONT/.env.local" <<ENV
$MARCA
NEXT_PUBLIC_API_URL=http://localhost:$PORTA_API
NEXT_PUBLIC_APP_URL=http://localhost:$PORTA_APP
ENV

# ── Servidores ──────────────────────────────────────────────────────────────
# O servidor precisa sair limpo de dois lugares:
#
#   1. da sessão do shell que chamou o script — senão ele cai junto com o
#      comando que o subiu (por isso `setsid --fork`, que também torna o
#      processo líder de grupo e deixa o derrubar.sh matar a árvore inteira);
#   2. dos descritores de saída herdados — senão o servidor segura o stdout do
#      chamador para sempre, e um `subir.sh | tail` nunca termina mesmo com
#      tudo no ar. Daí os três descritores irem para /dev/null e o log.
#
# O próprio filho grava o PID antes do `exec`, porque com --fork o `$!` aqui é
# o pai efêmero do setsid, que morre em seguida.
subir_dev() {
  local nome="$1" dir="$2" porta="$3"
  if porta_viva "$porta"; then
    passo "$nome já de pé na porta $porta"
    return
  fi
  passo "subindo $nome na porta $porta"
  setsid --fork bash -c "cd '$dir'; echo \$\$ > '$RUN/$nome.pid'; exec npm run dev" \
    </dev/null >"$RUN/$nome.log" 2>&1
  esperar_porta "$porta" "$nome" 120
}

subir_dev backend "$BACK" "$PORTA_API"
subir_dev frontend "$FRONT" "$PORTA_APP"

# A guarda de CSRF recusa requisição sem header Origin com 500, então testar
# sem ele leva o diagnóstico para o lado errado. Aqui 401 é sinal de saúde:
# o servidor está de pé e pedindo sessão.
CODIGO="$(curl -s -o /dev/null -w '%{http_code}' \
  -H "Origin: http://localhost:$PORTA_APP" \
  "http://localhost:$PORTA_API/auth/me" || true)"
[ "$CODIGO" = "401" ] || echo "⚠ /auth/me devolveu $CODIGO (esperado 401) — veja $RUN/backend.log"

cat <<RESUMO

✓ VIU no ar
  app       http://localhost:$PORTA_APP
  api       http://localhost:$PORTA_API
  banco     $BANCO
  logs      $RUN/backend.log  $RUN/frontend.log

  contas do seed (senha 123456)
    designer@viu.com       DESIGNER
    cliente1@empresa.com   CLIENTE
    admin@viu.com          ADMIN

  derrubar: bash "$AQUI/derrubar.sh"
RESUMO
