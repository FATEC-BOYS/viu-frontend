"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

type SheetContextType = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};
const SheetCtx = React.createContext<SheetContextType | null>(null);

/** Root */
export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <SheetCtx.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetCtx.Provider>
  );
}

/** Content (painel) */
export function SheetContent({
  side = "right",
  className,
  children,
  ...props
}: {
  side?: "right" | "left";
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(SheetCtx);
  const [mounted, setMounted] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  // lock scroll quando aberto
  React.useEffect(() => {
    if (!ctx) return;
    if (ctx.open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [ctx?.open]);

  // foca painel ao abrir (a11y)
  React.useEffect(() => {
    if (!ctx?.open) return;
    panelRef.current?.focus();
  }, [ctx?.open]);

  if (!ctx || !mounted) return null;
  const { open, onOpenChange } = ctx;

  const sideClass =
    side === "right"
      ? "right-0 translate-x-full data-[state=open]:translate-x-0"
      : "left-0 -translate-x-full data-[state=open]:translate-x-0";

  const content = open ? (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50"
      onKeyDown={(e) => {
        if (e.key === "Escape") onOpenChange(false);
      }}
    >
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/40 opacity-100 data-[state=closed]:opacity-0 transition-opacity"
        data-state={open ? "open" : "closed"}
        onClick={() => onOpenChange(false)}
      />
      {/* panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        data-state={open ? "open" : "closed"}
        className={clsx(
          "absolute top-0 h-full w-[90%] max-w-[560px] bg-white shadow-xl outline-none",
          "transition-transform duration-300 ease-out",
          sideClass,
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  ) : null;

  return createPortal(content, document.body);
}

/** Header (container de título/descrição) */
export function SheetHeader({
  className,
  children,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("px-4 py-3 border-b bg-white", className)} {...props}>
      {children}
    </div>
  );
}

/** Title — agora aceita qualquer prop de <h2> (ex.: title, id, aria-*) */
export function SheetTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={clsx("text-lg font-semibold leading-none", className)} {...props} />
  );
}

/** Description — idem para <p> */
export function SheetDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={clsx("text-sm text-neutral-600 mt-1", className)} {...props} />
  );
}
