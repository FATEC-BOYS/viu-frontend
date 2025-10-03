"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Props = {
  onGoogle: () => void | Promise<void>;
  disabled?: boolean;
  googleLoading?: boolean;
  className?: string;
};

export default function SocialAuthButtons({
  onGoogle,
  disabled,
  googleLoading,
  className,
}: Props) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={onGoogle}
        disabled={disabled || googleLoading}
        aria-label="Continuar com Google"
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon className="h-4 w-4" />
        )}
        {googleLoading ? "Conectando..." : "Continuar com Google"}
      </Button>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.9 0-12.5-5.6-12.5-12.5S17.1 11 24 11c3.2 0 6.1 1.2 8.3 3.2l5.7-5.7C34.6 5.4 29.6 3.3 24 3.3 12.4 3.3 3 12.7 3 24.3S12.4 45.3 24 45.3c11.3 0 21-8.2 21-21 0-1.6-.2-3.1-.4-4.8z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.9C14.8 16.5 19 14 24 14c3.2 0 6.1 1.2 8.3 3.2l5.7-5.7C34.6 7.4 29.6 5.3 24 5.3c-7.1 0-13.3 3.6-17 9.4z"/>
      <path fill="#4CAF50" d="M24 43.3c5.2 0 9.6-1.7 12.8-4.7l-6-4.9C29.1 35.3 26.7 36 24 36c-5.3 0-9.7-3.4-11.4-8.1l-6.6 5C9.8 39.5 16.4 43.3 24 43.3z"/>
      <path fill="#1976D2" d="M45 24.3c0-1.3-.1-2.6-.4-3.8H24v8h11.3c-.7 3.4-2.8 6.2-5.8 8.1l6 4.9C39.9 38.9 45 32.4 45 24.3z"/>
    </svg>
  );
}
