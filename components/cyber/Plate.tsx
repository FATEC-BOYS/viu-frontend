// components/cyber/Plate.tsx
import { cn } from "@/lib/utils";

export default function Plate({
  children,
  accent = false,
  className,
  tab,
}: {
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
  tab?: string; 
}) {
  return (
    <div className={cn("viu-plate p-4", accent && "viu-plate--accent", className)}>
      {tab && <span className="viu-tabcap">{tab}</span>}
      {children}
    </div>
  );
}
