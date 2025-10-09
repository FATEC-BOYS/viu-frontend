// components/cyber/LoadingBoard.tsx
"use client";
import { useEffect, useState } from "react";
import Plate from "./Plate";
import { Stripe } from "./Stripe";

const LINES = ["Afiando os lápis…","Abrindo pastas…","Buscando inspirações…","Alinhando pixels…"] as const;

export default function LoadingBoard() {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT(v => (v+1)%LINES.length), 1300);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="grid place-items-center h-[55vh]">
      <Plate className="w-[min(520px,92vw)]">
        <div className="viu-caps mb-3 flex items-center justify-between">
          <span>* viu.sys / loader</span>
          <span className="viu-digits">0{t+1}/0{LINES.length}</span>
        </div>
        <Stripe className="mb-3" />
        <div className="flex items-center justify-between">
          <div className="viu-caps">{LINES[t]}</div>
          <div className="viu-caps text-[hsl(var(--cy-muted))]">stand by</div>
        </div>
      </Plate>
    </div>
  );
}
