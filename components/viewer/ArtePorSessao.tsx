"use client";

import { useEffect, useState } from "react";
import { api, type ApiError } from "@/lib/api";
import ArteNaTela from "@/components/viewer/ArteNaTela";

/**
 * A arte pela própria conta — buscada pelo NAVEGADOR.
 *
 * Isto era um server component que lia o cookie com `credenciaisDaSessao()` e,
 * sem ele, mandava para `/login?next=…`. Funcionava em desenvolvimento e
 * falhava sempre em produção, pelo mesmo motivo: o cookie é gravado pelo
 * backend sem atributo `Domain`, portanto host-only, e o navegador só o
 * entrega ao host que o criou. Local, API e app dividem o host `localhost` —
 * porta não conta para cookie — e o servidor Next enxergava tudo. Publicados,
 * são dois domínios: o servidor Next nunca via cookie nenhum, concluía
 * "deslogada" e devolvia o login. Quem fizesse login voltava para cá e levava
 * o mesmo 307, para sempre.
 *
 * Buscar daqui resolve na origem: o navegador TEM o cookie e o manda direto
 * ao backend, que é quem sabe se esta pessoa pode ver esta arte. Um 200 é a
 * autorização, igual a antes — só que perguntado de onde dá para perguntar.
 *
 * O desvio para o login não sumiu: continua existindo em `request()`, que o
 * dispara depois de tentar renovar a sessão. A diferença é que agora ele
 * acontece quando a pessoa está REALMENTE deslogada.
 */
export default function ArtePorSessao({ id }: { id: string }) {
  const [dados, setDados] = useState<any | null>(null);
  const [estado, setEstado] = useState<"carregando" | "pronto" | "sem-acesso">("carregando");

  useEffect(() => {
    let ativo = true;

    (async () => {
      try {
        const resArte = await api.get<{ data: any }>(`/artes/${encodeURIComponent(id)}`);
        const arte = resArte?.data;
        if (!ativo) return;
        if (!arte?.id) {
          setEstado("sem-acesso");
          return;
        }

        /*
         * Os comentários vêm à parte porque `/preview` (que os traz junto) só
         * existe para token. Se esta chamada falhar, a arte ainda abre: ver a
         * peça sem a trilha é melhor que não ver nada.
         */
        const feedbacks = await api
          .get<{ data: any[] }>(`/feedbacks?arteId=${encodeURIComponent(id)}&limit=200`)
          .then((r) => r?.data ?? [])
          .catch(() => []);

        if (!ativo) return;
        setDados({
          arte,
          feedbacks,
          licenca: arte.licenca ?? null,
          /*
           * `somenteLeitura` é do LINK, e aqui não há link. A permissão de quem
           * está na própria conta vem do acesso ao projeto — que o backend já
           * checou para devolver esta arte. Herdar o switch de algum link faria
           * a mesma pessoa poder ou não comentar conforme qual link o designer
           * configurou por último.
           */
          somenteLeitura: false,
        });
        setEstado("pronto");
      } catch (erro) {
        if (!ativo) return;
        /*
         * 401 não chega aqui: `request()` já terá renovado a sessão ou mandado
         * para o login. O que sobra é a arte que não existe, ou que existe e
         * não é desta pessoa — e os dois têm a mesma resposta honesta, porque
         * distinguir contaria a quem não deveria que a arte existe.
         */
        void (erro as ApiError);
        setEstado("sem-acesso");
      }
    })();

    return () => {
      ativo = false;
    };
  }, [id]);

  if (estado === "carregando") {
    return (
      <main className="grid h-[100dvh] place-items-center bg-background">
        <p className="text-sm text-muted-foreground">Abrindo a arte…</p>
      </main>
    );
  }

  if (estado === "sem-acesso" || !dados) {
    return (
      <main className="grid h-[100dvh] place-items-center bg-background p-6 text-center">
        <div className="max-w-sm space-y-1">
          <p className="text-sm font-medium">Não encontramos esta arte</p>
          <p className="text-sm text-muted-foreground">
            Ela pode ter sido removida, ou pertencer a um projeto que não é seu.
          </p>
        </div>
      </main>
    );
  }

  return <ArteNaTela token="" d={dados} />;
}
