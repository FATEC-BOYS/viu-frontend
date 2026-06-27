// app/l/[token]/page.tsx
import { redirect, notFound } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

type Props = { params: Promise<{ token: string }> };

export default async function PublicLinkResolver({ params }: Props) {
  const { token } = await params;

  let preview: any = null;
  try {
    const res = await fetch(`${BACKEND_URL}/preview/${token}`, { cache: 'no-store' });
    if (!res.ok) return notFound();
    const body = await res.json();
    preview = body?.data;
  } catch {
    return notFound();
  }

  if (!preview?.arte?.id) return notFound();

  redirect(`/viewer/arte/${preview.arte.id}?token=${token}`);
}
