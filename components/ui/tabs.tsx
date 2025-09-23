"use client";

import * as React from "react";
import clsx from "clsx";

type TabsContext = {
  value: string;
  setValue: (v: string) => void;
};
const Ctx = React.createContext<TabsContext | null>(null);

export function Tabs({
  defaultValue,
  value: controlled,
  onValueChange,
  className,
  children,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue || "");
  const isControlled = controlled !== undefined;
  const value = isControlled ? (controlled as string) : uncontrolled;

  const setValue = (v: string) => {
    if (!isControlled) setUncontrolled(v);
    onValueChange?.(v);
  };

  React.useEffect(() => {
    if (!value && defaultValue) setUncontrolled(defaultValue);
  }, [defaultValue]); // init

  return (
    <Ctx.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  );
}

export function TabsList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="tablist"
      className={clsx(
        "inline-flex items-center gap-1 rounded-md bg-muted p-1",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(Ctx);
  if (!ctx) return null;
  const selected = ctx.value === value;
  return (
    <button
      role="tab"
      aria-selected={selected}
      onClick={() => ctx.setValue(value)}
      className={clsx(
        "px-3 py-1.5 text-sm rounded-md transition",
        selected
          ? "bg-white shadow-sm"
          : "hover:bg-white/60 text-muted-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(Ctx);
  if (!ctx) return null;
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}
