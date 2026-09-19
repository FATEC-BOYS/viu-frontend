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
  } catch {
    // Rede ou backend fora: não dá para dizer o motivo, e chutar seria pior.
    return <LinkIndisponivel motivo="NAO_ENCONTRADO" />;
  }

  if (!destino?.arteId) return <LinkIndisponivel motivo="NAO_ENCONTRADO" />;

  redirect(`/viewer/arte/${destino.arteId}?token=${token}`);
}
