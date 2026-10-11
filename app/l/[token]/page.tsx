// app/l/[token]/page.tsx
import { redirect } from "next/navigation";
import { backendFetch } from "@/lib/serverBackend";
import LinkIndisponivel from "@/components/viewer/LinkIndisponivel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ token: string }> };

export default async function PublicLinkResolver({ params }: Props) {
  const { token } = await params;

  let destino: { arteId?: string } | null = null;
  try {
    /*
     * `/destino` e não `/preview`: esta página só redireciona.
     *
     * Ela buscava a preview inteira — URL assinada, feedbacks, licença — para
     * ler UM campo, o id da arte. O resto era descartado, e junto vinha o
     * efeito colateral: `/preview` soma um acesso. Como o viewer busca a
     * preview de novo logo depois, uma abertura do cliente contava DOIS
     * acessos. Conferido no navegador.
     *
     * Isso estraga o número que o designer lê como "quantas vezes ele abriu"
     * — a única prova de que o link chegou do outro lado — e corta pela metade
     * o `limiteTentativas`, que mata o link comparando contra esse mesmo
     * contador.
     *
     * backendFetch, não fetch cru: o backend recusa request sem header Origin
     * (guarda de CSRF), e um fetch de servidor não manda Origin sozinho. Com o
     * fetch cru, TODO link compartilhado caía neste notFound().
     */
    const res = await backendFetch(`/preview/${token}/destino`);
    if (!res.ok) {
      /*
       * Esta é a PRIMEIRA porta — é este endereço que vai no WhatsApp. O
       * `notFound()` que estava aqui transformava revogado, expirado, limite
       * atingido e token inexistente na mesma página em branco, e o cliente
       * voltava dizendo "não abriu".
       *
       * A tela do viewer também trata o caso, mas quase ninguém chega lá por
       * fora: quem tem o link tem /l/<token>.
       */
      /*
       * 5xx não é link ruim, é falha nossa.
       *
       * O `?? "NAO_ENCONTRADO"` era um balde: qualquer resposta sem `motivo`
       * — inclusive um 500 do servidor — virava "Não encontramos esta arte".
       * O cliente lia que o endereço estava errado e voltava cobrar outro
       * link de quem já tinha mandado o certo, o designer parecia desleixado
       * por erro nosso, e ninguém ficava sabendo que houve erro nenhum.
       *
       * O backend distingue revogado, expirado e limite atingido com 404 e um
       * `motivo` no corpo. Qualquer 5xx é outra categoria, e a tela precisa
       * dizer isso.
       */
      if (res.status >= 500) {
        // Vai para o log do servidor: do lado do cliente este caso é mudo, e
        // sem rastro ninguém descobre que aconteceu.
        console.error("[/l/token] backend falhou ao resolver o destino", {
          status: res.status,
          token: token.slice(0, 8),
        });
        return <LinkIndisponivel motivo="FALHA_TEMPORARIA" tentarEm={`/l/${token}`} />;
      }

      const corpo = await res.json().catch(() => null);
      return (
        <LinkIndisponivel
          motivo={corpo?.motivo ?? "NAO_ENCONTRADO"}
          expiraEm={corpo?.expiraEm ?? null}
        />
      );
    }
    const body = await res.json();
    destino = body?.data;
  } catch (erro) {
    /*
     * Rede ou backend fora. Não dá para dizer QUAL link é — e justamente por
     * isso não dá para dizer que ele não existe, que era o que esta tela
     * fazia. Chutar contra o link é o pior chute possível: é o único que
     * manda o cliente cobrar a pessoa errada.
     */
    console.error("[/l/token] não foi possível falar com o backend", erro);
    return <LinkIndisponivel motivo="FALHA_TEMPORARIA" tentarEm={`/l/${token}`} />;
  }

  // Aqui o backend respondeu 2xx mas sem destino: resposta bem-formada e sem
  // o campo que importa. É falha nossa, não endereço errado.
  if (!destino?.arteId) {
    console.error("[/l/token] destino sem arteId", { token: token.slice(0, 8) });
    return <LinkIndisponivel motivo="FALHA_TEMPORARIA" tentarEm={`/l/${token}`} />;
  }

  redirect(`/viewer/arte/${destino.arteId}?token=${token}`);
}
