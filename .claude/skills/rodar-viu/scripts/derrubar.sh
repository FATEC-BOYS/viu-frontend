#!/usr/bin/env bash
# Derruba o que o subir.sh levantou: servidores, Postgres efêmero e os
# arquivos de ambiente gerados.
#
# Uso:  bash .claude/skills/rodar-viu/scripts/derrubar.sh
#       VIU_MANTER_ENV=1 bash .../derrubar.sh   # preserva .env e .env.local
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAIZ_SKILL="$(cd "$AQUI/../../../.." && pwd)"
PAI="$(dirname "$RAIZ_SKILL")"
BACK="${VIU_BACKEND:-$PAI/viu-backend}"
FRONT="${VIU_FRONTEND:-$PAI/viu-frontend}"

PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
RUN="${VIU_RUN_DIR:-/tmp/viu-dev}"
MARCA="# gerado por .claude/skills/rodar-viu"

passo() { echo "→ $*"; }

# `npm run dev` vira uma árvore de processos, então matar só o PID do npm
# deixa o next/tsx de pé segurando a porta. O subir.sh usa setsid, o que faz do
# npm o líder do grupo — daí `kill -- -PID` levar a árvore inteira junto.
#
# Nada de `pkill -f "next dev"`: o padrão casa também com a linha de comando do
# shell que executa este script, e o comando morre no meio do trabalho.
matar_grupo() {
  local pid="$1"
  kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || return 0
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    kill -0 "$pid" 2>/dev/null || return 0
    sleep 1
  done
  kill -KILL -- "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
}

for nome in frontend backend; do
  arquivo="$RUN/$nome.pid"
  if [ -f "$arquivo" ]; then
    passo "parando $nome (pid $(cat "$arquivo"))"
    matar_grupo "$(cat "$arquivo")"
    rm -f "$arquivo"
  fi
done

# Rede de segurança para quando o arquivo de PID se perdeu (container reciclado,
# servidor subido à mão). pgrep só lista; quem mata é o kill, com o PID deste
# script e o do pai de fora.
for padrao in "next dev" "tsx watch src/index.ts"; do
  for pid in $(pgrep -f "$padrao" 2>/dev/null || true); do
    if [ "$pid" = "$$" ] || [ "$pid" = "$PPID" ]; then continue; fi
    passo "parando processo solto $pid ($padrao)"
    kill -TERM "$pid" 2>/dev/null || true
  done
done

if [ -d "$RUN/data" ]; then
  passo "parando Postgres"
  if [ "$(id -u)" = "0" ]; then
    COMO_PG="setpriv --reuid=postgres --regid=postgres --clear-groups"
  else
    COMO_PG=""
  fi
  $COMO_PG "$PGBIN/pg_ctl" -D "$RUN/data" -m immediate stop >/dev/null 2>&1 || true
fi

passo "removendo $RUN"
rm -rf "$RUN"

# Só apaga o que este skill escreveu — um .env com credenciais de verdade não
# sai daqui por acidente.
if [ -z "${VIU_MANTER_ENV:-}" ]; then
  for arquivo in "$BACK/.env" "$FRONT/.env.local"; do
    if [ -f "$arquivo" ] && grep -qF "$MARCA" "$arquivo"; then
      passo "removendo $arquivo"
      rm -f "$arquivo"
    fi
  done
fi

echo "✓ ambiente derrubado"
