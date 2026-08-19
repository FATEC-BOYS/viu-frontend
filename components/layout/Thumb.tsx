"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Miniatura de arte com fallback.
 *
 * Com <Image> puro, uma URL de preview que falha (link assinado expirado, R2
 * fora do ar) faz o navegador desenhar o texto alternativo dentro da caixa —
 * aparecia "de Visita TechStart" no lugar da imagem, em cima do badge de
 * status. Aqui a falha vira um ícone, e o nome fica só no title.
 *
 * Precisa de um pai com `position: relative` e altura definida.
 */
export default function Thumb({
  src,
  alt,
  sizes,
  className,
  iconClassName,
}: {
  src?: string | null;
  alt: string;
  sizes?: string;
  className?: string;
  iconClassName?: string;
}) {
  const [falhou, setFalhou] = useState(false);

  if (!src || falhou) {
    return (
      <div
        title={alt}
        className={cn("grid h-full w-full place-items-center bg-muted text-muted-foreground", className)}
      >
        <ImageOff className={cn("h-5 w-5", iconClassName)} aria-hidden />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized
      onError={() => setFalhou(true)}
      className={cn("object-cover", className)}
    />
  );
}
