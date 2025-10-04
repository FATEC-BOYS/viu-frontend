"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

export default function MultiSelect({
  value, onChange, options, placeholder = "Selecionar…", emptyMessage = "Nada encontrado",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: Option[];
  placeholder?: string;
  emptyMessage?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = new Set(value);
  const toggle = (v: string) => {
    const next = new Set(selected);
    next.has(v) ? next.delete(v) : next.add(v);
    onChange(Array.from(next));
  };
  const remove = (v: string) => onChange(value.filter(i => i !== v));

  return (
    <div className="flex flex-wrap gap-2">
      {value.map((v) => {
        const opt = options.find(o => o.value === v);
        return (
          <Badge key={v} variant="secondary" className="gap-1">
            {opt?.label ?? v}
            <button onClick={() => remove(v)} className="ml-1 opacity-70 hover:opacity-100">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" role="combobox" aria-expanded={open} className="gap-2">
            {placeholder}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-64">
          <Command>
            <CommandInput placeholder="Buscar..." />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem key={opt.value} onSelect={() => toggle(opt.value)} className="cursor-pointer">
                    <Check className={cn("mr-2 h-4 w-4", selected.has(opt.value) ? "opacity-100" : "opacity-0")} />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
