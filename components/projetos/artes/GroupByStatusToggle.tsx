"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function GroupByStatusToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch id="group-by-status" checked={value} onCheckedChange={onChange} />
      <Label htmlFor="group-by-status" className="text-sm">Agrupar por status</Label>
    </div>
  );
}
