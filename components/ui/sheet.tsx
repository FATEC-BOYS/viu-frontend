"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

type SheetContextType = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};
const SheetCtx = React.createContext<SheetContextType | null>(null);

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

export function SheetContent({
  side = "right",
  className,
  children,
}: {
  side?: "right" | "left";
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(SheetCtx);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (ctx?.open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
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
      onKeyDown={(e) => e.key === "Escape" && onOpenChange(false)}
    >
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange(false)}
      />
      {/* panel */}
      <div
        data-state={open ? "open" : "closed"}
        className={clsx(
          "absolute top-0 h-full w-[90%] max-w-[560px] bg-white shadow-xl transition-transform duration-300 ease-out",
          sideClass,
          className
        )}
      >
        {children}
      </div>
    </div>
  ) : null;

  return createPortal(content, document.body);
}

export function SheetHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx("px-4 py-3 border-b bg-white", className)}>
      {children}
    </div>
  );
}

export function SheetTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h2 className={clsx("text-lg font-semibold leading-none", className)}>
      {children}
    </h2>
  );
}
