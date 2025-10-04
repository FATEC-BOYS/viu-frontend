"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Dispara um confete leve sem libs externas.
 * - Renderiza partículas CSS por ~1200ms e desmonta.
 * - Garante 1x por montagem quando `active` vira true.
 */
export default function ConfettiOnce({ active, duration = 1200, className }: {
  active: boolean;
  duration?: number;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    if (!active || fired.current) return;
    fired.current = true;
    setShow(true);
    const t = setTimeout(() => setShow(false), duration + 150);
    return () => clearTimeout(t);
  }, [active, duration]);

  if (!show) return null;

  // gera ~24 partículas com “randomness” simples
  const particles = Array.from({ length: 24 }).map((_, i) => {
    const left = Math.random() * 100; // %
    const rot = Math.floor(Math.random() * 360);
    const delay = Math.random() * 150; // ms
    const size = 6 + Math.round(Math.random() * 6); // px
    const hue = Math.floor(Math.random() * 360);
    const dx = -40 + Math.random() * 80; // “lean” lateral
    return { i, left, rot, delay, size, hue, dx };
  });

  return (
    <div
      aria-hidden
      className={["pointer-events-none fixed inset-0 z-[60] overflow-hidden", className].filter(Boolean).join(" ")}
    >
      {particles.map((p) => (
        <span
          key={p.i}
          className="confetti-p"
          style={{
            left: `${p.left}%`,
            transform: `translateX(0) rotate(${p.rot}deg)`,
            animationDelay: `${p.delay}ms`,
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            backgroundColor: `hsl(${p.hue} 90% 60%)`,
            // custom properties usadas no @keyframes:
            // @ts-ignore
            "--dx": `${p.dx}px`,
            // @ts-ignore
            "--rise": `-${80 + Math.random() * 40}vh`,
            // @ts-ignore
            "--spin": `${360 + Math.floor(Math.random() * 360)}deg`,
            // @ts-ignore
            "--dur": `${duration}ms`,
          } as React.CSSProperties}
        />
      ))}

      {/* CSS escopado (styled-jsx) */}
      <style jsx>{`
        .confetti-p {
          position: absolute;
          top: 60%;
          display: inline-block;
          border-radius: 1px;
          opacity: 0;
          animation: confetti-fall var(--dur) ease-out forwards;
        }
        @keyframes confetti-fall {
          0%   { transform: translate(0, 0) rotate(0); opacity: 0; }
          8%   { opacity: 1; }
          100% {
            transform:
              translate(var(--dx), var(--rise))
              rotate(var(--spin));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
