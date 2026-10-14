'use client';

import { useEffect, useState } from 'react';
import { Cookie, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CONSENT_COOKIE = 'viu_cookie_consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = document.cookie
      .split('; ')
      .some((cookie) => cookie.startsWith(`${CONSENT_COOKIE}=`));
    setVisible(!accepted);
  }, []);

  const accept = () => {
    document.cookie = `${CONSENT_COOKIE}=accepted; Max-Age=31536000; Path=/; SameSite=Lax`;
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      role="dialog"
      aria-label="Preferências de cookies"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl animate-in slide-in-from-bottom-4 fade-in duration-500 sm:inset-x-auto sm:bottom-6 sm:right-6"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/95 p-5 shadow-2xl shadow-foreground/10 backdrop-blur-xl">
        <button
          type="button"
          onClick={accept}
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Fechar aviso de cookies"
        >
          <X data-icon="inline-start" />
        </button>
        <div className="flex gap-4 pr-6">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-pastel-pessego text-primary">
            <Cookie data-icon="inline-start" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-base font-semibold tracking-tight">Uma experiência mais fluida</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Usamos cookies essenciais para manter sua sessão segura e lembrar suas preferências. Nada de rastreamento invasivo.
            </p>
            <Button type="button" size="sm" className="mt-4" onClick={accept}>
              Entendi
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
