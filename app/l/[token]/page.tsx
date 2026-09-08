// app/l/[token]/page.tsx
import { redirect, notFound } from "next/navigation";
import { backendFetch } from "@/lib/serverBackend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ token: string }> };

export default async function PublicLinkResolver({ params }: Props) {
  const { token } = await params;

  let preview: any = null;
  try {
    // backendFetch, não fetch cru: o backend recusa request sem header Origin
    // (guarda de CSRF), e um fetch de servidor não manda Origin sozinho. Com o
    // fetch cru, TODO link compartilhado caía neste notFound().
    const res = await backendFetch(`/preview/${token}`);
    if (!res.ok) return notFound();
    const body = await res.json();
    preview = body?.data;
  } catch {
    return notFound();
  }

  if (!preview?.arte?.id) return notFound();

  redirect(`/viewer/arte/${preview.arte.id}?token=${token}`);
}
